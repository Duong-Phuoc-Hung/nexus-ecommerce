'use client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { catalogApi } from '../api/catalog.api';
import { formatPrice, type CatalogProduct } from '../api/catalog.factory';
import { ApiError, userMessage } from '../../../lib/axios/http';
import { StoreHeader } from '@/components/layout/store-header';
import { useSession } from '@/modules/auth/hooks/use-session';
import { addCartProduct } from '@/modules/commerce/utils/cart';
const conditions: Record<string, string> = {
  NEW: 'Mới',
  LIKE_NEW: 'Như mới',
  USED: 'Đã qua sử dụng',
  REFURBISHED: 'Tân trang',
};
export function ProductDetail({ productId }: { productId: string }) {
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [photo, setPhoto] = useState(0);
  const [cartNotice, setCartNotice] = useState('');
  const { user } = useSession();
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setMissing(false);
    setProduct(null);
    setPhoto(0);
    catalogApi
      .detail(productId, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result.status && result.status !== 'ACTIVE') {
          setMissing(true);
          setError('Sản phẩm hiện không được hiển thị. Vui lòng khám phá lựa chọn khác.');
          return;
        }
        setProduct(result);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setMissing(err instanceof ApiError && err.status === 404);
          setError(userMessage(err));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [productId, revision]);
  return (
    <>
      <StoreHeader />
      <main className="nexus-container pb-16 pt-6">
        <nav
          aria-label="Đường dẫn"
          className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted"
        >
          <Link className="inline-flex min-h-11 items-center" href="/">
            Trang chủ
          </Link>
          <span>/</span>
          <Link className="inline-flex min-h-11 items-center" href="/products">
            Sản phẩm
          </Link>
          <span>/</span>
          <span aria-current="page">Chi tiết</span>
        </nav>
        {loading ? (
          <div
            role="status"
            className="grid gap-8 rounded-3xl border border-line bg-white p-6 lg:grid-cols-2"
          >
            <div className="aspect-square animate-pulse rounded-2xl bg-stone-100 motion-reduce:animate-none" />
            <div className="space-y-5 pt-6">
              <span className="sr-only">Đang tải sản phẩm…</span>
              {[80, 100, 60].map((w) => (
                <div key={w} className="h-6 rounded bg-stone-100" style={{ width: w + '%' }} />
              ))}
            </div>
          </div>
        ) : error ? (
          <section
            role="alert"
            className="rounded-3xl border border-line bg-white p-10 text-center"
          >
            <h1 className="text-2xl font-bold">
              {missing ? 'Món đồ này không còn khả dụng' : 'Chưa tải được thông tin sản phẩm'}
            </h1>
            <p className="mt-3 text-sm text-muted">{error}</p>
            <div className="mt-6 flex justify-center gap-3">
              {!missing && (
                <Button
                  variant="ghost"
                  size="plain"
                  type="button"
                  onClick={() => setRevision((r) => r + 1)}
                  className="min-h-11 rounded-xl bg-brand-dark px-5 text-sm font-semibold text-white"
                >
                  Thử lại
                </Button>
              )}
              <Link
                href="/products"
                className="inline-flex min-h-11 items-center rounded-xl border border-line px-5 text-sm font-semibold"
              >
                Khám phá sản phẩm khác
              </Link>
            </div>
          </section>
        ) : (
          product && (
            <>
              <section className="grid gap-7 rounded-3xl border border-line bg-white p-4 sm:p-7 lg:grid-cols-[1.05fr_1fr]">
                <div>
                  <div className="aspect-square overflow-hidden rounded-2xl bg-stone-100">
                    <img
                      key={photo}
                      src={product.images[photo] || '/images/nexus-product-placeholder.svg'}
                      onError={(e) => {
                        if (!e.currentTarget.src.endsWith('/images/nexus-product-placeholder.svg'))
                          e.currentTarget.src = '/images/nexus-product-placeholder.svg';
                      }}
                      alt={product.title + ' — ảnh ' + (photo + 1)}
                      width={800}
                      height={800}
                      className="size-full object-contain"
                    />
                  </div>
                  {product.images.length > 1 && (
                    <div className="mt-4 flex gap-3 overflow-x-auto pb-2" aria-label="Ảnh sản phẩm">
                      {product.images.map((src, i) => (
                        <Button
                          variant="ghost"
                          size="plain"
                          key={src + i}
                          type="button"
                          onClick={() => setPhoto(i)}
                          aria-label={'Xem ảnh ' + (i + 1)}
                          aria-pressed={photo === i}
                          className={
                            'size-20 shrink-0 overflow-hidden rounded-xl border-2 ' +
                            (photo === i ? 'border-brand' : 'border-line')
                          }
                        >
                          <img
                            src={src}
                            alt=""
                            width={80}
                            height={80}
                            className="size-full object-cover"
                          />
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="py-2 lg:px-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand-dark">
                    {product.categoryName || 'Bộ sưu tập Nexus'}
                  </p>
                  <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight">
                    {product.title}
                  </h1>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {product.condition && (
                      <span className="rounded-full bg-stone-100 px-3 py-2">
                        {conditions[product.condition] || product.condition}
                      </span>
                    )}
                    <span className="rounded-full bg-stone-100 px-3 py-2">
                      {product.status === 'ACTIVE'
                        ? 'Đang hiển thị'
                        : product.status === 'DRAFT'
                          ? 'Chưa mở bán'
                          : 'Tạm ngừng hiển thị'}
                    </span>
                  </div>
                  <div className="my-7 rounded-2xl bg-brand-soft p-5">
                    <p className="text-sm text-muted">Giá sản phẩm</p>
                    <p className="mt-2 break-words text-3xl font-bold tracking-tight text-brand-dark">
                      {formatPrice(product)}
                    </p>
                  </div>
                  <dl className="divide-y divide-line text-sm">
                    <div className="flex justify-between gap-5 py-4">
                      <dt className="text-muted">Người bán</dt>
                      <dd className="text-right font-semibold">
                        {product.sellerName || 'Thông tin đang cập nhật'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-5 py-4">
                      <dt className="text-muted">Tình trạng hàng</dt>
                      <dd className="text-right font-semibold">
                        {product.stockQuantity === null
                          ? 'Số lượng đang được cập nhật'
                          : product.stockQuantity === 0
                            ? 'Tạm hết hàng'
                            : product.stockQuantity + ' sản phẩm khả dụng'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-5 py-4">
                      <dt className="text-muted">Hình thức giao dịch</dt>
                      <dd className="text-right font-semibold">
                        {product.saleType === 'FIXED_PRICE'
                          ? 'Mua sắm'
                          : product.saleType === 'AUCTION'
                            ? 'Tham gia phiên đấu'
                            : 'Thông tin đang cập nhật'}
                      </dd>
                    </div>
                  </dl>
                  <div
                    className="mt-6 rounded-xl border border-line p-4 text-sm leading-6 text-muted"
                    role="note"
                  >
                    {
                      'Kiểm tra hình ảnh, tình trạng và thông tin người bán trước khi lựa chọn sản phẩm.'
                    }
                  </div>
                  {product.saleType === 'FIXED_PRICE' && product.stockQuantity !== 0 && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {user?.role === 'BUYER' ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-12 rounded-xl border-brand-dark font-semibold text-brand-dark"
                          onClick={() => {
                            addCartProduct(product);
                            setCartNotice('Đã thêm vào giỏ hàng.');
                          }}
                        >
                          Thêm vào giỏ hàng
                        </Button>
                      ) : (
                        <Link
                          href={`/login?next=${encodeURIComponent(`/products/${product.id}`)}`}
                          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold"
                        >
                          Đăng nhập để mua
                        </Link>
                      )}
                      <Link
                        href="/cart"
                        className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-dark px-4 text-sm font-semibold text-white hover:bg-brand"
                      >
                        Xem giỏ hàng
                      </Link>
                    </div>
                  )}
                  {cartNotice && (
                    <p className="mt-3 text-sm font-medium text-emerald-700" role="status">
                      {cartNotice}
                    </p>
                  )}
                  <Link
                    href="/products"
                    className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-dark px-5 text-sm font-semibold text-white hover:bg-brand"
                  >
                    Tiếp tục khám phá
                  </Link>
                </div>
              </section>
              <section className="mt-6 rounded-3xl border border-line bg-white p-6 sm:p-8">
                <h2 className="text-xl font-bold">Thông tin sản phẩm</h2>
                <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-muted">
                  {product.description || 'Người bán chưa cung cấp mô tả chi tiết.'}
                </p>
              </section>
            </>
          )
        )}
      </main>
    </>
  );
}
