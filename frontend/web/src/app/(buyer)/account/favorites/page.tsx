'use client';

import Link from 'next/link';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { StoreHeader } from '@/components/layout/store-header';
import { useSession } from '@/modules/auth/hooks/use-session';
import { catalogApi } from '@/modules/catalog/api/catalog.api';
import { addCartProduct } from '@/modules/commerce/utils/cart';
import { userMessage } from '@/lib/axios/http';
import {
  FAVORITES_EVENT,
  readFavorites,
  removeFavorite,
  type FavoriteProduct,
} from '@/modules/commerce/utils/favorites';

const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;

export default function BuyerFavoritesPage() {
  const router = useRouter();
  const { user, phase } = useSession();
  const [items, setItems] = useState<FavoriteProduct[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [cartError, setCartError] = useState<{ id: string; message: string } | null>(null);

  async function moveToCart(item: FavoriteProduct) {
    setAddingId(item.id);
    setCartError(null);
    try {
      const product = await catalogApi.detail(item.id);
      if (product.saleType !== 'FIXED_PRICE') {
        setCartError({
          id: item.id,
          message: 'Món này thuộc phiên đấu giá, không thể thêm vào giỏ.',
        });
        return;
      }
      if (product.status !== 'ACTIVE' || product.stockQuantity === 0 || product.price === null) {
        setCartError({
          id: item.id,
          message: 'Sản phẩm hiện chưa thể mua. Vui lòng xem lại thông tin sản phẩm.',
        });
        return;
      }
      addCartProduct(product);
      router.push('/cart');
    } catch (error) {
      setCartError({ id: item.id, message: userMessage(error) });
    } finally {
      setAddingId(null);
    }
  }

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
                  {item.saleType === 'AUCTION' || item.href.startsWith('/auctions/') ? (
                    <Link
                      href={item.href}
                      className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-brand/25 bg-brand-soft px-4 text-sm font-semibold text-brand-dark transition hover:border-brand/50"
                    >
                      Xem phiên đấu giá
                    </Link>
                  ) : (
                    <Button
                      type="button"
                      className="mt-4 w-full"
                      disabled={addingId !== null}
                      onClick={() => void moveToCart(item)}
                    >
                      <ShoppingCart aria-hidden="true" className="size-4" />
                      {addingId === item.id ? 'Đang kiểm tra…' : 'Thêm vào giỏ và xem giỏ'}
                    </Button>
                  )}
                  {cartError?.id === item.id && (
                    <p role="alert" className="mt-2 text-xs leading-5 text-brand-dark">
                      {cartError.message}
                    </p>
                  )}
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
