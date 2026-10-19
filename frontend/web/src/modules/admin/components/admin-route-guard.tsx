'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '@/modules/auth/hooks/use-session';

export function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const { user, phase, error, retry } = useSession();
  const router = useRouter();
  const pathname = usePathname() || '/admin';

  useEffect(() => {
    if (phase === 'ready' && !user) {
      router.replace('/login?next=' + encodeURIComponent(pathname));
    }
  }, [phase, user, pathname, router]);

  if (phase === 'loading' || (phase === 'ready' && !user)) {
    return (
      <main className="admin-status" role="status">
        Đang xác minh tài khoản quản trị…
      </main>
    );
  }

  if (phase === 'error') {
    return (
      <main className="admin-status">
        <section className="admin-card admin-access-card" role="alert">
          <h1>Chưa xác minh được phiên</h1>
          <p>{error}</p>
          <button type="button" className="admin-button" onClick={retry}>
            Thử lại
          </button>
        </section>
      </main>
    );
  }

  if (user?.role !== 'ADMIN') {
    return (
      <main className="admin-status">
        <section className="admin-card admin-access-card">
          <p className="admin-eyebrow">NEXUS ADMIN</p>
          <h1>Tài khoản chưa có quyền truy cập</h1>
          <p>Khu vực này chỉ dành cho tài khoản Admin đang hoạt động.</p>
          <Link className="admin-button" href="/">
            Về trang Buyer
          </Link>
        </section>
      </main>
    );
  }

  return children;
}
