'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useSession } from '@/modules/auth/hooks/use-session';
import { SupportRouteGuard } from './support-route-guard';

const items = [
  { href: '/support', label: 'Tổng quan', icon: '⌂' },
  { href: '/support/orders', label: 'Tra cứu đơn hàng', icon: '▤' },
  { href: '/support/users', label: 'Tra cứu người dùng', icon: '◎' },
  { href: '/support/shipments', label: 'Vận đơn', icon: '⇢' },
];

export function SupportShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout: logoutSession } = useSession();

  const displayName = user?.fullName || user?.email || 'Nhân viên hỗ trợ';
  const roleLabel =
    user?.role === 'SUPPORT_STAFF'
      ? 'Nhân viên hỗ trợ · Ca trực'
      : user?.role === 'ADMIN'
        ? 'Quản trị viên'
        : user?.role
          ? `Vai trò: ${user.role}`
          : 'Chưa đăng nhập';

  async function logout() {
    await logoutSession();
    window.location.replace('/login');
  }

  return (
    <div className="support-shell">
      <aside className="support-sidebar">
        <Link className="support-brand" href="/support">
          <span className="support-brand-mark">N</span>
          <span>
            NEXUS <small>HỖ TRỢ</small>
          </span>
        </Link>
        <p className="support-nav-caption">VẬN HÀNH & HỖ TRỢ</p>
        <nav aria-label="Support navigation">
          {items.map((item) => {
            const active =
              item.href === '/support'
                ? pathname === item.href
                : Boolean(pathname?.startsWith(item.href));
            return (
              <Link
                className={`support-nav-item ${active ? 'active' : ''}`}
                href={item.href}
                key={item.href}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="support-sidebar-foot">
          <span>CỔNG HỖ TRỢ KHÁCH HÀNG</span>
          <br />
          Nexus Operations
        </div>
      </aside>
      <div className="support-main">
        <header className="support-topbar">
          <div>
            <span>Cổng hỗ trợ vận hành</span>
            <small>
              {' '}
              /{' '}
              {items.find(
                (item) =>
                  item.href === pathname ||
                  (item.href !== '/support' && Boolean(pathname?.startsWith(item.href))),
              )?.label ?? 'Chi tiết đơn hàng'}
            </small>
          </div>
          <div className="support-agent">
            <span className="support-agent-avatar">{displayName.slice(0, 1).toUpperCase()}</span>
            <span>
              <strong>{displayName}</strong>
              <small>{roleLabel}</small>
            </span>
            <Link href="/" className="support-to-store-btn" title="Quay về trang chủ cửa hàng">
              <span aria-hidden="true">⌂</span>
              <span>Về cửa hàng</span>
            </Link>
            <button type="button" onClick={logout}>
              Đăng xuất
            </button>
          </div>
        </header>
        <main className="support-content">
          <SupportRouteGuard>{children}</SupportRouteGuard>
        </main>
      </div>
    </div>
  );
}
