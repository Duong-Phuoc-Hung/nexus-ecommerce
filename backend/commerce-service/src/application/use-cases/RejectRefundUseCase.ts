import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { OrderNotFoundException } from '../../domain/exceptions/OrderNotFoundException';
import { OrderDetailDto } from '../dtos/OrderDetailDto';
import { GetOrderDetailUseCase } from './GetOrderDetailUseCase';

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

    return this.getOrderDetailUseCase.execute(orderId);
  }
}
