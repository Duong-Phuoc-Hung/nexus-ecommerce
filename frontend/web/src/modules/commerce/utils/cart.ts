import type { CatalogProduct } from '@/modules/catalog/types/product.types';
import { cartApi, type ServerCart } from '../api/cart.api';

export type CartLine = {
  productId: string;
  cartItemId?: string;
  title: string;
  image: string;
  price: number;
  currency: string;
  quantity: number;
  stock: number | null;
};

const key = 'nexus-cart-v1';

export function fromServerCart(serverCart: ServerCart): CartLine[] {
  return serverCart.items.map((item) => ({
    productId: item.productId,
    cartItemId: item.id,
    title: item.title,
    image: item.imageUrl || '/images/nexus-product-placeholder.svg',
    price: item.price,
    currency: serverCart.currency || 'VND',
    quantity: item.quantity,
    stock: item.stockQuantity ?? null,
  }));
}

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

export async function syncCartFromServer(): Promise<CartLine[]> {
  try {
    const serverCart = await cartApi.getCart();
    if (serverCart && Array.isArray(serverCart.items)) {
      const lines = fromServerCart(serverCart);
      writeCart(lines);
      return lines;
    }
  } catch {
    // Nếu chưa đăng nhập hoặc endpoint cart chưa chạy ở backend, dùng giỏ local
  }
  return readCart();
}

export async function addCartProductAsync(product: CatalogProduct, quantity: number = 1) {
  // Thử thêm vào server nếu có phiên Buyer
  try {
    const serverCart = await cartApi.addItem({
      productId: product.id,
      quantity,
    });
    if (serverCart && Array.isArray(serverCart.items)) {
      const lines = fromServerCart(serverCart);
      writeCart(lines);
      return;
    }
  } catch {
    // Fallback vào giỏ local
  }

  addCartProduct(product);
}

export function addCartProduct(product: CatalogProduct) {
  const lines = readCart();
  const found = lines.find((line) => line.productId === product.id);
  if (found) {
    found.quantity = Math.min(found.quantity + 1, product.stockQuantity ?? 99);
  } else {
    lines.push({
      productId: product.id,
      title: product.title,
      image: product.images[0] || '/images/nexus-product-placeholder.svg',
      price: product.price ?? 0,
      currency: product.currency || 'VND',
      quantity: 1,
      stock: product.stockQuantity,
    });
  }
  writeCart(lines);
}
