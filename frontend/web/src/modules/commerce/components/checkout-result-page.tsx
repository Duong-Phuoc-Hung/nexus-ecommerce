'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Clock3, ShieldCheck } from 'lucide-react';
import { StoreHeader } from '@/components/layout/store-header';
import { useSession } from '@/modules/auth/hooks/use-session';

export function CheckoutResultPage() {
  const { user, phase } = useSession();
  const params = useSearchParams();
  const orderId = params?.get('orderId') || '';

  return (
    <>
      <StoreHeader />
      <main className="nexus-container min-h-[70vh] py-10">
        <div className="mx-auto max-w-xl rounded-3xl border border-line bg-white p-7 text-center shadow-sm sm:p-10">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-soft text-brand-dark">
            <Clock3 aria-hidden="true" className="size-8" />
          </span>
          <p className="mt-6 text-xs font-bold uppercase tracking-widest text-brand-dark">
            NEXUS · THANH TOÁN
          </p>
          <h1 className="mt-3 text-2xl font-bold">Kiểm tra trạng thái thanh toán</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            {phase === 'loading'
              ? 'Đang kiểm tra phiên đăng nhập.'
              : user?.role !== 'BUYER'
                ? 'Đăng nhập tài khoản Buyer để xem đơn hàng của bạn.'
                : 'Trạng thái trên đường dẫn quay lại chưa xác nhận giao dịch. Hãy kiểm tra đơn hàng sau khi máy chủ nhận kết quả thanh toán.'}
          </p>
          {user?.role === 'BUYER' && orderId && (
            <p className="mt-4 break-all rounded-xl bg-stone-50 p-3 text-xs text-muted">
              Mã đơn: {orderId}
            </p>
          )}
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {user?.role === 'BUYER' ? (
              <Link
                href="/account/orders"
                className="inline-flex min-h-11 items-center rounded-xl bg-brand-dark px-5 text-sm font-semibold text-white"
              >
                Xem đơn mua
              </Link>
            ) : (
              <Link
                href="/login?next=%2Faccount%2Forders"
                className="inline-flex min-h-11 items-center rounded-xl bg-brand-dark px-5 text-sm font-semibold text-white"
              >
                Đăng nhập Buyer
              </Link>
            )}
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-xl border border-line px-5 text-sm font-semibold"
            >
              Về trang chủ
            </Link>
          </div>
          <p className="mt-7 flex items-start gap-2 text-left text-xs leading-5 text-muted">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Nếu bạn đã chuyển tiền, hãy giữ mã đơn và tránh thanh toán lại trước khi trạng thái được
            đối soát.
          </p>
        </div>
      </main>
    </>
  );
}
