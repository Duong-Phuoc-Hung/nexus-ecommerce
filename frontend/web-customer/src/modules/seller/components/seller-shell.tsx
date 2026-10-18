'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { AuthUser, authApi } from '@/services/auth.api';

const navigation = [
  { href: '/seller', label: 'Tổng quan', icon: '⌂' },
  { href: '/seller/products', label: 'Sản phẩm', icon: '▦' },
  { href: '/seller/auctions', label: 'Đấu giá', icon: '◷' },
  { href: '/seller/orders', label: 'Đơn hàng', icon: '▤' },
  { href: '/seller/inventory', label: 'Tồn kho', icon: '▥' },
];

export function SellerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setUser(authApi.getCurrentUser());
    setChecked(true);
  }, []);

  async function logout() {
    await authApi.logout().catch(() => undefined);
    router.push('/login');
  }

  if (!checked) {
    return <main className="seller-access-state">Đang kiểm tra phiên đăng nhập…</main>;
  }

  if (!user || user.role !== 'SELLER') {
    return (
      <main className="seller-access-state">
        <section>
          <span className="seller-brand-mark">N</span>
          <p className="seller-eyebrow">NEXUS SELLER CENTER</p>
          <h1>Cần đăng nhập bằng tài khoản Seller</h1>
          <p>Khu vực này chỉ dành cho tài khoản đã được cấp vai trò người bán.</p>
          <Link className="seller-primary-link" href="/login">
            Đăng nhập
          </Link>
          <Link className="seller-back-link" href="/">
            Về trang chủ
          </Link>
        </section>
      </main>
    );
  }

  return (
    <div className="seller-workspace">
      <aside className="seller-sidebar">
        <Link className="seller-brand" href="/seller">
          <span className="seller-brand-mark">N</span>
          <span>
            NEXUS <small>SELLER</small>
          </span>
        </Link>
        <p className="seller-nav-caption">BÁN HÀNG</p>
        <nav aria-label="Seller navigation">
          {navigation.map((item) => {
            const active =
              item.href === '/seller' ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                className={`seller-nav-item ${active ? 'active' : ''}`}
                href={item.href}
                key={item.href}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="seller-sidebar-foot">
          <span>DEMO WORKSPACE</span>
          <br />
          Nexus Marketplace
        </div>
      </aside>
      <div className="seller-main">
        <header className="seller-topbar">
          <div>
            <span className="seller-topbar-label">Không gian người bán</span>
            <span className="seller-topbar-crumb">
              {' '}
              /{' '}
              {navigation.find(
                (item) =>
                  item.href === pathname ||
                  (item.href !== '/seller' && pathname.startsWith(item.href)),
              )?.label ?? 'Tổng quan'}
            </span>
          </div>
          <div className="seller-account">
            <span className="seller-avatar">{user.fullName.slice(0, 1).toUpperCase()}</span>
            <span>
              <strong>{user.fullName}</strong>
              <small>Seller</small>
            </span>
            <button type="button" onClick={logout}>
              Đăng xuất
            </button>
          </div>
        </header>
        <main className="seller-content">{children}</main>
      </div>
    </div>
  );
}
