'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NexusLogo } from './nexus-logo';
import { AccountControls } from '@/modules/user/components/account-controls';
import { BuyerStoreActions } from '@/modules/commerce/components/buyer-store-actions';
import { useSession } from '@/modules/auth/hooks/use-session';

export function StoreHeader() {
  const pathname = usePathname();
  const { user } = useSession();

  const isHome = pathname === '/';
  const isProducts = pathname?.startsWith('/products');
  const isAuctions = pathname?.startsWith('/auctions');
  const isOrders = pathname?.startsWith('/account/orders');

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur-xl">
      <div className="nexus-container flex min-h-20 flex-wrap items-center justify-between gap-3 py-3">
        <NexusLogo className="marketplace-logo" />
        <nav
          aria-label="Điều hướng chính"
          className="order-3 flex w-full justify-center gap-5 border-t border-line pt-2 text-sm sm:order-none sm:w-auto sm:border-0 sm:pt-0"
        >
          {user ? (
            <>
              <Link
                href="/"
                className={`inline-flex min-h-11 items-center transition-colors ${
                  isHome
                    ? 'font-bold text-brand-dark border-b-2 border-brand'
                    : 'text-muted hover:text-brand-dark'
                }`}
              >
                Trang chủ
              </Link>
              <Link
                href="/products"
                className={`inline-flex min-h-11 items-center transition-colors ${
                  isProducts
                    ? 'font-bold text-brand-dark border-b-2 border-brand'
                    : 'text-muted hover:text-brand-dark'
                }`}
              >
                Sản phẩm
              </Link>
              <Link
                href="/auctions"
                className={`inline-flex min-h-11 items-center transition-colors ${
                  isAuctions
                    ? 'font-bold text-brand-dark border-b-2 border-brand'
                    : 'text-muted hover:text-brand-dark'
                }`}
              >
                Phiên đấu giá
              </Link>
              <Link
                href="/account/orders"
                className={`inline-flex min-h-11 items-center transition-colors ${
                  isOrders
                    ? 'font-bold text-brand-dark border-b-2 border-brand'
                    : 'text-muted hover:text-brand-dark'
                }`}
              >
                Đơn mua
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/"
                className={`inline-flex min-h-11 items-center transition-colors ${
                  isHome
                    ? 'font-bold text-brand-dark border-b-2 border-brand'
                    : 'text-muted hover:text-brand-dark'
                }`}
              >
                Trang chủ
              </Link>
              <Link
                href="/auctions"
                className={`inline-flex min-h-11 items-center transition-colors ${
                  isAuctions
                    ? 'font-bold text-brand-dark border-b-2 border-brand'
                    : 'text-muted hover:text-brand-dark'
                }`}
              >
                Đấu giá trực tiếp
              </Link>
              <Link
                href="/products"
                className={`inline-flex min-h-11 items-center transition-colors ${
                  isProducts
                    ? 'font-bold text-brand-dark border-b-2 border-brand'
                    : 'text-muted hover:text-brand-dark'
                }`}
              >
                Tất cả sản phẩm
              </Link>
              <Link
                href="/#how-it-works"
                className="inline-flex min-h-11 items-center text-muted hover:text-brand-dark"
              >
                Nexus hoạt động thế nào?
              </Link>
            </>
          )}
        </nav>
        <BuyerStoreActions />
        <AccountControls />
      </div>
    </header>
  );
}
