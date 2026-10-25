'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ReputationBadge } from '@/components/reputation';

const navigation = [
  { href: '/seller', label: 'Tổng quan', icon: '⌂' },
  { href: '/seller/products', label: 'Sản phẩm', icon: '▦' },
  { href: '/seller/auctions', label: 'Đấu giá', icon: '◷' },
  { href: '/seller/orders', label: 'Đơn hàng', icon: '▤' },
  { href: '/seller/inventory', label: 'Tồn kho', icon: '▥' },
  { href: '/seller/reputation', label: 'Điểm uy tín', icon: '✦' },
];

export function SellerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const demoSeller = { fullName: 'Nexus Demo Seller' };

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
              item.href === '/seller'
                ? pathname === item.href
                : Boolean(pathname?.startsWith(item.href));
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
                  (item.href !== '/seller' && Boolean(pathname?.startsWith(item.href))),
              )?.label ?? 'Tổng quan'}
            </span>
          </div>
          <div className="seller-account">
            <ReputationBadge score={98} size="sm" />
            <span className="seller-avatar">{demoSeller.fullName.slice(0, 1).toUpperCase()}</span>
            <span>
              <strong>{demoSeller.fullName}</strong>
              <small>Seller · Demo</small>
            </span>
          </div>
        </header>
        <main className="seller-content">{children}</main>
      </div>
    </div>
  );
}
