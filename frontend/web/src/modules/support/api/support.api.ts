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
  };
}

export const supportApi = createSupportApi(requestApi);
