'use client';
import { Button } from '@/components/ui/button';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { NexusLogo } from './nexus-logo';
import { AccountControls } from '@/modules/user/components/account-controls';
import { MarketplaceIcon } from '@/modules/home/components/marketplace-icon';
import {
  MarketplaceCard,
  ProductPhoto,
  money,
  timeLeft,
} from '@/modules/home/components/marketplace-card';
import { AccountPromptDialog } from '@/modules/home/components/account-prompt-dialog';
import type { MarketplaceFeed, MarketplaceProduct } from '@/modules/home/types/marketplace.types';

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
const fieldClass =
  'min-h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-brand';

export function MarketplaceDirectory({
  feed,
  variant,
}: {
  feed: MarketplaceFeed;
  variant: 'products' | 'auctions';
}) {
  const auction = variant === 'auctions';
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [budget, setBudget] = useState('all');
  const [condition, setCondition] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('featured');
  const [page, setPage] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [prompt, setPrompt] = useState<MarketplaceProduct | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!auction) return;
    const started = Date.now();
    const timer = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - started) / 1000)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [auction]);

  const source = useMemo(
    () => feed.products.filter((p) => p.mode === (auction ? 'auction' : 'fixed')),
    [feed.products, auction],
  );
  const live = source.filter((p) => p.status === 'active' && p.remainingSeconds > elapsed);
  const upcoming = source.filter((p) => p.status === 'scheduled');
  const spotlight = auction ? [...live].sort((a, b) => b.bids - a.bids)[0] : undefined;
  const result = useMemo(() => {
    const list = source.filter((p) => {
      const remaining = p.remainingSeconds - elapsed;
      const matchesStatus =
        !auction ||
        status === 'all' ||
        (status === 'live' && p.status === 'active' && remaining > 0) ||
        (status === 'ending' && p.status === 'active' && remaining > 0 && remaining <= 3600) ||
        (status === 'upcoming' && p.status === 'scheduled') ||
        (status === 'ended' && p.status === 'active' && remaining <= 0);
      return (
        matchesStatus &&
        (category === 'all' || p.category === category) &&
        normalize(`${p.name} ${p.categoryName} ${p.seller}`).includes(normalize(query.trim())) &&
        (budget === 'all' ||
          (budget === 'under1' && p.price < 1000000) ||
          (budget === '1to5' && p.price >= 1000000 && p.price <= 5000000) ||
          (budget === 'over5' && p.price > 5000000)) &&
        (condition === 'all' ||
          (condition === 'new' ? p.condition.startsWith('Mới') : !p.condition.startsWith('Mới')))
      );
    });
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    if (sort === 'popular')
      list.sort((a, b) => (auction ? b.bids - a.bids : (b.soldCount ?? 0) - (a.soldCount ?? 0)));
    if (sort === 'ending') list.sort((a, b) => a.remainingSeconds - b.remainingSeconds);
    return list;
  }, [source, elapsed, auction, status, category, query, budget, condition, sort]);
  const pageSize = auction ? 6 : 12;
  const pageCount = Math.max(1, Math.ceil(result.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = result.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const activeFilters =
    Number(category !== 'all') + Number(budget !== 'all') + Number(condition !== 'all');
  function change(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }
  function reset() {
    setQuery('');
    setCategory('all');
    setBudget('all');
    setCondition('all');
    setSort('featured');
    setStatus('all');
    setPage(1);
  }
  function changePage(value: number) {
    setPage(value);
    resultsHeading.current?.focus({ preventScroll: true });
    resultsHeading.current?.scrollIntoView({
      block: 'start',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }

  return (
    <>
      <a
        href="#directory-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 z-50 bg-white p-3"
      >
        Đi đến nội dung chính
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur-xl">
        <div className="nexus-container flex min-h-20 flex-wrap items-center justify-between gap-3 py-3">
          <NexusLogo className="marketplace-logo" />
          <nav
            aria-label="Điều hướng chính"
            className="order-3 flex w-full items-center justify-center gap-5 border-t border-line pt-2 text-sm sm:order-none sm:w-auto sm:border-0 sm:pt-0"
          >
            <Link href="/" className="flex min-h-11 items-center text-muted hover:text-brand-dark">
              Trang chủ
            </Link>
            <Link
              href="/products"
              aria-current={!auction ? 'page' : undefined}
              className={`flex min-h-11 items-center gap-2 ${!auction ? 'font-bold text-brand-dark' : 'text-muted hover:text-brand-dark'}`}
            >
              <MarketplaceIcon name="box" className="hidden size-4 sm:block" />
              Sản phẩm
            </Link>
            <Link
              href="/auctions"
              aria-current={auction ? 'page' : undefined}
              className={`flex min-h-11 items-center gap-2 ${auction ? 'font-bold text-brand-dark' : 'text-muted hover:text-brand-dark'}`}
            >
              <MarketplaceIcon name="gavel" className="hidden size-4 sm:block" />
              Phiên đấu giá
            </Link>
          </nav>
          <AccountControls />
        </div>
      </header>
      <main id="directory-main" className="nexus-container pb-16 pt-6 sm:pt-8">
        <nav aria-label="Đường dẫn" className="mb-6 flex items-center gap-2 text-xs text-muted">
          <Link href="/" className="hover:text-brand-dark">
            Trang chủ
          </Link>
          <MarketplaceIcon name="chevron" className="size-3" />
          <span aria-current="page">{auction ? 'Các phiên đấu giá' : 'Tất cả sản phẩm'}</span>
        </nav>
        {auction ? (
          <section
            aria-labelledby="directory-title"
            className="directory-auction-hero relative overflow-hidden rounded-3xl p-6 text-white sm:p-9"
          >
            <div className="relative grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
              <div>
                <p className="mb-4 flex items-center gap-2 text-xs font-bold tracking-[.2em]">
                  <span className="size-2 rounded-full bg-white" />
                  NEXUS AUCTION CLUB
                </p>
                <h1
                  id="directory-title"
                  className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl"
                >
                  Một món đồ.
                  <br />
                  <span className="text-red-100">Nhiều đam mê.</span>
                </h1>
                <p className="mt-5 max-w-md text-sm leading-7 text-white/90">
                  Khám phá những phiên đấu có thời hạn. Chọn món đồ xứng đáng, theo dõi mức giá và
                  tìm thời điểm của riêng bạn.
                </p>
                <div className="mt-7 flex flex-wrap gap-6 border-t border-white/20 pt-5">
                  <div>
                    <p className="font-mono text-3xl font-bold tabular-nums">
                      {String(live.length).padStart(2, '0')}
                    </p>
                    <p className="mt-1 text-xs text-white/80">Phiên đang mở</p>
                  </div>
                  <div>
                    <p className="font-mono text-3xl font-bold tabular-nums">
                      {String(upcoming.length).padStart(2, '0')}
                    </p>
                    <p className="mt-1 text-xs text-white/80">Phiên sắp mở</p>
                  </div>
                  <div>
                    <p className="font-mono text-3xl font-bold tabular-nums">04</p>
                    <p className="mt-1 text-xs text-white/80">Danh mục đam mê</p>
                  </div>
                </div>
              </div>
              {spotlight ? (
                <Button
                  variant="ghost"
                  size="plain"
                  onClick={() => setPrompt(spotlight)}
                  className="group grid overflow-hidden rounded-2xl border border-white/30 bg-white text-left text-ink shadow-xl sm:grid-cols-[.9fr_1fr]"
                  aria-label={`Xem phiên nổi bật: ${spotlight.name}`}
                >
                  <div className="relative min-h-48 overflow-hidden bg-stone-100">
                    <ProductPhoto
                      product={spotlight}
                      priority
                      className="h-full max-h-72 w-full object-cover transition duration-500 group-hover:scale-105 motion-reduce:transform-none"
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-brand-dark">
                      PHIÊN NỔI BẬT
                    </span>
                  </div>
                  <div className="flex flex-col p-5 sm:p-6">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                      {spotlight.categoryName} · {spotlight.bids} lượt trả giá
                    </p>
                    <h2 className="mt-3 text-lg font-bold leading-6">{spotlight.name}</h2>
                    <p className="mt-5 text-xs text-muted">Giá hiện tại</p>
                    <p className="mt-1 text-2xl font-bold text-brand-dark">
                      {money(spotlight.price)}
                    </p>
                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
                      <span className="font-mono text-lg font-bold tabular-nums">
                        {timeLeft(spotlight.remainingSeconds - elapsed)}
                      </span>
                      <span className="grid size-10 place-items-center rounded-full bg-brand-soft text-brand-dark">
                        <MarketplaceIcon name="arrow" />
                      </span>
                    </div>
                  </div>
                </Button>
              ) : (
                <div className="rounded-2xl border border-white/25 p-8">
                  <MarketplaceIcon name="clock" className="mb-4 size-8" />
                  <p className="text-lg font-semibold">Đón chờ những phiên tiếp theo.</p>
                  <p className="mt-3 text-sm text-white/80">Khám phá danh sách sắp mở bên dưới.</p>
                </div>
              )}
            </div>
          </section>
        ) : (
          <section
            aria-labelledby="directory-title"
            className="grid overflow-hidden rounded-3xl border border-line bg-white md:grid-cols-[1.15fr_1fr]"
          >
            <div className="p-7 sm:p-10">
              <p className="text-[10px] font-bold tracking-[.22em] text-brand-dark">
                THE NEXUS EDIT
              </p>
              <h1
                id="directory-title"
                className="mt-4 text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl"
              >
                Đúng gu bạn.
                <br />
                <span className="text-brand-dark">Đủ lựa chọn.</span>
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-muted">
                Công nghệ, thời gian, âm thanh và những món đồ mang câu chuyện. Tìm một điều mới cho
                đam mê quen thuộc.
              </p>
              <p className="mt-6 text-xs font-semibold text-muted">
                {source.length} sản phẩm · 4 danh mục · Mua sắm theo cách của bạn
              </p>
            </div>
            <div
              className="directory-catalog-art grid grid-cols-3 items-center gap-3 overflow-hidden p-6 sm:p-8"
              aria-hidden="true"
            >
              {source.slice(0, 3).map((p, i) => (
                <div
                  key={p.id}
                  className={`overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg ${i === 1 ? 'translate-y-5 rotate-3' : '-rotate-3'}`}
                >
                  <ProductPhoto product={p} className="aspect-[3/4] w-full object-cover" />
                </div>
              ))}
            </div>
          </section>
        )}

        {!auction && (
          <section
            aria-label="Chọn danh mục"
            className="my-7 grid grid-cols-2 gap-3 lg:grid-cols-4"
          >
            {feed.categories.map((c) => (
              <Button
                variant="ghost"
                size="plain"
                key={c.id}
                onClick={() => change(setCategory, category === c.id ? 'all' : c.id)}
                aria-pressed={category === c.id}
                className={`flex min-h-20 items-center gap-3 rounded-2xl border p-4 text-left transition ${category === c.id ? 'border-brand bg-brand-soft' : 'border-line bg-white hover:border-brand/40'}`}
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-dark">
                  <MarketplaceIcon name={c.icon} />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{c.name}</span>
                  <span className="mt-1 block text-xs text-muted">
                    {source.filter((p) => p.category === c.id).length} sản phẩm
                  </span>
                </span>
              </Button>
            ))}
          </section>
        )}
        {auction && (
          <div className="my-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-white px-5 py-4">
            <p className="flex items-center gap-2 text-xs leading-5 text-muted">
              <MarketplaceIcon name="gavel" className="size-5 shrink-0 text-brand-dark" />
              Giá hiện tại chưa phải giá chốt. Mỗi phiên có bước giá và thời gian riêng.
            </p>
            <Link
              href="/#how-it-works"
              className="flex min-h-11 items-center gap-2 text-xs font-bold text-brand-dark"
            >
              Cách tham gia
              <MarketplaceIcon name="arrow" className="size-4" />
            </Link>
          </div>
        )}

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2
            ref={resultsHeading}
            tabIndex={-1}
            className="scroll-mt-44 text-xl font-bold tracking-tight"
          >
            {auction ? 'Sàn đấu giá' : 'Tất cả sản phẩm'}{' '}
            <span className="ml-2 text-sm font-normal text-muted">({result.length})</span>
          </h2>
          <Button
            variant="ghost"
            size="plain"
            onClick={() => setFiltersOpen(!filtersOpen)}
            aria-expanded={filtersOpen}
            aria-controls="directory-filters"
            className="flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold lg:hidden"
          >
            <MarketplaceIcon name="sliders" className="size-4" />
            Bộ lọc{activeFilters > 0 && ` (${activeFilters})`}
          </Button>
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-[224px_minmax(0,1fr)]">
          <aside
            id="directory-filters"
            aria-label="Bộ lọc danh sách"
            className={`${filtersOpen ? 'block' : 'hidden'} rounded-2xl border border-line bg-white p-5 lg:block`}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <MarketplaceIcon name="sliders" className="size-4" />
                Bộ lọc
              </h3>
              <Button
                variant="ghost"
                size="plain"
                onClick={reset}
                className="min-h-11 text-xs font-semibold text-brand-dark underline underline-offset-4"
              >
                Đặt lại
              </Button>
            </div>
            <fieldset className="border-b border-line pb-5">
              <legend className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">
                Danh mục
              </legend>
              {[{ id: 'all', name: 'Tất cả danh mục' }, ...feed.categories].map((c) => (
                <label
                  key={c.id}
                  className="flex min-h-10 cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="radio"
                    name="directory-category"
                    value={c.id}
                    checked={category === c.id}
                    onChange={() => change(setCategory, c.id)}
                    className="size-4 accent-[#9e0b0f]"
                  />
                  {c.name}
                  <span className="ml-auto text-xs text-muted">
                    {source.filter((p) => c.id === 'all' || p.category === c.id).length}
                  </span>
                </label>
              ))}
            </fieldset>
            <label
              className="mt-5 block text-xs font-bold uppercase tracking-wider text-muted"
              htmlFor="directory-budget"
            >
              {auction ? 'Mức giá phiên' : 'Khoảng giá'}
            </label>
            <select
              id="directory-budget"
              value={budget}
              onChange={(e) => change(setBudget, e.target.value)}
              className={`${fieldClass} mt-3`}
            >
              <option value="all">Mọi khoảng giá</option>
              <option value="under1">Dưới 1 triệu</option>
              <option value="1to5">1–5 triệu</option>
              <option value="over5">Trên 5 triệu</option>
            </select>
            <label
              className="mt-5 block text-xs font-bold uppercase tracking-wider text-muted"
              htmlFor="directory-condition"
            >
              Tình trạng
            </label>
            <select
              id="directory-condition"
              value={condition}
              onChange={(e) => change(setCondition, e.target.value)}
              className={`${fieldClass} mt-3`}
            >
              <option value="all">Tất cả tình trạng</option>
              <option value="new">Mới</option>
              <option value="used">Đã dùng / Sưu tầm</option>
            </select>
            <div className="mt-6 rounded-xl bg-stone-50 p-4">
              <MarketplaceIcon
                name={auction ? 'clock' : 'gem'}
                className="mb-3 size-5 text-brand-dark"
              />
              <p className="text-xs font-semibold">
                {auction ? 'Theo dõi trước, quyết định sau.' : 'Tìm món đồ hợp với bạn.'}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted">
                {auction
                  ? 'Xem kỹ mô tả, tình trạng và bước giá trước khi tham gia.'
                  : 'Dùng bộ lọc để thu hẹp lựa chọn theo danh mục, giá và tình trạng.'}
              </p>
            </div>
          </aside>
          <div className="min-w-0">
            {auction && (
              <div aria-label="Trạng thái phiên" className="mb-4 flex flex-wrap gap-2">
                {[
                  { id: 'all', name: 'Tất cả phiên' },
                  { id: 'live', name: 'Đang diễn ra' },
                  { id: 'ending', name: 'Sắp kết thúc' },
                  { id: 'upcoming', name: 'Sắp mở' },
                  { id: 'ended', name: 'Đã kết thúc' },
                ].map((t) => (
                  <Button
                    variant="ghost"
                    size="plain"
                    key={t.id}
                    onClick={() => change(setStatus, t.id)}
                    aria-pressed={status === t.id}
                    className={`min-h-11 rounded-full border px-4 text-xs font-semibold transition ${status === t.id ? 'border-brand-dark bg-brand-dark text-white' : 'border-line bg-white hover:border-brand/40'}`}
                  >
                    {t.name}
                  </Button>
                ))}
              </div>
            )}
            <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white p-3">
              <label
                className="min-w-0 flex-1 basis-48 text-xs font-medium text-muted"
                htmlFor="directory-search"
              >
                Tìm trong {auction ? 'phiên đấu' : 'sản phẩm'}
                <div className="mt-2 flex min-h-11 items-center gap-2 rounded-xl border border-line px-3">
                  <MarketplaceIcon name="search" className="size-4 shrink-0" />
                  <input
                    id="directory-search"
                    type="search"
                    value={query}
                    onChange={(e) => change(setQuery, e.target.value)}
                    placeholder="Tên, danh mục, gian hàng…"
                    className="min-w-0 flex-1 bg-transparent py-3 text-sm text-ink outline-none"
                  />
                </div>
              </label>
              <label
                className="min-w-0 flex-1 basis-40 text-xs font-medium text-muted"
                htmlFor="directory-sort"
              >
                Sắp xếp
                <select
                  id="directory-sort"
                  value={sort}
                  onChange={(e) => change(setSort, e.target.value)}
                  className={`${fieldClass} mt-2 text-ink`}
                >
                  <option value="featured">Nổi bật</option>
                  <option value="price-asc">Giá tăng dần</option>
                  <option value="price-desc">Giá giảm dần</option>
                  <option value="popular">
                    {auction ? 'Nhiều lượt trả giá' : 'Được mua nhiều'}
                  </option>
                  {auction && <option value="ending">Kết thúc sớm nhất</option>}
                </select>
              </label>
            </div>
            <p role="status" className="mb-4 text-xs text-muted">
              {result.length
                ? `Hiển thị ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, result.length)} trong ${result.length} ${auction ? 'phiên đấu' : 'sản phẩm'}`
                : 'Không có kết quả phù hợp'}
              {query.trim() && ` cho “${query.trim()}”`}
            </p>
            {visible.length ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
                {visible.map((p) => (
                  <MarketplaceCard
                    key={p.id}
                    product={p}
                    elapsed={elapsed}
                    favorite={false}
                    onFavorite={() => setPrompt(p)}
                    onOpen={() => setPrompt(p)}
                    compact={auction}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center">
                <MarketplaceIcon name="search" className="mx-auto mb-4 size-8 text-muted" />
                <h3 className="text-lg font-semibold">Chưa tìm thấy lựa chọn phù hợp</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
                  Thử từ khóa ngắn hơn hoặc mở rộng danh mục và khoảng giá.
                </p>
                <Button
                  variant="ghost"
                  size="plain"
                  onClick={reset}
                  className="mt-5 min-h-11 rounded-xl bg-brand-dark px-5 text-sm font-semibold text-white"
                >
                  Xóa bộ lọc
                </Button>
              </div>
            )}
            {pageCount > 1 && (
              <nav
                aria-label="Phân trang danh sách"
                className="mt-8 flex items-center justify-center gap-2"
              >
                <Button
                  variant="ghost"
                  size="plain"
                  onClick={() => changePage(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Trang trước"
                  className="grid size-11 place-items-center rounded-xl border border-line bg-white disabled:opacity-35"
                >
                  <MarketplaceIcon name="chevron" className="size-4 rotate-180" />
                </Button>
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                  <Button
                    variant="ghost"
                    size="plain"
                    key={n}
                    onClick={() => changePage(n)}
                    aria-label={`Trang ${n}`}
                    aria-current={currentPage === n ? 'page' : undefined}
                    className={`size-11 rounded-xl border text-sm font-semibold ${currentPage === n ? 'border-brand-dark bg-brand-dark text-white' : 'border-line bg-white hover:border-brand'}`}
                  >
                    {n}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="plain"
                  onClick={() => changePage(currentPage + 1)}
                  disabled={currentPage === pageCount}
                  aria-label="Trang tiếp theo"
                  className="grid size-11 place-items-center rounded-xl border border-line bg-white disabled:opacity-35"
                >
                  <MarketplaceIcon name="chevron" className="size-4" />
                </Button>
              </nav>
            )}
          </div>
        </div>
        <section className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-white p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-dark">
              Một Nexus. Hai cách khám phá.
            </p>
            <h2 className="mt-2 text-lg font-semibold">
              {auction ? 'Thích chọn ngay món đồ của bạn?' : 'Tìm kiếm một trải nghiệm khác?'}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {auction
                ? 'Khám phá sản phẩm có giá bán, tách biệt với các phiên đấu.'
                : 'Ghé sàn đấu giá và theo dõi những món đồ đang được quan tâm.'}
            </p>
          </div>
          <Link
            href={auction ? '/products' : '/auctions'}
            className="flex min-h-12 items-center gap-3 rounded-xl bg-brand-soft px-5 text-sm font-bold text-brand-dark"
          >
            {auction ? 'Khám phá sản phẩm' : 'Khám phá phiên đấu'}
            <MarketplaceIcon name="arrow" className="size-4" />
          </Link>
        </section>
      </main>
      <footer className="border-t border-line bg-white">
        <div className="nexus-container flex flex-wrap items-center justify-between gap-4 py-7">
          <NexusLogo className="marketplace-logo" />
          <p className="text-xs text-muted">Khám phá giá trị. Kết nối đam mê.</p>
          <p className="text-[11px] text-muted">Khám phá món đồ phù hợp với sở thích của bạn.</p>
        </div>
      </footer>
      {prompt && <AccountPromptDialog product={prompt} onClose={() => setPrompt(null)} />}
    </>
  );
}
