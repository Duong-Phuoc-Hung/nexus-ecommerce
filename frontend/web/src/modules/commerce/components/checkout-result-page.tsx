'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  PackageCheck,
  Receipt,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  XCircle,
} from 'lucide-react';
import { StoreHeader } from '@/components/layout/store-header';
import { useSession } from '@/modules/auth/hooks/use-session';
import { useBuyerAssistant } from '@/modules/chat/context/buyer-assistant-provider';
import { auctionApi } from '@/modules/auction/api/auction.api';
import { commerceApi } from '../api/commerce.api';
import { takePendingPayosCart } from '../utils/cart-selection';
import { readCart, writeCart } from '../utils/cart';
import { formatVndCurrency } from '../utils/order-payment-presentation';

type PaymentStatusData = {
  orderId: string;
  orderCode?: string | number;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  amount: number;
  amountDue?: number | null;
  currency: string;
  paidAt: string | null;
  expiresAt: string;
  expired: boolean;
  checkoutUrl?: string | null;
};

export function CheckoutResultPage() {
  const router = useRouter();
  const { user, phase } = useSession();
  const { setCheckoutContext } = useBuyerAssistant();
  const params = useSearchParams();

  const [pendingOrderId, setPendingOrderId] = useState('');
  const [pendingAuctionId, setPendingAuctionId] = useState('');
  const orderId = params?.get('orderId') || pendingOrderId || params?.get('orderCode') || '';
  const methodParam = params?.get('method') || '';
  const codeParam = params?.get('code') || '';
  const statusParam = (params?.get('status') || '').toUpperCase();
  const cancelParam = (params?.get('cancel') || params?.get('cancelled') || '').toLowerCase();
  const isCancelReturn = cancelParam === 'true' || statusParam === 'CANCELLED';
  const isPayOsReturnPaid =
    !isCancelReturn &&
    (statusParam === 'PAID' || statusParam === 'SUCCEEDED' || codeParam === '00');
  const isPayOsReturnPending =
    !isCancelReturn && (statusParam === 'PENDING' || statusParam === 'PROCESSING');

  const [loading, setLoading] = useState(false);
  const [hasCheckedOnce, setHasCheckedOnce] = useState(false);
  const [statusData, setStatusData] = useState<PaymentStatusData | null>(null);
  const redirectScheduledRef = useRef(false);

  useEffect(() => {
    try {
      setPendingOrderId(sessionStorage.getItem('nexus-pending-payos-order') || '');
      setPendingAuctionId(sessionStorage.getItem('nexus-pending-payos-auction') || '');
    } catch {
      // Ignore storage read errors
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!orderId || phase === 'loading' || user?.role !== 'BUYER') return null;
    setLoading(true);
    try {
      const data = await commerceApi.getPaymentStatus(orderId);
      setStatusData(data);
      return data;
    } catch {
      // Giữ trạng thái gần nhất khi mạng tạm gián đoạn
      return null;
    } finally {
      setLoading(false);
      setHasCheckedOnce(true);
    }
  }, [orderId, phase, user?.role]);

  useEffect(() => {
    if (!orderId || phase === 'loading' || user?.role !== 'BUYER') return;
    let active = true;
    let timer: number | null = null;

    const runVerification = async (attempt: number) => {
      const data = await fetchStatus();
      if (!active) return;

      const paySt = (data?.paymentStatus || '').toUpperCase();
      const ordSt = (data?.orderStatus || '').toUpperCase();
      const confirmedPaid =
        paySt === 'PAID' ||
        paySt === 'SUCCEEDED' ||
        ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(ordSt);

      // Nếu PayOS báo PAID hoặc đang PENDING mà BE cần thêm vài giây đồng bộ, thử lại tối đa 3 lần
      if (
        !confirmedPaid &&
        !isCancelReturn &&
        !data?.expired &&
        attempt < 3 &&
        (isPayOsReturnPaid || isPayOsReturnPending || paySt === 'PENDING' || !data)
      ) {
        timer = window.setTimeout(() => {
          void runVerification(attempt + 1);
        }, 1800);
      }
    };

    void runVerification(0);
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [
    fetchStatus,
    isCancelReturn,
    isPayOsReturnPaid,
    isPayOsReturnPending,
    orderId,
    phase,
    user?.role,
  ]);

  const rawPayStatus = (statusData?.paymentStatus || '').toUpperCase();
  const rawOrderStatus = (statusData?.orderStatus || '').toUpperCase();

  const isCod =
    methodParam === 'COD' ||
    statusData?.paymentMethod?.toUpperCase() === 'COD' ||
    rawOrderStatus === 'PLACED';
  const isBackendPaid =
    rawPayStatus === 'PAID' ||
    rawPayStatus === 'SUCCEEDED' ||
    ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(rawOrderStatus);
  const isPaid =
    isBackendPaid ||
    (isPayOsReturnPaid && rawPayStatus !== 'FAILED' && rawPayStatus !== 'CANCELLED');
  const isExpired = !isPaid && Boolean(statusData?.expired || rawOrderStatus === 'EXPIRED');
  const isPendingConfirmation =
    !isPaid &&
    !isCod &&
    !isExpired &&
    !isCancelReturn &&
    (rawPayStatus === 'PENDING' ||
      rawOrderStatus === 'PENDING_PAYMENT' ||
      isPayOsReturnPending ||
      (Boolean(orderId) && !hasCheckedOnce));

  const displayAmount = statusData?.amountDue ?? statusData?.amount ?? null;
  const effectiveOrderId = statusData?.orderId || orderId;
  const displayOrderCode = statusData?.orderCode ? String(statusData.orderCode) : effectiveOrderId;
  const isAuctionOrder =
    Boolean(pendingAuctionId) ||
    String(displayOrderCode || '')
      .toUpperCase()
      .startsWith('ORD-AUC-');

  // Nếu từ PayOS trả về và đơn đã PAID -> dọn session + giỏ hàng + đồng bộ phiên đấu giá + chuyển tới trang chi tiết đơn hàng
  useEffect(() => {
    if (!isPaid || !effectiveOrderId) return;
    try {
      const savedOrder = sessionStorage.getItem('nexus-pending-payos-order');
      if (savedOrder === orderId || savedOrder === effectiveOrderId) {
        sessionStorage.removeItem('nexus-pending-payos-order');
      }
      const savedAuction =
        pendingAuctionId || sessionStorage.getItem('nexus-pending-payos-auction') || '';
      if (savedAuction) {
        sessionStorage.removeItem('nexus-pending-payos-auction');
        // Kích hoạt hydrateAuctionSettlement trên Auction Service để cập nhật trạng thái phiên sang PAID
        void auctionApi.detail(savedAuction).catch(() => {});
      }
    } catch {
      // Ignore storage errors
    }

    const purchased = takePendingPayosCart(orderId);
    if (purchased.length > 0) {
      const ids = new Set(purchased.map((line) => line.productId));
      writeCart(readCart().filter((line) => !ids.has(line.productId)));
    }

    if (!redirectScheduledRef.current && user?.role === 'BUYER') {
      redirectScheduledRef.current = true;
      const redirectTimer = window.setTimeout(() => {
        router.replace(`/account/orders/${encodeURIComponent(effectiveOrderId)}`);
      }, 1200);
      return () => window.clearTimeout(redirectTimer);
    }
  }, [effectiveOrderId, isPaid, orderId, pendingAuctionId, router, user?.role]);

  useEffect(() => {
    setCheckoutContext({
      stage: 'RESULT',
      itemsCount: 0,
      subtotal: displayAmount ?? 0,
      totalAmount: displayAmount,
      paymentMethod: methodParam || (isCod ? 'COD' : 'PAYOS'),
      orderId: effectiveOrderId || undefined,
      paymentStatus: isPaid ? 'PAID' : statusData?.paymentStatus,
      orderStatus: isPaid ? 'PAID' : statusData?.orderStatus,
    });
    return () => setCheckoutContext(null);
  }, [
    displayAmount,
    effectiveOrderId,
    isCod,
    isPaid,
    methodParam,
    setCheckoutContext,
    statusData?.orderStatus,
    statusData?.paymentStatus,
  ]);

  const isSuccess = isPaid || isCod;
  const isWaitingVerification =
    phase === 'loading' || (Boolean(orderId) && !hasCheckedOnce && !isCod && !isCancelReturn);

  return (
    <>
      <StoreHeader />
      <main className="nexus-container flex min-h-[calc(100dvh-80px)] items-center justify-center px-3 py-6 sm:px-4">
        <div className="relative my-auto w-full max-w-xl overflow-hidden rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 text-center shadow-lg">
          {isWaitingVerification ? (
            <div className="py-8 flex flex-col items-center gap-3 text-sm text-muted">
              <Loader2 className="size-8 animate-spin text-brand-dark" />
              <span>Đang xác nhận kết quả thanh toán từ hệ thống…</span>
            </div>
          ) : (
            <>
              {isPaid ? (
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 ring-4 ring-emerald-500/10">
                  <CheckCircle2 aria-hidden="true" className="size-8" />
                </div>
              ) : isCod ? (
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-sky-50 text-sky-600 ring-4 ring-sky-500/10">
                  <PackageCheck aria-hidden="true" className="size-8" />
                </div>
              ) : isPendingConfirmation ? (
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-600 ring-4 ring-amber-500/10">
                  <Clock3 aria-hidden="true" className="size-8" />
                </div>
              ) : (
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-600 ring-4 ring-red-500/10">
                  <XCircle aria-hidden="true" className="size-8" />
                </div>
              )}

              <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-brand-dark">
                {isAuctionOrder ? 'NEXUS · THANH TOÁN ĐẤU GIÁ' : 'NEXUS · KẾT QUẢ ĐẶT HÀNG'}
              </p>

              <h1 className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
                {isPaid
                  ? 'Thanh toán thành công!'
                  : isCod
                    ? 'Đặt hàng thành công (COD)'
                    : isPendingConfirmation
                      ? 'Đang chờ xác nhận thanh toán'
                      : isExpired
                        ? 'Phiên thanh toán đã hết hạn'
                        : isCancelReturn
                          ? 'Bạn đã hủy phiên thanh toán'
                          : 'Thanh toán chưa hoàn tất'}
              </h1>

              <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm leading-relaxed text-muted">
                {user?.role !== 'BUYER'
                  ? 'Đăng nhập tài khoản Buyer để xem đơn hàng của bạn.'
                  : isPaid
                    ? 'Giao dịch PayOS của bạn đã được xác nhận thành công. Hệ thống đang chuyển bạn đến trang chi tiết đơn hàng…'
                    : isCod
                      ? 'Đơn hàng đã được ghi nhận. Bạn sẽ kiểm tra sản phẩm và thanh toán tiền mặt trực tiếp khi nhận hàng.'
                      : isPendingConfirmation
                        ? 'Đơn hàng đã được tạo và đang chờ xác nhận giao dịch từ PayOS. Bạn có thể bấm Kiểm tra lại hoặc mở trực tiếp chi tiết đơn hàng.'
                        : 'Giao dịch chưa hoàn tất. Bạn có thể mở chi tiết đơn hàng để tiếp tục thanh toán hoặc xem danh sách đơn mua.'}
              </p>

              {(isSuccess || isPendingConfirmation) && effectiveOrderId && (
                <div
                  className={`mt-5 space-y-2 rounded-2xl border p-4 text-left text-xs sm:text-sm ${
                    isPaid
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : isPendingConfirmation
                        ? 'border-amber-200 bg-amber-50/40'
                        : 'border-line bg-stone-50/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted">Mã đơn hàng:</span>
                    <strong className="font-mono font-bold text-stone-900">
                      #{displayOrderCode}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-line/60 pt-2">
                    <span className="text-muted">Phương thức:</span>
                    <span className="font-semibold text-stone-900">
                      {isCod ? 'Trả khi nhận hàng (COD)' : 'Chuyển khoản PayOS'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-line/60 pt-2">
                    <span className="text-muted">Tình trạng tiền:</span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        isPaid
                          ? 'bg-emerald-100 text-emerald-800'
                          : isPendingConfirmation
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-sky-100 text-sky-900'
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          isPaid
                            ? 'bg-emerald-600'
                            : isPendingConfirmation
                              ? 'bg-amber-600'
                              : 'bg-sky-600'
                        }`}
                      />
                      {isPaid
                        ? 'Đã thanh toán'
                        : isPendingConfirmation
                          ? 'Đang chờ xác nhận'
                          : displayAmount
                            ? `Cần trả ${formatVndCurrency(displayAmount)} khi nhận`
                            : 'Trả khi nhận hàng'}
                    </span>
                  </div>

                  {displayAmount !== null && (isPaid || isPendingConfirmation) && (
                    <div className="flex items-center justify-between gap-2 border-t border-line/60 pt-2">
                      <span className="text-muted">
                        {isPaid ? 'Số tiền đã trả:' : 'Số tiền thanh toán:'}
                      </span>
                      <strong
                        className={`font-mono text-sm sm:text-base font-bold ${
                          isPaid ? 'text-emerald-700' : 'text-stone-900'
                        }`}
                      >
                        {formatVndCurrency(displayAmount)}
                      </strong>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                {user?.role === 'BUYER' ? (
                  <>
                    {effectiveOrderId ? (
                      <Link
                        href={`/account/orders/${encodeURIComponent(effectiveOrderId)}`}
                        className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-dark px-4 text-xs sm:text-sm font-semibold text-white hover:bg-brand-dark/90 transition"
                      >
                        Xem chi tiết đơn này
                        <ArrowRight className="ml-1.5 size-4" />
                      </Link>
                    ) : (
                      <Link
                        href="/cart"
                        className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-dark px-4 text-xs sm:text-sm font-semibold text-white hover:bg-brand-dark/90 transition"
                      >
                        <ShoppingCart className="mr-1.5 size-4" />
                        Quay lại giỏ hàng
                      </Link>
                    )}

                    {isPendingConfirmation && (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => void fetchStatus()}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-4 text-xs sm:text-sm font-semibold text-amber-950 hover:bg-amber-100 transition disabled:opacity-60"
                      >
                        <RefreshCw className={`mr-1.5 size-4 ${loading ? 'animate-spin' : ''}`} />
                        Kiểm tra lại
                      </button>
                    )}

                    <Link
                      href="/account/orders"
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-line bg-white px-4 text-xs sm:text-sm font-semibold text-stone-800 hover:bg-stone-50 transition"
                    >
                      <Receipt className="mr-1.5 size-4" />
                      Đơn hàng của tôi
                    </Link>
                  </>
                ) : (
                  <Link
                    href={
                      effectiveOrderId
                        ? `/login?next=${encodeURIComponent(`/account/orders/${effectiveOrderId}`)}`
                        : '/login?next=%2Faccount%2Forders'
                    }
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-dark px-5 text-xs sm:text-sm font-semibold text-white hover:bg-brand-dark/90 transition"
                  >
                    Đăng nhập Buyer
                  </Link>
                )}

                <Link
                  href="/products"
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-line bg-white px-4 text-xs sm:text-sm font-medium text-stone-600 hover:bg-stone-50 transition"
                >
                  <ShoppingBag className="mr-1.5 size-4" />
                  Tiếp tục mua sắm
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
