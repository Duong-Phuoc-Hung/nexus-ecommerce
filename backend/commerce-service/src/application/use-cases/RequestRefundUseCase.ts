import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { GetOrderDetailUseCase } from './GetOrderDetailUseCase';
import { OrderNotFoundException } from '../../domain/exceptions/OrderNotFoundException';
import { OrderDetailDto } from '../dtos/OrderDetailDto';

export interface RequestRefundInput {
  orderId: string;
  requesterId?: string;
  requesterRole?: string;
  reason: string;
  evidenceUrls?: string[];
}

export class RequestRefundUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly getOrderDetailUseCase: GetOrderDetailUseCase,
  ) {}

  public async execute(input: RequestRefundInput): Promise<OrderDetailDto> {
    const order = await this.orderRepository.findById(input.orderId);

    if (!order) {
      throw new OrderNotFoundException(input.orderId);
    }

    // BẢO MẬT CHỐNG IDOR: Nếu role là BUYER, chỉ cho phép gửi yêu cầu cho chính đơn của mình
    if (
      input.requesterRole === 'BUYER' &&
      input.requesterId &&
      order.buyerId !== input.requesterId
    ) {
      throw new Error('Bạn không có quyền gửi yêu cầu hoàn tiền cho đơn hàng của người khác.');
    }

    order.requestRefund(input.reason, input.evidenceUrls);

    await this.orderRepository.update(order);
    return this.getOrderDetailUseCase.execute(input.orderId);
  }
}
