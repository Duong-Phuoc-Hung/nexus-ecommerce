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

export function createSupportApi(request: RequestApi) {
  return {
    async dashboard(signal?: AbortSignal): Promise<SupportSummary> {
      return unwrap<SupportSummary>(await request('/support/dashboard/summary', { signal }));
    },
  };
}

export const supportApi = createSupportApi(requestApi);
