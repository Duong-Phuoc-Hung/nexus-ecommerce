'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Clock3, Gavel, HelpCircle, Search, Trophy } from 'lucide-react';
import { StoreHeader } from '@/components/layout/store-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AuctionBadge, auctionDate, auctionMoney } from './auction-ui';
import { getAuctionSocket } from '../utils/auction-socket';
import {
  auctionApi,
  currentPrice,
  hasCommittedBids,
  isAuctionOpenForBidding,
  lifecycle,
  type Auction,
} from '../api/auction.api';

type FilterTab = 'ACTIVE' | 'SCHEDULED' | 'ENDED' | 'ALL';

const TABS: Array<{ key: FilterTab; label: string }> = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'ACTIVE', label: 'Đang diễn ra' },
  { key: 'SCHEDULED', label: 'Sắp bắt đầu' },
  { key: 'ENDED', label: 'Đã kết thúc' },
];

function priorityRank(status: Auction['status']): number {
  if (status === 'EXTENDED' || status === 'ACTIVE') return 0;
  if (status === 'SCHEDULED') return 1;
  if (status === 'ENDED') return 2;
  return 3;
}

export function AuctionList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab = (searchParams?.get('tab')?.toUpperCase() as FilterTab) || 'ALL';
  const [rows, setRows] = useState<Auction[]>([]);
  const [q, setQ] = useState(searchParams?.get('q') || '');
  const [tab, setTab] = useState<FilterTab>(
    TABS.some((t) => t.key === initialTab) ? initialTab : 'ALL',
  );
  const [sort, setSort] = useState(searchParams?.get('sort') || 'ending');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [guideOpen, setGuideOpen] = useState(false);

  // Giữ bộ lọc trên URL để khi quay lại từ chi tiết không mất trạng thái (B1)
  useEffect(() => {
    const params = new URLSearchParams();
    if (tab !== 'ALL') params.set('tab', tab);
    if (q.trim()) params.set('q', q.trim());
    if (sort !== 'ending') params.set('sort', sort);
    const qs = params.toString();
    router.replace(qs ? `/auctions?${qs}` : '/auctions', { scroll: false });
  }, [q, router, sort, tab]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const data = await auctionApi.list();
        if (!ignore) {
          setRows(data);
          setError('');
        }
      } catch (e) {
        if (!ignore) setError((e as Error).message);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    void load();

    let debounceTimer: number | null = null;
    const scheduleLoad = () => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        void load();
      }, 250);
    };

    const off = auctionApi.subscribe(scheduleLoad);
    const socket = getAuctionSocket();
    socket.emit('join_auctions_feed');
    socket.on('auctions:changed', scheduleLoad);
    socket.on('auction:bid_placed', scheduleLoad);
    socket.on('auction:buy_now', scheduleLoad);
    socket.on('auction:created', scheduleLoad);
    socket.on('auction:updated', scheduleLoad);
    socket.on('auction:cancelled', scheduleLoad);
    socket.on('auction:started', scheduleLoad);
    socket.on('auction:ended', scheduleLoad);

    return () => {
      ignore = true;
      if (debounceTimer) window.clearTimeout(debounceTimer);
      off();
      socket.emit('leave_auctions_feed');
      socket.off('auctions:changed', scheduleLoad);
      socket.off('auction:bid_placed', scheduleLoad);
      socket.off('auction:buy_now', scheduleLoad);
      socket.off('auction:created', scheduleLoad);
      socket.off('auction:updated', scheduleLoad);
      socket.off('auction:cancelled', scheduleLoad);
      socket.off('auction:started', scheduleLoad);
      socket.off('auction:ended', scheduleLoad);
    };
  }, []);

  const matching = useMemo(() => {
    const nowMs = Date.now();
    const query = q.trim().toLocaleLowerCase('vi');

    return rows
      .map((a) => ({ ...a, status: lifecycle(a, nowMs) }))
      .filter((a) => {
        if (tab === 'ACTIVE' && !isAuctionOpenForBidding(a.status)) return false;
        if (tab === 'SCHEDULED' && a.status !== 'SCHEDULED') return false;
        if (tab === 'ENDED' && a.status !== 'ENDED' && a.status !== 'CANCELLED') return false;
        if (query) {
          return `${a.title} ${a.seller} ${a.id}`.toLocaleLowerCase('vi').includes(query);
        }
        return true;
      })
      .sort((a, b) => {
        if (sort === 'price') return currentPrice(a) - currentPrice(b);
        if (sort === 'popular')
          return (b.bidCount ?? b.bids.length) - (a.bidCount ?? a.bids.length);
        // Mặc định: ưu tiên phiên còn tham gia được, gần kết thúc trước (B1)
        const rankDiff = priorityRank(a.status) - priorityRank(b.status);
        if (rankDiff !== 0) return rankDiff;
        return a.endAt - b.endAt;
      });
  }, [q, rows, sort, tab]);

  const pages = Math.max(1, Math.ceil(matching.length / 8));
  const actual = Math.min(page, pages);
  const hasFilters = tab !== 'ALL' || Boolean(q.trim());

  return (
    <>
      <StoreHeader />
      <main className="nexus-container py-8 sm:py-10">
        {/* Đầu trang phong cách phòng trưng bày sạch, gọn, không text dư */}
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-950 sm:text-3xl">
              Đấu giá
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              Giá và thời gian đồng bộ trực tiếp theo máy chủ Nexus.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setGuideOpen(true)}
              className="min-h-11 gap-1.5 rounded-xl border-stone-300 text-xs font-semibold"
            >
              <HelpCircle className="size-4" aria-hidden="true" />
              Cách đấu giá
            </Button>
            <Button
              asChild
              variant="outline"
              className="min-h-11 rounded-xl border-stone-300 text-xs font-semibold"
            >
              <Link href="/account/auctions">Phiên của tôi</Link>
            </Button>
          </div>
        </header>

        {/* Thanh bộ lọc ngang thân thiện mobile */}
        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            role="group"
            aria-label="Lọc trạng thái phiên"
          >
            {TABS.map((item) => (
              <Button
                key={item.key}
                type="button"
                variant={tab === item.key ? 'default' : 'outline'}
                aria-pressed={tab === item.key}
                onClick={() => {
                  setTab(item.key);
                  setPage(1);
                }}
                className={`min-h-11 shrink-0 rounded-xl px-4 text-xs font-semibold ${
                  tab === item.key
                    ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                    : 'border-stone-300'
                }`}
              >
                {item.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <label className="relative flex items-center sm:w-72">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 text-stone-400"
                aria-hidden="true"
              />
              <span className="sr-only">Tìm phiên đấu giá</span>
              <Input
                value={q}
                placeholder="Tìm sản phẩm hoặc người bán…"
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                className="min-h-11 rounded-xl pl-9 text-sm"
              />
            </label>
            <Select
              value={sort}
              onValueChange={(value) => {
                setSort(value);
                setPage(1);
              }}
            >
              <SelectTrigger
                aria-label="Sắp xếp phiên"
                className="min-h-11 w-full rounded-xl sm:w-48"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ending">Kết thúc sớm nhất</SelectItem>
                <SelectItem value="price">Giá tăng dần</SelectItem>
                <SelectItem value="popular">Nhiều lượt đặt nhất</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        <div className="mt-6">
          {loading ? (
            <div
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
              role="status"
              aria-label="Đang tải phiên đấu"
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-80 animate-pulse rounded-2xl border border-line bg-stone-100"
                />
              ))}
            </div>
          ) : error && !rows.length ? (
            <div className="rounded-3xl border border-line bg-white p-10 text-center">
              <h2 className="text-lg font-semibold text-stone-950">
                Chưa tải được danh sách phiên
              </h2>
              <p className="mt-1.5 text-sm text-stone-600">Kiểm tra kết nối rồi tải lại trang.</p>
            </div>
          ) : !rows.length ? (
            <div className="rounded-3xl border border-line bg-white py-16 text-center">
              <Gavel className="mx-auto mb-3 size-8 text-stone-400" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-stone-950">Chưa có phiên đấu giá nào</h2>
            </div>
          ) : !matching.length ? (
            <div className="rounded-3xl border border-line bg-white py-16 text-center">
              <Gavel className="mx-auto mb-3 size-8 text-stone-400" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-stone-950">Không có phiên phù hợp</h2>
              {hasFilters && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setQ('');
                    setTab('ALL');
                    setPage(1);
                  }}
                  className="mt-4 min-h-11 rounded-xl"
                >
                  Xóa bộ lọc
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {matching.slice((actual - 1) * 8, actual * 8).map((a) => {
                const hasBids = hasCommittedBids(a);
                const isEndedWon =
                  a.status === 'ENDED' &&
                  Boolean(a.settlement?.winnerId || a.settlement?.outcome === 'WON' || hasBids);
                const price = isEndedWon
                  ? (a.settlement?.winningBidAmount ?? a.settlement?.finalPrice ?? currentPrice(a))
                  : currentPrice(a);
                const bidCount = a.bidCount ?? a.bids.length;
                const winnerDisplay =
                  a.settlement?.winnerAlias ||
                  (a.settlement?.winnerId
                    ? `Buyer ••••${a.settlement.winnerId.slice(-4).toUpperCase()}`
                    : null);
                return (
                  <article
                    key={a.id}
                    className="group overflow-hidden rounded-2xl border border-line bg-white transition-shadow hover:shadow-md"
                  >
                    <Link
                      href={'/auctions/' + encodeURIComponent(a.id)}
                      className="block focus-visible:outline-2 focus-visible:outline-emerald-600"
                    >
                      <div className="relative overflow-hidden bg-stone-50">
                        <img
                          loading="lazy"
                          src={a.image}
                          alt={a.title}
                          className="aspect-[4/3] w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.03]"
                        />
                        <span className="absolute top-3 left-3">
                          <AuctionBadge status={a.status} />
                        </span>
                      </div>
                      <div className="p-4 sm:p-5">
                        <div className="flex items-center justify-between gap-2 text-xs text-stone-500">
                          <span className="truncate">{a.seller}</span>
                          {a.condition && (
                            <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700">
                              {a.condition}
                            </span>
                          )}
                        </div>
                        <h2 className="mt-2 line-clamp-2 min-h-11 text-sm font-semibold leading-snug text-stone-950">
                          {a.title}
                        </h2>
                        <div className="mt-3.5">
                          {isEndedWon ? (
                            <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800">
                              <Trophy className="size-3.5 text-amber-600" aria-hidden="true" />
                              Trúng giá
                            </p>
                          ) : (
                            <p className="text-[11px] font-medium text-stone-500">
                              {a.status === 'ENDED'
                                ? 'Chưa có lượt đặt'
                                : hasBids
                                  ? 'Giá hiện tại'
                                  : 'Khởi điểm'}
                            </p>
                          )}
                          <p
                            className={`mt-0.5 text-xl font-bold tabular-nums ${
                              isEndedWon ? 'text-amber-900' : 'text-emerald-800'
                            }`}
                          >
                            {auctionMoney(price)}
                          </p>
                          {a.demoMode && (
                            <p className="mt-0.5 text-[11px] text-stone-500 tabular-nums">
                              ≈ {(price * (a.demoMultiplier ?? 1_000_000)).toLocaleString('vi-VN')}{' '}
                              ₫
                            </p>
                          )}
                          {isEndedWon && winnerDisplay && (
                            <p className="mt-1.5 truncate rounded-lg bg-amber-50/80 px-2 py-1 text-[11px] font-medium text-amber-950">
                              Người thắng: <strong>{winnerDisplay}</strong>
                            </p>
                          )}
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-stone-600">
                          <span className="tabular-nums">
                            {a.bidCount === null
                              ? 'Đang cập nhật lượt'
                              : hasBids
                                ? `${bidCount} lượt đặt`
                                : 'Chưa có lượt'}
                          </span>
                          <ArrowUpRight
                            className="size-4 text-stone-400 transition group-hover:text-emerald-700"
                            aria-hidden="true"
                          />
                        </div>
                        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-stone-500 tabular-nums">
                          <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
                          <span>
                            {a.status === 'SCHEDULED'
                              ? `Mở: ${auctionDate(a.startAt)}`
                              : a.status === 'ENDED'
                                ? `Đóng: ${auctionDate(a.endAt)}`
                                : a.status === 'CANCELLED'
                                  ? 'Đã hủy'
                                  : `Đóng: ${auctionDate(a.endAt)}`}
                          </span>
                        </p>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {matching.length > 8 && (
          <nav aria-label="Phân trang phiên đấu" className="mt-8 flex items-center justify-between">
            <span className="text-xs text-stone-600 tabular-nums">
              {matching.length} phiên · Trang {actual}/{pages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={actual === 1}
                onClick={() => setPage(actual - 1)}
                className="min-h-11 rounded-xl"
              >
                Trước
              </Button>
              <Button
                variant="outline"
                disabled={actual === pages}
                onClick={() => setPage(actual + 1)}
                className="min-h-11 rounded-xl"
              >
                Sau
              </Button>
            </div>
          </nav>
        )}
      </main>

      {/* Dialog "Cách đấu giá" ngắn gọn, rõ ràng */}
      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogTitle>Cách đấu giá trên Nexus</DialogTitle>
          <DialogDescription>4 nguyên tắc nhanh trước khi đặt giá:</DialogDescription>
          <ul className="mt-2 space-y-2.5 text-sm text-stone-700">
            <li>
              <strong>1. Lượt đầu &amp; bước giá:</strong> Khi chưa có lượt, bạn được đặt đúng{' '}
              <strong>giá khởi điểm</strong>. Từ lượt sau, tối thiểu bằng giá dẫn đầu + bước giá.
            </li>
            <li>
              <strong>2. Tự động gia hạn:</strong> Lượt đặt trong 2 phút cuối sẽ cộng thêm{' '}
              <strong>5 phút</strong> (tối đa 3 lần).
            </li>
            <li>
              <strong>3. Điều kiện uy tín:</strong> Tài khoản Buyer cần tối thiểu{' '}
              <strong>50/100 điểm uy tín</strong>. Thanh toán đơn trúng trong{' '}
              <strong>24 giờ</strong> (+2 điểm).
            </li>
            <li>
              <strong>4. Quy ước phiên demo:</strong> Với phiên demo giá nhỏ,{' '}
              <strong>1 ₫ tương đương 1.000.000 ₫</strong> giá trị minh họa.
            </li>
          </ul>
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              onClick={() => setGuideOpen(false)}
              className="min-h-11 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800"
            >
              Đã hiểu
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
