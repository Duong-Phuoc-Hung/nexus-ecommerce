'use client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { catalogApi } from '../api/catalog.api';
import {
  parseCatalogQuery,
  queryString,
  formatPrice,
  type CatalogPage,
  type CatalogProduct,
  type CatalogCategory,
  type CatalogQuery,
} from '../api/catalog.factory';
import { userMessage } from '../../../lib/axios/http';
import { Heart } from 'lucide-react';
import { useSession } from '@/modules/auth/hooks/use-session';
import { FAVORITES_EVENT, readFavorites, toggleFavorite } from '@/modules/commerce/utils/favorites';
import { MarketplaceIcon } from '@/modules/home/components/marketplace-icon';
import { StoreHeader } from '@/components/layout/store-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const inputClass =
  'min-h-11 w-full rounded-xl border border-line bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';
export function CatalogSkeleton() {
  return (
    <div role="status" className="nexus-container py-8">
      <span className="sr-only">Đang tải sản phẩm…</span>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-line bg-white">
            <div className="aspect-square animate-pulse bg-stone-100 motion-reduce:animate-none" />
            <div className="space-y-3 p-4">
              <div className="h-4 w-3/4 rounded bg-stone-100" />
              <div className="h-5 w-1/2 rounded bg-stone-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
const conditionText: Record<string, string> = {
  NEW: 'Mới',
  LIKE_NEW: 'Như mới',
  USED: 'Đã qua sử dụng',
  REFURBISHED: 'Tân trang',
};
export function CatalogListing({ embedded = false }: { embedded?: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const key = params?.toString() || '';
  const query = parseCatalogQuery(new URLSearchParams(key));
  if (embedded) query.pageSize = 8;
  const [draft, setDraft] = useState(query);
  const [data, setData] = useState<CatalogPage | null>(null);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [categoryError, setCategoryError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [openFilters, setOpenFilters] = useState(false);
  const [validation, setValidation] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const { user } = useSession();
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const requestedNavigation = useRef(false);
  useEffect(() => {
    const syncFavorites = () => setFavoriteIds(readFavorites().map((item) => item.id));
    syncFavorites();
    window.addEventListener(FAVORITES_EVENT, syncFavorites);
    return () => window.removeEventListener(FAVORITES_EVENT, syncFavorites);
  }, []);
  useEffect(() => {
    setDraft(parseCatalogQuery(new URLSearchParams(key)));
  }, [key]);
  useEffect(() => {
    const controller = new AbortController();
    setCategoryError('');
    catalogApi
      .categories(controller.signal)
      .then(setCategories)
      .catch((err) => {
        if (!controller.signal.aborted) {
          setCategories([]);
          setCategoryError(userMessage(err));
        }
      });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    const controller = new AbortController();
    const q = parseCatalogQuery(new URLSearchParams(key));
    if (embedded) q.pageSize = 8;
    setLoading(true);
    setError('');
    setData(null);
    catalogApi
      .list(q, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(userMessage(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          if (requestedNavigation.current) {
            resultsHeading.current?.focus({ preventScroll: true });
            requestedNavigation.current = false;
          }
        }
      });
    return () => controller.abort();
  }, [key, embedded, revision]);
  function navigate(next: CatalogQuery) {
    requestedNavigation.current = true;
    router.push('/products?' + queryString(next), { scroll: false });
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.minPrice && draft.maxPrice && Number(draft.minPrice) > Number(draft.maxPrice)) {
      setValidation('Giá từ không được lớn hơn giá đến.');
      return;
    }
    setValidation('');
    navigate({ ...draft, page: 1 });
  }
  function open(product: CatalogProduct) {
    router.push('/products/' + encodeURIComponent(product.id));
  }
  function reset() {
    setDraft({ ...parseCatalogQuery(new URLSearchParams()), pageSize: 12 });
    setValidation('');
    navigate(parseCatalogQuery(new URLSearchParams()));
  }
  const filteringUnsupported = data?.querySupported === false;
  const active = !!(
    query.q ||
    query.categoryId ||
    query.minPrice ||
    query.maxPrice ||
    query.condition
  );
  const Title = embedded ? 'h2' : 'h1';
  const content = (
    <section
      id={embedded ? 'discover' : 'catalog-main'}
      aria-labelledby="catalog-title"
      className={embedded ? 'scroll-mt-36 pt-4' : 'nexus-container pb-16 pt-7'}
    >
      {!embedded && (
        <nav aria-label="Đường dẫn" className="mb-7 flex items-center gap-2 text-xs text-muted">
          <Link href="/" className="inline-flex min-h-11 items-center hover:text-brand-dark">
            Trang chủ
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Sản phẩm</span>
        </nav>
      )}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-bold tracking-[.18em] text-brand-dark">
            ĐỒ BẠN THÍCH · GIÁ TRỊ BẠN CHỌN
          </p>
          <Title id="catalog-title" className="text-3xl font-bold tracking-tight text-ink">
            {embedded ? 'Khám phá sản phẩm' : 'Tìm món đồ dành cho bạn'}
          </Title>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            {embedded
              ? 'Những lựa chọn cho sở thích và phong cách của riêng bạn.'
              : 'Khám phá theo danh mục, tình trạng và khoảng giá. Các phiên đấu được hiển thị tại khu vực riêng.'}
          </p>
        </div>
        {embedded ? (
          <Link
            href="/products"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-dark"
          >
            Xem tất cả <MarketplaceIcon name="arrow" className="size-4" />
          </Link>
        ) : (
          <Link
            href="/auctions"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold"
          >
            <MarketplaceIcon name="gavel" className="size-4" />
            Khám phá phiên đấu
          </Link>
        )}
      </div>

      <div className="mb-6 rounded-2xl border border-line bg-white p-4 sm:p-5">
        <form role="search" onSubmit={submit}>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-0 flex-1">
              <label htmlFor="catalog-query" className="sr-only">
                Tìm sản phẩm
              </label>
              <Input
                id="catalog-query"
                className={inputClass}
                value={draft.q}
                onChange={(e) => setDraft({ ...draft, q: e.target.value })}
                placeholder="Bạn đang tìm món đồ nào?"
                maxLength={200}
                disabled={filteringUnsupported}
              />
            </div>
            <Button
              variant="ghost"
              size="plain"
              type="submit"
              disabled={filteringUnsupported}
              className="min-h-11 rounded-xl bg-brand-dark px-5 text-sm font-semibold text-white hover:bg-brand disabled:opacity-50"
            >
              Tìm kiếm
            </Button>
            <Button
              variant="ghost"
              size="plain"
              type="button"
              onClick={() => setOpenFilters(!openFilters)}
              aria-label="Bộ lọc sản phẩm"
              aria-expanded={openFilters}
              aria-controls="catalog-filters"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold"
            >
              <MarketplaceIcon name="grid" className="size-4" />
              Bộ lọc
              <MarketplaceIcon
                name="chevron"
                className={'size-3 transition ' + (openFilters ? '-rotate-90' : 'rotate-90')}
              />
            </Button>
          </div>
          <div
            id="catalog-filters"
            hidden={!openFilters}
            className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div>
              <label id="category-label" className="mb-2 block text-xs font-semibold">
                Danh mục
              </label>
              <Select
                value={draft.categoryId || 'all'}
                onValueChange={(value) =>
                  setDraft({ ...draft, categoryId: value === 'all' ? '' : value })
                }
                disabled={!categories.length || filteringUnsupported}
              >
                <SelectTrigger className={inputClass} aria-labelledby="category-label">
                  <SelectValue placeholder="Tất cả danh mục" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả danh mục</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {'— '.repeat(Math.max(0, c.level - 1))}
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label id="condition-label" className="mb-2 block text-xs font-semibold">
                Tình trạng
              </label>
              <Select
                value={draft.condition || 'all'}
                onValueChange={(value) =>
                  setDraft({ ...draft, condition: value === 'all' ? '' : value })
                }
                disabled={filteringUnsupported}
              >
                <SelectTrigger className={inputClass} aria-labelledby="condition-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả tình trạng</SelectItem>
                  {Object.entries(conditionText).map(([id, label]) => (
                    <SelectItem value={id} key={id}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="catalog-min" className="mb-2 block text-xs font-semibold">
                Giá từ
              </label>
              <Input
                id="catalog-min"
                className={inputClass}
                type="number"
                min="0"
                step="any"
                value={draft.minPrice}
                onChange={(e) => setDraft({ ...draft, minPrice: e.target.value })}
                placeholder="Không giới hạn"
                disabled={filteringUnsupported}
              />
            </div>
            <div>
              <label htmlFor="catalog-max" className="mb-2 block text-xs font-semibold">
                Giá đến
              </label>
              <Input
                id="catalog-max"
                className={inputClass}
                type="number"
                min="0"
                step="any"
                value={draft.maxPrice}
                onChange={(e) => setDraft({ ...draft, maxPrice: e.target.value })}
                placeholder="Không giới hạn"
                disabled={filteringUnsupported}
              />
            </div>
            <div className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-4">
              <Button
                variant="ghost"
                size="plain"
                type="submit"
                disabled={filteringUnsupported}
                className="min-h-11 rounded-xl bg-brand-dark px-5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Áp dụng bộ lọc
              </Button>
              <Button
                variant="ghost"
                size="plain"
                type="button"
                onClick={reset}
                className="min-h-11 px-3 text-sm font-semibold text-muted underline underline-offset-4"
              >
                Đặt lại
              </Button>
            </div>
          </div>
          {validation && (
            <p role="alert" className="mt-3 text-sm text-brand-dark">
              {validation}
            </p>
          )}
        </form>
        {categoryError && (
          <p className="mt-3 text-xs text-muted" role="status">
            Danh mục chưa tải được. Bạn vẫn có thể xem sản phẩm.{' '}
            <Button
              variant="ghost"
              size="plain"
              type="button"
              className="min-h-11 font-semibold text-brand-dark underline"
              onClick={() => setRevision((r) => r + 1)}
            >
              Tải lại
            </Button>
          </p>
        )}
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2
          ref={resultsHeading}
          tabIndex={-1}
          className="text-sm font-semibold outline-none"
          aria-live="polite"
        >
          {loading
            ? 'Đang tìm sản phẩm…'
            : error
              ? 'Chưa tải được danh sách'
              : data?.total !== null && data?.total !== undefined
                ? `${data.total} sản phẩm${query.q ? ' cho “' + query.q + '”' : ''}`
                : 'Danh sách sản phẩm hiện có'}
        </h2>
        <div className="flex items-center gap-2">
          <span id="sort-label" className="text-xs text-muted">
            Sắp xếp
          </span>
          <Select
            value={query.sort}
            disabled={filteringUnsupported || loading}
            onValueChange={(sort) => navigate({ ...query, sort, page: 1 })}
          >
            <SelectTrigger
              aria-labelledby="sort-label"
              className="min-h-11 w-44 rounded-xl border-line bg-white text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Nổi bật</SelectItem>
              <SelectItem value="newest">Mới nhất</SelectItem>
              <SelectItem value="price-asc">Giá tăng dần</SelectItem>
              <SelectItem value="price-desc">Giá giảm dần</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {filteringUnsupported && (
        <p className="mb-4 rounded-xl border border-line bg-white p-4 text-sm leading-6 text-muted">
          Bộ lọc và phân trang đang được cập nhật. Danh sách hiện tại được hiển thị theo dữ liệu hệ
          thống cung cấp.
        </p>
      )}

      {loading ? (
        <CatalogSkeleton />
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-line bg-white p-8 text-center">
          <MarketplaceIcon name="box" className="mx-auto mb-4 size-9 text-muted" />
          <h3 className="text-xl font-semibold">Kết nối đang gián đoạn</h3>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted">{error}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button
              variant="ghost"
              size="plain"
              type="button"
              onClick={() => setRevision((r) => r + 1)}
              className="min-h-11 rounded-xl bg-brand-dark px-5 text-sm font-semibold text-white"
            >
              Thử lại
            </Button>
            {active && (
              <Button
                variant="ghost"
                size="plain"
                type="button"
                onClick={reset}
                className="min-h-11 rounded-xl border border-line px-5 text-sm font-semibold"
              >
                Đặt lại bộ lọc
              </Button>
            )}
          </div>
        </div>
      ) : !data?.items.length ? (
        <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <h3 className="text-xl font-semibold">Chưa tìm thấy món đồ phù hợp</h3>
          <p className="mt-3 text-sm text-muted">Thử từ khóa khác hoặc mở rộng khoảng giá.</p>
          <Button
            variant="ghost"
            size="plain"
            type="button"
            onClick={reset}
            className="mt-5 min-h-11 rounded-xl bg-brand-dark px-5 text-sm font-semibold text-white"
          >
            Xem lại tất cả
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {data.items.map((product) => (
            <article
              key={product.id}
              className="group overflow-hidden rounded-2xl border border-line bg-white transition duration-200 hover:-translate-y-1 hover:shadow-lg motion-reduce:transform-none"
            >
              <div className="relative aspect-square overflow-hidden bg-stone-100">
                <Button
                  variant="ghost"
                  size="plain"
                  type="button"
                  onClick={() => open(product)}
                  aria-label={'Xem ' + product.title}
                  className="block size-full disabled:cursor-wait"
                >
                  <img
                    src={product.images[0] || '/images/nexus-product-placeholder.svg'}
                    onError={(e) => {
                      if (!e.currentTarget.src.endsWith('/images/nexus-product-placeholder.svg'))
                        e.currentTarget.src = '/images/nexus-product-placeholder.svg';
                    }}
                    alt={product.title}
                    width={600}
                    height={600}
                    loading="lazy"
                    className="size-full object-cover transition duration-300 group-hover:scale-105 motion-reduce:transform-none"
                  />
                </Button>
                {user?.role === 'BUYER' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={
                      favoriteIds.includes(product.id)
                        ? `Bỏ ${product.title} khỏi yêu thích`
                        : `Thêm ${product.title} vào yêu thích`
                    }
                    aria-pressed={favoriteIds.includes(product.id)}
                    onClick={() =>
                      toggleFavorite({
                        id: product.id,
                        name: product.title,
                        image: product.images[0] || '/images/nexus-product-placeholder.svg',
                        price: product.price ?? 0,
                        href: '/products/' + encodeURIComponent(product.id),
                      })
                    }
                    className={`absolute right-3 top-3 size-11 rounded-full bg-white/95 shadow-sm ${favoriteIds.includes(product.id) ? 'text-brand' : 'text-ink'}`}
                  >
                    <Heart
                      aria-hidden="true"
                      className="size-5"
                      fill={favoriteIds.includes(product.id) ? 'currentColor' : 'none'}
                    />
                  </Button>
                )}
              </div>
              <div className="p-3 sm:p-4">
                <p className="mb-1 text-[11px] text-muted">
                  {product.categoryName ||
                    categories.find((c) => c.id === product.categoryId)?.name ||
                    'Sản phẩm'}
                  {product.condition &&
                    ' · ' + (conditionText[product.condition] || product.condition)}
                </p>
                <Button
                  variant="ghost"
                  size="plain"
                  type="button"

                  onClick={() => open(product)}
                  className="line-clamp-2 min-h-11 text-left text-sm font-semibold leading-5 hover:text-brand-dark"
                >
                  {product.title}
                </Button>
                <p className="mt-2 break-words text-lg font-bold text-brand-dark">
                  {formatPrice(product)}
                </p>
                {(product.rating !== undefined || product.soldCount !== undefined) && (
                  <p className="mt-2 text-xs text-muted">
                    {product.rating !== undefined && '★ ' + product.rating.toFixed(1)}
                    {product.rating !== undefined && product.soldCount !== undefined && ' · '}
                    {product.soldCount !== undefined && 'Đã bán ' + product.soldCount}
                  </p>
                )}
                <p className="mt-3 truncate text-xs text-muted">
                  {product.sellerName || 'Thông tin người bán đang cập nhật'}
                </p>
                <Button
                  variant="ghost"
                  size="plain"
                  type="button"

                  onClick={() => open(product)}
                  className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-line text-xs font-semibold hover:border-brand hover:text-brand-dark"
                >
                  Xem sản phẩm
                  <MarketplaceIcon name="arrow" className="size-3.5" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
      {!embedded && !loading && !error && data?.totalPages && data.totalPages > 1 && (
        <nav
          aria-label="Phân trang sản phẩm"
          className="mt-8 flex items-center justify-center gap-4"
        >
          <Button
            variant="ghost"
            size="plain"
            type="button"
            disabled={query.page <= 1}
            onClick={() => navigate({ ...query, page: query.page - 1 })}
            className="min-h-11 rounded-xl border border-line bg-white px-4 text-sm disabled:opacity-40"
          >
            Trang trước
          </Button>
          <span className="text-sm">
            Trang {data.page} / {data.totalPages}
          </span>
          <Button
            variant="ghost"
            size="plain"
            type="button"
            disabled={query.page >= data.totalPages}
            onClick={() => navigate({ ...query, page: query.page + 1 })}
            className="min-h-11 rounded-xl border border-line bg-white px-4 text-sm disabled:opacity-40"
          >
            Trang sau
          </Button>
        </nav>
      )}
    </section>
  );
  return embedded ? (
    content
  ) : (
    <>
      <StoreHeader />
      <main>{content}</main>
    </>
  );
}
