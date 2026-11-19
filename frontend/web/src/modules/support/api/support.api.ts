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

export type DisputeItem = {
  caseId: string;
  id: string;
  orderId: string;
  order: string;
  orderCode: string;
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
    submittedAt?: string;
  };
  sellerEvidence?: {
    videos?: string[];
    photos?: string[];
    note?: string;
    submittedAt?: string;
  };
  verdict?: {
    decision: 'REFUND_BUYER' | 'REJECT_BUYER' | 'REQUIRE_RETURN_FIRST';
    refundAmount?: number;
    liableParty?: 'SELLER' | 'BUYER' | 'CARRIER';
    note: string;
    arbitratorId?: string;
    issuedAt?: string;
  };
  createdAt: string;
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
      params: { status?: string; page?: number; limit?: number; q?: string } = {},
      signal?: AbortSignal,
    ): Promise<DisputeItem[]> {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== '') q.set(k, String(v));
      }
      const raw = await request<any>(`/support/disputes${q.toString() ? `?${q.toString()}` : ''}`, {
        signal,
      });
      const unwrapped = unwrap<any>(raw);
      if (Array.isArray(unwrapped)) return unwrapped;
      if (Array.isArray(unwrapped?.items)) return unwrapped.items;
      return [];
    },
    async issueVerdict(
      caseId: string,
      payload: {
        decision: 'REFUND_BUYER' | 'REJECT_BUYER' | 'REQUIRE_RETURN_FIRST';
        refundAmount?: number;
        liableParty?: 'SELLER' | 'BUYER' | 'CARRIER';
        note: string;
      },
    ): Promise<DisputeItem> {
      return unwrap<DisputeItem>(
        await request(`/support/disputes/${encodeURIComponent(caseId)}/verdict`, {
          method: 'POST',
          body: payload,
        }),
      );
    },
    async submitSellerEvidence(
      caseIdOrOrderId: string,
      payload: { videos?: string[]; photos?: string[]; note?: string },
    ): Promise<any> {
      try {
        return unwrap<any>(
          await request(`/support/orders/${encodeURIComponent(caseIdOrOrderId)}/dispute-evidence`, {
            method: 'POST',
            body: payload,
          }),
        );
      } catch {
        return unwrap<any>(
          await request(
            `/support/disputes/${encodeURIComponent(caseIdOrOrderId)}/seller-evidence`,
            {
              method: 'POST',
              body: payload,
            },
          ),
        );
      }
    },
  };
}

export const supportApi = createSupportApi(requestApi);
