'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useSession } from '@/modules/auth/hooks/use-session';

/**
 * Component Route Guard: SupportRouteGuard
 * Khắc phục triệt để BUG-04 (P0): Chặn truy cập trái phép vào không gian Support Staff.
 *
 * Tiêu chí bảo vệ:
 * 1. Chỉ người dùng đã đăng nhập có token hợp lệ mới được truy cập.
 * 2. Vai trò bắt buộc: SUPPORT_STAFF hoặc ADMIN.
 * 3. Tự động chuyển hướng về /login?next=... nếu chưa đăng nhập.
 * 4. Hiển thị thông báo từ chối truy cập (Access Denied) nếu đăng nhập bằng BUYER hoặc SELLER.
 */
export function SupportRouteGuard({ children }: { children: ReactNode }) {
  const { user, phase, error, retry, logout } = useSession();
  const router = useRouter();
  const pathname = usePathname() || '/support';

  useEffect(() => {
    // Khi đã kiểm tra xong phiên làm việc (ready) mà không có user -> redirect về trang login
    if (phase === 'ready' && !user) {
      router.replace('/login?next=' + encodeURIComponent(pathname));
    }
  }, [phase, user, pathname, router]);

  // 1. Trạng thái đang xác thực phiên đăng nhập
  if (phase === 'loading' || (phase === 'ready' && !user)) {
    return (
      <main className="support-status-wrap" role="status">
        <div className="support-spinner" aria-hidden="true" />
        <p>Đang xác minh phiên làm việc Support Staff…</p>
      </main>
    );
  }

  // 2. Trạng thái lỗi xác thực phiên
  if (phase === 'error') {
    return (
      <main className="support-status-wrap">
        <section className="support-access-card" role="alert">
          <p className="support-eyebrow">XÁC MINH PHIÊN THẤT BẠI</p>
          <h2>Không thể xác minh phiên làm việc</h2>
          <p>{error || 'Đã có lỗi xảy ra trong quá trình xác thực. Vui lòng thử lại.'}</p>
          <div className="support-guard-actions">
            <button type="button" className="support-guard-button primary" onClick={retry}>
              Thử lại
            </button>
            <Link className="support-guard-button secondary" href="/">
              Về trang chủ
            </Link>
          </div>
        </section>
      </main>
    );
  }

  // 3. Trạng thái đã đăng nhập nhưng sai vai trò (Không phải SUPPORT_STAFF hoặc ADMIN)
  const isAuthorized = user?.role === 'SUPPORT_STAFF' || user?.role === 'ADMIN';

  if (!isAuthorized) {
    return (
      <main className="support-status-wrap">
        <section className="support-access-card" role="alert">
          <p className="support-eyebrow">KHU VỰC NỘI BỘ · QUYỀN TRUY CẬP BỊ TỪ CHỐI</p>
          <h2>Tài khoản không có quyền truy cập</h2>
          <p>
            Không gian này chỉ dành riêng cho <strong>Nhân viên Hỗ trợ (Support Staff)</strong> hoặc{' '}
            <strong>Quản trị viên (Admin)</strong> của Nexus.
          </p>
          <p className="support-guard-user-info">
            Tài khoản hiện tại: <strong>{user?.email}</strong> (Vai trò: <code>{user?.role}</code>)
          </p>
          <div className="support-guard-actions">
            <Link className="support-guard-button primary" href="/">
              Về Marketplace
            </Link>
            <button
              type="button"
              className="support-guard-button secondary"
              onClick={async () => {
                await logout();
                router.replace('/login?next=' + encodeURIComponent(pathname));
              }}
            >
              Đăng xuất & Đổi tài khoản
            </button>
          </div>
        </section>
      </main>
    );
  }

  // 4. Hợp lệ: Hiển thị nội dung khu vực Support Staff
  return <>{children}</>;
}
