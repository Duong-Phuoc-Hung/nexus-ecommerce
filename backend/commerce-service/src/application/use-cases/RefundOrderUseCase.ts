import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { OrderNotFoundException } from '../../domain/exceptions/OrderNotFoundException';
import { OrderDetailDto } from '../dtos/OrderDetailDto';
import { GetOrderDetailUseCase } from './GetOrderDetailUseCase';

export class RefundOrderUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly getOrderDetailUseCase: GetOrderDetailUseCase,
  ) {}

  public async execute(orderId: string, reason?: string): Promise<OrderDetailDto> {
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new OrderNotFoundException(orderId);
    }

    order.refund(reason);
    await this.orderRepository.update(order);

    return this.getOrderDetailUseCase.execute(orderId);
  }
}
