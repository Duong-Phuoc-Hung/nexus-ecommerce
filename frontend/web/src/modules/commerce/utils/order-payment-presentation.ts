import { getOrderStatusBadgeClass } from './order-status';
import type { OrderDetail, OrderSummary } from '../types/order.types';

export type PaymentMethodKind = 'PAYOS' | 'COD' | 'UNKNOWN';
export type MoneyStatusTone = 'info' | 'danger' | 'success' | 'neutral';

export interface LivePaymentStatusSnapshot {
  orderStatus?: string;
  paymentStatus?: string;
  paymentMethod?: string | null;
  amount?: number | null;
  amountDue?: number | null;
  checkoutUrl?: string | null;
  expired?: boolean;
  expiresAt?: string;
}

export interface OrderPaymentPresentation {
  targetOrderId: string;
  displayCode: string;
  normalizedOrderStatus: string;
  orderStatusLabel: string;
  orderStatusBadgeClass: string;
  methodKind: PaymentMethodKind;
  methodLabel: string;
  moneyStatusLabel: string;
  moneyStatusTone: MoneyStatusTone;
  amountDue: number;
  isPaid: boolean;
  isClosed: boolean;
  canTrackShipment: boolean;
}

export function formatVndCurrency(amount: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(amount || 0))} ₫`;
}

function normalizeMethodKind(rawMethod?: string | null): PaymentMethodKind {
  const upper = (rawMethod || '').trim().toUpperCase();
  if (!upper) return 'UNKNOWN';
  if (upper === 'COD' || upper.includes('NHẬN HÀNG') || upper === 'CASH_ON_DELIVERY') {
    return 'COD';
  }
  if (upper === 'PAYOS' || upper === 'QR' || upper === 'VIETQR' || upper.includes('PAYOS')) {
    return 'PAYOS';
  }
  return 'UNKNOWN';
}

/**
 * Quy tắc hiển thị thống nhất giữa màn "Đơn hàng của tôi" và "Chi tiết đơn hàng":
 * - Gọn, logic, không hiển thị các trạng thái "Chờ thanh toán" / "Chờ chuyển khoản".
 * - Tách bạch phương thức (PayOS vs COD) và tình trạng tiền thực tế.
 */
export function getOrderPaymentPresentation(
  order: OrderSummary | OrderDetail,
  live?: LivePaymentStatusSnapshot | null,
): OrderPaymentPresentation {
  const targetOrderId = order.internalId || order.id;
  const displayCode = order.orderCode || order.id;

  const rawOrderStatus = (live?.orderStatus || order.orderStatus || order.status || '')
    .trim()
    .toUpperCase();
  const rawPaymentStatus = (live?.paymentStatus || order.paymentStatus || '').trim().toUpperCase();
  const methodKind = normalizeMethodKind(live?.paymentMethod ?? order.paymentMethod);

  const totalAmount = order.totalAmount ?? order.total ?? 0;
  const amountDue = live?.amountDue ?? order.amountDue ?? live?.amount ?? totalAmount;

  const isCancelled =
    rawOrderStatus === 'CANCELLED' || rawOrderStatus === 'CANCELED' || rawOrderStatus === 'EXPIRED';
  const isRefunded = rawPaymentStatus === 'REFUNDED' || rawOrderStatus === 'REFUNDED';
  const isDelivered = rawOrderStatus === 'DELIVERED' || rawOrderStatus === 'COMPLETED';
  const isShipped = rawOrderStatus === 'SHIPPED';

  const isPaid =
    !isCancelled &&
    !isRefunded &&
    (rawPaymentStatus === 'PAID' ||
      rawPaymentStatus === 'SUCCEEDED' ||
      rawPaymentStatus === 'COLLECTED' ||
      rawOrderStatus === 'PAID' ||
      (methodKind !== 'COD' && (isShipped || isDelivered)) ||
      (methodKind === 'COD' && isDelivered && rawPaymentStatus !== 'UNPAID'));

  const isClosed = isCancelled || isRefunded;

  const hasTracking =
    Boolean(order.tracking) && order.tracking !== '—' && !order.tracking.startsWith('NEX-TRK-');

  let orderStatusLabel = 'Đang xử lý';
  if (isCancelled) orderStatusLabel = 'Đã hủy';
  else if (isRefunded) orderStatusLabel = 'Đã hoàn tiền';
  else if (isDelivered) orderStatusLabel = 'Đã giao hàng';
  else if (isShipped) orderStatusLabel = 'Đang giao hàng';
  else if (rawOrderStatus === 'PAID') orderStatusLabel = 'Đã xác nhận';
  else if (rawOrderStatus === 'PLACED') orderStatusLabel = 'Đã tiếp nhận';

  const normalizedBadgeInput =
    rawOrderStatus === 'PENDING_PAYMENT' || rawOrderStatus === 'CREATED'
      ? 'PROCESSING'
      : rawOrderStatus;
  const orderStatusBadgeClass = getOrderStatusBadgeClass(normalizedBadgeInput, isCancelled, isPaid);

  const methodLabel =
    methodKind === 'PAYOS'
      ? 'Chuyển khoản PayOS'
      : methodKind === 'COD'
        ? 'Trả khi nhận hàng (COD)'
        : '';

  let moneyStatusLabel = 'Đã ghi nhận';
  let moneyStatusTone: MoneyStatusTone = 'neutral';

  if (isRefunded) {
    moneyStatusLabel = 'Đã hoàn tiền';
    moneyStatusTone = 'neutral';
  } else if (isCancelled) {
    moneyStatusLabel = 'Không thu tiền';
    moneyStatusTone = 'neutral';
  } else if (isPaid) {
    moneyStatusLabel = methodKind === 'COD' ? 'Đã thu tiền' : 'Đã thanh toán';
    moneyStatusTone = 'success';
  } else if (methodKind === 'COD') {
    moneyStatusLabel = `Cần trả ${formatVndCurrency(amountDue)} khi nhận`;
    moneyStatusTone = 'info';
  } else if (methodKind === 'PAYOS') {
    moneyStatusLabel = 'Chưa hoàn tất';
    moneyStatusTone = 'neutral';
  }

  return {
    targetOrderId,
    displayCode,
    normalizedOrderStatus: rawOrderStatus,
    orderStatusLabel,
    orderStatusBadgeClass,
    methodKind,
    methodLabel,
    moneyStatusLabel,
    moneyStatusTone,
    amountDue,
    isPaid,
    isClosed,
    canTrackShipment: !isCancelled && hasTracking,
  };
}
