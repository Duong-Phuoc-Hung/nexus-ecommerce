import { requestApi } from '@/lib/axios/api-client';
import { unwrap } from '@/lib/axios/http';

export type FavoriteProduct = {
  id: string;
  name: string;
  image: string;
  price: number;
  href: string;
  saleType?: 'FIXED_PRICE' | 'AUCTION' | 'UNKNOWN';
};

const key = 'nexus-favorites-v1';
export const FAVORITES_EVENT = 'nexus-favorites-change';

function hasAuthToken(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.localStorage.getItem('nexus.accessToken'));
}

export function readFavorites(): FavoriteProduct[] {
  if (typeof window === 'undefined') return [];
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value)
      ? value.filter(
          (item): item is FavoriteProduct =>
            item &&
            typeof item.id === 'string' &&
            typeof item.name === 'string' &&
            typeof item.image === 'string' &&
            typeof item.price === 'number' &&
            typeof item.href === 'string',
        )
      : [];
  } catch {
    return [];
  }
}

function writeFavorites(items: FavoriteProduct[]) {
  if (typeof window === 'undefined') return;
  const serialized = JSON.stringify(items);
  if (localStorage.getItem(key) === serialized) return;
  localStorage.setItem(key, serialized);
  window.dispatchEvent(new Event(FAVORITES_EVENT));
}

export async function syncFavoritesFromApi(): Promise<FavoriteProduct[]> {
  if (!hasAuthToken()) return readFavorites();
  try {
    const raw = await requestApi('/favorites');
    const data = unwrap<unknown>(raw);
    if (!Array.isArray(data)) return readFavorites();
    const mapped: FavoriteProduct[] = (data as Array<Record<string, unknown>>)
      .map((item): FavoriteProduct | null => {
        const id =
          typeof item.id === 'string' || typeof item.id === 'number' ? String(item.id) : '';
        const name = String(item.title ?? item.name ?? '').trim();
        if (!id || !name) return null;
        const images = Array.isArray(item.images) ? item.images : [];
        const firstImg = images[0];
        const image =
          typeof firstImg === 'string'
            ? firstImg
            : firstImg && typeof firstImg === 'object'
              ? String(
                  (firstImg as Record<string, unknown>).url ??
                    (firstImg as Record<string, unknown>).imageUrl ??
                    '',
                )
              : typeof item.imageUrl === 'string'
                ? item.imageUrl
                : '/images/nexus-product-placeholder.svg';
        const price = Number(item.basePrice ?? item.price ?? 0);
        const saleTypeRaw = String(
          item.saleType ?? (item.allowAuction ? 'AUCTION' : 'FIXED_PRICE'),
        ).toUpperCase();
        const saleType: FavoriteProduct['saleType'] =
          saleTypeRaw === 'AUCTION'
            ? 'AUCTION'
            : saleTypeRaw === 'FIXED_PRICE'
              ? 'FIXED_PRICE'
              : 'UNKNOWN';
        return {
          id,
          name,
          image: image || '/images/nexus-product-placeholder.svg',
          price: Number.isFinite(price) ? price : 0,
          href: `/products/${encodeURIComponent(id)}`,
          saleType,
        };
      })
      .filter((x): x is FavoriteProduct => x !== null);
    writeFavorites(mapped);
    return mapped;
  } catch {
    return readFavorites();
  }
}

export function hasFavorite(id: string) {
  return readFavorites().some((item) => item.id === id);
}

export function toggleFavorite(product: FavoriteProduct) {
  const items = readFavorites();
  const existed = items.some((item) => item.id === product.id);
  const next = existed ? items.filter((item) => item.id !== product.id) : [product, ...items];
  writeFavorites(next);
  if (hasAuthToken()) {
    void requestApi(`/favorites/${encodeURIComponent(product.id)}`, {
      method: 'POST',
    }).catch(() => {
      // Keep local optimistic state if backend rejects (e.g. non-catalog auction id)
    });
  }
  return !existed;
}

export function removeFavorite(id: string) {
  const existed = readFavorites().some((item) => item.id === id);
  writeFavorites(readFavorites().filter((item) => item.id !== id));
  if (existed && hasAuthToken()) {
    void requestApi(`/favorites/${encodeURIComponent(id)}`, {
      method: 'POST',
    }).catch(() => {});
  }
}
