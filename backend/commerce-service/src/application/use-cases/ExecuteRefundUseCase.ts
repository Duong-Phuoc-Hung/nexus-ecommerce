import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { OrderNotFoundException } from '../../domain/exceptions/OrderNotFoundException';
import { OrderStatus } from '../../domain/entities/Order';
import { IPaymentGateway } from '../checkout/ports';

export interface ExecuteRefundInput {
  orderId: string;
  refundAmount?: number;
  reason?: string;
  operatorId?: string;
  idempotencyKey?: string;
}

export interface ExecuteRefundResult {
  orderId: string;
  refundTransactionId: string;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  completedAt: string;
  message: string;
  alreadyRefunded?: boolean;
  needsReconciliation?: boolean;
  errorCode?: string;
}

/**
 * UseCase: ExecuteRefundUseCase
 * Kích hoạt lệnh hoàn tiền qua Cổng thanh toán (PayOS / Ngân hàng).
 * - Không bao giờ giả mạo SUCCESS khi provider chưa xác nhận.
 * - Chống hoàn tiền hai lần (idempotent nếu đã REFUNDED/SUCCESS).
 * - Nếu đang PENDING (do timeout trước đó), đối soát với provider trước khi thử lại.
 */
export class ExecuteRefundUseCase {
  private readonly inFlight = new Map<string, Promise<ExecuteRefundResult>>();

  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly paymentGateway?: IPaymentGateway,
  ) {}

  public async execute(input: ExecuteRefundInput): Promise<ExecuteRefundResult> {
    const rawId = (input.orderId || '').trim();
    if (!rawId) {
      throw new OrderNotFoundException('empty_id');
    }

    const existing = this.inFlight.get(rawId);
    if (existing) {
      return existing;
    }

    const promise = this.runExecute(rawId, input).finally(() => {
      this.inFlight.delete(rawId);
    });
    this.inFlight.set(rawId, promise);
    return promise;
  }

  private async runExecute(rawId: string, input: ExecuteRefundInput): Promise<ExecuteRefundResult> {
    const order = await this.orderRepository.findById(rawId);
    if (!order) {
      throw new OrderNotFoundException(rawId);
    }

    // 1. Chống hoàn tiền hai lần: đơn đã REFUNDED hoặc refundStatus === SUCCESS -> trả kết quả idempotent, KHÔNG gọi provider
    if (order.status === OrderStatus.REFUNDED || order.refundStatus === 'SUCCESS') {
      return {
        orderId: order.id,
        refundTransactionId: order.refundTransactionId || '',
        amount: order.refundAmount ?? order.totalAmount,
        status: 'SUCCESS',
        completedAt: order.updatedAt.toISOString(),
        alreadyRefunded: true,
        message: 'Đơn hàng đã được hoàn tiền trước đó; bỏ qua yêu cầu hoàn lặp.',
      };
    }

    const amount =
      typeof input.refundAmount === 'number' && input.refundAmount > 0
        ? Math.min(input.refundAmount, order.totalAmount)
        : order.refundAmount || order.totalAmount;

    if (!this.paymentGateway || typeof this.paymentGateway.executeRefund !== 'function') {
      order.executeRefund({
        refundTransactionId: '',
        amount,
        reason: input.reason || 'Cổng thanh toán chưa sẵn sàng để hoàn tiền',
        status: 'FAILED',
      });
      await this.orderRepository.update(order);
      return {
        orderId: order.id,
        refundTransactionId: '',
        amount,
        status: 'FAILED',
        completedAt: new Date().toISOString(),
        errorCode: 'REFUND_GATEWAY_NOT_CONFIGURED',
        message: 'Cổng thanh toán hoàn tiền chưa được cấu hình.',
      };
    }

    // 2. Nếu có giao dịch hoàn tiền đang PENDING -> đối soát với provider trước khi phát lệnh mới
    if (order.refundStatus === 'PENDING' && order.refundTransactionId) {
      if (typeof this.paymentGateway.getRefundStatus === 'function') {
        const reconciled = await this.paymentGateway.getRefundStatus(order.refundTransactionId);
        if (reconciled.status === 'SUCCESS' && reconciled.providerConfirmed) {
          const finalTxnId = reconciled.refundTransactionId || order.refundTransactionId;
          order.executeRefund({
            refundTransactionId: finalTxnId,
            amount,
            reason: input.reason || 'Đối soát xác nhận hoàn tiền thành công',
            status: 'SUCCESS',
          });
          await this.orderRepository.update(order);
          return {
            orderId: order.id,
            refundTransactionId: finalTxnId,
            amount,
            status: 'SUCCESS',
            completedAt: (reconciled.completedAt || new Date()).toISOString(),
            message: `Đã đối soát và xác nhận hoàn tiền thành công ${amount.toLocaleString('vi-VN')} VND.`,
          };
        }
        if (reconciled.status === 'PENDING' || reconciled.status === 'UNKNOWN') {
          return {
            orderId: order.id,
            refundTransactionId: order.refundTransactionId,
            amount,
            status: 'PENDING',
            completedAt: new Date().toISOString(),
            needsReconciliation: true,
            errorCode: 'REFUND_RECONCILIATION_PENDING',
            message:
              'Giao dịch hoàn tiền trước đó đang chờ xác nhận từ cổng thanh toán; không khởi tạo lệnh hoàn mới.',
          };
        }
        // Nếu provider xác nhận FAILED -> cho phép đi tiếp tạo yêu cầu hoàn mới
      } else {
        return {
          orderId: order.id,
          refundTransactionId: order.refundTransactionId,
          amount,
          status: 'PENDING',
          completedAt: new Date().toISOString(),
          needsReconciliation: true,
          errorCode: 'REFUND_RECONCILIATION_UNSUPPORTED',
          message:
            'Đang có giao dịch hoàn tiền ở trạng thái PENDING nhưng cổng thanh toán chưa hỗ trợ đối soát tự động.',
        };
      }
    }

    // 3. Gọi cổng thanh toán thực thi hoàn tiền
    const idempotencyKey =
      input.idempotencyKey?.trim() ||
      `rf_${order.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(-16)}_${amount}`;

    let gatewayRes: Awaited<ReturnType<NonNullable<IPaymentGateway['executeRefund']>>>;
    try {
      gatewayRes = await this.paymentGateway.executeRefund({
        orderId: order.id,
        amount,
        reason: input.reason || 'Support duyệt hoàn tiền',
        idempotencyKey,
      });
    } catch (err: any) {
      // Lỗi mạng/timeout từ adapter -> giữ PENDING để đối soát, TUYỆT ĐỐI không đánh dấu SUCCESS
      order.executeRefund({
        refundTransactionId: idempotencyKey,
        amount,
        reason: `Lỗi kết nối cổng thanh toán (${err?.message || 'timeout'}), chờ đối soát`,
        status: 'PENDING',
      });
      await this.orderRepository.update(order);
      return {
        orderId: order.id,
        refundTransactionId: idempotencyKey,
        amount,
        status: 'PENDING',
        completedAt: new Date().toISOString(),
        needsReconciliation: true,
        errorCode: 'REFUND_PROVIDER_TIMEOUT',
        message:
          'Không nhận được xác nhận từ cổng thanh toán; giao dịch được giữ ở trạng thái PENDING để đối soát.',
      };
    }

    const finalStatus: 'PENDING' | 'SUCCESS' | 'FAILED' =
      gatewayRes.status === 'SUCCESS' && gatewayRes.providerConfirmed !== false
        ? 'SUCCESS'
        : gatewayRes.status === 'PENDING'
          ? 'PENDING'
          : 'FAILED';

    order.executeRefund({
      refundTransactionId:
        gatewayRes.refundTransactionId || (finalStatus === 'PENDING' ? idempotencyKey : ''),
      amount,
      reason:
        finalStatus === 'FAILED'
          ? gatewayRes.errorMessage || input.reason || 'Cổng thanh toán từ chối hoàn tiền'
          : input.reason || 'Kích hoạt hoàn tiền qua cổng PayOS',
      status: finalStatus,
    });

    await this.orderRepository.update(order);

    if (finalStatus === 'SUCCESS') {
      return {
        orderId: order.id,
        refundTransactionId: gatewayRes.refundTransactionId,
        amount,
        status: 'SUCCESS',
        completedAt: gatewayRes.completedAt.toISOString(),
        message: `Đã hoàn tiền thành công số tiền ${amount.toLocaleString('vi-VN')} VND về tài khoản người mua.`,
      };
    }

    if (finalStatus === 'PENDING') {
      return {
        orderId: order.id,
        refundTransactionId: gatewayRes.refundTransactionId || idempotencyKey,
        amount,
        status: 'PENDING',
        completedAt: gatewayRes.completedAt.toISOString(),
        needsReconciliation: true,
        errorCode: gatewayRes.errorCode || 'REFUND_PENDING',
        message:
          gatewayRes.errorMessage ||
          'Yêu cầu hoàn tiền đang chờ xác nhận từ cổng thanh toán (PENDING).',
      };
    }

    return {
      orderId: order.id,
      refundTransactionId: gatewayRes.refundTransactionId || '',
      amount,
      status: 'FAILED',
      completedAt: gatewayRes.completedAt.toISOString(),
      errorCode: gatewayRes.errorCode || 'REFUND_FAILED',
      message: gatewayRes.errorMessage || 'Cổng thanh toán không xác nhận hoàn tiền.',
    };
  }
}
