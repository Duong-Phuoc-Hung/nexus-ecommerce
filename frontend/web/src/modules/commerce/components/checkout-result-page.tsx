'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, RefreshCw, ShieldCheck, XCircle, PackageCheck } from 'lucide-react';
import { StoreHeader } from '@/components/layout/store-header';
import { Button } from '@/components/ui/button';
import { useSession } from '@/modules/auth/hooks/use-session';
import { commerceApi } from '../api/commerce.api';
import { PaymentQrCard } from './payment-qr-card';

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

  const [loading, setLoading] = useState(false);
  const [statusData, setStatusData] = useState<PaymentStatusData | null>(null);
  const [error, setError] = useState('');

  const fetchStatus = async () => {
    if (!orderId || user?.role !== 'BUYER') return;
    setLoading(true);
    setError('');
    try {
      const data = await commerceApi.getPaymentStatus(orderId);
      setStatusData(data);
    } catch {
      // Nếu backend payment-status chưa sẵn sàng, giữ trạng thái theo methodParam
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [orderId, user?.role]);

  const isCod = methodParam === 'COD' || statusData?.orderStatus === 'PLACED';
  const isPaid =
    statusData?.paymentStatus === 'PAID' ||
    statusData?.orderStatus === 'PAID' ||
    params?.get('status') === 'PAID';
  const isExpired = statusData?.expired || statusData?.orderStatus === 'EXPIRED';
  const isCancelled = statusData?.orderStatus === 'CANCELLED';

  return (
    <>
      <StoreHeader />
      <main className="nexus-container min-h-[70vh] py-10">
        <div className="mx-auto max-w-2xl rounded-3xl border border-line bg-white p-6 text-center shadow-sm sm:p-10">
          {/* Biểu tượng trạng thái */}
          {isPaid ? (
            <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 aria-hidden="true" className="size-8" />
            </span>
          ) : isCod ? (
            <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-blue-50 text-blue-600">
              <PackageCheck aria-hidden="true" className="size-8" />
            </span>
          ) : isCancelled || isExpired ? (
            <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-red-50 text-red-600">
              <XCircle aria-hidden="true" className="size-8" />
            </span>
          ) : (
            <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-soft text-brand-dark">
              <Clock3 aria-hidden="true" className="size-8" />
            </span>
          )}

          <p className="mt-6 text-xs font-bold uppercase tracking-widest text-brand-dark">
            NEXUS · KẾT QUẢ ĐẶT HÀNG
          </p>

          <h1 className="mt-3 text-2xl font-bold">
            {isPaid
              ? 'Thanh toán thành công!'
              : isCod
                ? 'Đặt hàng thành công (COD)'
                : isExpired
                  ? 'Đơn hàng đã hết hạn thanh toán'
                  : isCancelled
                    ? 'Đơn hàng đã bị hủy'
                    : 'Đang chờ thanh toán'}
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">
            {phase === 'loading'
              ? 'Đang kiểm tra phiên đăng nhập.'
              : user?.role !== 'BUYER'
                ? 'Đăng nhập tài khoản Buyer để xem đơn hàng của bạn.'
                : isPaid
                  ? 'Giao dịch của bạn đã được xác nhận thành công. Người bán sẽ sớm chuẩn bị và giao hàng đến bạn.'
                  : isCod
                    ? 'Đơn hàng đã được lưu trên hệ thống. Bạn sẽ kiểm tra và thanh toán tiền mặt trực tiếp cho bưu tá khi nhận hàng.'
                    : isExpired
                      ? 'Thời gian chờ thanh toán đã kết thúc. Vui lòng đặt lại đơn hàng mới.'
                      : 'Đơn hàng đang chờ nhận tiền. Vui lòng quét mã VietQR bên dưới hoặc hoàn tất chuyển khoản để hệ thống xác nhận tự động.'}
          </p>

          {orderId && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-stone-50 px-4 py-2 text-xs font-medium text-stone-700">
              <span>Mã đơn:</span>
              <strong className="font-mono text-brand-dark">{orderId}</strong>
            </div>
          )}

          {/* Hiển thị thẻ VietQR MoMo to, rõ ràng cho Buyer quét khi chưa thanh toán */}
          {!isPaid && !isCod && !isExpired && !isCancelled && (
            <PaymentQrCard orderId={orderId} amount={statusData?.amount} />
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {!isPaid && !isCod && !isExpired && !isCancelled && (
              <Button
                type="button"
                variant="outline"
                onClick={fetchStatus}
                disabled={loading}
                className="min-h-11 rounded-xl px-5 text-sm font-semibold"
              >
                <RefreshCw
                  aria-hidden="true"
                  className={`mr-2 size-4 ${loading ? 'animate-spin' : ''}`}
                />
                Làm mới trạng thái
              </Button>
            )}

            {user?.role === 'BUYER' ? (
              <Link
                href="/account/orders"
                className="inline-flex min-h-11 items-center rounded-xl bg-brand-dark px-5 text-sm font-semibold text-white hover:bg-brand-dark/90"
              >
                Xem danh sách đơn mua
              </Link>
            ) : (
              <Link
                href="/login?next=%2Faccount%2Forders"
                className="inline-flex min-h-11 items-center rounded-xl bg-brand-dark px-5 text-sm font-semibold text-white hover:bg-brand-dark/90"
              >
                Đăng nhập Buyer
              </Link>
            )}

            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-xl border border-line px-5 text-sm font-semibold hover:bg-stone-50"
            >
              Về trang chủ
            </Link>
          </div>

          <p className="mt-8 flex items-start gap-2 text-left text-xs leading-5 text-muted">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-dark" />
            Hệ thống đối soát thanh toán tự động hoạt động 24/7. Vui lòng giữ mã đơn hàng để tra cứu
            khi cần trợ giúp.
          </p>
        </div>
      </main>
    </>
  );
}
