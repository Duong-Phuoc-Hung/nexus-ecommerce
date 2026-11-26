import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { OrderNotFoundException } from '../../domain/exceptions/OrderNotFoundException';
import { OrderStatus } from '../../domain/entities/Order';
import { OrderDetailDto } from '../dtos/OrderDetailDto';
import { GetOrderDetailUseCase } from './GetOrderDetailUseCase';
import { ICatalogClient, INotificationClient } from '../checkout/ports';

export class CancelOrderUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly getOrderDetailUseCase: GetOrderDetailUseCase,
    private readonly catalogClient?: ICatalogClient,
    private readonly notificationClient?: INotificationClient,
  ) {}

  public async execute(orderId: string, reason?: string): Promise<OrderDetailDto> {
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new OrderNotFoundException(orderId);
    }

    const previousStatus = order.status;
    const stockWasDeducted =
      previousStatus === OrderStatus.PROCESSING ||
      previousStatus === OrderStatus.PAID ||
      previousStatus === OrderStatus.SHIPPED ||
      order.timeline.some(
        (t) => t.status === 'STOCK_DEDUCTED' || (t.note?.includes('STOCK_DEDUCTED') ?? false),
      );

    order.cancel(reason);
    await this.orderRepository.update(order);

    // GAP-LOG-01: Hoàn tồn kho Catalog nếu đơn đã từng trừ tồn kho (COD / PayOS đã PAID)
    if (
      previousStatus !== OrderStatus.CANCELLED &&
      stockWasDeducted &&
      this.catalogClient &&
      typeof this.catalogClient.restoreStock === 'function'
    ) {
      for (const item of order.items) {
        if (item.productId && item.quantity > 0) {
          try {
            await this.catalogClient.restoreStock(item.productId, item.quantity, order.id);
          } catch (err: any) {
            console.warn(
              `[CancelOrderUseCase] Không thể hoàn kho cho sản phẩm ${item.productId}:`,
              err?.message || err,
            );
          }
        }
      }
    }

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
