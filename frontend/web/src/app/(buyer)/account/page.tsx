'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Store } from 'lucide-react';
import { StoreHeader } from '@/components/layout/store-header';
import { useSession } from '@/modules/auth/hooks/use-session';
import { readContactPhone } from '@/modules/user/utils/address-book';

export default function AccountPage() {
  const { user, phase, error, retry } = useSession();
  const [phone, setPhone] = useState('');

  useEffect(() => {
    setPhone(user ? readContactPhone(user.id) : '');
  }, [user?.id]);

  return (
    <>
      <StoreHeader />
      <main className="nexus-container py-10">
        <section className="mx-auto max-w-2xl rounded-3xl border border-line bg-white p-7 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-dark">
            Tài khoản Nexus
          </p>
          <h1 className="mt-3 text-3xl font-bold">Thông tin cá nhân</h1>
          {phase === 'loading' ? (
            <p className="mt-6 text-sm text-muted" role="status">
              Đang xác minh phiên đăng nhập…
            </p>
          ) : phase === 'error' ? (
            <div className="mt-6" role="alert">
              <p>{error}</p>
              <button
                type="button"
                onClick={retry}
                className="mt-4 min-h-11 rounded-xl border border-line px-4"
              >
                Thử lại
              </button>
            </div>
          ) : !user ? (
            <div className="mt-6">
              <p className="text-sm text-muted">Đăng nhập để xem thông tin tài khoản của bạn.</p>
              <Link
                href="/login?next=%2Faccount"
                className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-brand-dark px-5 text-sm font-semibold text-white"
              >
                Đăng nhập
              </Link>
            </div>
          ) : (
            <>
              <dl className="mt-7 divide-y divide-line text-sm">
                {[
                  ['Họ và tên', user.fullName],
                  ['Email', user.email],
                  ...(user.role === 'BUYER'
                    ? [['Điện thoại liên hệ', phone || 'Chưa bổ sung']]
                    : []),
                  [
                    'Vai trò',
                    user.role === 'BUYER'
                      ? 'Người mua'
                      : user.role === 'SELLER'
                        ? 'Người bán'
                        : user.role === 'ADMIN'
                          ? 'Quản trị viên'
                          : user.role,
                  ],
                  ['Trạng thái', user.status === 'ACTIVE' ? 'Đang hoạt động' : user.status],
                ].map(([label, value]) => (
                  <div key={label} className="grid gap-2 py-4 sm:grid-cols-[140px_1fr]">
                    <dt className="text-muted">{label}</dt>
                    <dd className="break-words font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>

              {user.role === 'BUYER' && (
                <div className="mt-7 rounded-2xl border border-brand-dark/20 bg-brand-soft/40 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="flex items-center gap-2 text-sm font-bold text-brand-dark">
                        <Store className="size-4" aria-hidden="true" />
                        <span>Trở thành Người bán trên Nexus</span>
                      </p>
                      <p className="text-xs leading-relaxed text-muted">
                        Gửi hồ sơ đăng ký mở gian hàng để Admin xét duyệt và kích hoạt kênh bán hàng
                        chuyên nghiệp.
                      </p>
                    </div>
                    <Link
                      href="/account/seller-registration"
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-dark px-4 text-xs font-semibold text-white hover:bg-brand"
                    >
                      <span>Đăng ký bán hàng</span>
                    </Link>
                  </div>
                </div>
              )}

              {user.role === 'SELLER' && (
                <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                        <Store className="size-4" aria-hidden="true" />
                        <span>Tài khoản Người bán (Seller) đang hoạt động</span>
                      </p>
                      <p className="text-xs leading-relaxed text-emerald-800">
                        Bạn có thể truy cập Kênh người bán hoặc xem lại hồ sơ đăng ký gian hàng của
                        mình.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href="/seller"
                        className="inline-flex min-h-11 items-center rounded-xl bg-brand-dark px-4 text-xs font-semibold text-white"
                      >
                        Kênh người bán
                      </Link>
                      <Link
                        href="/account/seller-registration"
                        className="inline-flex min-h-11 items-center rounded-xl border border-line bg-white px-4 text-xs font-semibold text-ink"
                      >
                        Xem hồ sơ bán hàng
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              <p className="mt-6 rounded-xl bg-stone-50 p-4 text-sm leading-6 text-muted">
                Thông tin được xác minh từ phiên hiện tại.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                {user.role === 'BUYER' && (
                  <Link
                    href="/account/addresses"
                    className="inline-flex min-h-11 items-center rounded-xl bg-brand-dark px-5 text-sm font-semibold text-white"
                  >
                    Địa chỉ nhận hàng
                  </Link>
                )}
                <Link
                  href="/account/orders"
                  className="inline-flex min-h-11 items-center rounded-xl border border-line px-5 text-sm font-semibold"
                >
                  {user.role === 'SELLER' ? 'Lịch sử đơn mua trước đây' : 'Xem đơn hàng của tôi'}
                </Link>
                {user.role === 'BUYER' && (
                  <Link
                    href="/account/seller-registration"
                    className="inline-flex min-h-11 items-center rounded-xl border border-line px-5 text-sm font-semibold text-brand-dark hover:bg-brand-soft"
                  >
                    Đăng ký bán hàng
                  </Link>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </>
  );
}
