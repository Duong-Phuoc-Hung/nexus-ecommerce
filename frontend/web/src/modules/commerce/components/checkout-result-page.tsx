'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  PackageCheck,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  XCircle,
} from 'lucide-react';
import { StoreHeader } from '@/components/layout/store-header';
import { useSession } from '@/modules/auth/hooks/use-session';
import { useBuyerAssistant } from '@/modules/chat/context/buyer-assistant-provider';
import { commerceApi } from '../api/commerce.api';
import { takePendingPayosCart } from '../utils/cart-selection';
import { readCart, writeCart } from '../utils/cart';
import { formatVndCurrency } from '../utils/order-payment-presentation';

type PaymentStatusData = {
  orderId: string;
  orderCode?: number;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  amount: number;
  amountDue?: number | null;
  currency: string;
  paidAt: string | null;
  expiresAt: string;
  expired: boolean;
};

export function CheckoutResultPage() {
  const { user, phase } = useSession();
  const { setCheckoutContext } = useBuyerAssistant();
  const params = useSearchParams();

  const [pendingOrderId, setPendingOrderId] = useState('');
  const orderId = params?.get('orderId') || pendingOrderId || params?.get('orderCode') || '';
  const methodParam = params?.get('method') || '';
  const statusParam = params?.get('status') || '';
  const cancelParam = params?.get('cancel') || params?.get('cancelled') || '';
  const isCancelReturn = cancelParam === 'true' || statusParam === 'CANCELLED';

  const [loading, setLoading] = useState(false);
  const [statusData, setStatusData] = useState<PaymentStatusData | null>(null);

  useEffect(() => {
    setPendingOrderId(sessionStorage.getItem('nexus-pending-payos-order') || '');
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!orderId || user?.role !== 'BUYER') return;
    setLoading(true);
    try {
      const data = await commerceApi.getPaymentStatus(orderId);
      setStatusData(data);
    } catch {
      // Giữ trạng thái gần nhất khi mạng tạm gián đoạn
    } finally {
      setLoading(false);
    }
  }, [orderId, user?.role]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const isCod =
    methodParam === 'COD' ||
    statusData?.paymentMethod?.toUpperCase() === 'COD' ||
    statusData?.orderStatus === 'PLACED';
  const isPaid = statusData?.paymentStatus === 'PAID' || statusData?.orderStatus === 'PAID';
  const isExpired =
    !isPaid && Boolean(statusData?.expired || statusData?.orderStatus === 'EXPIRED');

  // Nếu từ PayOS trả về và đơn đã PAID -> dọn session + giỏ hàng đã mua
  useEffect(() => {
    if (!isPaid || !orderId) return;
    if (sessionStorage.getItem('nexus-pending-payos-order') === orderId) {
      sessionStorage.removeItem('nexus-pending-payos-order');
    }
    const purchased = takePendingPayosCart(orderId);
    if (!purchased.length) return;
    const ids = new Set(purchased.map((line) => line.productId));
    writeCart(readCart().filter((line) => !ids.has(line.productId)));
  }, [isPaid, orderId]);

  const displayAmount = statusData?.amountDue ?? statusData?.amount ?? null;
  const effectiveOrderId = statusData?.orderId || orderId;
  const displayOrderCode = statusData?.orderCode ? String(statusData.orderCode) : effectiveOrderId;

  useEffect(() => {
    setCheckoutContext({
      stage: 'RESULT',
      itemsCount: 0,
      subtotal: displayAmount ?? 0,
      totalAmount: displayAmount,
      paymentMethod: methodParam || (isCod ? 'COD' : 'PAYOS'),
      orderId: effectiveOrderId || undefined,
      paymentStatus: statusData?.paymentStatus,
      orderStatus: statusData?.orderStatus,
    });
    return () => setCheckoutContext(null);
  }, [
    displayAmount,
    effectiveOrderId,
    isCod,
    methodParam,
    setCheckoutContext,
    statusData?.orderStatus,
    statusData?.paymentStatus,
  ]);

  const isSuccess = isPaid || isCod;

  return (
    <>
      <StoreHeader />
      <main className="nexus-container flex min-h-[calc(100dvh-80px)] items-center justify-center px-3 py-6 sm:px-4">
        <div className="relative my-auto w-full max-w-xl overflow-hidden rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 text-center shadow-lg">
          {loading && !statusData && !isCod && !isCancelReturn ? (
            <div className="py-8 flex flex-col items-center gap-3 text-sm text-muted">
              <Loader2 className="size-8 animate-spin text-brand-dark" />
              <span>Đang xác nhận kết quả thanh toán…</span>
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
              ) : (
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-600 ring-4 ring-red-500/10">
                  <XCircle aria-hidden="true" className="size-8" />
                </div>
              )}

              <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-brand-dark">
                NEXUS · KẾT QUẢ ĐẶT HÀNG
              </p>

              <h1 className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
                {isPaid
                  ? 'Thanh toán thành công!'
                  : isCod
                    ? 'Đặt hàng thành công (COD)'
                    : isExpired
                      ? 'Phiên thanh toán đã hết hạn'
                      : 'Thanh toán chưa hoàn tất'}
              </h1>

              <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm leading-relaxed text-muted">
                {phase === 'loading'
                  ? 'Đang kiểm tra phiên đăng nhập.'
                  : user?.role !== 'BUYER'
                    ? 'Đăng nhập tài khoản Buyer để xem đơn hàng của bạn.'
                    : isPaid
                      ? 'Giao dịch PayOS của bạn đã được xác nhận thành công. Người bán sẽ sớm chuẩn bị và giao hàng đến bạn.'
                      : isCod
                        ? 'Đơn hàng đã được ghi nhận. Bạn sẽ kiểm tra sản phẩm và thanh toán tiền mặt trực tiếp khi nhận hàng.'
                        : 'Giao dịch chưa được hoàn tất. Bạn có thể quay lại giỏ hàng để đặt lại hoặc xem danh sách đơn hàng.'}
              </p>

              {isSuccess && effectiveOrderId && (
                <div
                  className={`mt-5 space-y-2 rounded-2xl border p-4 text-left text-xs sm:text-sm ${
                    isPaid ? 'border-emerald-200 bg-emerald-50/50' : 'border-line bg-stone-50/80'
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
                        isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-900'
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          isPaid ? 'bg-emerald-600' : 'bg-sky-600'
                        }`}
                      />
                      {isPaid
                        ? 'Đã thanh toán'
                        : displayAmount
                          ? `Cần trả ${formatVndCurrency(displayAmount)} khi nhận`
                          : 'Trả khi nhận hàng'}
                    </span>
                  </div>

                  {displayAmount !== null && isPaid && (
                    <div className="flex items-center justify-between gap-2 border-t border-line/60 pt-2">
                      <span className="text-muted">Số tiền đã trả:</span>
                      <strong className="font-mono text-sm sm:text-base font-bold text-emerald-700">
                        {formatVndCurrency(displayAmount)}
                      </strong>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                {user?.role === 'BUYER' ? (
                  <>
                    {isSuccess && effectiveOrderId ? (
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
                    href="/login?next=%2Faccount%2Forders"
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
