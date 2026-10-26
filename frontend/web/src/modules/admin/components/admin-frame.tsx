'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Gavel, LayoutDashboard, LogOut, PackageSearch, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NexusLogo } from '@/components/layout/nexus-logo';
import { useSession } from '@/modules/auth/hooks/use-session';

const navigation = [
  { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Sản phẩm', icon: PackageSearch },
  { href: '/admin/auctions', label: 'Phiên đấu giá', icon: Gavel },
  { href: '/admin/orders', label: 'Đơn hàng', icon: ReceiptText },
];

export function AdminFrame({
  children,
  name,
  actions,
  notice,
  homePath = '/',
  productsPath = '/products',
}: {
  children: React.ReactNode;
  name?: string;
  actions: React.ReactNode;
  notice?: React.ReactNode;
  homePath?: string;
  productsPath?: string;
}) {
  const pathname = usePathname() || homePath;
  const router = useRouter();
  const { user, logout } = useSession();
  const [loggingOut, setLoggingOut] = useState(false);
  const displayName = user?.fullName || name || 'Quản trị viên';

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      router.replace('/login');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="admin-week-shell">
      <a href="#admin-main" className="admin-skip">
        Đi đến nội dung
      </a>
      <aside className="admin-week-sidebar">
        <div className="admin-brand-wrap">
          <NexusLogo className="marketplace-logo admin-home-logo" href={homePath} />
          <p className="admin-brand-caption">QUẢN TRỊ · KHÔNG GIAN LÀM VIỆC</p>
        </div>
        <p className="admin-nav-label">MENU QUẢN TRỊ</p>
        <nav aria-label="Quản trị">
          {navigation.map(({ href, label, icon: Icon }, index) => {
            const active = href === '/admin' ? pathname === href : pathname.startsWith(href);
            return (
              <Link href={href} aria-current={active ? 'page' : undefined} key={href}>
                <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                <span>{label}</span>
                <small aria-hidden="true">0{index + 1}</small>
              </Link>
            );
          })}
        </nav>
        <div className="admin-sidebar-bottom">
          <strong>Project Nexus</strong>
          <p>Không gian vận hành và kiểm soát nội dung sàn.</p>
        </div>
      </aside>
      <div className="admin-week-panel">
        <header className="admin-week-topbar">
          <div className="admin-breadcrumb">
            <span>Quản trị</span>
            <span className="admin-muted" aria-hidden="true">
              /
            </span>
            <span className="admin-breadcrumb-current">
              {pathname.includes('/auctions')
                ? 'Phiên đấu giá'
                : pathname.includes('/products')
                  ? 'Sản phẩm'
                  : pathname.includes('/orders')
                    ? 'Đơn hàng'
                    : 'Tổng quan'}
            </span>
          </div>
          <div className="admin-topbar-right">
            {actions}
            <div className="admin-account">
              <span className="admin-account-avatar" aria-hidden="true">
                {displayName.trim().charAt(0).toUpperCase() || 'A'}
              </span>
              <span className="admin-account-details">
                <strong>{displayName}</strong>
                <small>Quản trị viên</small>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={loggingOut}
                aria-label="Đăng xuất khỏi Nexus Admin"
                className="admin-logout-button"
              >
                <LogOut aria-hidden="true" size={16} />
                {loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
              </Button>
            </div>
          </div>
        </header>
        <main id="admin-main" className="admin-week-content">
          {notice}
          {children}
        </main>
      </div>
    </div>
  );
}
