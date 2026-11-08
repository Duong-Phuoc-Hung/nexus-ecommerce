import { requestApi } from '@/lib/axios/api-client';
import { unwrap, type RequestApi } from '@/lib/axios/http';

export type SupportCase = {
  id: string;
  type: string;
  order: string;
  orderId: string;
  customer: string;
  reason: string;
  priority: string;
  age: string;
  status: string;
};
export type SupportSummary = {
  pendingCases: number;
  processingCases: number;
  resolvedToday: number;
  flaggedShipments: number;
  metrics: {
    highPriorityCount: number;
    nearOverdueCount: number;
    averageHandlingTimeMinutes: number;
    updatedTodayCount: number;
  };
  recentCases: SupportCase[];
};

export type SupportCaseFilter = {
  userId?: string;
  status?: string;
  priority?: string;
  page?: number;
  limit?: number;
};

export type DisputeCase = {
  caseId: string;
  id: string;
  orderId: string;
  orderCode: string;
  order: string;
  customer: string;
  userId: string;
  type: string;
  reason: string;
  priority: string;
  status: string;
  slaDeadline: string;
  slaRemainingHours: number;
  isSlaOverdue: boolean;
  buyerEvidence?: {
    photos?: string[];
    note?: string;
  };
  sellerEvidence?: {
    photos?: string[];
    note?: string;
    trackingCode?: string;
  };
};

export type DisputeFilter = {
  status?: string;
  page?: number;
  limit?: number;
  q?: string;
};

export type DisputeVerdictPayload = {
  decision: 'REFUND_BUYER' | 'REJECT_BUYER' | 'REQUIRE_RETURN_FIRST';
  refundAmount?: number;
  liableParty?: 'SELLER' | 'BUYER' | 'CARRIER' | 'PLATFORM';
  note: string;
};

export function createSupportApi(request: RequestApi) {
  return {
    async dashboard(signal?: AbortSignal): Promise<SupportSummary> {
      return unwrap<SupportSummary>(await request('/support/dashboard/summary', { signal }));
    },
    async listCases(params: SupportCaseFilter = {}, signal?: AbortSignal): Promise<SupportCase[]> {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== '') q.set(k, String(v));
      }
      const raw = await request<{ success: boolean; data: SupportCase[] }>(
        `/support/cases${q.toString() ? `?${q.toString()}` : ''}`,
        { signal },
      );
      return unwrap<SupportCase[]>(raw);
    },
    async resolveCase(
      id: string,
      payload: { resolution: 'APPROVED' | 'REJECTED' | 'ESCALATED'; note: string },
    ): Promise<{ id: string; status: string; resolutionNote?: string }> {
      return unwrap<{ id: string; status: string; resolutionNote?: string }>(
        await request(`/support/cases/${encodeURIComponent(id)}/resolve`, {
          method: 'POST',
          body: payload,
        }),
      );
    },
    async listDisputes(
      params: DisputeFilter = {},
      signal?: AbortSignal,
    ): Promise<{
      items: DisputeCase[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }> {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== '') q.set(k, String(v));
      }
      const raw = await request<{
        success: boolean;
        data: DisputeCase[];
        pagination?: { total: number; page: number; limit: number; totalPages: number };
      }>(`/support/disputes${q.toString() ? `?${q.toString()}` : ''}`, { signal });

      const items = unwrap<DisputeCase[]>(raw);
      const pagination = raw.pagination || {
        total: Array.isArray(items) ? items.length : 0,
        page: params.page || 1,
        limit: params.limit || 10,
        totalPages: 1,
      };

      return {
        items: Array.isArray(items) ? items : [],
        pagination,
      };
    },
    async issueVerdict(
      caseId: string,
      payload: DisputeVerdictPayload,
    ): Promise<{ caseId: string; status: string; decision: string }> {
      return unwrap<{ caseId: string; status: string; decision: string }>(
        await request(`/support/disputes/${encodeURIComponent(caseId)}/verdict`, {
          method: 'POST',
          body: payload,
        }),
      );
    },
  };
}

export const supportApi = createSupportApi(requestApi);
