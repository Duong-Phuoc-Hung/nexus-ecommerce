'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { CategoryId, MarketplaceFeed, MarketplaceProduct } from '../types/marketplace.types';
import { MarketplaceIcon } from './marketplace-icon';
import { MarketplaceCard, timeLeft } from './marketplace-card';
import { MarketplaceHero } from './marketplace-hero';
import { AccountPromptDialog } from './account-prompt-dialog';
import { MarketplaceSortMenu } from './marketplace-sort-menu';
import { NexusLogo } from '@/shared/components/nexus-logo';
import { authApi, type AuthUser } from '@/services/auth.api';

const normalized = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

export function MarketplaceHome({ feed }: { feed: MarketplaceFeed }) {
  const products = feed.products;
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [draftSearch, setDraftSearch] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryId>('all');
  const [budget, setBudget] = useState('all');
  const [sort, setSort] = useState('featured');
  const [auctionTab, setAuctionTab] = useState('all');
  const [showCategories, setShowCategories] = useState(false);
  const [prompt, setPrompt] = useState<{ product?: MarketplaceProduct } | null>(null);
  const [limit, setLimit] = useState(12);

  useEffect(() => {
    setCurrentUser(authApi.getCurrentUser());
    const started = Date.now();
    const interval = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - started) / 1000)),
      1000,
    );
    return () => window.clearInterval(interval);
  }, []);

  const activeAuctions = products.filter(
    (product) =>
      product.mode === 'auction' &&
      product.status === 'active' &&
      product.remainingSeconds > elapsed,
  );
  const closestEnding = activeAuctions.length
    ? Math.min(...activeAuctions.map((product) => product.remainingSeconds)) - elapsed
    : 0;
  const matchingAuctions = useMemo(() => {
    const result = products.filter(
      (product) =>
        product.mode === 'auction' &&
        (auctionTab === 'upcoming'
          ? product.status === 'scheduled'
          : product.status === 'active' && product.remainingSeconds > elapsed) &&
        (category === 'all' || product.category === category) &&
        normalized(`${product.name} ${product.categoryName} ${product.seller}`).includes(
          normalized(query),
        ),
    );
    if (auctionTab === 'ending') result.sort((a, b) => a.remainingSeconds - b.remainingSeconds);
    if (auctionTab === 'popular') result.sort((a, b) => b.bids - a.bids);
    return result;
  }, [products, elapsed, auctionTab, category, query]);
  const auctions = matchingAuctions.slice(0, 5);
  const catalog = useMemo(() => {
    const result = products.filter(
      (product) =>
        product.mode === 'fixed' &&
        normalized(`${product.name} ${product.categoryName} ${product.seller}`).includes(
          normalized(query),
        ) &&
        (category === 'all' || product.category === category) &&
        (budget === 'all' ||
          (budget === 'under1' && product.price < 1000000) ||
          (budget === '1to5' && product.price >= 1000000 && product.price <= 5000000) ||
          (budget === 'over5' && product.price > 5000000)),
    );
    if (sort === 'price-asc') result.sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') result.sort((a, b) => b.price - a.price);
    if (sort === 'popular') result.sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0));
    return result;
  }, [products, query, category, budget, sort]);
  function openProduct(product: MarketplaceProduct) {
    setPrompt({ product });
  }
  function scrollToCatalog() {
    document.getElementById('discover')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }
  function chooseCategory(value: CategoryId) {
    setCategory(value);
    setQuery('');
    setDraftSearch('');
    setLimit(12);
    setShowCategories(false);
    scrollToCatalog();
  }
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(draftSearch.trim());
    setCategory('all');
    setBudget('all');
    setLimit(12);
    setAuctionTab('all');
    scrollToCatalog();
  }
  function resetFilters() {
    setQuery('');
    setDraftSearch('');
    setCategory('all');
    setBudget('all');
    setSort('featured');
    setLimit(12);
  }

  return (
    <>
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-white px-5 py-3 font-semibold text-brand-dark focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Đi đến nội dung chính
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-white shadow-[0_2px_15px_#24232904]">
        <div className="border-b border-line/60 bg-stone-50">
          <div className="nexus-container flex min-h-8 items-center justify-between gap-4 text-[11px] text-muted">
            <p className="hidden sm:block">Khám phá giá trị. Kết nối đam mê.</p>
            <div className="ml-auto flex items-center gap-4">
              <a href="#how-it-works" className="hover:text-brand-dark">
                Cách đấu giá
              </a>
              <a href="#faq" className="hidden hover:text-brand-dark sm:block">
                Trợ giúp
              </a>
              {currentUser ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-brand-dark">
                    👤 {currentUser.fullName || currentUser.email} ({currentUser.role})
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      await authApi.logout();
                      setCurrentUser(null);
                      window.location.reload();
                    }}
                    className="text-xs font-semibold text-red-500 hover:text-red-700 underline cursor-pointer"
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <a
                  href="/login"
                  className="flex min-h-11 items-center gap-1.5 font-semibold text-brand-dark hover:text-brand"
                >
                  <MarketplaceIcon name="users" className="size-4" />
                  Đăng nhập
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="nexus-container flex flex-wrap items-center gap-4 py-4 lg:gap-9">
          <NexusLogo className="marketplace-logo shrink-0" href="#" />
          <form
            onSubmit={search}
            role="search"
            className="order-3 flex min-h-12 w-full min-w-0 items-center gap-3 rounded-xl border border-line bg-stone-50 p-1.5 lg:order-none lg:flex-1"
          >
            <span className="ml-2 hidden text-muted sm:block">
              <MarketplaceIcon name="search" />
            </span>
            <label htmlFor="marketplace-search" className="sr-only">
              Tìm sản phẩm hoặc gian hàng
            </label>
            <input
              id="marketplace-search"
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
              placeholder="Tìm món đồ bạn yêu thích..."
              className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm outline-offset-0 placeholder:text-muted"
            />
            <button
              className="flex min-h-10 items-center gap-2 rounded-lg bg-brand-dark px-4 text-xs font-semibold text-white transition hover:bg-brand"
              type="submit"
            >
              <MarketplaceIcon name="search" className="size-4" />
              <span className="hidden sm:inline">Tìm kiếm</span>
            </button>
          </form>
          <button
            onClick={() => setPrompt({})}
            aria-label="Xem món đồ đã lưu"
            className="ml-auto flex min-h-11 items-center gap-2 text-sm font-medium text-ink hover:text-brand-dark"
          >
            <MarketplaceIcon name="heart" className="size-6" />
            <span className="hidden sm:block">Đã lưu</span>
          </button>
        </div>
        <div className="nexus-container relative flex min-h-12 items-center justify-between gap-4 border-t border-line/60 text-xs font-medium">
          <nav aria-label="Điều hướng chính" className="flex items-center gap-4 sm:gap-7">
            <button
              aria-expanded={showCategories}
              aria-controls="category-menu"
              onClick={() => setShowCategories((value) => !value)}
              className="flex min-h-11 items-center gap-2 text-ink"
            >
              <MarketplaceIcon name="grid" className="size-4" />
              Danh mục
            </button>
            <a
              href="/auctions"
              className="flex min-h-11 items-center border-b-2 border-brand font-bold text-brand-dark"
            >
              Đấu giá trực tiếp
            </a>
            <a
              href="/products"
              className="hidden min-h-11 items-center hover:text-brand-dark sm:flex"
            >
              Tất cả sản phẩm
            </a>
            <a
              href="#how-it-works"
              className="hidden min-h-11 items-center hover:text-brand-dark md:flex"
            >
              Nexus hoạt động thế nào?
            </a>
          </nav>
          <span className="hidden items-center gap-1.5 text-muted md:flex">
            <span className="size-1.5 rounded-full bg-brand" />
            {activeAuctions.length} phiên đang mở
          </span>
          {showCategories && (
            <div
              id="category-menu"
              className="absolute inset-x-0 top-full z-40 grid grid-cols-2 gap-2 rounded-b-2xl border border-line bg-white p-4 shadow-xl md:left-0 md:right-auto md:w-[560px]"
            >
              {feed.categories.map((item) => (
                <button
                  key={item.id}
                  onClick={() => chooseCategory(item.id)}
                  className="flex min-h-16 items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-brand-soft"
                >
                  <MarketplaceIcon name={item.icon} className="size-6 text-brand-dark" />
                  <span className="font-semibold">
                    {item.name}
                    <small className="mt-1 block font-normal text-muted">{item.description}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main id="main-content" className="nexus-container pb-16 pt-6 sm:pt-7">
        <MarketplaceHero products={products} onOpen={openProduct} suspended={prompt !== null} />

        <section
          id="categories"
          aria-labelledby="categories-title"
          className="my-6 grid grid-cols-2 gap-3 lg:grid-cols-[.9fr_repeat(4,1fr)]"
        >
          <div className="col-span-2 flex items-center lg:col-span-1 lg:block lg:self-center">
            <div>
              <p className="mb-1 text-[10px] font-bold tracking-[.16em] text-brand-dark">
                TÌM ĐAM MÊ CỦA BẠN
              </p>
              <h2 id="categories-title" className="text-xl font-bold leading-tight tracking-tight">
                Khám phá
                <br className="hidden lg:block" /> theo danh mục
              </h2>
            </div>
          </div>
          {feed.categories.map((item, index) => (
            <button
              key={item.id}
              onClick={() => chooseCategory(item.id)}
              className="group flex min-h-[90px] items-center gap-2 rounded-2xl border border-line bg-white p-3 sm:gap-3 sm:p-4 text-left transition hover:border-brand/30 hover:shadow-md"
            >
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-xl sm:size-12 ${['bg-brand-soft text-brand-dark', 'bg-amber-50 text-amber-800', 'bg-indigo-50 text-indigo-800', 'bg-teal-50 text-teal-800'][index]}`}
              >
                <MarketplaceIcon name={item.icon} className="size-6" />
              </span>
              <span className="text-xs font-bold group-hover:text-brand-dark sm:text-sm">
                {item.name}
                <small className="mt-1.5 block text-[11px] font-normal text-muted">
                  {
                    products.filter(
                      (product) => product.mode === 'fixed' && product.category === item.id,
                    ).length
                  }{' '}
                  lựa chọn mua sắm
                </small>
              </span>
            </button>
          ))}
        </section>

        <section
          id="live-auctions"
          aria-labelledby="auctions-title"
          className="overflow-hidden rounded-3xl border border-brand/15 bg-white"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-brand/10 bg-linear-to-r from-brand-soft to-white px-5 py-5 sm:px-7">
            <div>
              <p className="mb-1.5 flex items-center gap-2 text-[10px] font-bold tracking-[.18em] text-brand-dark">
                <span className="size-1.5 rounded-full bg-brand" />
                NEXUS LIVE
              </p>
              <h2
                id="auctions-title"
                className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl"
              >
                Đấu giá đang diễn ra
                <MarketplaceIcon name="gavel" className="hidden size-6 text-brand sm:block" />
              </h2>
              <p className="mt-1.5 text-xs text-muted">
                Khu vực dành riêng cho đấu giá. Mỗi phiên có thời gian và mức tăng giá riêng.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right text-[10px] leading-4 text-muted sm:block">
                Phiên gần nhất
                <br />
                kết thúc sau
              </div>
              <span
                aria-label={`Phiên gần nhất kết thúc sau ${timeLeft(closestEnding)}`}
                className="rounded-lg bg-ink px-3 py-2.5 font-mono text-lg font-semibold tracking-[.12em] text-white tabular-nums"
              >
                {timeLeft(closestEnding)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-7">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', text: 'Đang diễn ra' },
                { id: 'ending', text: 'Sắp kết thúc' },
                { id: 'popular', text: 'Nhiều lượt trả giá' },
                { id: 'upcoming', text: 'Sắp mở phiên' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAuctionTab(tab.id)}
                  aria-pressed={auctionTab === tab.id}
                  className={`min-h-10 rounded-full px-3 text-[11px] font-semibold transition ${auctionTab === tab.id ? 'bg-brand-dark text-white' : 'bg-stone-50 text-muted hover:bg-brand-soft hover:text-brand-dark'}`}
                >
                  {tab.text}
                </button>
              ))}
            </div>
            <a
              href="/auctions"
              className="ml-2 inline-flex min-h-11 items-center gap-1 text-xs font-semibold tracking-normal text-brand-dark"
            >
              Xem tất cả <MarketplaceIcon name="arrow" className="size-3.5" />
            </a>
          </div>
          {auctions.length ? (
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-6 sm:grid sm:grid-cols-2 sm:px-7 md:grid-cols-3 xl:grid-cols-5">
              {auctions.map((product) => (
                <div key={product.id} className="w-[240px] shrink-0 snap-start sm:w-auto">
                  <MarketplaceCard
                    compact
                    product={product}
                    elapsed={elapsed}
                    favorite={false}
                    onFavorite={() => openProduct(product)}
                    onOpen={() => openProduct(product)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="p-7 text-center text-sm text-muted">
              Chưa có phiên phù hợp với lựa chọn. Thử danh mục hoặc từ khóa khác.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-stone-50/80 px-7 py-3 text-[11px] text-muted">
            <span className="flex items-center gap-1.5">
              <MarketplaceIcon name="shield" className="size-3.5 text-brand-dark" />
              Đấu giá theo thời gian · Giá hiện tại là mức đang được trả, chưa phải giá mua
            </span>
            <span>Dữ liệu & thời gian mô phỏng</span>
          </div>
        </section>

        <section
          aria-label="Giá trị của Nexus"
          className="my-7 grid gap-4 rounded-2xl border border-line bg-white p-5 md:grid-cols-3 md:divide-x md:divide-line"
        >
          {[
            {
              icon: 'gavel' as const,
              title: 'Một cách sở hữu khác',
              text: 'Theo dõi giá và chọn thời điểm tham gia.',
            },
            {
              icon: 'shield' as const,
              title: 'Thông tin để bạn đối chiếu',
              text: 'Xem tình trạng, người bán và điểm uy tín.',
            },
            {
              icon: 'box' as const,
              title: 'Tìm đúng điều bạn thích',
              text: 'Mua sắm và đấu giá, hai trải nghiệm rõ ràng.',
            },
          ].map((item, index) => (
            <div key={item.title} className={`flex items-center gap-3 ${index ? 'md:pl-6' : ''}`}>
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-dark">
                <MarketplaceIcon name={item.icon} />
              </span>
              <div>
                <h3 className="text-xs font-bold">{item.title}</h3>
                <p className="mt-1 text-[11px] leading-5 text-muted">{item.text}</p>
              </div>
            </div>
          ))}
        </section>

        <section id="discover" aria-labelledby="discover-title" className="pt-2">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-[10px] font-bold tracking-[.16em] text-brand-dark">
                CHỌN MỘT MÓN ĐỒ. BẮT ĐẦU MỘT ĐAM MÊ.
              </p>
              <h2 id="discover-title" className="text-2xl font-bold tracking-tight">
                {query ? `Kết quả mua sắm cho “${query}”` : 'Khám phá sản phẩm'}
                <a
                  href="/products"
                  className="ml-3 inline-flex min-h-11 items-center gap-1 align-middle text-xs font-semibold tracking-normal text-brand-dark"
                >
                  Xem tất cả <MarketplaceIcon name="arrow" className="size-3.5" />
                </a>
              </h2>
              <p className="mt-2 text-xs text-muted">
                {catalog.length} sản phẩm
                {category !== 'all'
                  ? ` · ${feed.categories.find((item) => item.id === category)?.name}`
                  : ' để mua sắm · Không bao gồm sản phẩm đấu giá'}
              </p>
            </div>
            <button
              onClick={resetFilters}
              className="min-h-11 text-xs font-semibold text-brand-dark underline underline-offset-4"
            >
              Đặt lại bộ lọc
            </button>
          </div>
          {query && (
            <p className="mb-4 text-xs text-muted">
              Phiên đấu phù hợp được hiển thị riêng.{' '}
              <a
                href="#live-auctions"
                className="inline-flex min-h-11 items-center font-semibold text-brand-dark underline underline-offset-4"
              >
                Xem kết quả tại Nexus Live
              </a>
            </p>
          )}
          <div className="mb-5 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] items-center gap-2 rounded-2xl border border-line bg-white p-3 sm:flex">
            <label className="sr-only" htmlFor="category-filter">
              Danh mục sản phẩm
            </label>
            <select
              id="category-filter"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value as CategoryId);
                setLimit(12);
              }}
              className="min-h-11 min-w-0 rounded-lg border border-line bg-white px-2 text-xs text-ink sm:px-3"
            >
              <option value="all">Tất cả danh mục</option>
              {feed.categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <label htmlFor="budget-filter" className="sr-only">
              Khoảng giá
            </label>
            <select
              id="budget-filter"
              value={budget}
              onChange={(event) => {
                setBudget(event.target.value);
                setLimit(12);
              }}
              className="min-h-11 min-w-0 rounded-lg border border-line bg-white px-2 text-xs sm:px-3"
            >
              <option value="all">Mọi khoảng giá</option>
              <option value="under1">Dưới 1 triệu</option>
              <option value="1to5">1–5 triệu</option>
              <option value="over5">Trên 5 triệu</option>
            </select>
            <MarketplaceSortMenu value={sort} onChange={setSort} />
          </div>
          {catalog.length ? (
            <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {catalog.slice(0, limit).map((product) => (
                <MarketplaceCard
                  key={product.id}
                  product={product}
                  elapsed={elapsed}
                  favorite={false}
                  onFavorite={() => openProduct(product)}
                  onOpen={() => openProduct(product)}
                />
              ))}
            </div>
          ) : (
            <div className="grid min-h-56 place-content-center rounded-2xl border border-dashed border-line bg-white p-6 text-center">
              <MarketplaceIcon name="search" className="mx-auto mb-3 size-8 text-brand-dark" />
              <h3 className="text-lg font-semibold">Chưa tìm thấy sản phẩm phù hợp</h3>
              <p className="mt-2 text-sm text-muted">
                Thử từ khóa khác hoặc thay đổi bộ lọc. Phiên đấu giá được hiển thị riêng ở khu Nexus
                Live.
              </p>
              <button
                onClick={resetFilters}
                className="mx-auto mt-4 min-h-11 rounded-lg bg-brand-soft px-4 text-xs font-bold text-brand-dark"
              >
                Khám phá tất cả
              </button>
            </div>
          )}
          {catalog.length > limit && (
            <div className="mt-7 text-center">
              <button
                onClick={() => setLimit((value) => value + 12)}
                className="inline-flex min-h-12 items-center gap-5 rounded-xl border border-line bg-white px-8 text-xs font-bold transition hover:border-brand hover:text-brand-dark"
              >
                Khám phá thêm
                <MarketplaceIcon name="arrow" className="size-4" />
              </button>
            </div>
          )}
        </section>

        <section
          id="how-it-works"
          className="mt-12 grid gap-8 rounded-3xl bg-ink px-6 py-9 text-white sm:px-9 lg:grid-cols-[1fr_1.6fr]"
        >
          <div>
            <p className="mb-3 text-[10px] font-bold tracking-[.2em] text-white/60">
              BẮT ĐẦU CÙNG NEXUS
            </p>
            <h2 className="text-[28px] font-bold leading-tight tracking-tight">
              Đấu giá dễ hiểu.
              <br />
              <span className="text-red-300">Khám phá dễ dàng.</span>
            </h2>
            <p className="mt-4 text-xs leading-6 text-white/65">
              Trải nghiệm cách một phiên đấu giá diễn ra, ngay từ món đồ đầu tiên bạn yêu thích.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                title: 'Tìm điều bạn thích',
                text: 'Khám phá danh mục, so sánh giá và xem kỹ thông tin sản phẩm.',
              },
              {
                title: 'Theo dõi phiên đấu',
                text: 'Xem thời gian còn lại, giá hiện tại và mức tăng tối thiểu.',
              },
              {
                title: 'Kết nối tài khoản',
                text: 'Đăng nhập hoặc đăng ký để tiếp tục xem chi tiết và tham gia theo quyền của bạn.',
              },
            ].map((item, index) => (
              <div key={item.title}>
                <span className="mb-5 grid size-10 place-items-center rounded-full border border-white/20 text-sm font-bold text-white/70">
                  0{index + 1}
                </span>
                <h3 className="text-sm font-bold">{item.title}</h3>
                <p className="mt-3 text-xs leading-6 text-white/65">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="faq"
          aria-labelledby="faq-title"
          className="mt-10 grid gap-6 rounded-2xl border border-line bg-white p-6 md:grid-cols-[1fr_2fr] sm:p-8"
        >
          <div>
            <p className="mb-2 text-[10px] font-bold tracking-[.16em] text-brand-dark">
              MỘT CHÚT GIẢI ĐÁP
            </p>
            <h2 id="faq-title" className="text-xl font-bold">
              Bạn mới đến Nexus?
            </h2>
            <p className="mt-3 text-xs leading-6 text-muted">
              Những điều cần biết trước khi khám phá phiên đầu tiên.
            </p>
          </div>
          <div className="divide-y divide-line">
            {[
              {
                question: 'Mua sắm và đấu giá khác nhau như thế nào?',
                answer:
                  'Khu mua sắm hiển thị giá bán của sản phẩm. Với đấu giá, người tham gia trả giá trong khoảng thời gian của phiên; mỗi lần trả phải tuân theo mức tối thiểu và bước giá được công bố.',
              },
              {
                question: 'Vì sao cần đăng nhập khi mở sản phẩm?',
                answer:
                  'Bạn có thể xem danh mục, tìm kiếm và so sánh trên trang chủ. Khi mở một món đồ, Nexus mời bạn đăng nhập hoặc tạo tài khoản để tiếp tục. Dữ liệu hiện tại là mẫu; chưa có giao dịch thật.',
              },
              {
                question: 'Khi có API thật, quy trình sẽ hoạt động thế nào?',
                answer:
                  'Bản thật sẽ xác thực Buyer và kiểm tra quyền, điểm uy tín, trạng thái phiên ở backend. Khi phiên kết thúc hợp lệ, kết quả sẽ chuyển sang luồng đơn hàng và thanh toán theo SRS.',
              },
            ].map((item) => (
              <details key={item.question} className="group py-4 first:pt-0">
                <summary className="flex min-h-11 list-none items-center justify-between gap-4 text-sm font-semibold">
                  {item.question}
                  <MarketplaceIcon
                    name="chevron"
                    className="size-4 shrink-0 text-muted transition group-open:rotate-90"
                  />
                </summary>
                <p className="mt-2 max-w-xl text-xs leading-6 text-muted">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="nexus-container grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <NexusLogo className="marketplace-logo" href="#" />
            <p className="mt-4 max-w-xs text-xs leading-6 text-muted">
              Nơi những món đồ có giá trị
              <br />
              tìm thấy người thật sự yêu thích chúng.
            </p>
            <span className="mt-5 inline-block rounded-md bg-brand-soft px-2.5 py-1.5 text-[10px] font-semibold text-brand-dark">
              Marketplace & Auction
            </span>
          </div>
          <div>
            <h2 className="text-xs font-bold">Khám phá Nexus</h2>
            <ul className="mt-3 space-y-2 text-xs text-muted">
              <li>
                <a
                  className="inline-flex min-h-9 items-center hover:text-brand-dark"
                  href="#live-auctions"
                >
                  Phiên đấu đang diễn ra
                </a>
              </li>
              <li>
                <a
                  className="inline-flex min-h-9 items-center hover:text-brand-dark"
                  href="#discover"
                  onClick={resetFilters}
                >
                  Khám phá sản phẩm
                </a>
              </li>
              <li>
                <a
                  className="inline-flex min-h-9 items-center hover:text-brand-dark"
                  href="#categories"
                >
                  Danh mục được chọn
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-xs font-bold">Danh mục</h2>
            <ul className="mt-3 space-y-2 text-xs text-muted">
              {feed.categories.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => chooseCategory(item.id)}
                    className="min-h-9 hover:text-brand-dark"
                  >
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-xs font-bold">Cùng bạn bắt đầu</h2>
            <ul className="mt-3 space-y-2 text-xs text-muted">
              <li>
                <a
                  className="inline-flex min-h-9 items-center hover:text-brand-dark"
                  href="#how-it-works"
                >
                  Cách đấu giá hoạt động
                </a>
              </li>
              <li>
                <a className="inline-flex min-h-9 items-center hover:text-brand-dark" href="#faq">
                  Câu hỏi thường gặp
                </a>
              </li>
            </ul>
            <p className="mt-4 text-[11px] leading-5 text-muted">
              Project Nexus · Giao diện giới thiệu với dữ liệu mô phỏng.
            </p>
          </div>
        </div>
        <div className="border-t border-line">
          <div className="nexus-container flex flex-wrap justify-between gap-3 py-5 text-[10px] text-muted">
            <p>© 2026 Nexus Marketplace. Khám phá theo cách của bạn.</p>
            <p>Khám phá giá trị. Kết nối đam mê.</p>
          </div>
        </div>
      </footer>
      {prompt && <AccountPromptDialog product={prompt.product} onClose={() => setPrompt(null)} />}
    </>
  );
}
