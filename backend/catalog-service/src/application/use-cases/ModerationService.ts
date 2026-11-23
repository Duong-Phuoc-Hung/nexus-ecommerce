export const caseStatuses = ['PENDING', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED'] as const;
export const caseTypes = ['NEW_PRODUCT', 'REPORTED_PRODUCT', 'REPORTED_REVIEW'] as const;
export const decisions = ['APPROVE', 'REQUEST_CHANGES', 'REJECT'] as const;
export const violations = [
  'PROHIBITED_ITEM',
  'MISLEADING_DESCRIPTION',
  'COPYRIGHT',
  'SUSPECTED_FRAUD',
  'OTHER',
] as const;

export type CaseStatus = (typeof caseStatuses)[number];
export type CaseType = (typeof caseTypes)[number];
type Decision = (typeof decisions)[number];

export class ModerationError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export interface QueueFilters {
  status?: CaseStatus;
  type?: CaseType;
  q: string;
  page: number;
  limit: number;
}

export interface ModerationDecision {
  actorId: string;
  productId: string;
  caseId?: string;
  decision: Decision;
  reason: string | null;
  violationCategory: string | null;
}

export interface ModerationRepository {
  list(filters: QueueFilters): Promise<{ items: unknown[]; total: number }>;
  detail(caseId: string): Promise<unknown>;
  sellerStatus(productId: string, actorId: string): Promise<unknown>;
  report(input: {
    actorId: string;
    productId: string;
    reviewId?: string;
    reason: string;
  }): Promise<unknown>;
  resubmit(productId: string, sellerId: string): Promise<unknown>;
  decide(input: ModerationDecision): Promise<unknown>;
}

function invalid(field: string): never {
  throw new ModerationError(400, 'VALIDATION_ERROR', `Trường ${field} không hợp lệ.`);
}

function body(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid('body');
  return value as Record<string, unknown>;
}

function string(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== 'string') return invalid(field);
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) return invalid(field);
  return trimmed;
}

function key(value: unknown, field: string): string {
  const result = string(value, field, 1, 36);
  if (!/^[\w-]+$/.test(result)) return invalid(field);
  return result;
}

function pageNumber(value: unknown, field: string, fallback: number, max: number): number {
  if (value === undefined) return fallback;
  if (
    typeof value !== 'string' ||
    !/^\d+$/.test(value) ||
    Number(value) < 1 ||
    Number(value) > max
  ) {
    return invalid(field);
  }
  return Number(value);
}

export class ModerationService {
  constructor(private readonly repository: ModerationRepository) {}

  async list(query: Record<string, unknown>) {
    const status = caseStatuses.find((value) => value === query.status);
    const type = caseTypes.find((value) => value === query.type);
    if (query.status && !status) return invalid('status');
    if (query.type && !type) return invalid('type');
    const q = query.q === undefined ? '' : string(query.q, 'q', 0, 200);
    const page = pageNumber(query.page, 'page', 1, 1_000_000);
    const limit = pageNumber(query.limit, 'limit', 20, 100);
    const { items, total } = await this.repository.list({ status, type, q, page, limit });
    return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  detail(caseId: unknown) {
    return this.repository.detail(key(caseId, 'caseId'));
  }

  report(productId: unknown, reviewId: unknown, actorId: string, value: unknown) {
    return this.repository.report({
      productId: key(productId, 'productId'),
      reviewId: reviewId === undefined ? undefined : key(reviewId, 'reviewId'),
      actorId,
      reason: string(body(value).reason, 'reason', 10, 500),
    });
  }

  sellerStatus(productId: unknown, actorId: string) {
    return this.repository.sellerStatus(key(productId, 'productId'), actorId);
  }

  resubmit(productId: unknown, actorId: string) {
    return this.repository.resubmit(key(productId, 'productId'), actorId);
  }

  decide(productId: unknown, actorId: string, value: unknown) {
    const input = body(value);
    const decision = decisions.find((value) => value === input.decision);
    if (!decision) return invalid('decision');
    const reason =
      input.reason == null && decision === 'APPROVE'
        ? null
        : string(input.reason, 'reason', decision === 'APPROVE' ? 0 : 10, 500) || null;
    const violationCategory = violations.find((value) => value === input.violationCategory) ?? null;
    if ((decision === 'REJECT' || input.violationCategory != null) && !violationCategory) {
      return invalid('violationCategory');
    }
    return this.repository.decide({
      productId: key(productId, 'productId'),
      actorId,
      decision,
      reason,
      violationCategory,
      caseId: input.caseId === undefined ? undefined : key(input.caseId, 'caseId'),
    });
  }
}
