import type { CartLine } from './cart';

const key = 'nexus-checkout-selection-v1';
const buyNowKey = 'nexus-buy-now-line-v1';
const pendingKey = (orderId: string) => `nexus-pending-payos-cart:${orderId}`;

export function writeBuyNowLine(line: CartLine) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(buyNowKey, JSON.stringify(line));
  }
}

export function readBuyNowLine(): CartLine | null {
  if (typeof window === 'undefined') return null;
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(buyNowKey) || 'null');
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as CartLine).productId === 'string' &&
      typeof (parsed as CartLine).title === 'string' &&
      typeof (parsed as CartLine).price === 'number' &&
      typeof (parsed as CartLine).quantity === 'number' &&
      (parsed as CartLine).quantity > 0
    ) {
      return parsed as CartLine;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearBuyNowLine() {
  if (typeof window !== 'undefined') sessionStorage.removeItem(buyNowKey);
}

export function readCheckoutSelection(): string[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(key) || 'null');
    return Array.isArray(value) && value.every((id) => typeof id === 'string') ? value : null;
  } catch {
    return null;
  }
}

export function writeCheckoutSelection(ids: string[]) {
  if (typeof window !== 'undefined') sessionStorage.setItem(key, JSON.stringify(ids));
}

export function clearCheckoutSelection() {
  if (typeof window !== 'undefined') sessionStorage.removeItem(key);
}

export function rememberPendingPayosCart(
  orderId: string,
  lines: { productId: string; cartItemId?: string }[],
) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(
      pendingKey(orderId),
      JSON.stringify(lines.map(({ productId, cartItemId }) => ({ productId, cartItemId }))),
    );
  }
}

export function takePendingPayosCart(
  orderId: string,
): { productId: string; cartItemId?: string }[] {
  if (typeof window === 'undefined') return [];
  const raw = sessionStorage.getItem(pendingKey(orderId));
  if (!raw) return [];
  sessionStorage.removeItem(pendingKey(orderId));
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(
          (line): line is { productId: string; cartItemId?: string } =>
            typeof line?.productId === 'string' &&
            (line.cartItemId === undefined || typeof line.cartItemId === 'string'),
        )
      : [];
  } catch {
    return [];
  }
}
