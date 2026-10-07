import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { OrderNotFoundException } from '../../domain/exceptions/OrderNotFoundException';
import { OrderDetailDto } from '../dtos/OrderDetailDto';

export class GetOrderDetailUseCase {
  constructor(private readonly orderRepository: IOrderRepository) {}

  public async execute(orderId: string): Promise<OrderDetailDto> {
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new OrderNotFoundException(orderId);
    }

    return {
      id: order.id,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      totalAmount: order.totalAmount,
      status: order.status,
      itemsCount: order.items.length,
      createdAt: order.createdAt.toISOString(),
    };
  }
}
