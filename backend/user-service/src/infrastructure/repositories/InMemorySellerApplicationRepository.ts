import {
  SellerApplication,
  SellerApplicationDecisionRecord,
  SellerApplicationShopSnapshot,
  SellerApplicationStatus,
  SellerApplicationVersionRecord,
} from '../../domain/entities/SellerApplication';
import {
  ISellerApplicationRepository,
  SellerApplicationSearchCriteria,
  SellerApplicationSearchPage,
  SellerApplicationStatusSummary,
} from '../../domain/repositories/ISellerApplicationRepository';

const STATUS_PRIORITY: Record<SellerApplicationStatus, number> = {
  [SellerApplicationStatus.PENDING]: 0,
  [SellerApplicationStatus.APPROVED]: 1,
  [SellerApplicationStatus.REJECTED]: 2,
  [SellerApplicationStatus.WITHDRAWN]: 3,
  [SellerApplicationStatus.ACTIVATED]: 4,
};

function cloneSnapshot(snapshot: SellerApplicationShopSnapshot): SellerApplicationShopSnapshot {
  return {
    ...snapshot,
    pickupAddress: { ...snapshot.pickupAddress },
    categoryIds: [...snapshot.categoryIds],
    categoryNames: [...snapshot.categoryNames],
  };
}

function cloneApplication(app: SellerApplication): SellerApplication {
  const snapshot = cloneSnapshot(app.snapshot);

  const versions: SellerApplicationVersionRecord[] = app.versions.map((v) => ({
    version: v.version,
    submittedAt: v.submittedAt,
    snapshot: cloneSnapshot(v.snapshot),
  }));

  const decisionHistory: SellerApplicationDecisionRecord[] = app.decisionHistory.map((d) => ({
    ...d,
  }));

  return new SellerApplication({
    id: app.id,
    applicantId: app.applicantId,
    applicantName: app.applicantName,
    applicantEmail: app.applicantEmail,
    status: app.status,
    version: app.version,
    snapshot,
    rejectionReason: app.rejectionReason,
    submittedAt: new Date(app.submittedAt.getTime()),
    reviewedAt: app.reviewedAt ? new Date(app.reviewedAt.getTime()) : null,
    reviewedBy: app.reviewedBy,
    activatedAt: app.activatedAt ? new Date(app.activatedAt.getTime()) : null,
    versions,
    decisionHistory,
    createdAt: new Date(app.createdAt.getTime()),
    updatedAt: new Date(app.updatedAt.getTime()),
  });
}

export class InMemorySellerApplicationRepository implements ISellerApplicationRepository {
  private applications: Map<string, SellerApplication> = new Map();
  private idempotencyStore: Map<string, unknown> = new Map();
  private activationLocks: Map<string, number> = new Map();

  async findById(id: string): Promise<SellerApplication | null> {
    const found = this.applications.get(id);
    return found ? cloneApplication(found) : null;
  }

  async findLatestByApplicantId(applicantId: string): Promise<SellerApplication | null> {
    const matches = Array.from(this.applications.values()).filter(
      (app) => app.applicantId === applicantId,
    );
    if (matches.length === 0) return null;
    matches.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return cloneApplication(matches[0]);
  }

  async search(criteria: SellerApplicationSearchCriteria): Promise<SellerApplicationSearchPage> {
    const page = Math.max(1, Number(criteria.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(criteria.limit) || 20));
    const q = criteria.q?.trim().toLowerCase() || '';
    const statusFilter =
      criteria.status && criteria.status !== 'ALL' ? String(criteria.status).toUpperCase() : '';

    const fromTime = criteria.fromDate ? Date.parse(criteria.fromDate) : NaN;
    const toTime = criteria.toDate ? Date.parse(criteria.toDate) : NaN;

    const allApps = Array.from(this.applications.values());

    const summary: SellerApplicationStatusSummary = {
      pendingCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      activatedCount: 0,
      withdrawnCount: 0,
    };

    for (const app of allApps) {
      if (app.status === SellerApplicationStatus.PENDING) summary.pendingCount += 1;
      else if (app.status === SellerApplicationStatus.APPROVED) summary.approvedCount += 1;
      else if (app.status === SellerApplicationStatus.REJECTED) summary.rejectedCount += 1;
      else if (app.status === SellerApplicationStatus.ACTIVATED) summary.activatedCount += 1;
      else if (app.status === SellerApplicationStatus.WITHDRAWN) summary.withdrawnCount += 1;
    }

    const filtered = allApps.filter((app) => {
      if (statusFilter && app.status !== statusFilter) {
        return false;
      }

      if (q) {
        const haystacks = [
          app.id,
          app.applicantName,
          app.applicantEmail,
          app.snapshot.shopName,
          app.snapshot.contactName,
          app.snapshot.contactPhone,
        ]
          .filter(Boolean)
          .map((item) => item.toLowerCase());

        const matched = haystacks.some((item) => item.includes(q));
        if (!matched) return false;
      }

      const submittedMs = app.submittedAt.getTime();
      if (!Number.isNaN(fromTime) && submittedMs < fromTime) {
        return false;
      }
      if (!Number.isNaN(toTime)) {
        const inclusiveEnd = toTime + 24 * 60 * 60 * 1000 - 1;
        if (submittedMs > inclusiveEnd) {
          return false;
        }
      }

      return true;
    });

    const sortBy = criteria.sortBy || 'priorityQueue';
    const sortOrder = criteria.sortOrder || 'asc';

    filtered.sort((a, b) => {
      if (sortBy === 'priorityQueue') {
        const priorityDiff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
        if (priorityDiff !== 0) return priorityDiff;
        if (
          a.status === SellerApplicationStatus.PENDING ||
          a.status === SellerApplicationStatus.APPROVED
        ) {
          return a.submittedAt.getTime() - b.submittedAt.getTime();
        }
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      }

      const fieldA = sortBy === 'submittedAt' ? a.submittedAt.getTime() : a.updatedAt.getTime();
      const fieldB = sortBy === 'submittedAt' ? b.submittedAt.getTime() : b.updatedAt.getTime();
      return sortOrder === 'desc' ? fieldB - fieldA : fieldA - fieldB;
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const offset = (page - 1) * limit;
    const paged = filtered.slice(offset, offset + limit).map(cloneApplication);

    return {
      applications: paged,
      total,
      page,
      limit,
      totalPages,
      summary,
    };
  }

  async save(application: SellerApplication): Promise<void> {
    this.applications.set(application.id, cloneApplication(application));
  }

  async updateWithVersion(
    application: SellerApplication,
    expectedVersion: number,
  ): Promise<boolean> {
    const existing = this.applications.get(application.id);
    if (!existing) return false;
    if (existing.version !== expectedVersion) {
      return false;
    }
    this.applications.set(application.id, cloneApplication(application));
    return true;
  }

  async getIdempotentResult<T = unknown>(key: string): Promise<T | null> {
    if (!this.idempotencyStore.has(key)) return null;
    return this.idempotencyStore.get(key) as T;
  }

  async saveIdempotentResult<T = unknown>(key: string, result: T): Promise<void> {
    this.idempotencyStore.set(key, result);
  }

  async acquireActivationLock(userId: string, ttlMs: number = 15000): Promise<boolean> {
    const now = Date.now();
    const existingExpiry = this.activationLocks.get(userId);
    if (existingExpiry && existingExpiry > now) {
      return false;
    }
    this.activationLocks.set(userId, now + ttlMs);
    return true;
  }

  async releaseActivationLock(userId: string): Promise<void> {
    this.activationLocks.delete(userId);
  }

  async isInActivationWindow(userId: string): Promise<boolean> {
    const now = Date.now();
    const expiry = this.activationLocks.get(userId);
    if (!expiry) return false;
    if (expiry <= now) {
      this.activationLocks.delete(userId);
      return false;
    }
    return true;
  }

  clear(): void {
    this.applications.clear();
    this.idempotencyStore.clear();
    this.activationLocks.clear();
  }
}
