import { SupportCase } from '../../domain/entities/SupportCase';
import {
  ISupportCaseRepository,
  SupportCaseSearchCriteria,
  SupportCaseSearchPage,
} from '../../domain/repositories/ISupportCaseRepository';

export class InMemorySupportCaseRepository implements ISupportCaseRepository {
  private cases: Map<string, SupportCase> = new Map();

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData(): void {
    const now = Date.now();
    const samples = [
      {
        id: 'CS-4021',
        type: 'Yêu cầu hoàn tiền',
        orderId: 'ord_01hqz555abc',
        orderCode: 'NX-ORD-8021',
        userId: 'usr_01hqz789abc',
        customer: 'Minh Anh',
        reason: 'Sản phẩm chưa đúng mô tả',
        priority: 'Cao' as const,
        status: 'PENDING' as const,
        createdAt: new Date(now - 12 * 60 * 1000), // 12 phút trước
      },
      {
        id: 'CS-4018',
        type: 'Khiếu nại giao hàng',
        orderId: 'ord_01hqz888def',
        orderCode: 'NX-ORD-8017',
        userId: 'usr_buyer_02',
        customer: 'Quốc Bảo',
        reason: 'Đơn hàng giao chậm',
        priority: 'Trung bình' as const,
        status: 'PENDING' as const,
        createdAt: new Date(now - 46 * 60 * 1000), // 46 phút trước
      },
      {
        id: 'CS-4012',
        type: 'Tranh chấp giao dịch',
        orderId: 'ord_01hqz999ghi',
        orderCode: 'NX-ORD-8009',
        userId: 'usr_buyer_03',
        customer: 'Thu Hà',
        reason: 'Cần xác nhận trạng thái đơn',
        priority: 'Thấp' as const,
        status: 'PENDING' as const,
        createdAt: new Date(now - 2 * 60 * 60 * 1000), // 2 giờ trước
      },
    ];

    for (const item of samples) {
      const sc = new SupportCase(item);
      this.cases.set(sc.id, sc);
    }
  }

  public async findById(id: string): Promise<SupportCase | null> {
    return this.cases.get(id.trim().toUpperCase()) || this.cases.get(id.trim()) || null;
  }

  public async search(criteria: SupportCaseSearchCriteria): Promise<SupportCaseSearchPage> {
    let items = Array.from(this.cases.values());

    if (criteria.userId && criteria.userId.trim()) {
      items = items.filter((c) => c.userId.toLowerCase() === criteria.userId!.trim().toLowerCase());
    }

    if (criteria.status && criteria.status.trim()) {
      items = items.filter((c) => c.status.toLowerCase() === criteria.status!.trim().toLowerCase());
    }

    if (criteria.priority && criteria.priority.trim()) {
      items = items.filter(
        (c) => c.priority.toLowerCase() === criteria.priority!.trim().toLowerCase(),
      );
    }

    // Sắp xếp ưu tiên: Cao trước, sau đó mới nhất lên đầu
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = items.length;
    const page = Math.max(1, criteria.page || 1);
    const limit = Math.max(1, Math.min(100, criteria.limit || 10));
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;

    const pagedItems = items.slice(offset, offset + limit);

    return {
      items: pagedItems,
      total,
      page,
      limit,
      totalPages,
    };
  }

  public async save(caseItem: SupportCase): Promise<void> {
    this.cases.set(caseItem.id, caseItem);
  }
}
