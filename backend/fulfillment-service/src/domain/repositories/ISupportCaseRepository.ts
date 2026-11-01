import { SupportCase } from '../entities/SupportCase';

export interface SupportCaseSearchCriteria {
  userId?: string;
  status?: string;
  priority?: string;
  page?: number;
  limit?: number;
}

export interface SupportCaseSearchPage {
  items: SupportCase[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ISupportCaseRepository {
  findById(id: string): Promise<SupportCase | null>;
  search(criteria: SupportCaseSearchCriteria): Promise<SupportCaseSearchPage>;
  save(caseItem: SupportCase): Promise<void>;
}
