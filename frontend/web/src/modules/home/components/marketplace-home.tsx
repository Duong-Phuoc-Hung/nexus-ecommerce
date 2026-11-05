'use client';
import { auctionApi, currentPrice, type Auction } from '@/modules/auction/api/auction.api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { Suspense, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CatalogListing, CatalogSkeleton } from '@/modules/catalog/components/catalog-listing';
import { catalogApi } from '@/modules/catalog/api/catalog.api';
import { defaultQuery } from '@/modules/catalog/api/catalog.factory';
import { appConfig } from '@/configs/app.config';
import { userMessage } from '@/lib/axios/http';
import { AccountControls } from '@/modules/user/components/account-controls';
import { useSession } from '@/modules/auth/hooks/use-session';
import type { CategoryId, MarketplaceFeed, MarketplaceProduct } from '../types/marketplace.types';
import { MarketplaceIcon } from './marketplace-icon';
import { MarketplaceCard, timeLeft } from './marketplace-card';
import { MarketplaceHero } from './marketplace-hero';
import { AccountPromptDialog } from './account-prompt-dialog';
import { NexusLogo } from '@/components/layout/nexus-logo';
import { FAVORITES_EVENT, readFavorites, toggleFavorite } from '@/modules/commerce/utils/favorites';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function MarketplaceHome({ feed }: { feed: MarketplaceFeed }) {
  const [auctionRows, setAuctionRows] = useState<Auction[] | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<MarketplaceProduct[]>([]);
  const [apiError, setApiError] = useState('');
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const page = await catalogApi.list({ ...defaultQuery, pageSize: 24 });
        let rows: Auction[] = [];
        let auctionError = '';
        try {
          rows = await auctionApi.list();
        } catch (error) {
          auctionError = userMessage(error);
        }
        if (!active) return;
        setAuctionRows(rows);
        const toCategory = (name: string): MarketplaceProduct['category'] => {
          const value = name.toLocaleLowerCase('vi');
          if (value.includes('đồng hồ') || value.includes('watch')) return 'watches';
          if (value.includes('âm thanh') || value.includes('audio')) return 'audio';
          if (value.includes('sưu tầm') || value.includes('collect')) return 'collectibles';
          return 'tech';
        };
        const mapped = page.items.map((product): MarketplaceProduct => {
          const auction = rows.find((item) => item.productId === product.id);
          const endAt = auction?.endAt ?? Date.now();
          return {
            id: product.id,
            auctionId: auction?.id,
            name: product.title,
            category: toCategory(product.categoryName),
            categoryName: product.categoryName || 'Sản phẩm Nexus',
            image: product.images[0] || '/images/nexus-product-placeholder.svg',
            imageAlt: product.title,
            mode: auction ? 'auction' : 'fixed',
            status: auction?.status === 'SCHEDULED' ? 'scheduled' : 'active',
            price: auction ? currentPrice(auction) : (product.price ?? 0),
            rating: product.rating,
            soldCount: product.soldCount,
            startingPrice: auction?.startingPrice ?? product.price ?? 0,
            increment: auction?.increment ?? 0,
            remainingSeconds: auction ? Math.max(0, Math.ceil((endAt - Date.now()) / 1000)) : 0,
            bids: auction?.bidCount ?? auction?.bids.length ?? 0,
            bidCountKnown: auction ? auction.bidCount !== null : true,
            condition: product.condition || 'Đang cập nhật',
            seller: product.sellerName || product.sellerId || 'Người bán Nexus',
            reputation: 0,
            location: 'Việt Nam',
            description: product.description,
            history: [],
          };
        });
        setCatalogProducts(mapped);
        setApiError(auctionError);
      } catch (error) {
        if (active) setApiError(userMessage(error));
      }
    };
    void load();
    const off = auctionApi.subscribe(() => void load());
    const timer = setInterval(
      () => {
        if (!document.hidden) void load();
      },
      appConfig.auctionSource === 'api' ? 15000 : 3000,
    );
    return () => {
      active = false;
      off();
      clearInterval(timer);
    };
  }, []);
  const router = useRouter();
  const { user } = useSession();
  const [headerCategories, setHeaderCategories] = useState(feed.categories.slice(0, 0));
  useEffect(() => {
    const controller = new AbortController();
    catalogApi
      .categories(controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted)
          setHeaderCategories(
            rows.map((row) => ({
              id: row.id,
              name: row.name,
              icon: feed.categories.find((c) => c.id === row.id)?.icon || 'gem',
              description: 'Khám phá sản phẩm trong danh mục',
            })),
          );
      })
      .catch(() => {
        if (!controller.signal.aborted) setHeaderCategories([]);
      });
    return () => controller.abort();
  }, [feed.categories]);
  const featuredCategories = useMemo(() => {
    const priorityIds = ['1', '2', '3', '18'];
    const selected = priorityIds
      .map((id) => headerCategories.find((category) => category.id === id))
      .filter((category): category is (typeof headerCategories)[number] => Boolean(category));

    return selected.length === 4 ? selected : headerCategories.slice(0, 4);
  }, [headerCategories]);
  const [elapsed, setElapsed] = useState(0);
  const sourceProducts = appConfig.catalogSource === 'api' ? catalogProducts : feed.products;
  const products = sourceProducts.flatMap((product) => {
    if (product.mode !== 'auction' || !auctionRows) return [product];
    const a = auctionRows.find((row) => row.productId === product.id);
    if (!a || a.status === 'ENDED' || a.status === 'CANCELLED') return [];
    return [
      {
        ...product,
        price: currentPrice(a),
        bids: a.bidCount ?? a.bids.length,
        bidCountKnown: a.bidCount !== null,
        status: a.status === 'ACTIVE' ? ('active' as const) : ('scheduled' as const),
        remainingSeconds: Math.max(0, Math.ceil((a.endAt - Date.now()) / 1000)) + elapsed,
      },
    ];
  });
  const [draftSearch, setDraftSearch] = useState('');
  const [auctionTab, setAuctionTab] = useState('all');
  const [showAllAuctions, setShowAllAuctions] = useState(false);
  const [prompt, setPrompt] = useState<{ product?: MarketplaceProduct } | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    const syncFavorites = () => setFavoriteIds(readFavorites().map((item) => item.id));
    syncFavorites();
    window.addEventListener(FAVORITES_EVENT, syncFavorites);
    return () => window.removeEventListener(FAVORITES_EVENT, syncFavorites);
  }, []);

  useEffect(() => {
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
          : product.status === 'active' && product.remainingSeconds > elapsed),
    );
    if (auctionTab === 'ending') result.sort((a, b) => a.remainingSeconds - b.remainingSeconds);
    if (auctionTab === 'popular') result.sort((a, b) => b.bids - a.bids);
    return result;
  }, [products, elapsed, auctionTab]);
  const auctions = matchingAuctions.slice(0, showAllAuctions ? matchingAuctions.length : 5);
  function openProduct(product: MarketplaceProduct) {
    if (product.mode === 'fixed') {
      router.push('/products/' + encodeURIComponent(product.id));
      return;
    }
    router.push('/auctions/' + encodeURIComponent(product.auctionId ?? product.id));
  }
  function scrollToCatalog() {
    document.getElementById('discover')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }
  function chooseCategory(value: CategoryId) {
    router.push('/products' + (value === 'all' ? '' : '?categoryId=' + encodeURIComponent(value)));
  }
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push('/products?q=' + encodeURIComponent(draftSearch.trim()));
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
              <AccountControls />
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
            <Input
              id="marketplace-search"
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
              placeholder="Tìm món đồ bạn yêu thích..."
              className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm outline-offset-0 placeholder:text-muted"
            />
            <Button
              variant="ghost"
              size="plain"
              className="flex min-h-10 items-center gap-2 rounded-lg bg-brand-dark px-4 text-xs font-semibold text-white transition hover:bg-brand"
              type="submit"
            >
              <MarketplaceIcon name="search" className="size-4" />
              <span className="hidden sm:inline">Tìm kiếm</span>
            </Button>
          </form>
          <a
            href="/account"
            className="ml-auto inline-flex min-h-11 items-center gap-2 text-sm font-medium text-ink"
          >
            <MarketplaceIcon name="users" className="size-5" />
            <span className="hidden sm:block">Tài khoản</span>
          </a>
        </div>
        <div className="nexus-container relative flex min-h-12 items-center justify-between gap-4 border-t border-line/60 text-xs font-medium">
          <nav aria-label="Điều hướng chính" className="flex items-center gap-4 sm:gap-7">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="plain"
                  type="button"
                  className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-ink transition hover:bg-brand-soft data-[state=open]:bg-brand-soft data-[state=open]:text-brand-dark"
                >
                  <MarketplaceIcon name="grid" className="size-4" />
                  Danh mục
                  <MarketplaceIcon name="chevron" className="size-3 rotate-90" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={8}
                collisionPadding={16}
                className="w-80 max-w-[calc(100vw-2rem)] rounded-2xl border-line bg-white p-2 shadow-[0_12px_40px_#24232918]"
              >
                <DropdownMenuLabel className="px-3 py-2 text-[10px] font-bold uppercase tracking-[.15em] text-muted">
                  Khám phá danh mục
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onSelect={() => chooseCategory('all')}
                  className="min-h-11 cursor-pointer gap-3 rounded-xl px-3 focus:bg-brand-soft focus:text-brand-dark"
                >
                  <MarketplaceIcon name="box" className="size-4" />
                  <span>Tất cả sản phẩm</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="mx-1 bg-line" />
                {headerCategories.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    onSelect={() => chooseCategory(item.id)}
                    className="min-h-16 cursor-pointer gap-3 rounded-xl px-3 focus:bg-brand-soft focus:text-brand-dark"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-dark">
                      <MarketplaceIcon name={item.icon} className="size-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{item.name}</span>
                      <span className="mt-1 block text-xs text-muted">{item.description}</span>
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
        </div>
      </header>

      <main id="main-content" className="nexus-container pb-16 pt-6 sm:pt-7">
        {apiError && appConfig.catalogSource === 'api' && (
          <div
            role="alert"
            className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <span>Chưa tải được dữ liệu từ hệ thống: {apiError}</span>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Thử lại
            </Button>
          </div>
        )}
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
          {featuredCategories.map((item, index) => (
            <Button
              variant="ghost"
              size="plain"
              key={item.id}
              onClick={() => chooseCategory(item.id)}
              className="group flex min-h-[90px] items-center gap-2 rounded-2xl border border-line bg-white p-3 sm:gap-3 sm:p-4 text-left transition hover:border-brand/30 hover:shadow-md"
            >
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-xl sm:size-12 ${['bg-brand-soft text-brand-dark', 'bg-amber-50 text-amber-800', 'bg-indigo-50 text-indigo-800', 'bg-teal-50 text-teal-800'][index % 4]}`}
              >
                <MarketplaceIcon name={item.icon} className="size-6" />
              </span>
              <span className="text-xs font-bold group-hover:text-brand-dark sm:text-sm">
                {item.name}
                <small className="mt-1.5 block text-[11px] font-normal text-muted">
                  Khám phá bộ sưu tập
                </small>
              </span>
            </Button>
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
                <Button
                  variant="ghost"
                  size="plain"
                  key={tab.id}
                  onClick={() => setAuctionTab(tab.id)}
                  aria-pressed={auctionTab === tab.id}
                  className={`min-h-10 rounded-full px-3 text-[11px] font-semibold transition ${auctionTab === tab.id ? 'bg-brand-dark text-white' : 'bg-stone-50 text-muted hover:bg-brand-soft hover:text-brand-dark'}`}
                >
                  {tab.text}
                </Button>
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
                    canFavorite={user?.role === 'BUYER'}
                    favorite={favoriteIds.includes(product.id)}
                    onFavorite={() => {
                      toggleFavorite({
                        id: product.id,
                        name: product.name,
                        image: product.image,
                        price: product.price,
                        href:
                          product.mode === 'auction'
                            ? '/auctions/' + encodeURIComponent(product.auctionId ?? product.id)
                            : '/products/' + encodeURIComponent(product.id),
                      });
                    }}
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
            <span>Khám phá những phiên đấu nổi bật</span>
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

        <Suspense fallback={<CatalogSkeleton />}>
          <CatalogListing embedded />
        </Suspense>

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
                question: 'Có thể xem sản phẩm khi chưa đăng nhập không?',
                answer:
                  'Bạn có thể xem danh sách, hình ảnh và thông tin chi tiết sản phẩm ngay. Đăng nhập giúp bạn sử dụng các tính năng tài khoản.',
              },
              {
                question: 'Nên xem thông tin nào trước khi tham gia đấu giá?',
                answer:
                  'Hãy đọc kỹ mô tả sản phẩm, tình trạng, thông tin người bán, thời gian kết thúc và bước giá của phiên để lựa chọn mức giá phù hợp.',
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
              {headerCategories.map((item) => (
                <li key={item.id}>
                  <Button
                    variant="ghost"
                    size="plain"
                    onClick={() => chooseCategory(item.id)}
                    className="min-h-9 hover:text-brand-dark"
                  >
                    {item.name}
                  </Button>
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
              Nexus · Khám phá giá trị, kết nối đam mê.
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
