'use client';

import Link from 'next/link';
import { Heart, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { StoreHeader } from '@/components/layout/store-header';
import { useSession } from '@/modules/auth/hooks/use-session';
import {
  FAVORITES_EVENT,
  readFavorites,
  removeFavorite,
  type FavoriteProduct,
} from '@/modules/commerce/utils/favorites';

const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;

export default function BuyerFavoritesPage() {
  const { user, phase } = useSession();
  const [items, setItems] = useState<FavoriteProduct[]>([]);

  useEffect(() => {
    const sync = () => setItems(readFavorites());
    sync();
    window.addEventListener(FAVORITES_EVENT, sync);
    return () => window.removeEventListener(FAVORITES_EVENT, sync);
  }, []);

  return (
    <>
      <StoreHeader />
      <main className="nexus-container min-h-[70vh] py-8">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-dark">
          BỘ SƯU TẬP CỦA BẠN
        </p>
        <div className="mt-2 flex items-center gap-3">
          <Heart aria-hidden="true" className="size-7 text-brand" />
          <h1 className="text-3xl font-bold">Sản phẩm yêu thích</h1>
        </div>
        {phase === 'loading' ? (
          <p className="mt-6 text-sm text-muted" role="status">
            Đang kiểm tra tài khoản…
          </p>
        ) : user?.role !== 'BUYER' ? (
          <section className="mt-6 rounded-2xl border border-line bg-white p-8 text-center">
            <p className="text-muted">Danh sách yêu thích dành cho tài khoản Buyer.</p>
            <Link
              href="/login?next=%2Faccount%2Ffavorites"
              className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-brand-dark px-5 text-sm font-semibold text-white"
            >
              Đăng nhập Buyer
            </Link>
          </section>
        ) : items.length === 0 ? (
          <section className="mt-6 rounded-2xl border border-line bg-white p-10 text-center">
            <Heart aria-hidden="true" className="mx-auto size-9 text-muted" />
            <h2 className="mt-4 text-lg font-semibold">Bạn chưa lưu sản phẩm nào</h2>
            <p className="mt-2 text-sm text-muted">
              Chạm vào biểu tượng trái tim trên sản phẩm để lưu lại tại đây.
            </p>
            <Link
              href="/products"
              className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-brand-dark px-5 text-sm font-semibold text-white"
            >
              Khám phá sản phẩm
            </Link>
          </section>
        ) : (
          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-2xl border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <Link href={item.href} className="block aspect-square bg-stone-100">
                  <img src={item.image} alt={item.name} className="size-full object-cover" />
                </Link>
                <div className="p-4">
                  <Link
                    href={item.href}
                    className="line-clamp-2 min-h-11 font-semibold hover:underline"
                  >
                    {item.name}
                  </Link>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="font-bold text-brand-dark">{money(item.price)}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Bỏ ${item.name} khỏi yêu thích`}
                      onClick={() => removeFavorite(item.id)}
                      className="text-muted hover:text-brand"
                    >
                      <Trash2 aria-hidden="true" className="mr-1 size-4" />
                      Bỏ lưu
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
        <p className="mt-6 text-xs text-muted">
          Danh sách này được lưu trên trình duyệt hiện tại; chưa đồng bộ giữa các thiết bị.
        </p>
      </main>
    </>
  );
}
