'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '@/modules/auth/hooks/use-session';
import { roleHomePath } from '@/lib/utils/navigation';

export function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const { user, phase, error, retry } = useSession();
  const router = useRouter();
  const pathname = usePathname() || '/admin';

  useEffect(() => {
    if (phase === 'ready' && !user) {
      router.replace('/login?next=' + encodeURIComponent(pathname));
    }
  }, [phase, user, pathname, router]);

  useEffect(() => {
    if (phase === 'ready' && user && (user.role !== 'ADMIN' || user.status !== 'ACTIVE')) {
      router.replace(roleHomePath(user.role));
    }
  }, [phase, user, router]);

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

  if (user?.role !== 'ADMIN' || user.status !== 'ACTIVE') {
    return (
      <main className="admin-status" role="status">
        Đang chuyển bạn đến không gian phù hợp…
      </main>
    );
  }

  return children;
}
