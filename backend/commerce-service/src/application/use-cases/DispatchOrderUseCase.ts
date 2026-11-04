import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { GetOrderDetailUseCase } from './GetOrderDetailUseCase';
import { OrderNotFoundException } from '../../domain/exceptions/OrderNotFoundException';
import { OrderDetailDto } from '../dtos/OrderDetailDto';

export interface DispatchOrderInput {
  orderId: string;
  operatorId?: string;
  operatorRole?: string;
  carrierCode?: string;
  trackingCode?: string;
}

export class DispatchOrderUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly getOrderDetailUseCase: GetOrderDetailUseCase,
  ) {}

  public async execute(input: DispatchOrderInput): Promise<OrderDetailDto> {
    const order = await this.orderRepository.findById(input.orderId);

    if (!order) {
      throw new OrderNotFoundException(input.orderId);
    }

    // BẢO MẬT CHỐNG IDOR: Nếu role là SELLER, chỉ cho phép dispatch đơn thuộc gian hàng của mình
    if (
      input.operatorRole === 'SELLER' &&
      input.operatorId &&
      order.sellerId !== input.operatorId
    ) {
      throw new Error('Bạn không có quyền bàn giao đơn hàng của gian hàng khác.');
    }

    const carrier = input.carrierCode || 'GHN';
    order.dispatch(input.trackingCode, carrier);

    await this.orderRepository.update(order);
    return this.getOrderDetailUseCase.execute(input.orderId);
  }
}
