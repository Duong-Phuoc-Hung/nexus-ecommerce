import { SellerApplication, SellerApplicationStatus } from '../entities/SellerApplication';

export interface SellerApplicationSearchCriteria {
  q?: string;
  status?: SellerApplicationStatus | string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
  sortBy?: 'submittedAt' | 'updatedAt' | 'priorityQueue';
  sortOrder?: 'asc' | 'desc';
}

export interface SellerApplicationStatusSummary {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  activatedCount: number;
  withdrawnCount: number;
}

export interface SellerApplicationSearchPage {
  applications: SellerApplication[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: SellerApplicationStatusSummary;
}

export interface ISellerApplicationRepository {
  findById(id: string): Promise<SellerApplication | null>;
  findLatestByApplicantId(applicantId: string): Promise<SellerApplication | null>;
  search(criteria: SellerApplicationSearchCriteria): Promise<SellerApplicationSearchPage>;
  save(application: SellerApplication): Promise<void>;
  updateWithVersion(application: SellerApplication, expectedVersion: number): Promise<boolean>;
  getIdempotentResult<T = unknown>(key: string): Promise<T | null>;
  saveIdempotentResult<T = unknown>(key: string, result: T): Promise<void>;
  acquireActivationLock(userId: string, ttlMs?: number): Promise<boolean>;
  releaseActivationLock(userId: string): Promise<void>;
  isInActivationWindow(userId: string): Promise<boolean>;
}
