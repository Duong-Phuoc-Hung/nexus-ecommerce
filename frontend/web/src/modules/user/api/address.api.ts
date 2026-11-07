import { requestApi } from '@/lib/axios/api-client';
import { unwrap, type RequestApi } from '@/lib/axios/http';

export type BackendAddress = {
  id: string;
  userId: string;
  label?: string;
  recipientName: string;
  phone: string;
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
  street: string;
  note?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateAddressInput = {
  label?: string;
  recipientName: string;
  phone: string;
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
  street: string;
  note?: string;
  isDefault?: boolean;
};

export type UpdateAddressInput = Partial<CreateAddressInput>;

export function createAddressApi(request: RequestApi) {
  return {
    async list(signal?: AbortSignal): Promise<BackendAddress[]> {
      const raw = await request('/users/me/addresses', { signal });
      const items = unwrap<BackendAddress[]>(raw);
      return Array.isArray(items) ? items : [];
    },

    async create(input: CreateAddressInput): Promise<BackendAddress> {
      return unwrap<BackendAddress>(
        await request('/users/me/addresses', {
          method: 'POST',
          body: input,
        }),
      );
    },

    async update(id: string, input: UpdateAddressInput): Promise<BackendAddress> {
      return unwrap<BackendAddress>(
        await request(`/users/me/addresses/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: input,
        }),
      );
    },

    async remove(id: string): Promise<{ success: boolean; message?: string }> {
      return unwrap<{ success: boolean; message?: string }>(
        await request(`/users/me/addresses/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        }),
      );
    },

    async setDefault(id: string): Promise<BackendAddress> {
      return unwrap<BackendAddress>(
        await request(`/users/me/addresses/${encodeURIComponent(id)}/default`, {
          method: 'PUT',
        }),
      );
    },
  };
}

export const addressApi = createAddressApi(requestApi);
