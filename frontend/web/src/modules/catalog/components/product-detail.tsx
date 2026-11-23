'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Zap,
} from 'lucide-react';
import { catalogApi } from '../api/catalog.api';
import { formatPrice, type CatalogProduct } from '../api/catalog.factory';
import { ApiError, userMessage } from '../../../lib/axios/http';
import { StoreHeader } from '@/components/layout/store-header';
import { SellerReputationTrigger } from '@/modules/user/components/seller-reputation-drawer';
import { useSession } from '@/modules/auth/hooks/use-session';
import { useBuyerAssistant } from '@/modules/chat/context/buyer-assistant-provider';
import { addCartProductAsync } from '@/modules/commerce/utils/cart';
import { writeBuyNowLine } from '@/modules/commerce/utils/cart-selection';
import { FAVORITES_EVENT, hasFavorite, toggleFavorite } from '@/modules/commerce/utils/favorites';

const conditions: Record<string, string> = {
  NEW: 'Mới',
  LIKE_NEW: 'Như mới',
  USED: 'Đã qua sử dụng',
  REFURBISHED: 'Tân trang',
};

export function ProductDetail({ productId }: { productId: string }) {
  const router = useRouter();
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [photo, setPhoto] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartNotice, setCartNotice] = useState('');
  const [favorite, setFavorite] = useState(false);
  const { user } = useSession();
  const { setProductContext } = useBuyerAssistant();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setMissing(false);
    setProduct(null);
    setPhoto(0);
    setQuantity(1);
    setCartNotice('');
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

  useEffect(() => {
    const sync = () => setFavorite(hasFavorite(productId));
    sync();
    window.addEventListener(FAVORITES_EVENT, sync);
    return () => window.removeEventListener(FAVORITES_EVENT, sync);
  }, [productId]);

  useEffect(() => {
    if (!product) {
      setProductContext(null);
      return;
    }
    setProductContext({
      id: product.id,
      title: product.title,
      price: product.price ?? undefined,
      stock: product.stockQuantity ?? null,
      condition: product.condition ?? undefined,
    });
    return () => setProductContext(null);
  }, [product, setProductContext]);

  const maxQuantity =
    product?.stockQuantity !== null &&
    product?.stockQuantity !== undefined &&
    product.stockQuantity > 0
      ? product.stockQuantity
      : 99;

  const updateQuantity = (next: number) => {
    const clamped = Math.max(1, Math.min(maxQuantity, Math.floor(next) || 1));
    setQuantity(clamped);
  };

  const handleAddToCart = async () => {
    if (!product || addingToCart) return;
    setAddingToCart(true);
    try {
      await addCartProductAsync(product, quantity);
      setCartNotice(`Đã thêm ${quantity} sản phẩm vào giỏ hàng.`);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = () => {
    if (!product) return;
    writeBuyNowLine({
      productId: product.id,
      title: product.title,
      image: product.images[0] || '/images/nexus-product-placeholder.svg',
      price: product.price ?? 0,
      currency: product.currency || 'VND',
      quantity,
      stock: product.stockQuantity ?? null,
    });
    router.push('/checkout?mode=buy-now');
  };

  return (
    <>
      <StoreHeader />
      <main className="nexus-container pb-16 pt-6">
        <nav
          aria-label="Đường dẫn"
          className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted"
        >
          <Link className="inline-flex min-h-11 items-center hover:text-stone-900" href="/">
            Trang chủ
          </Link>
          <span>/</span>
          <Link className="inline-flex min-h-11 items-center hover:text-stone-900" href="/products">
            Sản phẩm
          </Link>
          <span>/</span>
          <span aria-current="page" className="text-stone-800 font-medium">
            Chi tiết
          </span>
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
              <section className="grid gap-7 rounded-3xl border border-line bg-white p-4 sm:p-7 lg:grid-cols-[1.05fr_1fr] shadow-xs">
                <div>
                  <div className="aspect-square overflow-hidden rounded-2xl border border-line/60 bg-stone-50">
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
                            'size-20 shrink-0 overflow-hidden rounded-xl border-2 bg-stone-50 ' +
                            (photo === i
                              ? 'border-brand ring-1 ring-brand/30'
                              : 'border-line hover:border-stone-300')
                          }
                        >
                          <img
                            src={src || '/images/nexus-product-placeholder.svg'}
                            onError={(e) => {
                              if (
                                !e.currentTarget.src.endsWith(
                                  '/images/nexus-product-placeholder.svg',
                                )
                              ) {
                                e.currentTarget.src = '/images/nexus-product-placeholder.svg';
                              }
                            }}
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

                <div className="flex flex-col py-1 lg:px-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand-dark">
                    {product.categoryName || 'Bộ sưu tập Nexus'}
                  </p>
                  <div className="mt-2.5 flex items-start justify-between gap-3">
                    <h1 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-stone-900">
                      {product.title}
                    </h1>
                    {user?.role === 'BUYER' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={favorite ? 'Bỏ sản phẩm khỏi yêu thích' : 'Thêm vào yêu thích'}
                        aria-pressed={favorite}
                        title={favorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
                        className={
                          'size-11 shrink-0 rounded-full ' +
                          (favorite ? 'border-brand text-brand' : 'text-muted')
                        }
                        onClick={() =>
                          setFavorite(
                            toggleFavorite({
                              id: product.id,
                              name: product.title,
                              image: product.images[0] || '/images/nexus-product-placeholder.svg',
                              price: product.price ?? 0,
                              saleType: product.saleType,
                              href: '/products/' + encodeURIComponent(product.id),
                            }),
                          )
                        }
                      >
                        <Heart
                          aria-hidden="true"
                          className="size-5"
                          fill={favorite ? 'currentColor' : 'none'}
                        />
                      </Button>
                    )}
                  </div>

                  <div className="mt-3.5 flex flex-wrap gap-2 text-xs">
                    {product.condition && (
                      <span className="rounded-full bg-stone-100 px-3 py-1.5 font-medium text-stone-700">
                        {conditions[product.condition] || product.condition}
                      </span>
                    )}
                    <span className="rounded-full bg-emerald-50 border border-emerald-200/70 px-3 py-1.5 font-medium text-emerald-800">
                      {product.status === 'ACTIVE'
                        ? 'Đang mở bán'
                        : product.status === 'DRAFT'
                          ? 'Chưa mở bán'
                          : 'Tạm ngừng hiển thị'}
                    </span>
                  </div>

                  <div className="my-6 rounded-2xl bg-brand-soft/75 border border-brand/15 p-5">
                    <p className="text-xs font-medium text-muted">Giá bán</p>
                    <p className="mt-1.5 break-words text-3xl font-bold tracking-tight text-brand-dark">
                      {formatPrice(product)}
                    </p>
                  </div>

                  <dl className="divide-y divide-line text-sm">
                    <div className="flex justify-between gap-5 py-3.5">
                      <dt className="text-muted">Người bán</dt>
                      <dd className="flex flex-wrap items-center justify-end gap-2 text-right font-semibold text-stone-900">
                        <span>{product.sellerName || 'Thông tin đang cập nhật'}</span>
                        <SellerReputationTrigger
                          sellerId={product.sellerId}
                          sellerName={product.sellerName}
                        />
                      </dd>
                    </div>
                    <div className="flex justify-between gap-5 py-3.5">
                      <dt className="text-muted">Kho hàng</dt>
                      <dd className="text-right font-semibold text-stone-900">
                        {product.stockQuantity === null
                          ? 'Đang cập nhật'
                          : product.stockQuantity === 0
                            ? 'Tạm hết hàng'
                            : `${product.stockQuantity} sản phẩm có sẵn`}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-5 py-3.5">
                      <dt className="text-muted">Hình thức giao dịch</dt>
                      <dd className="text-right font-semibold text-stone-900">
                        {product.saleType === 'FIXED_PRICE'
                          ? 'Mua trực tiếp · Thanh toán PayOS / COD'
                          : product.saleType === 'AUCTION'
                            ? 'Tham gia phiên đấu giá'
                            : 'Thông tin đang cập nhật'}
                      </dd>
                    </div>
                  </dl>

                  {product.saleType === 'FIXED_PRICE' && product.stockQuantity !== 0 && (
                    <div className="mt-5 space-y-4 border-t border-line pt-5">
                      {user?.role === 'BUYER' ? (
                        <>
                          {/* Bộ chọn số lượng kiểu Shopee */}
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className="text-sm font-medium text-stone-700">Số lượng</span>
                            <div className="flex items-center gap-3">
                              <div className="inline-flex items-center rounded-xl border border-line bg-white shadow-2xs">
                                <button
                                  type="button"
                                  aria-label="Giảm số lượng"
                                  disabled={quantity <= 1}
                                  onClick={() => updateQuantity(quantity - 1)}
                                  className="grid size-9 place-items-center text-stone-600 hover:bg-stone-50 disabled:opacity-40 rounded-l-xl"
                                >
                                  <Minus className="size-3.5" />
                                </button>
                                <input
                                  type="number"
                                  aria-label="Số lượng sản phẩm"
                                  min={1}
                                  max={maxQuantity}
                                  value={quantity}
                                  onChange={(e) => {
                                    const parsed = parseInt(e.target.value, 10);
                                    if (!Number.isNaN(parsed)) updateQuantity(parsed);
                                  }}
                                  className="h-9 w-12 border-x border-line bg-white text-center text-sm font-semibold text-stone-900 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <button
                                  type="button"
                                  aria-label="Tăng số lượng"
                                  disabled={quantity >= maxQuantity}
                                  onClick={() => updateQuantity(quantity + 1)}
                                  className="grid size-9 place-items-center text-stone-600 hover:bg-stone-50 disabled:opacity-40 rounded-r-xl"
                                >
                                  <Plus className="size-3.5" />
                                </button>
                              </div>
                              {product.stockQuantity !== null && product.stockQuantity > 0 && (
                                <span className="text-xs text-muted">
                                  Còn {product.stockQuantity} sản phẩm
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 2 nút chính: Thêm vào giỏ hàng + Mua ngay */}
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Button
                              type="button"
                              variant="outline"
                              disabled={addingToCart}
                              className="min-h-12 rounded-xl border-brand-dark bg-brand-soft/30 font-semibold text-brand-dark hover:bg-brand-soft/70"
                              onClick={handleAddToCart}
                            >
                              <ShoppingCart aria-hidden="true" className="mr-2 size-4" />
                              {addingToCart ? 'Đang thêm…' : 'Thêm vào giỏ hàng'}
                            </Button>
                            <Button
                              type="button"
                              className="min-h-12 rounded-xl bg-brand-dark px-5 font-semibold text-white hover:bg-brand shadow-xs"
                              onClick={handleBuyNow}
                            >
                              <Zap aria-hidden="true" className="mr-2 size-4" />
                              Mua ngay
                            </Button>
                          </div>
                        </>
                      ) : user ? (
                        <p
                          className="rounded-xl bg-stone-50 p-4 text-sm leading-6 text-muted"
                          role="note"
                        >
                          Bạn vẫn có thể xem đầy đủ sản phẩm. Chức năng mua hàng dành cho tài khoản
                          Buyer.
                        </p>
                      ) : (
                        <Link
                          href={`/login?next=${encodeURIComponent(`/products/${product.id}`)}`}
                          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-dark px-4 text-sm font-semibold text-white hover:bg-brand"
                        >
                          Đăng nhập để mua ngay
                        </Link>
                      )}
                    </div>
                  )}

                  {cartNotice && (
                    <div
                      role="status"
                      className="mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-900"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                        <span>{cartNotice}</span>
                      </span>
                      <Link
                        href="/cart"
                        className="font-semibold text-emerald-800 underline underline-offset-2 hover:text-emerald-950"
                      >
                        Mở giỏ hàng
                      </Link>
                    </div>
                  )}

                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-line/70 pt-4 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck className="size-4 shrink-0 text-emerald-700" />
                      <span>Bảo chứng Nexus Buyer Protection</span>
                    </span>
                    <Link
                      href="/products"
                      className="inline-flex items-center gap-1 font-semibold text-stone-700 hover:text-brand-dark transition"
                    >
                      <ArrowLeft className="size-3.5" />
                      <span>Khám phá thêm</span>
                    </Link>
                  </div>
                </div>
              </section>

              <section className="mt-6 rounded-3xl border border-line bg-white p-6 sm:p-8 shadow-xs">
                <h2 className="text-xl font-bold text-stone-900">Thông tin sản phẩm</h2>
                <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-muted">
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
