'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldCheck,
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
import { PaymentQrCard } from './payment-qr-card';
import { isOrderMarkedPaid, markOrderAsPaid } from '../config/payment-qr';

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
};

export function CheckoutResultPage() {
  const { user, phase } = useSession();
  const params = useSearchParams();
  const orderId = params?.get('orderId') || '';
  const methodParam = params?.get('method') || '';
  const statusParam = params?.get('status') || '';
  const codeParam = params?.get('code') || '';
  const cancelParam = params?.get('cancel') || params?.get('cancelled') || '';

  const amountParam = params?.get('amount') ? Number(params.get('amount')) : null;

  const [loading, setLoading] = useState(false);
  const [statusData, setStatusData] = useState<PaymentStatusData | null>(null);

  // Nếu URL truyền status=PAID hoặc PayOS trả về code=00 thì tự động lưu orderId vào danh sách đã thanh toán
  useEffect(() => {
    if (orderId && (statusParam === 'PAID' || codeParam === '00')) {
      markOrderAsPaid(orderId);
    }
  }, [orderId, statusParam, codeParam]);

  const fetchStatus = async () => {
    if (!orderId || user?.role !== 'BUYER') return;
    setLoading(true);
    try {
      const data = await commerceApi.getPaymentStatus(orderId);
      setStatusData(data);
      if (data.paymentStatus === 'PAID' || data.orderStatus === 'PAID') {
        markOrderAsPaid(orderId);
      }
    } catch {
      // Backend payment-status chưa cấu hình hoặc mạng chậm, giữ fallback từ local/params
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [orderId, user?.role]);

  const isCod = methodParam === 'COD' || statusData?.orderStatus === 'PLACED';
  const isPaid =
    statusParam === 'PAID' ||
    codeParam === '00' ||
    (orderId ? isOrderMarkedPaid(orderId) : false) ||
    statusData?.paymentStatus === 'PAID' ||
    statusData?.orderStatus === 'PAID';
  const isExpired = !isPaid && (statusData?.expired || statusData?.orderStatus === 'EXPIRED');
  const isCancelled =
    !isPaid &&
    (statusData?.orderStatus === 'CANCELLED' ||
      statusParam === 'CANCELLED' ||
      cancelParam === 'true');

  const displayAmount = statusData?.amount ?? amountParam;

  return (
    <>
      <StoreHeader />
      <main className="nexus-container min-h-[calc(100vh-68px)] flex items-center justify-center py-4 px-3 sm:px-4">
        {/* Khung duy nhất chứa toàn bộ thông tin kết quả thanh toán, tối ưu không scroll */}
        <div className="w-full max-w-xl rounded-2xl sm:rounded-3xl border border-stone-200/90 bg-white p-5 sm:p-6 text-center shadow-lg relative overflow-hidden">
          {/* Biểu tượng trạng thái */}
          {isPaid ? (
            <div className="relative mx-auto grid size-14 sm:size-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-inner ring-4 sm:ring-8 ring-emerald-500/10">
              <CheckCircle2 aria-hidden="true" className="size-8 sm:size-9" />
            </div>
          ) : isCod ? (
            <span className="mx-auto grid size-14 sm:size-16 place-items-center rounded-2xl bg-blue-50 text-blue-600">
              <PackageCheck aria-hidden="true" className="size-7 sm:size-8" />
            </span>
          ) : isCancelled || isExpired ? (
            <span className="mx-auto grid size-14 sm:size-16 place-items-center rounded-2xl bg-red-50 text-red-600">
              <XCircle aria-hidden="true" className="size-7 sm:size-8" />
            </span>
          ) : (
            <span className="mx-auto grid size-14 sm:size-16 place-items-center rounded-2xl bg-blue-50 text-blue-700">
              <Clock3 aria-hidden="true" className="size-7 sm:size-8" />
            </span>
          )}

          <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-brand-dark">
            NEXUS · KẾT QUẢ ĐẶT HÀNG
          </p>

          <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
            {isPaid
              ? 'Thanh toán thành công qua PayOS!'
              : isCod
                ? 'Đặt hàng thành công (COD)'
                : isExpired
                  ? 'Đơn hàng đã hết hạn thanh toán'
                  : isCancelled
                    ? 'Đơn hàng đã bị hủy'
                    : 'Đang chờ thanh toán qua PayOS'}
          </h1>

          <p className="mx-auto mt-1 max-w-md text-xs sm:text-[13px] leading-relaxed text-muted">
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
                      : 'Đơn hàng đang chờ chuyển khoản. Vui lòng quét mã VietQR bên dưới bằng app Ngân hàng để hoàn tất qua cổng PayOS.'}
          </p>

          {/* Khung tóm tắt chi tiết giao dịch */}
          {isPaid && orderId && (
            <div className="mt-3.5 space-y-2 rounded-xl border border-emerald-200/90 bg-emerald-50/60 p-3 sm:p-3.5 text-left text-xs sm:text-[13px]">
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
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-700">
                <span>Mã đơn:</span>
                <strong className="font-mono text-brand-dark">#{orderId}</strong>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
                <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                {isExpired ? 'ĐÃ HẾT HẠN' : isCancelled ? 'ĐÃ HỦY' : 'CHỜ THANH TOÁN'}
              </div>
            </div>
          )}

          {/* Hiển thị thẻ VietQR PayOS cho Buyer quét khi chưa thanh toán */}
          {!isPaid && !isCod && !isExpired && !isCancelled && (
            <PaymentQrCard orderId={orderId} amount={displayAmount || undefined} />
          )}

          {/* Khu vực nút hành động - Bố trí gọn gàng trong cùng khung */}
          <div className="mt-4 sm:mt-5 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
            {!isPaid && !isCod && !isExpired && !isCancelled && (
              <Button
                type="button"
                variant="outline"
                onClick={fetchStatus}
                disabled={loading}
                className="h-9 sm:h-10 rounded-xl px-4 text-xs sm:text-sm font-semibold"
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
                  className="inline-flex h-9 sm:h-10 items-center justify-center rounded-xl bg-brand-dark px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-brand-dark/90 transition"
                >
                  <Receipt className="mr-1.5 size-3.5 sm:size-4" />
                  Xem danh sách đơn mua
                </Link>
                {orderId && isPaid && (
                  <Link
                    href={`/account/orders/${encodeURIComponent(orderId)}`}
                    className="inline-flex h-9 sm:h-10 items-center justify-center rounded-xl border border-brand bg-white px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-brand-dark hover:bg-brand-soft/40 transition"
                  >
                    Xem chi tiết đơn này <ArrowRight className="ml-1 size-3.5 sm:size-4" />
                  </Link>
                )}
              </>
            ) : (
              <Link
                href="/login?next=%2Faccount%2Forders"
                className="inline-flex h-9 sm:h-10 items-center justify-center rounded-xl bg-brand-dark px-4 text-xs sm:text-sm font-semibold text-white hover:bg-brand-dark/90 transition"
              >
                Đăng nhập Buyer
              </Link>
            )}

            <Link
              href="/products"
              className="inline-flex h-9 sm:h-10 items-center justify-center rounded-xl border border-line bg-white px-3 sm:px-3.5 text-xs sm:text-sm font-medium text-stone-700 hover:bg-stone-50 transition"
            >
              <ShoppingBag className="mr-1.5 size-3.5 sm:size-4" />
              Tiếp tục mua sắm
            </Link>
          </div>

          {/* Dòng ghi chú bảo chứng hệ thống nằm trọn vẹn trong khung */}
          <div className="mt-3.5 pt-3 border-t border-stone-100 flex items-center justify-center gap-1.5 text-center text-[11px] sm:text-xs text-muted leading-tight">
            <ShieldCheck
              aria-hidden="true"
              className="size-3.5 sm:size-4 shrink-0 text-brand-dark"
            />
            <span>
              Hệ thống đối soát thanh toán tự động qua cổng PayOS 24/7. Vui lòng lưu mã đơn hàng để
              tra cứu khi cần hỗ trợ.
            </span>
          </div>
        </div>
      </main>
    </>
  );
}
