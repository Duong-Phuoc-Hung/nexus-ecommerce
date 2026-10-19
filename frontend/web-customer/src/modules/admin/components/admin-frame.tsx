'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  return (
    <div className="admin-week-shell">
      <a href="#admin-main" className="admin-skip">
        Đi đến nội dung
      </a>
      <aside className="admin-week-sidebar">
        <Link href={homePath} className="admin-wordmark">
          NEXUS<span>.</span>
          <small>QUẢN TRỊ</small>
        </Link>
        <p className="admin-nav-label">KHÔNG GIAN LÀM VIỆC</p>
        <nav aria-label="Quản trị">
          <Link href={homePath} aria-current={pathname === homePath ? 'page' : undefined}>
            <span aria-hidden="true">01</span>Tổng quan
          </Link>
          <Link
            href={productsPath}
            aria-current={pathname.startsWith(productsPath) ? 'page' : undefined}
          >
            <span aria-hidden="true">02</span>Sản phẩm
          </Link>
          <Link
            href="/admin/auctions"
            aria-current={pathname.startsWith('/admin/auctions') ? 'page' : undefined}
          >
            <span aria-hidden="true">03</span>Phiên đấu giá
          </Link>
        </nav>
        <div className="admin-sidebar-bottom">
          <strong>Project Nexus</strong>
          <p>
            Quản lý thông tin sản phẩm
            <br />
            theo quyền của tài khoản.
          </p>
        </div>
      </aside>
      <div className="admin-week-panel">
        <header className="admin-week-topbar">
          <span>
            Quản trị{' '}
            <span className="admin-muted">
              /{' '}
              {pathname.includes('/auctions')
                ? 'Phiên đấu giá'
                : pathname.includes('/products')
                  ? 'Sản phẩm'
                  : 'Tổng quan'}
            </span>
          </span>
          <div className="admin-account">
            <span>{name}</span>
            {actions}
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
