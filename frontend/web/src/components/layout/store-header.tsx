import Link from 'next/link';
import { NexusLogo } from './nexus-logo';
import { AccountControls } from '@/modules/user/components/account-controls';
import { BuyerStoreActions } from '@/modules/commerce/components/buyer-store-actions';
export function StoreHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur-xl">
      <div className="nexus-container flex min-h-20 flex-wrap items-center justify-between gap-3 py-3">
        <NexusLogo className="marketplace-logo" />
        <nav
          aria-label="Điều hướng chính"
          className="order-3 flex w-full justify-center gap-5 border-t border-line pt-2 text-sm sm:order-none sm:w-auto sm:border-0 sm:pt-0"
        >
          <Link
            href="/"
            className="inline-flex min-h-11 items-center text-muted hover:text-brand-dark"
          >
            Trang chủ
          </Link>
          <Link
            href="/products"
            className="inline-flex min-h-11 items-center font-semibold text-brand-dark"
          >
            Sản phẩm
          </Link>
          <Link
            href="/auctions"
            className="inline-flex min-h-11 items-center text-muted hover:text-brand-dark"
          >
            Phiên đấu giá
          </Link>
          <Link
            href="/account/orders"
            className="inline-flex min-h-11 items-center text-muted hover:text-brand-dark"
          >
            Đơn mua
          </Link>
        </nav>
        <BuyerStoreActions />
        <AccountControls />
      </div>
    </header>
  );
}
