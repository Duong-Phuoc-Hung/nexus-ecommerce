import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { GetOrderDetailUseCase } from './GetOrderDetailUseCase';
import { OrderNotFoundException } from '../../domain/exceptions/OrderNotFoundException';
import { OrderDetailDto } from '../dtos/OrderDetailDto';
import { OrderStatus } from '../../domain/entities/Order';
import { ICatalogClient, INotificationClient } from '../checkout/ports';

export interface UpdateOrderStatusInput {
  orderId: string;
  status: OrderStatus | string;
  note?: string;
  operatorId?: string;
  operatorRole?: string;
}

/**
 * Use Case: Cập nhật trạng thái đơn hàng (SRS 3.4 & 3.6).
 * Hỗ trợ đồng bộ trạng thái từ Vận chuyển (Fulfillment/3PL Carrier)
 * và tự động kích hoạt trừ tồn kho phía Catalog Service khi đơn hàng chuyển sang DELIVERED.
 */
export class UpdateOrderStatusUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly getOrderDetailUseCase: GetOrderDetailUseCase,
    private readonly catalogClient?: ICatalogClient,
    private readonly notificationClient?: INotificationClient,
  ) {}

  public async execute(input: UpdateOrderStatusInput): Promise<OrderDetailDto> {
    const rawId = (input.orderId || '').trim();
    if (!rawId) {
      throw new Error('Mã đơn hàng (orderId) không được để trống.');
    }

    const order = await this.orderRepository.findById(rawId);
    if (!order) {
      throw new OrderNotFoundException(rawId);
    }

    // BẢO MẬT CHỐNG IDOR: Nếu role là SELLER, chỉ cho phép cập nhật đơn thuộc gian hàng của mình
    if (
      input.operatorRole === 'SELLER' &&
      input.operatorId &&
      order.sellerId !== input.operatorId
    ) {
      throw new Error('Bạn không có quyền cập nhật trạng thái đơn hàng của gian hàng khác.');
    }

    const targetStatus = this.mapStatus(input.status);

    // Idempotency: Kiểm tra xem đơn hàng đã từng được trừ tồn kho qua DELIVERED chưa
    const alreadyDeducted =
      order.status === OrderStatus.DELIVERED ||
      order.timeline.some(
        (t) =>
          t.status === 'STOCK_DEDUCTED' ||
          (t.status === 'DELIVERED' && (t.note?.includes('STOCK_DEDUCTED') ?? false)),
      );

    // Kích hoạt trừ tồn kho khi đơn hàng chuyển sang DELIVERED
    if (targetStatus === OrderStatus.DELIVERED && !alreadyDeducted) {
      if (
        this.catalogClient &&
        typeof this.catalogClient.deductStock === 'function' &&
        Array.isArray(order.items)
      ) {
        for (const item of order.items) {
          if (item.productId && item.quantity > 0) {
            try {
              await this.catalogClient.deductStock(item.productId, item.quantity, order.id);
            } catch (err: any) {
              console.warn(
                `[UpdateOrderStatusUseCase] Không thể trừ kho cho sản phẩm ${item.productId}:`,
                err?.message || err,
              );
            }
          }
        }
      }
    }

    const finalNote =
      targetStatus === OrderStatus.DELIVERED && !alreadyDeducted
        ? `${input.note || 'Xác nhận giao hàng thành công'} · [STOCK_DEDUCTED]`.trim()
        : input.note;

    order.updateStatus(targetStatus, finalNote);
    await this.orderRepository.update(order);

    // Kích hoạt thông báo tiến trình cho Người mua qua Notification Service (SRS 3.2, 3.4 & 3.6)
    if (this.notificationClient && order.buyerId) {
      const statusLabel = this.formatStatusVietnamese(targetStatus);
      const title = `Cập nhật đơn hàng #${order.id}`;
      const body = `Đơn hàng của bạn đã chuyển sang trạng thái: "${statusLabel}".${finalNote ? ` Ghi chú: ${finalNote}` : ''}`;

      this.notificationClient
        .sendInAppNotification({
          recipientId: order.buyerId,
          channel: 'IN_APP',
          title,
          body,
          data: {
            orderId: order.id,
            orderCode: order.id,
            status: targetStatus,
          },
        })
        .catch((err: any) =>
          console.warn(
            '[UpdateOrderStatusUseCase] Lỗi gửi in-app notification:',
            err?.message || err,
          ),
        );

      if (
        order.buyerEmail &&
        typeof this.notificationClient.sendOrderConfirmationEmail === 'function'
      ) {
        this.notificationClient
          .sendOrderConfirmationEmail({
            email: order.buyerEmail,
            title: `[Nexus] ${title}`,
            body: `Xin chào ${order.buyerName || 'Quý khách'},\n\nĐơn hàng #${order.id} của bạn đã được cập nhật trạng thái mới: "${statusLabel}".\n${finalNote ? `Ghi chú: ${finalNote}\n` : ''}\nBạn có thể theo dõi hành trình đơn hàng tại cổng tài khoản Nexus.`,
          })
          .catch((err: any) =>
            console.warn(
              '[UpdateOrderStatusUseCase] Lỗi gửi email cập nhật tiến trình:',
              err?.message || err,
            ),
          );
      }
    }

    return this.getOrderDetailUseCase.execute(order.id);
  }

  private formatStatusVietnamese(status: OrderStatus | string): string {
    switch (status) {
      case 'PENDING_PAYMENT':
        return 'Chờ thanh toán';
      case 'PENDING':
        return 'Chờ xử lý';
      case 'PAID':
        return 'Đã thanh toán (Chờ giao hàng)';
      case 'PROCESSING':
        return 'Đang chuẩn bị hàng';
      case 'SHIPPED':
        return 'Đang giao hàng';
      case 'DELIVERED':
        return 'Đã giao hàng thành công';
      case 'CANCELLED':
        return 'Đã hủy';
      case 'REFUND_REQUESTED':
        return 'Yêu cầu hoàn tiền';
      case 'REFUNDED':
        return 'Đã hoàn tiền';
      default:
        return String(status);
    }
  }

  private mapStatus(raw: string): OrderStatus {
    const upper = (raw || '').toUpperCase().trim();
    if (upper in OrderStatus) {
      return upper as OrderStatus;
    }
    switch (raw) {
      case 'ĐÃ TẠO':
      case 'CHỜ THANH TOÁN':
      case 'Chờ thanh toán':
      case 'Đã tạo':
        return OrderStatus.PENDING;
      case 'ĐÃ THANH TOÁN':
      case 'Đã thanh toán':
        return OrderStatus.PAID;
      case 'ĐANG XỬ LÝ':
      case 'Đang xử lý':
        return OrderStatus.PROCESSING;
      case 'ĐANG GIAO':
      case 'ĐANG GIAO HÀNG':
      case 'Đang giao':
      case 'Đang giao hàng':
        return OrderStatus.SHIPPED;
      case 'ĐÃ GIAO':
      case 'ĐÃ GIAO HÀNG':
      case 'GIAO THÀNH CÔNG':
      case 'Đã giao':
      case 'Đã giao hàng':
      case 'Giao thành công':
        return OrderStatus.DELIVERED;
      case 'HOÀN TẤT':
      case 'Hoàn tất':
        return OrderStatus.COMPLETED;
      case 'ĐÃ HỦY':
      case 'Đã hủy':
        return OrderStatus.CANCELLED;
      case 'YÊU CẦU HOÀN TIỀN':
      case 'Yêu cầu hoàn tiền':
      case 'RETURN_PENDING':
      case 'RETURN_REQUESTED':
        return OrderStatus.REFUND_REQUESTED;
      case 'ĐÃ HOÀN TIỀN':
      case 'Đã hoàn tiền':
        return OrderStatus.REFUNDED;
      default:
        throw new Error(
          `Trạng thái đơn hàng không hợp lệ: "${raw}". Các giá trị hợp lệ: PENDING, PAID, PROCESSING, SHIPPED, DELIVERED, COMPLETED, CANCELLED, REFUND_REQUESTED, REFUNDED.`,
        );
    }
  }
}
