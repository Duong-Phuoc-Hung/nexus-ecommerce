import { SupportCase } from '../../domain/entities/SupportCase';
import {
  ISupportCaseRepository,
  SupportCaseSearchCriteria,
  SupportCaseSearchPage,
} from '../../domain/repositories/ISupportCaseRepository';
import { loadSeedSupportCases } from '../seeds/fulfillmentSeedLoader';

export class InMemorySupportCaseRepository implements ISupportCaseRepository {
  private cases: Map<string, SupportCase> = new Map();

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData(): void {
    const samples = loadSeedSupportCases();
    for (const sc of samples) {
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
