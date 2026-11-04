'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '@/modules/auth/hooks/use-session';

export function SupportRouteGuard({ children }: { children: React.ReactNode }) {
  const { user, phase, error, retry, logout } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (phase === 'ready' && !user) {
      router.replace('/login');
    }
  }, [phase, user, router]);

  if (phase === 'loading' || (phase === 'ready' && !user)) {
    return (
      <div className="support-guard-status" role="status">
        <div className="support-guard-spinner" />
        <p>Đang xác minh quyền truy cập Bộ phận hỗ trợ…</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <section className="support-guard-card" role="alert">
        <p className="support-eyebrow">XÁC MINH PHIÊN</p>
        <h2>Chưa xác minh được phiên đăng nhập</h2>
        <p className="support-guard-desc">{error || 'Có lỗi xảy ra khi xác thực tài khoản.'}</p>
        <button type="button" className="support-guard-btn primary" onClick={retry}>
          Thử lại
        </button>
      </section>
    );
  }

  // Chỉ cho phép role SUPPORT_STAFF hoặc ADMIN vào quản trị vận hành/vận đơn
  if (user?.role !== 'SUPPORT_STAFF' && user?.role !== 'ADMIN') {
    const handleSwitchAccount = async () => {
      await logout();
      window.location.replace('/login');
    };

    return (
      <section className="support-guard-card" role="alert">
        <p className="support-eyebrow">NEXUS CUSTOMER OPERATIONS</p>
        <h2>Tài khoản chưa có quyền Hỗ trợ viên</h2>
        <p className="support-guard-desc">
          Tài khoản hiện tại <strong>{user?.email}</strong> (vai trò: <code>{user?.role}</code>)
          không có quyền truy cập vào Cổng vận hành & Vận đơn. Vui lòng đăng nhập với tài khoản Nhân
          viên hỗ trợ (SUPPORT_STAFF).
        </p>
        <div className="support-guard-actions">
          <button type="button" className="support-guard-btn primary" onClick={handleSwitchAccount}>
            Đăng nhập tài khoản Support
          </button>
          <Link className="support-guard-btn secondary" href="/">
            Về trang mua sắm
          </Link>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
