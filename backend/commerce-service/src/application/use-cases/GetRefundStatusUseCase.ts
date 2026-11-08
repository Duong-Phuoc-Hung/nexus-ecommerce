import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { OrderNotFoundException } from '../../domain/exceptions/OrderNotFoundException';

export interface RefundStatusDto {
  orderId: string;
  orderStatus: string;
  refundStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'NONE';
  refundTransactionId?: string;
  refundAmount?: number;
  completedAt?: string;
  canRefund: boolean;
}

/**
 * UseCase: GetRefundStatusUseCase
 * Tra cứu tiến độ và trạng thái tiền đã về tài khoản ngân hàng của khách chưa (SRS 2.3, 3.4)
 */
export class GetRefundStatusUseCase {
  constructor(private readonly orderRepository: IOrderRepository) {}

  public async execute(orderId: string): Promise<RefundStatusDto> {
    const rawId = (orderId || '').trim();
    if (!rawId) {
      throw new OrderNotFoundException('empty_id');
    }

    const order = await this.orderRepository.findById(rawId);
    if (!order) {
      throw new OrderNotFoundException(rawId);
    }

    const refundTxnId = order.refundTransactionId;
    const isRefunded = order.status === 'REFUNDED';
    const refundStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'NONE' = isRefunded
      ? 'SUCCESS'
      : order.status === 'REFUND_REQUESTED'
        ? 'PENDING'
        : 'NONE';

    return {
      orderId: order.id,
      orderStatus: order.status,
      refundStatus,
      refundTransactionId: refundTxnId || undefined,
      refundAmount: order.refundAmount || (isRefunded ? order.totalAmount : undefined),
      completedAt: isRefunded ? order.updatedAt.toISOString() : undefined,
      canRefund:
        order.status === 'PAID' ||
        order.status === 'DELIVERED' ||
        order.status === 'CANCELLED' ||
        order.status === 'REFUND_REQUESTED',
    };
  }
}
