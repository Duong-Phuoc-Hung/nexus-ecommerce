import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { OrderNotFoundException } from '../../domain/exceptions/OrderNotFoundException';
import { OrderDetailDto } from '../dtos/OrderDetailDto';
import { GetOrderDetailUseCase } from './GetOrderDetailUseCase';
import { OrderStatus } from '../../domain/entities/Order';
import { INotificationClient } from '../checkout/ports';

export interface ConfirmOrderReceiptInput {
  orderId: string;
  buyerId: string;
}

export class ConfirmOrderReceiptUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly getOrderDetailUseCase: GetOrderDetailUseCase,
    private readonly notificationClient?: INotificationClient,
  ) {}

  public async execute(input: ConfirmOrderReceiptInput): Promise<OrderDetailDto> {
    const order = await this.orderRepository.findById(input.orderId);
    if (!order) {
      throw new OrderNotFoundException(input.orderId);
    }

    if (order.buyerId !== input.buyerId) {
      throw new Error('Bạn không có quyền xác nhận nhận hàng cho đơn hàng của người khác.');
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new Error('Chỉ có thể xác nhận nhận hàng khi đơn hàng ở trạng thái "DELIVERED".');
    }

    order.confirmReceipt();
    await this.orderRepository.update(order);

    if (this.notificationClient && order.sellerId) {
      const title = `Người mua đã xác nhận nhận hàng đơn #${order.id}`;
      const body = `Khách hàng đã bấm xác nhận nhận hàng thành công. Doanh thu đơn hàng đã sẵn sàng giải tỏa.`;
      this.notificationClient
        .sendInAppNotification({
          recipientId: order.sellerId,
          channel: 'ORDER_STATUS',
          title,
          body,
          data: { orderId: order.id, status: 'DELIVERED' },
        })
        .catch((err: any) =>
          console.warn(
            '[ConfirmOrderReceiptUseCase] Lỗi gửi notification tới seller:',
            err?.message || err,
          ),
        );
    }

    return this.getOrderDetailUseCase.execute(order.id);
  }
}
