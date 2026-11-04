import type { CatalogProduct } from '@/modules/catalog/types/product.types';
export type CartLine = {
  productId: string;
  title: string;
  image: string;
  price: number;
  currency: string;
  quantity: number;
  stock: number | null;
};
const key = 'nexus-cart-v1';
export function readCart(): CartLine[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
export function writeCart(lines: CartLine[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(lines));
    window.dispatchEvent(new Event('nexus-cart-change'));
  }
}
export function addCartProduct(product: CatalogProduct) {
  const lines = readCart();
  const found = lines.find((line) => line.productId === product.id);
  if (found) found.quantity = Math.min(found.quantity + 1, product.stockQuantity ?? 99);
  else
    lines.push({
      productId: product.id,
      title: product.title,
      image: product.images[0] || '/images/nexus-product-placeholder.svg',
      price: product.price ?? 0,
      currency: product.currency || 'VND',
      quantity: 1,
      stock: product.stockQuantity,
    });
  writeCart(lines);
}
