'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '@/modules/auth/hooks/use-session';

export function SellerRouteGuard({ children }: { children: React.ReactNode }) {
  const { user, phase, error, retry, logout } = useSession();
  const router = useRouter();
  const pathname = usePathname() || '/seller';

  useEffect(() => {
    if (phase === 'ready' && !user) {
      router.replace('/login?next=' + encodeURIComponent(pathname));
    }
  }, [phase, user, pathname, router]);

  if (phase === 'loading' || (phase === 'ready' && !user)) {
    return (
      <div className="seller-guard-status" role="status">
        <div className="seller-guard-spinner" />
        <p>Đang xác minh quyền truy cập Không gian người bán…</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <section className="seller-guard-card" role="alert">
        <p className="seller-eyebrow">XÁC MINH PHIÊN</p>
        <h2>Chưa xác minh được phiên đăng nhập</h2>
        <p className="seller-guard-desc">{error || 'Có lỗi xảy ra khi xác thực tài khoản.'}</p>
        <button type="button" className="seller-guard-btn primary" onClick={retry}>
          Thử lại
        </button>
      </section>
    );
  }

  // Chỉ cho phép role SELLER hoặc ADMIN vào quản trị người bán
  if (user?.role !== 'SELLER' && user?.role !== 'ADMIN') {
    const handleSwitchAccount = async () => {
      await logout();
      router.push('/login?next=' + encodeURIComponent(pathname));
    };

    return (
      <section className="seller-guard-card" role="alert">
        <p className="seller-eyebrow">NEXUS SELLER CENTER</p>
        <h2>Tài khoản chưa có quyền Người bán</h2>
        <p className="seller-guard-desc">
          Tài khoản hiện tại <strong>{user?.email}</strong> (vai trò: <code>{user?.role}</code>)
          không có quyền truy cập vào Không gian người bán. Vui lòng đăng nhập với tài khoản người
          bán (SELLER).
        </p>
        <div className="seller-guard-actions">
          <button type="button" className="seller-guard-btn primary" onClick={handleSwitchAccount}>
            Đăng nhập tài khoản Seller
          </button>
          <Link className="seller-guard-btn secondary" href="/">
            Về trang mua sắm
          </Link>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
