'use client';

import Link from 'next/link';
import { Heart, ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FAVORITES_EVENT, readFavorites } from '../utils/favorites';
import { readCart } from '../utils/cart';
import { useSession } from '@/modules/auth/hooks/use-session';

export function BuyerStoreActions() {
  const { user } = useSession();
  const [cartCount, setCartCount] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);

  useEffect(() => {
    const sync = () => {
      setCartCount(readCart().reduce((count, item) => count + item.quantity, 0));
      setFavoriteCount(readFavorites().length);
    };
    sync();
    window.addEventListener('nexus-cart-change', sync);
    window.addEventListener(FAVORITES_EVENT, sync);
    return () => {
      window.removeEventListener('nexus-cart-change', sync);
      window.removeEventListener(FAVORITES_EVENT, sync);
    };
  }, []);

  if (user?.role !== 'BUYER') return null;

  return (
    <div className="flex items-center gap-1.5">
      <Link
        href="/account/favorites"
        aria-label={`Sản phẩm yêu thích${favoriteCount ? `, ${favoriteCount} sản phẩm` : ''}`}
        title="Sản phẩm yêu thích"
        className="relative inline-flex size-11 items-center justify-center rounded-xl text-ink transition hover:bg-brand-soft hover:text-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <Heart aria-hidden="true" className="size-5" />
        {favoriteCount > 0 && (
          <span className="absolute right-0.5 top-0.5 grid size-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[9px] font-bold text-white">
            {favoriteCount > 99 ? '99+' : favoriteCount}
          </span>
        )}
      </Link>
      <Link
        href="/cart"
        aria-label={`Giỏ hàng${cartCount ? `, ${cartCount} sản phẩm` : ''}`}
        title="Giỏ hàng"
        className="relative inline-flex size-11 items-center justify-center rounded-xl text-ink transition hover:bg-brand-soft hover:text-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <ShoppingCart aria-hidden="true" className="size-5" />
        {cartCount > 0 && (
          <span className="absolute right-0.5 top-0.5 grid size-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[9px] font-bold text-white">
            {cartCount > 99 ? '99+' : cartCount}
          </span>
        )}
      </Link>
    </div>
  );
}
