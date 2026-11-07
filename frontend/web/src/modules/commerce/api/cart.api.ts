import { requestApi } from '@/lib/axios/api-client';
import { unwrap, type RequestApi } from '@/lib/axios/http';

export type ServerCartItem = {
  id: string; // cart item id
  productId: string;
  title: string;
  sellerId?: string;
  price: number;
  quantity: number;
  stockQuantity?: number;
  status?: string;
  imageUrl?: string | null;
  subtotal?: number;
};

export type ServerCart = {
  id: string;
  totalItems: number;
  subtotal: number;
  currency: string;
  items: ServerCartItem[];
};

export function createCartApi(request: RequestApi) {
  return {
    async getCart(signal?: AbortSignal): Promise<ServerCart> {
      const raw = await request('/cart', { signal });
      return unwrap<ServerCart>(raw);
    },

    async addItem(input: { productId: string; quantity: number }): Promise<ServerCart> {
      return unwrap<ServerCart>(
        await request('/cart/items', {
          method: 'POST',
          body: input,
        }),
      );
    },

    async updateItem(cartItemId: string, quantity: number): Promise<ServerCart> {
      return unwrap<ServerCart>(
        await request(`/cart/items/${encodeURIComponent(cartItemId)}`, {
          method: 'PUT',
          body: { quantity },
        }),
      );
    },

    async removeItem(cartItemId: string): Promise<ServerCart> {
      return unwrap<ServerCart>(
        await request(`/cart/items/${encodeURIComponent(cartItemId)}`, {
          method: 'DELETE',
        }),
      );
    },

    async clearCart(): Promise<{ success: boolean }> {
      return unwrap<{ success: boolean }>(
        await request('/cart', {
          method: 'DELETE',
        }),
      );
    },
  };
}

export const cartApi = createCartApi(requestApi);
