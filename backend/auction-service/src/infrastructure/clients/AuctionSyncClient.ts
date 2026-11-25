import { maskBidderAlias } from '../../application/use-cases/GetAuctionDetailUseCase';
import { buildServiceAuthHeader } from '../security/internal-service-auth';

export interface SyncedOrderStatus {
  orderId: string;
  orderCode: string;
  auctionId: string | null;
  orderStatus: string;
  paymentStatus: 'PAID' | 'PENDING' | 'TIMEOUT';
  noOrder?: boolean;
  checkoutUrl: string | null;
  paidAt: string | null;
}

const nameCache = new Map<string, { fullName: string | null; expiresAt: number }>();
const NAME_TTL_MS = 10 * 60 * 1000;

export function maskDisplayName(fullName?: string | null, fallbackId?: string): string {
  const clean = String(fullName || '').trim();
  if (!clean) return maskBidderAlias(fallbackId || '');
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    const first = parts[0];
    return first.length <= 2 ? `${first[0]}***` : `${first.slice(0, 2)}***`;
  }
  const surname = parts[0];
  const nextInitial = parts[1][0] || '';
  return `${surname} ${nextInitial}***`;
}

export async function resolveUserFullName(userId?: string | null): Promise<string | null> {
  const id = String(userId || '').trim();
  if (!id || process.env.NODE_ENV === 'test') return null;

  const cached = nameCache.get(id);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.fullName;
  }

  const userServiceUrl = (
    process.env.USER_SERVICE_URL || `http://127.0.0.1:${process.env.USER_SERVICE_PORT || 4001}`
  ).replace('http://localhost:', 'http://127.0.0.1:');

  try {
    const res = await fetch(`${userServiceUrl}/api/v1/users/${encodeURIComponent(id)}`, {
      headers: buildServiceAuthHeader({
        issuer: 'auction-service',
        audience: 'user-service',
        scope: 'user:display-name:read',
        resource: id,
      }),
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) {
      const json = (await res.json()) as any;
      const fullName =
        typeof json?.data?.fullName === 'string' && json.data.fullName.trim()
          ? json.data.fullName.trim()
          : typeof json?.data?.name === 'string' && json.data.name.trim()
            ? json.data.name.trim()
            : null;
      nameCache.set(id, { fullName, expiresAt: Date.now() + NAME_TTL_MS });
      return fullName;
    }
  } catch {
    // Non-blocking lookup
  }

  nameCache.set(id, { fullName: null, expiresAt: Date.now() + 60_000 });
  return null;
}

const pendingSync = new Map<string, Promise<SyncedOrderStatus | null>>();
export function syncAuctionOrderStatus(key: string): Promise<SyncedOrderStatus | null> {
  const pending = pendingSync.get(key);
  if (pending) return pending;
  const operation = fetchAuctionOrderStatus(key).finally(() => pendingSync.delete(key));
  pendingSync.set(key, operation);
  return operation;
}

async function fetchAuctionOrderStatus(
  orderIdOrAuctionId: string,
): Promise<SyncedOrderStatus | null> {
  const key = String(orderIdOrAuctionId || '').trim();
  if (!key || process.env.NODE_ENV === 'test') return null;

  const commerceUrl = (
    process.env.COMMERCE_SERVICE_URL ||
    `http://127.0.0.1:${process.env.COMMERCE_SERVICE_PORT || 4003}`
  ).replace('http://localhost:', 'http://127.0.0.1:');

  try {
    const res = await fetch(
      `${commerceUrl}/api/v1/orders/internal/auction-status/${encodeURIComponent(key)}`,
      {
        headers: buildServiceAuthHeader({
          issuer: 'auction-service',
          audience: 'commerce-service',
          scope: 'order:auction:status:read',
          resource: key,
        }),
        signal: AbortSignal.timeout(3500),
      },
    );
    if (
      res.status === 404 &&
      ((await res.json().catch(() => null)) as { code?: string } | null)?.code ===
        'AUCTION_ORDER_NOT_FOUND'
    )
      return {
        orderId: '',
        orderCode: '',
        auctionId: key,
        orderStatus: 'NOT_FOUND',
        paymentStatus: 'PENDING',
        checkoutUrl: null,
        paidAt: null,
        noOrder: true,
      };
    if (!res.ok) return null;
    const json = (await res.json()) as any;
    if (json?.success && json.data) {
      return json.data as SyncedOrderStatus;
    }
  } catch {
    // Non-blocking sync
  }
  return null;
}

export async function recordAuctionReputationEvent(params: {
  userId: string;
  ruleCode: 'AUCTION_PAYMENT_TIMEOUT' | 'AUCTION_PAID_ON_TIME';
  auctionId: string;
  reason: string;
}): Promise<boolean> {
  const userId = String(params.userId || '').trim();
  const auctionId = String(params.auctionId || '').trim();
  if (!userId || !auctionId || process.env.NODE_ENV === 'test') return false;

  const userServiceUrl = (
    process.env.USER_SERVICE_URL || `http://127.0.0.1:${process.env.USER_SERVICE_PORT || 4001}`
  ).replace('http://localhost:', 'http://127.0.0.1:');

  try {
    const res = await fetch(
      `${userServiceUrl}/api/v1/users/${encodeURIComponent(userId)}/reputation/events`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildServiceAuthHeader({
            issuer: 'auction-service',
            audience: 'user-service',
            scope: 'user:reputation:event:record',
            resource: userId,
          }),
        },
        body: JSON.stringify({
          ruleCode: params.ruleCode,
          sourceId: `auction:${auctionId}`,
          reason: params.reason,
        }),
        signal: AbortSignal.timeout(3000),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function dispatchAuctionTimeoutNotification(params: {
  recipientId: string;
  auctionId: string;
  auctionTitle: string;
  winningAmount: number;
}): Promise<boolean> {
  const recipientId = String(params.recipientId || '').trim();
  const auctionId = String(params.auctionId || '').trim();
  if (!recipientId || !auctionId || process.env.NODE_ENV === 'test') return false;

  const notifUrl = (
    process.env.NOTIFICATION_SERVICE_URL ||
    `http://127.0.0.1:${process.env.NOTIFICATION_SERVICE_PORT || 4006}`
  ).replace('http://localhost:', 'http://127.0.0.1:');

  try {
    const idemKey = `auction-timeout:${auctionId}:${recipientId}`;
    const formattedPrice = new Intl.NumberFormat('vi-VN').format(
      Math.round(params.winningAmount || 0),
    );
    const res = await fetch(`${notifUrl}/api/v1/notifications/internal/dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...buildServiceAuthHeader({
          issuer: 'auction-service',
          audience: 'notification-service',
          scope: 'notification:dispatch',
          resource: recipientId,
        }),
        'Idempotency-Key': idemKey,
      },
      body: JSON.stringify({
        idempotencyKey: idemKey,
        recipientId,
        channel: 'IN_APP',
        category: 'AUCTION',
        title: 'Quá hạn thanh toán phiên đấu giá thắng cuộc',
        body: `Phiên "${params.auctionTitle}" (${formattedPrice} ₫) đã quá hạn thanh toán 24 giờ. Quyền mua đã đóng và hệ thống áp dụng trừ 10 điểm uy tín theo quy định.`,
        href: `/auctions/${encodeURIComponent(auctionId)}`,
      }),
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
