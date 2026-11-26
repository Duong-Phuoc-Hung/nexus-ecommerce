import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { OrderNotFoundException } from '../../domain/exceptions/OrderNotFoundException';
import { OrderDetailDto } from '../dtos/OrderDetailDto';
import { GetOrderDetailUseCase } from './GetOrderDetailUseCase';
import { INotificationClient } from '../checkout/ports';

/**
 * UseCase: RejectRefundUseCase
 * Từ chối hoặc hủy bỏ yêu cầu hoàn tiền cho đơn hàng (SRS 2.3, 3.1.2)
 * Quyền: SUPPORT_STAFF, ADMIN.
 * Chuyển trạng thái hoàn tiền về REFUND_REJECTED / REFUND_CANCELLED và khôi phục đơn hàng.
 */
export class RejectRefundUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly getOrderDetailUseCase: GetOrderDetailUseCase,
    private readonly notificationClient?: INotificationClient,
  ) {}

  public async execute(orderId: string, reason: string): Promise<OrderDetailDto> {
    if (!reason || !reason.trim()) {
      throw new Error('Lý do từ chối yêu cầu hoàn tiền (reason) không được để trống.');
    }

    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new OrderNotFoundException(orderId);
    }

    order.rejectRefund(reason.trim());
    await this.orderRepository.update(order);

    if (this.notificationClient && order.buyerId) {
      const title = `Yêu cầu hoàn tiền đơn hàng #${order.id} bị từ chối`;
      const body = `Yêu cầu hoàn tiền của bạn đã bị từ chối. Lý do: ${reason.trim()}`;
      this.notificationClient
        .sendInAppNotification({
          recipientId: order.buyerId,
          channel: 'ORDER_STATUS',
          title,
          body,
          data: { orderId: order.id, status: 'REFUND_REJECTED', reason: reason.trim() },
        })
        .catch((err: any) =>
          console.warn('[RejectRefundUseCase] Lỗi gửi in-app notification:', err?.message || err),
        );

      if (
        order.buyerEmail &&
        typeof this.notificationClient.sendOrderConfirmationEmail === 'function'
      ) {
        this.notificationClient
          .sendOrderConfirmationEmail({
            email: order.buyerEmail,
            title: `[Nexus] ${title}`,
            body: `Xin chào ${order.buyerName || 'Quý khách'},\n\nYêu cầu hoàn tiền cho đơn hàng #${order.id} đã không được chấp thuận.\nLý do: ${reason.trim()}\nNếu cần hỗ trợ thêm, bạn có thể liên hệ bộ phận Hỗ trợ Nexus.`,
          })
          .catch((err: any) =>
            console.warn(
              '[RejectRefundUseCase] Lỗi gửi email từ chối hoàn tiền:',
              err?.message || err,
            ),
          );
      }
    }

    return this.getOrderDetailUseCase.execute(orderId);
  }
}
