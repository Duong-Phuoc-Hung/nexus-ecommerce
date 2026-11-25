import { IOrderRepository, OrderSearchCriteria } from '../../domain/repositories/IOrderRepository';
import {
  OrderSearchItemDto,
  SearchOrdersQueryDto,
  SearchOrdersResultDto,
} from '../dtos/SearchOrdersDto';

export class SearchOrdersUseCase {
  constructor(private readonly orderRepository: Pick<IOrderRepository, 'search'>) {}

  public async execute(query: SearchOrdersQueryDto): Promise<SearchOrdersResultDto> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));

    const criteria: OrderSearchCriteria = {
      q: query.q?.trim() || undefined,
      buyerId:
        query.buyerId?.trim() && query.buyerId.trim().toLowerCase() !== 'all'
          ? query.buyerId.trim()
          : undefined,
      sellerId:
        query.sellerId?.trim() && query.sellerId.trim().toLowerCase() !== 'all'
          ? query.sellerId.trim()
          : undefined,
      status:
        query.status?.trim() && query.status.trim().toLowerCase() !== 'all'
          ? query.status.trim().toUpperCase()
          : undefined,
      fromDate: query.fromDate?.trim() || undefined,
      toDate: query.toDate?.trim() || undefined,
      page,
      limit,
      sortBy: this.validateSortBy(query.sortBy),
      sortOrder: query.sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc',
    };

    const searchResult = await this.orderRepository.search(criteria);

    const items: OrderSearchItemDto[] = searchResult.orders.map((order) => {
      const firstItemName =
        order.items.length > 0
          ? order.items[0].productName || 'Sản phẩm Nexus'
          : 'Đơn hàng không có sản phẩm';

      const formattedDate = order.createdAt.toLocaleDateString('vi-VN');

      return {
        id: order.id,
        orderCode: order.id,
        buyer: order.buyerName || 'Khách hàng',
        buyerId: order.buyerId,
        email: order.buyerEmail || '',
        seller: order.sellerName || 'Gian hàng đối tác',
        sellerId: order.sellerId,
        product: firstItemName,
        date: formattedDate,
        total: order.totalAmount,
        totalAmount: order.totalAmount,
        status: order.status,
        paymentMethod: order.paymentMethod,
        shippingAddress: order.shippingAddress,
        tracking: order.trackingCode || '—',
        trackingCode: order.trackingCode,
        itemsCount: order.items.length,
        items: order.items.map((i) => ({
          productId: i.productId,
          productName: i.productName || 'Sản phẩm Nexus',
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.totalPrice,
        })),
        timeline: (order.timeline || []).map((t) => ({
          status: t.status,
          title: t.title,
          description: t.note || t.title,
          timestamp: t.timestamp.toISOString(),
          note: t.note,
        })),
        buyerReceivedAt: order.buyerReceivedAt?.toISOString() || null,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      };
    });

    return {
      items,
      pagination: {
        total: searchResult.total,
        page: searchResult.page,
        limit: searchResult.limit,
        totalPages: searchResult.totalPages,
      },
    };
  }

  private validateSortBy(sortBy?: string): 'createdAt' | 'totalAmount' | 'status' {
    switch (sortBy) {
      case 'totalAmount':
      case 'status':
        return sortBy;
      case 'createdAt':
      default:
        return 'createdAt';
    }
  }
}
