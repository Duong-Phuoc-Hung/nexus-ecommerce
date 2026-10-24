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

    const firstItemName =
      order.items.length > 0
        ? order.items[0].productName || 'Sản phẩm Nexus'
        : 'Đơn hàng không có sản phẩm';

    const formattedDate = order.createdAt.toLocaleDateString('vi-VN');

    return {
      id: order.id,
      buyerId: order.buyerId,
      buyer: order.buyerName,
      email: order.buyerEmail,
      sellerId: order.sellerId,
      seller: order.sellerName,
      product: firstItemName,
      date: formattedDate,
      total: order.totalAmount,
      totalAmount: order.totalAmount,
      status: order.status,
      tracking: order.trackingCode || '—',
      itemsCount: order.items.length,
      items: order.items.map((i) => ({
        productId: i.productId,
        productName: i.productName || 'Sản phẩm Nexus',
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
      })),
      timeline: order.timeline.map((t) => ({
        status: t.status,
        title: t.title,
        timestamp: t.timestamp.toISOString(),
        note: t.note,
      })),
      paymentTransactionId: order.paymentTransactionId,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}
