import { IOrderRepository, OrderSearchCriteria } from '../../domain/repositories/IOrderRepository';
import {
  OrderSearchItemDto,
  SearchOrdersQueryDto,
  SearchOrdersResultDto,
} from '../dtos/SearchOrdersDto';

export class SearchOrdersUseCase {
  constructor(private readonly orderRepository: IOrderRepository) {}

  public async execute(query: SearchOrdersQueryDto): Promise<SearchOrdersResultDto> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));

    const criteria: OrderSearchCriteria = {
      q: query.q?.trim() || undefined,
      buyerId: query.buyerId?.trim() || undefined,
      sellerId: query.sellerId?.trim() || undefined,
      status: query.status?.trim().toUpperCase() || undefined,
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
        buyer: order.buyerName,
        email: order.buyerEmail,
        seller: order.sellerName,
        product: firstItemName,
        date: formattedDate,
        total: order.totalAmount,
        totalAmount: order.totalAmount,
        status: order.status,
        tracking: order.trackingCode || '—',
        itemsCount: order.items.length,
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
