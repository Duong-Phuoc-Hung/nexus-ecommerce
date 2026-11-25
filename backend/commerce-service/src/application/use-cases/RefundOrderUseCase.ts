import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { OrderNotFoundException } from '../../domain/exceptions/OrderNotFoundException';
import { OrderDetailDto } from '../dtos/OrderDetailDto';
import { GetOrderDetailUseCase } from './GetOrderDetailUseCase';
import { INotificationClient } from '../checkout/ports';

export class RefundOrderUseCase {
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

    order.refund(reason);
    await this.orderRepository.update(order);

    if (this.notificationClient && order.buyerId) {
      const title = `Đơn hàng #${order.id} đã được hoàn tiền`;
      const body = `Yêu cầu hoàn tiền cho đơn hàng #${order.id} đã được chấp thuận. ${reason ? `Lý do: ${reason}` : ''}`;
      this.notificationClient
        .sendInAppNotification({
          recipientId: order.buyerId,
          channel: 'ORDER_STATUS',
          title,
          body,
          data: { orderId: order.id, status: 'REFUNDED', reason },
        })
        .catch((err: any) =>
          console.warn('[RefundOrderUseCase] Lỗi gửi in-app notification:', err?.message || err),
        );

      if (
        order.buyerEmail &&
        typeof this.notificationClient.sendOrderConfirmationEmail === 'function'
      ) {
        this.notificationClient
          .sendOrderConfirmationEmail({
            email: order.buyerEmail,
            title: `[Nexus] ${title}`,
            body: `Xin chào ${order.buyerName || 'Quý khách'},\n\nKhoản tiền cho đơn hàng #${order.id} đã được hoàn trả thành công.\n${reason ? `Ghi chú: ${reason}\n` : ''}Cảm ơn bạn đã mua sắm tại Nexus.`,
          })
          .catch((err: any) =>
            console.warn('[RefundOrderUseCase] Lỗi gửi email hoàn tiền:', err?.message || err),
          );
      }
    }

    return this.getOrderDetailUseCase.execute(orderId);
  }
}
