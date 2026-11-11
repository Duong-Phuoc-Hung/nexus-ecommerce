'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  RefreshCw,
  XCircle,
  PackageCheck,
  ShoppingBag,
  ArrowRight,
  Receipt,
} from 'lucide-react';
import { StoreHeader } from '@/components/layout/store-header';
import { Button } from '@/components/ui/button';
import { useSession } from '@/modules/auth/hooks/use-session';
import { commerceApi } from '../api/commerce.api';
import { takePendingPayosCart } from '../utils/cart-selection';
import { readCart, writeCart } from '../utils/cart';

type PaymentStatusData = {
  orderId: string;
  orderCode?: number;
  orderStatus: string;
  paymentStatus: string;
  amount: number;
  currency: string;
  paidAt: string | null;
  expiresAt: string;
  expired: boolean;
  checkoutUrl?: string | null;
};

export function CheckoutResultPage() {
  const { user, phase } = useSession();
  const params = useSearchParams();
  const [pendingOrderId, setPendingOrderId] = useState('');
  const orderId = params?.get('orderId') || pendingOrderId;
  const methodParam = params?.get('method') || '';
  const statusParam = params?.get('status') || '';
  const cancelParam = params?.get('cancel') || params?.get('cancelled') || '';

  const [loading, setLoading] = useState(false);
  const [statusData, setStatusData] = useState<PaymentStatusData | null>(null);

  useEffect(() => {
    setPendingOrderId(sessionStorage.getItem('nexus-pending-payos-order') || '');
  }, []);

  const fetchStatus = async () => {
    if (!orderId || user?.role !== 'BUYER') return;
    setLoading(true);
    try {
      const data = await commerceApi.getPaymentStatus(orderId);
      setStatusData(data);
    } catch {
      // Giữ trạng thái xác nhận gần nhất; lỗi mạng tạm thời không đổi kết quả thanh toán.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [orderId, user?.role]);

  const isCod = methodParam === 'COD' || statusData?.orderStatus === 'PLACED';
  const isPaid = statusData?.paymentStatus === 'PAID' || statusData?.orderStatus === 'PAID';
  const isExpired = !isPaid && (statusData?.expired || statusData?.orderStatus === 'EXPIRED');
  // Trạng thái hủy phải lấy từ BE. Tham số cancel trên URL (PayOS redirect) chỉ là gợi ý khi
  // chưa có dữ liệu BE; nếu BE vẫn báo chờ thanh toán thì Buyer vẫn được quét lại mã.
  const isCancelled =
    !isPaid &&
    (statusData
      ? statusData.orderStatus === 'CANCELLED'
      : statusParam === 'CANCELLED' || cancelParam === 'true');
  const isTerminal =
    isPaid || isCod || Boolean(isExpired) || statusData?.orderStatus === 'CANCELLED';
  const awaitingPayment = !isPaid && !isCod && !isExpired && !isCancelled;

  useEffect(() => {
    if (!orderId || user?.role !== 'BUYER' || isTerminal) return;
    const timer = window.setInterval(() => {
      commerceApi
        .getPaymentStatus(orderId)
        .then(setStatusData)
        .catch(() => {});
    }, 4000);
    return () => window.clearInterval(timer);
  }, [orderId, user?.role, isTerminal]);

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

  // Chỉ hiển thị số tiền do API trả về, không lấy từ tham số URL (có thể bị sửa tay).
  const displayAmount = statusData?.amount ?? null;

  return (
    <>
      <StoreHeader />
      <main className="nexus-container flex min-h-[calc(100dvh-80px)] items-center justify-center px-3 py-2 sm:px-4">
        {/* Bố cục gọn cho màn hình lớn; màn hình nhỏ vẫn cuộn để không che thông tin. */}
        <div className="relative my-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-3 text-center shadow-lg sm:p-4">
          {/* Biểu tượng trạng thái */}
          {isPaid ? (
            <div className="relative mx-auto grid size-12 sm:size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-inner ring-4 ring-emerald-500/10">
              <CheckCircle2 aria-hidden="true" className="size-7 sm:size-8" />
            </div>
          ) : isCod ? (
            <span className="mx-auto grid size-12 sm:size-14 place-items-center rounded-2xl bg-blue-50 text-blue-600">
              <PackageCheck aria-hidden="true" className="size-6 sm:size-7" />
            </span>
          ) : isCancelled || isExpired ? (
            <span className="mx-auto grid size-12 sm:size-14 place-items-center rounded-2xl bg-red-50 text-red-600">
              <XCircle aria-hidden="true" className="size-6 sm:size-7" />
            </span>
          ) : awaitingPayment ? null : (
            <span className="mx-auto grid size-10 sm:size-12 place-items-center rounded-2xl bg-blue-50 text-blue-700">
              <Clock3 aria-hidden="true" className="size-5 sm:size-6" />
            </span>
          )}

          {!awaitingPayment && (
            <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-brand-dark">
              NEXUS · KẾT QUẢ ĐẶT HÀNG
            </p>
          )}

          <h1 className="mt-0.5 text-lg sm:text-xl font-bold tracking-tight text-stone-900">
            {isPaid
              ? 'Thanh toán thành công qua PayOS!'
              : isCod
                ? 'Đặt hàng thành công (COD)'
                : isExpired
                  ? 'Đơn hàng đã hết hạn thanh toán'
                  : isCancelled
                    ? 'Đơn hàng đã bị hủy'
                    : 'Đơn hàng đang chờ thanh toán'}
          </h1>

          <p className="mx-auto mt-0.5 max-w-md text-xs leading-relaxed text-muted">
            {phase === 'loading'
              ? 'Đang kiểm tra phiên đăng nhập.'
              : user?.role !== 'BUYER'
                ? 'Đăng nhập tài khoản Buyer để xem đơn hàng của bạn.'
                : isPaid
                  ? 'Giao dịch chuyển khoản PayOS của bạn đã được xác nhận thành công. Người bán sẽ sớm chuẩn bị và giao hàng đến bạn.'
                  : isCod
                    ? 'Đơn hàng đã được lưu trên hệ thống. Bạn sẽ kiểm tra và thanh toán tiền mặt trực tiếp cho bưu tá khi nhận hàng.'
                    : isExpired
                      ? 'Thời gian chờ thanh toán đã kết thúc. Vui lòng đặt lại đơn hàng mới.'
                      : isCancelled
                        ? 'Đơn hàng đã hủy và giải phóng tồn kho. Bạn có thể quay lại mua sắm.'
                        : 'Bạn có thể tiếp tục thanh toán trên PayOS hoặc kiểm tra trạng thái đơn hàng.'}
          </p>

          {/* Khung tóm tắt chi tiết giao dịch */}
          {isPaid && orderId && (
            <div className="mt-3 space-y-2 rounded-xl border border-emerald-200/90 bg-emerald-50/60 p-3 sm:p-3.5 text-left text-xs sm:text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-muted">Mã đơn hàng:</span>
                <strong className="font-mono text-brand-dark font-bold text-sm sm:text-base">
                  #{orderId}
                </strong>
              </div>
              <div className="flex items-center justify-between border-t border-emerald-100/90 pt-1.5">
                <span className="text-muted">Phương thức thanh toán:</span>
                <span className="font-semibold text-emerald-800">
                  Cổng thanh toán PayOS (VietQR)
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-emerald-100/90 pt-1.5">
                <span className="text-muted">Trạng thái giao dịch:</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  ĐÃ THANH TOÁN
                </span>
              </div>
              {displayAmount ? (
                <div className="flex items-center justify-between border-t border-emerald-100/90 pt-1.5">
                  <span className="text-muted">Số tiền đã trả:</span>
                  <strong className="text-sm sm:text-base font-bold text-emerald-700">
                    {new Intl.NumberFormat('vi-VN').format(displayAmount)} ₫
                  </strong>
                </div>
              ) : null}
            </div>
          )}

          {/* Badge mã đơn & trạng thái khi chưa thanh toán */}
          {!isPaid && orderId && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-xl bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-700">
                <span>Mã đơn:</span>
                <strong className="font-mono text-brand-dark">#{orderId}</strong>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                {isExpired ? 'ĐÃ HẾT HẠN' : isCancelled ? 'ĐÃ HỦY' : 'CHỜ THANH TOÁN'}
              </div>
            </div>
          )}

          {/* Khu vực nút hành động - Bố trí gọn gàng trong cùng khung */}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            {awaitingPayment &&
              user?.role === 'BUYER' &&
              (statusData?.checkoutUrl && /^https:\/\//i.test(statusData.checkoutUrl) ? (
                <a
                  href={statusData.checkoutUrl}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-dark px-4 text-sm font-semibold text-white hover:bg-brand-dark/90"
                >
                  Tiếp tục thanh toán trên PayOS
                </a>
              ) : orderId ? (
                <Link
                  href={`/account/orders/${encodeURIComponent(orderId)}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-dark px-4 text-sm font-semibold text-white hover:bg-brand-dark/90"
                >
                  Xem đơn để tiếp tục thanh toán
                </Link>
              ) : null)}
            {!isPaid && !isCod && !isExpired && !isCancelled && (
              <Button
                type="button"
                variant="outline"
                onClick={fetchStatus}
                disabled={loading}
                className="h-8 sm:h-9 rounded-xl px-3.5 text-xs font-semibold"
              >
                <RefreshCw
                  aria-hidden="true"
                  className={`mr-1.5 size-3.5 ${loading ? 'animate-spin' : ''}`}
                />
                Làm mới trạng thái
              </Button>
            )}

            {user?.role === 'BUYER' ? (
              <>
                <Link
                  href="/account/orders"
                  className="inline-flex h-8 sm:h-9 items-center justify-center rounded-xl bg-brand-dark px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-dark/90 transition"
                >
                  <Receipt className="mr-1.5 size-3.5" />
                  Xem danh sách đơn mua
                </Link>
                {orderId && isPaid && (
                  <Link
                    href={`/account/orders/${encodeURIComponent(orderId)}`}
                    className="inline-flex h-8 sm:h-9 items-center justify-center rounded-xl border border-brand bg-white px-3.5 text-xs font-semibold text-brand-dark hover:bg-brand-soft/40 transition"
                  >
                    Xem chi tiết đơn này <ArrowRight className="ml-1 size-3.5" />
                  </Link>
                )}
              </>
            ) : (
              <Link
                href="/login?next=%2Faccount%2Forders"
                className="inline-flex h-8 sm:h-9 items-center justify-center rounded-xl bg-brand-dark px-3.5 text-xs font-semibold text-white hover:bg-brand-dark/90 transition"
              >
                Đăng nhập Buyer
              </Link>
            )}

            <Link
              href="/products"
              className="inline-flex h-8 sm:h-9 items-center justify-center rounded-xl border border-line bg-white px-3 text-xs font-medium text-stone-700 hover:bg-stone-50 transition"
            >
              <ShoppingBag className="mr-1.5 size-3.5" />
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
