'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Calendar, Clock3, Gavel, Plus, RefreshCw, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminSelect } from './admin-select';
import { appConfig } from '@/configs/app.config';
import { useSession } from '@/modules/auth/hooks/use-session';
import {
  auctionApi,
  auctionStatusLabel,
  canManageAuction,
  currentPrice,
  hasCommittedBids,
  type Auction,
  type AuctionStatus,
} from '@/modules/auction/api/auction.api';
import { AuctionBadge, auctionDate, auctionMoney } from '@/modules/auction/components/auction-ui';

type QuickFilter = 'none' | 'starting_soon' | 'extended' | 'pending_settlement';

function isPendingSettlement(auction: Auction): boolean {
  if (auction.status !== 'ENDED') return false;
  if (auction.settlement?.outcome === 'NO_BIDS') return false;
  if (auction.settlement?.orderId) return false;
  return hasCommittedBids(auction) || auction.settlement?.outcome === 'PENDING';
}

function settlementLabel(auction: Auction): { text: string; tone: string } {
  if (auction.status === 'CANCELLED') {
    return { text: 'Đã hủy', tone: 'text-red-700' };
  }
  if (auction.status === 'SCHEDULED') {
    return { text: 'Chưa mở', tone: 'text-stone-500' };
  }
  if (auction.status === 'ACTIVE' || auction.status === 'EXTENDED') {
    return { text: 'Đang nhận giá', tone: 'text-stone-600' };
  }
  if (auction.settlement?.orderId) {
    const pay = auction.settlement.paymentStatus ? ` · ${auction.settlement.paymentStatus}` : '';
    return {
      text: `Đơn ${auction.settlement.orderId.slice(0, 10)}${pay}`,
      tone: 'text-emerald-800 font-medium',
    };
  }
  if (isPendingSettlement(auction)) {
    return { text: 'Chờ chốt kết quả', tone: 'text-amber-800 font-semibold' };
  }
  return { text: 'Không có lượt giá', tone: 'text-stone-500' };
}

export function AdminAuctions() {
  const { user } = useSession();
  const [rows, setRows] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('none');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await auctionApi.list();
      // Stable order: newest endAt first, deterministic tie-break by id.
      const sorted = [...data].sort((a, b) => {
        if (b.endAt !== a.endAt) return b.endAt - a.endAt;
        return a.id.localeCompare(b.id);
      });
      setRows(sorted);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chưa tải được danh sách phiên đấu giá.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
    const off = auctionApi.subscribe(() => void load(true));
    return off;
  }, [load]);

  const counts = useMemo(() => {
    const now = Date.now();
    const soonThreshold = now + 24 * 60 * 60 * 1000;
    return {
      startingSoon: rows.filter(
        (r) => r.status === 'SCHEDULED' && r.startAt >= now && r.startAt <= soonThreshold,
      ).length,
      scheduled: rows.filter((r) => r.status === 'SCHEDULED').length,
      extended: rows.filter((r) => r.status === 'EXTENDED').length,
      pendingSettlement: rows.filter(isPendingSettlement).length,
    };
  }, [rows]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('vi');
    const fromMs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const toMs = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : null;

    return rows.filter((row) => {
      if (quickFilter === 'starting_soon' && row.status !== 'SCHEDULED') return false;
      if (quickFilter === 'extended' && row.status !== 'EXTENDED') return false;
      if (quickFilter === 'pending_settlement' && !isPendingSettlement(row)) return false;

      if (status !== 'all' && row.status !== (status as AuctionStatus)) return false;

      if (fromMs !== null && Number.isFinite(fromMs) && row.endAt < fromMs) return false;
      if (toMs !== null && Number.isFinite(toMs) && row.startAt > toMs) return false;

      if (needle) {
        const haystack =
          `${row.id} ${row.productId} ${row.title} ${row.seller} ${row.sellerId ?? ''}`.toLocaleLowerCase(
            'vi',
          );
        if (!haystack.includes(needle)) return false;
      }

      return true;
    });
  }, [fromDate, query, quickFilter, rows, status, toDate]);

  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pages);
  const pageItems = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const hasActiveFilters =
    Boolean(query.trim()) ||
    status !== 'all' ||
    quickFilter !== 'none' ||
    Boolean(fromDate) ||
    Boolean(toDate);

  const resetFilters = () => {
    setQuery('');
    setStatus('all');
    setQuickFilter('none');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const toggleQuick = (next: QuickFilter) => {
    setQuickFilter((prev) => (prev === next ? 'none' : next));
    setStatus('all');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-xs font-bold tracking-[0.18em] text-emerald-800 uppercase">
            Điều hành đấu giá
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-stone-950 sm:text-3xl">
            Quản lý phiên đấu giá
          </h1>
          <p className="mt-1.5 text-sm text-stone-600">
            Theo dõi trạng thái, giá dẫn, lịch đóng và tình trạng chốt đơn của các phiên trên hệ
            thống.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => void load(true)}
            disabled={refreshing || loading}
            aria-busy={refreshing}
            className="min-h-11 rounded-xl border-stone-300"
          >
            <RefreshCw
              className={`size-4 ${refreshing ? 'motion-safe:animate-spin' : ''}`}
              aria-hidden="true"
            />
            Tải lại
          </Button>
          {canManageAuction(user, 'AUCTION.CREATE') && (
            <Button
              asChild
              className="min-h-11 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800"
            >
              <Link href="/admin/auctions/new">
                <Plus className="size-4" aria-hidden="true" />
                Tạo phiên đấu
              </Link>
            </Button>
          )}
        </div>
      </header>

      {/* Operational quick filters (A1) */}
      <div
        role="group"
        aria-label="Bộ lọc nhanh điều hành"
        className="flex flex-wrap items-center gap-2.5"
      >
        <button
          type="button"
          aria-pressed={quickFilter === 'starting_soon'}
          onClick={() => toggleQuick('starting_soon')}
          className={
            'inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-emerald-700 ' +
            (quickFilter === 'starting_soon'
              ? 'border-sky-600 bg-sky-50 text-sky-950'
              : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300')
          }
        >
          <Calendar className="size-4 text-sky-700" aria-hidden="true" />
          <span>Sắp bắt đầu</span>
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-bold tabular-nums text-stone-800">
            {loading ? '—' : counts.scheduled}
          </span>
        </button>

        <button
          type="button"
          aria-pressed={quickFilter === 'extended'}
          onClick={() => toggleQuick('extended')}
          className={
            'inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-emerald-700 ' +
            (quickFilter === 'extended'
              ? 'border-amber-600 bg-amber-50 text-amber-950'
              : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300')
          }
        >
          <Clock3 className="size-4 text-amber-700" aria-hidden="true" />
          <span>Đang gia hạn</span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold tabular-nums text-amber-950">
            {loading ? '—' : counts.extended}
          </span>
        </button>

        <button
          type="button"
          aria-pressed={quickFilter === 'pending_settlement'}
          onClick={() => toggleQuick('pending_settlement')}
          className={
            'inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-emerald-700 ' +
            (quickFilter === 'pending_settlement'
              ? 'border-red-600 bg-red-50 text-red-900'
              : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300')
          }
        >
          <Gavel className="size-4 text-red-700" aria-hidden="true" />
          <span>Chờ chốt kết quả</span>
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold tabular-nums text-red-800">
            {loading ? '—' : counts.pendingSettlement}
          </span>
        </button>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            onClick={resetFilters}
            className="min-h-11 rounded-xl text-stone-600"
          >
            <X className="size-4" aria-hidden="true" />
            Xóa bộ lọc
          </Button>
        )}
      </div>

      {/* Filter & operational table surface */}
      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="grid gap-3 border-b border-stone-200 p-4 sm:p-5 lg:grid-cols-[1.6fr_0.9fr_0.8fr_0.8fr]">
          <label className="relative block">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-stone-400"
            />
            <span className="sr-only">Tìm theo mã phiên, sản phẩm hoặc Seller</span>
            <Input
              className="min-h-11 rounded-xl pl-10"
              placeholder="Tìm mã phiên, sản phẩm hoặc Seller…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
          </label>

          <div>
            <AdminSelect
              id="admin-auction-status"
              value={status}
              onValueChange={(value) => {
                setStatus(value || 'all');
                setQuickFilter('none');
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'Tất cả trạng thái' },
                ...(Object.entries(auctionStatusLabel) as Array<[AuctionStatus, string]>).map(
                  ([key, label]) => ({ value: key, label }),
                ),
              ]}
              placeholder="Trạng thái"
            />
          </div>

          <label className="flex flex-col gap-1">
            <span className="sr-only">Từ ngày</span>
            <Input
              type="date"
              aria-label="Từ ngày"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value);
                setPage(1);
              }}
              className="min-h-11 rounded-xl text-sm"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="sr-only">Đến ngày</span>
            <Input
              type="date"
              aria-label="Đến ngày"
              value={toDate}
              onChange={(event) => {
                setToDate(event.target.value);
                setPage(1);
              }}
              className="min-h-11 rounded-xl text-sm"
            />
          </label>
        </div>

        {error ? (
          <div role="alert" className="p-8 text-center text-sm text-red-700">
            <p>{error}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void load(false)}
              className="mt-4 min-h-11"
            >
              Thử lại
            </Button>
          </div>
        ) : loading ? (
          <p role="status" className="p-10 text-center text-sm text-stone-500">
            Đang tải danh sách phiên đấu giá…
          </p>
        ) : visible.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Gavel className="mx-auto size-8 text-stone-400" aria-hidden="true" />
            <h2 className="mt-3 text-base font-semibold text-stone-900">
              Không tìm thấy phiên phù hợp
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Điều chỉnh từ khóa, trạng thái hoặc khoảng thời gian để xem thêm phiên.
            </p>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                onClick={resetFilters}
                className="mt-4 min-h-11 rounded-xl"
              >
                Xóa toàn bộ bộ lọc
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop aligned table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold tracking-wide text-stone-600 uppercase">
                  <tr>
                    <th className="px-4 py-3.5">Sản phẩm &amp; mã phiên</th>
                    <th className="px-4 py-3.5">Seller</th>
                    <th className="px-4 py-3.5">Trạng thái</th>
                    <th className="px-4 py-3.5 text-right">Giá dẫn</th>
                    <th className="px-4 py-3.5 text-right">Số lượt</th>
                    <th className="px-4 py-3.5">Mốc mở / đóng</th>
                    <th className="px-4 py-3.5">Chốt / đơn</th>
                    <th className="px-4 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {pageItems.map((row) => {
                    const settle = settlementLabel(row);
                    const bidTotal =
                      row.bidCount === null ? null : (row.bidCount ?? row.bids.length);
                    return (
                      <tr key={row.id} className="transition-colors hover:bg-stone-50/70">
                        <td className="max-w-[270px] px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <img
                              src={row.image}
                              alt=""
                              loading="lazy"
                              className="size-11 shrink-0 rounded-lg border border-stone-100 bg-stone-50 object-cover"
                            />
                            <div className="min-w-0">
                              <Link
                                href={`/admin/auctions/${encodeURIComponent(row.id)}`}
                                className="block truncate font-semibold text-stone-950 hover:text-emerald-800 hover:underline"
                              >
                                {row.title}
                              </Link>
                              <p className="mt-0.5 truncate font-mono text-xs text-stone-500">
                                {row.id}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="max-w-[160px] truncate px-4 py-3.5 text-stone-700">
                          {row.seller}
                        </td>
                        <td className="px-4 py-3.5">
                          <AuctionBadge status={row.status} />
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="font-semibold text-stone-950 tabular-nums">
                            {auctionMoney(currentPrice(row))}
                          </span>
                          {!hasCommittedBids(row) && (
                            <p className="text-[11px] text-stone-500">Giá khởi điểm</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium text-stone-800 tabular-nums">
                          {bidTotal === null ? '—' : bidTotal}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-stone-600 tabular-nums">
                          <p>Mở: {auctionDate(row.startAt)}</p>
                          <p className="mt-0.5 font-medium text-stone-900">
                            Đóng: {auctionDate(row.endAt)}
                          </p>
                        </td>
                        <td className={`px-4 py-3.5 text-xs ${settle.tone}`}>{settle.text}</td>
                        <td className="px-4 py-3.5 text-right">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="min-h-10 rounded-lg border-stone-300 text-xs font-semibold"
                          >
                            <Link href={`/admin/auctions/${encodeURIComponent(row.id)}`}>
                              Xem phiên
                              <ArrowUpRight className="size-3.5" aria-hidden="true" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile stacked cards (A1 responsive) */}
            <ul className="divide-y divide-stone-200 md:hidden">
              {pageItems.map((row) => (
                <li key={row.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <AuctionBadge status={row.status} />
                    <span className="text-xs text-stone-500 tabular-nums">
                      Đóng: {auctionDate(row.endAt)}
                    </span>
                  </div>
                  <div>
                    <Link
                      href={`/admin/auctions/${encodeURIComponent(row.id)}`}
                      className="font-semibold text-stone-950 hover:underline"
                    >
                      {row.title}
                    </Link>
                    <p className="mt-0.5 font-mono text-xs text-stone-500">
                      {row.id} · {row.seller}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div>
                      <p className="text-[11px] text-stone-500">Giá dẫn</p>
                      <p className="text-sm font-bold text-stone-950 tabular-nums">
                        {auctionMoney(currentPrice(row))}
                      </p>
                    </div>
                    <Button
                      asChild
                      variant="outline"
                      className="min-h-11 rounded-xl border-stone-300 px-4 text-xs font-semibold"
                    >
                      <Link href={`/admin/auctions/${encodeURIComponent(row.id)}`}>
                        Xem phiên
                        <ArrowUpRight className="size-3.5" aria-hidden="true" />
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-4 py-3.5 text-xs text-stone-600 sm:px-5 sm:text-sm">
          <div>
            <span className="font-medium text-stone-900 tabular-nums">
              Hiển thị {visible.length} phiên trong tập hiện tải · Trang {currentPage}/{pages}
            </span>
            {appConfig.auctionSource === 'api' && (
              <p className="mt-0.5 text-xs text-stone-500">
                Tổng toàn hệ thống và phân trang server-side sẽ tự kích hoạt khi Backend bổ sung
                query filter/total cho <code>/admin/auctions</code>.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              className="min-h-11 rounded-xl"
            >
              Trước
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={currentPage >= pages}
              onClick={() => setPage(currentPage + 1)}
              className="min-h-11 rounded-xl"
            >
              Sau
            </Button>
          </div>
        </footer>
      </section>
    </div>
  );
}
