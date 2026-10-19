'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { adminApi } from '@/services/admin-api';

const items = [
  { href: '/support', label: 'Tổng quan', icon: '⌂' },
  { href: '/support/orders', label: 'Tra cứu đơn hàng', icon: '▤' },
  { href: '/support/users', label: 'Tra cứu người dùng', icon: '◎' },
  { href: '/support/shipments', label: 'Vận đơn', icon: '⇢' },
];

export function SupportShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [name, setName] = useState('Nhân viên hỗ trợ');

  useEffect(() => {
    const user = adminApi.getCurrentUser();
    if (user?.role === 'SUPPORT_STAFF') setName(user.fullName || user.email);
  }, []);

  async function logout() {
    await adminApi.logout().catch(() => undefined);
    router.push('/');
  }

  return (
    <div className="support-shell">
      <aside className="support-sidebar">
        <Link className="support-brand" href="/support">
          <span className="support-brand-mark">N</span>
          <span>
            NEXUS <small>SUPPORT</small>
          </span>
        </Link>
        <p className="support-nav-caption">CUSTOMER OPERATIONS</p>
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
          <span>SUPPORT WORKSPACE</span>
          <br />
          Nexus Operations
        </div>
      </aside>
      <div className="support-main">
        <header className="support-topbar">
          <div>
            <span>Support workspace</span>
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
            <span className="support-agent-avatar">{name.slice(0, 1).toUpperCase()}</span>
            <span>
              <strong>{name}</strong>
              <small>Support Staff · Demo</small>
            </span>
            <button type="button" onClick={logout}>
              Đăng xuất
            </button>
          </div>
        </header>
        <main className="support-content">{children}</main>
      </div>
    </div>
  );
}
