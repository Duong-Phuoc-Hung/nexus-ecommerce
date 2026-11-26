import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { GetOrderDetailUseCase } from './GetOrderDetailUseCase';
import { OrderNotFoundException } from '../../domain/exceptions/OrderNotFoundException';
import { OrderDetailDto } from '../dtos/OrderDetailDto';
import { INotificationClient } from '../checkout/ports';

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
    private readonly notificationClient?: INotificationClient,
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

    // Thông báo cho Người bán biết có yêu cầu hoàn tiền mới cần phản hồi/nộp bằng chứng
    if (this.notificationClient && order.sellerId) {
      this.notificationClient
        .sendInAppNotification({
          recipientId: order.sellerId,
          channel: 'DISPUTE_RESOLUTION',
          title: `Đơn hàng #${order.id} có yêu cầu hoàn tiền mới`,
          body: `Người mua đã gửi yêu cầu hoàn tiền. Lý do: ${input.reason}`,
          data: { orderId: order.id, status: 'REFUND_REQUESTED', reason: input.reason },
        })
        .catch((err: any) =>
          console.warn(
            '[RequestRefundUseCase] Lỗi gửi notification tới seller:',
            err?.message || err,
          ),
        );
    }

    return this.getOrderDetailUseCase.execute(input.orderId);
  }
}
