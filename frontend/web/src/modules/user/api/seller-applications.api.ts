import { requestApi } from '../../../lib/axios/api-client';
import { unwrap } from '../../../lib/axios/http';
import type {
  AdminSellerApplicationsPageResponse,
  SellerActivationEligibilityResponse,
  SellerActivationResult,
  SellerApplicationAdminDto,
  SellerApplicationBuyerDto,
  SellerApplicationFormInput,
  SellerApplicationMeResponse,
  SellerApplicationStatusSummary,
} from '../types/seller-application.types';

export interface AdminSellerApplicationsQuery {
  q?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
  sortBy?: 'submittedAt' | 'updatedAt' | 'priorityQueue';
  sortOrder?: 'asc' | 'desc';
}

export const sellerApplicationsApi = {
  // Buyer endpoints
  async getMyApplication(): Promise<SellerApplicationMeResponse> {
    const res = await requestApi<unknown>('/seller-applications/me');
    return unwrap<SellerApplicationMeResponse>(res);
  },

  async submitApplication(
    payload: SellerApplicationFormInput,
    idempotencyKey?: string,
  ): Promise<SellerApplicationBuyerDto> {
    const res = await requestApi<unknown>('/seller-applications', {
      method: 'POST',
      body: payload,
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    });
    return unwrap<SellerApplicationBuyerDto>(res);
  },

  async resubmitApplication(
    applicationId: string,
    payload: SellerApplicationFormInput,
    idempotencyKey?: string,
  ): Promise<SellerApplicationBuyerDto> {
    const res = await requestApi<unknown>(
      `/seller-applications/${encodeURIComponent(applicationId)}/resubmit`,
      {
        method: 'POST',
        body: payload,
        headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
      },
    );
    return unwrap<SellerApplicationBuyerDto>(res);
  },

  async withdrawApplication(
    applicationId: string,
    params?: { reason?: string; expectedVersion?: number },
  ): Promise<SellerApplicationBuyerDto> {
    const res = await requestApi<unknown>(
      `/seller-applications/${encodeURIComponent(applicationId)}/withdraw`,
      {
        method: 'POST',
        body: params ?? {},
      },
    );
    return unwrap<SellerApplicationBuyerDto>(res);
  },

  async checkActivationEligibility(
    applicationId: string,
  ): Promise<SellerActivationEligibilityResponse> {
    const res = await requestApi<unknown>(
      `/seller-applications/${encodeURIComponent(applicationId)}/activation-eligibility`,
    );
    return unwrap<SellerActivationEligibilityResponse>(res);
  },

  async activateSeller(
    applicationId: string,
    params: {
      expectedVersion?: number;
      idempotencyKey: string;
    },
  ): Promise<SellerActivationResult> {
    const res = await requestApi<unknown>(
      `/seller-applications/${encodeURIComponent(applicationId)}/activate`,
      {
        method: 'POST',
        body: {
          expectedVersion: params.expectedVersion,
          idempotencyKey: params.idempotencyKey,
        },
        headers: {
          'Idempotency-Key': params.idempotencyKey,
        },
      },
    );
    return unwrap<SellerActivationResult>(res);
  },

  // Admin endpoints
  async listAdminApplications(
    query: AdminSellerApplicationsQuery = {},
  ): Promise<AdminSellerApplicationsPageResponse> {
    const searchParams = new URLSearchParams();
    if (query.q?.trim()) searchParams.set('q', query.q.trim());
    if (query.status && query.status !== 'ALL') searchParams.set('status', query.status);
    if (query.fromDate) searchParams.set('fromDate', query.fromDate);
    if (query.toDate) searchParams.set('toDate', query.toDate);
    if (query.page) searchParams.set('page', String(query.page));
    if (query.limit) searchParams.set('limit', String(query.limit));
    if (query.sortBy) searchParams.set('sortBy', query.sortBy);
    if (query.sortOrder) searchParams.set('sortOrder', query.sortOrder);

    const qs = searchParams.toString();
    const res = await requestApi<{
      success: boolean;
      data: SellerApplicationAdminDto[];
      summary?: SellerApplicationStatusSummary;
      pagination?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    }>(`/admin/seller-applications${qs ? `?${qs}` : ''}`);

    const items = Array.isArray(res?.data) ? res.data : [];
    const summary: SellerApplicationStatusSummary = res?.summary || {
      pendingCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      activatedCount: 0,
      withdrawnCount: 0,
    };
    const pagination = res?.pagination || {
      total: items.length,
      page: query.page || 1,
      limit: query.limit || 20,
      totalPages: 1,
    };

    return { items, summary, pagination };
  },

  async getAdminApplicationDetail(applicationId: string): Promise<SellerApplicationAdminDto> {
    const res = await requestApi<unknown>(
      `/admin/seller-applications/${encodeURIComponent(applicationId)}`,
    );
    return unwrap<SellerApplicationAdminDto>(res);
  },

  async approveApplication(
    applicationId: string,
    params: { expectedVersion?: number; internalNote?: string },
  ): Promise<SellerApplicationAdminDto> {
    const res = await requestApi<unknown>(
      `/admin/seller-applications/${encodeURIComponent(applicationId)}/approve`,
      {
        method: 'POST',
        body: params,
      },
    );
    return unwrap<SellerApplicationAdminDto>(res);
  },

  async rejectApplication(
    applicationId: string,
    params: {
      reason: string;
      internalNote?: string;
      expectedVersion?: number;
    },
  ): Promise<SellerApplicationAdminDto> {
    const res = await requestApi<unknown>(
      `/admin/seller-applications/${encodeURIComponent(applicationId)}/reject`,
      {
        method: 'POST',
        body: {
          reason: params.reason,
          rejectionReason: params.reason,
          internalNote: params.internalNote,
          expectedVersion: params.expectedVersion,
        },
      },
    );
    return unwrap<SellerApplicationAdminDto>(res);
  },

  async revokeApproval(
    applicationId: string,
    params: {
      reason: string;
      internalNote?: string;
      expectedVersion?: number;
    },
  ): Promise<SellerApplicationAdminDto> {
    const res = await requestApi<unknown>(
      `/admin/seller-applications/${encodeURIComponent(applicationId)}/revoke-approval`,
      {
        method: 'POST',
        body: {
          reason: params.reason,
          internalNote: params.internalNote,
          expectedVersion: params.expectedVersion,
        },
      },
    );
    return unwrap<SellerApplicationAdminDto>(res);
  },
};
