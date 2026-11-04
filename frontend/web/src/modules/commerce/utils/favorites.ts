export type FavoriteProduct = {
  id: string;
  name: string;
  image: string;
  price: number;
  href: string;
};

const key = 'nexus-favorites-v1';
export const FAVORITES_EVENT = 'nexus-favorites-change';

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
  localStorage.setItem(key, JSON.stringify(items));
  window.dispatchEvent(new Event(FAVORITES_EVENT));
}

export function hasFavorite(id: string) {
  return readFavorites().some((item) => item.id === id);
}

export function toggleFavorite(product: FavoriteProduct) {
  const items = readFavorites();
  const next = items.some((item) => item.id === product.id)
    ? items.filter((item) => item.id !== product.id)
    : [product, ...items];
  writeFavorites(next);
  return next.some((item) => item.id === product.id);
}

export function removeFavorite(id: string) {
  writeFavorites(readFavorites().filter((item) => item.id !== id));
}
