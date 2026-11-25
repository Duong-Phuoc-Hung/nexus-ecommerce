import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { OrderNotFoundException } from '../../domain/exceptions/OrderNotFoundException';
import { OrderDetailDto } from '../dtos/OrderDetailDto';
import { GetOrderDetailUseCase } from './GetOrderDetailUseCase';
import { INotificationClient } from '../checkout/ports';

export class CancelOrderUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly getOrderDetailUseCase: GetOrderDetailUseCase,
    private readonly notificationClient?: INotificationClient,
  ) {}

  public async execute(orderId: string, reason?: string): Promise<OrderDetailDto> {
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new OrderNotFoundException(orderId);
    }

    order.cancel(reason);
    await this.orderRepository.update(order);

    // Gửi thông báo in-app và email cho Người mua khi đơn hàng bị hủy (SRS 3.2 & 3.4)
    if (this.notificationClient && order.buyerId) {
      const title = `Đơn hàng #${order.id} đã bị hủy`;
      const body = reason
        ? `Lý do: ${reason}`
        : `Đơn hàng #${order.id} của bạn đã được hủy thành công.`;

      this.notificationClient
        .sendInAppNotification({
          recipientId: order.buyerId,
          channel: 'ORDER_STATUS',
          title,
          body,
          data: {
            orderId: order.id,
            status: 'CANCELLED',
            reason,
          },
        })
        .catch((err: any) =>
          console.warn('[CancelOrderUseCase] Lỗi gửi in-app notification:', err?.message || err),
        );

      if (
        order.buyerEmail &&
        typeof this.notificationClient.sendOrderConfirmationEmail === 'function'
      ) {
        this.notificationClient
          .sendOrderConfirmationEmail({
            email: order.buyerEmail,
            title: `[Nexus] ${title}`,
            body: `Xin chào ${order.buyerName || 'Quý khách'},\n\nĐơn hàng #${order.id} của bạn đã bị hủy.\n${reason ? `Lý do hủy: ${reason}\n` : ''}Nếu đơn hàng đã thanh toán trước, số tiền sẽ được hoàn trả theo quy trình hoàn tiền của hệ thống.`,
          })
          .catch((err: any) =>
            console.warn('[CancelOrderUseCase] Lỗi gửi email hủy đơn:', err?.message || err),
          );
      }
    }

    return this.getOrderDetailUseCase.execute(orderId);
  }
}
