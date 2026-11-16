import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { OrderNotFoundException } from '../../domain/exceptions/OrderNotFoundException';
import { OrderDetailDto } from '../dtos/OrderDetailDto';
import { GetOrderDetailUseCase } from './GetOrderDetailUseCase';
import { OrderStatus } from '../../domain/entities/Order';

export interface ConfirmOrderReceiptInput {
  orderId: string;
  buyerId: string;
}

export class ConfirmOrderReceiptUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly getOrderDetailUseCase: GetOrderDetailUseCase,
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

    return this.getOrderDetailUseCase.execute(order.id);
  }
}
