'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Plus, Search, ArrowUpRight, Gavel, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuctions } from '@/modules/auction/hooks/use-auctions';
import { AuctionBadge, auctionDate, auctionMoney } from '@/modules/auction/components/auction-ui';
import {
  auctionStatusLabel,
  currentPrice,
  canManageAuction,
} from '@/modules/auction/api/auction.api';
import { useSession } from '@/modules/auth/hooks/use-session';
import { appConfig } from '@/configs/app.config';
import { AdminAuctions } from './admin-auctions';
export function AuctionWorkspace() {
  if (appConfig.auctionSource !== 'mock') return <AdminAuctions />;
  return <AuctionWorkspaceContent />;
}
function AuctionWorkspaceContent() {
  const { rows, loading, error, reload, refreshing } = useAuctions();
  const { user } = useSession();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const matches = rows.filter(
    (a) =>
      (status === 'all' || a.status === status) &&
      (a.title + a.id + a.seller)
        .toLocaleLowerCase('vi')
        .includes(query.trim().toLocaleLowerCase('vi')),
  );
  const pages = Math.max(1, Math.ceil(matches.length / 8));
  const current = Math.min(page, pages);
  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[.18em] text-brand-dark">
            ĐIỀU HÀNH ĐẤU GIÁ
          </p>
          <h1>Quản lý phiên đấu</h1>
          <p className="text-sm text-muted">
            Theo dõi diễn biến, chuẩn bị phiên mới và kiểm soát từng thay đổi.
          </p>
        </div>
        {canManageAuction(user, 'AUCTION.CREATE') && (
          <Button asChild>
            <Link href="/admin/auctions/new">
              <Plus size={18} />
              Tạo phiên đấu
            </Link>
          </Button>
        )}
      </header>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Object.entries(auctionStatusLabel).map(([key, label]) => (
          <Button
            key={key}
            variant="outline"
            aria-pressed={status === key}
            onClick={() => {
              setStatus(status === key ? 'all' : key);
              setPage(1);
            }}
            className={
              'h-auto justify-between rounded-2xl bg-white p-5 text-left ' +
              (status === key ? 'border-brand ring-1 ring-brand' : '')
            }
          >
            <span className="text-sm text-muted">{label}</span>
            <strong className="text-2xl tabular-nums">
              {loading ? '—' : rows.filter((a) => a.status === key).length}
            </strong>
          </Button>
        ))}
      </div>
      <section className="overflow-hidden rounded-3xl border border-line bg-white">
        <div className="flex flex-wrap gap-3 border-b border-line p-5">
          <label className="relative min-w-0 flex-1">
            <Search aria-hidden="true" className="absolute top-3.5 left-3 text-muted" size={18} />
            <span className="sr-only">Tìm phiên đấu</span>
            <Input
              className="pl-10"
              placeholder="Tên phiên, mã phiên hoặc người bán…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-48" aria-label="Trạng thái phiên">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              {Object.entries(auctionStatusLabel).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => void reload()}
            disabled={refreshing}
            aria-busy={refreshing}
            aria-label={refreshing ? 'Đang tải lại' : 'Tải lại danh sách'}
          >
            <RefreshCw size={17} className={refreshing ? 'motion-safe:animate-spin' : ''} />
          </Button>
        </div>
        {error ? (
          <div role="alert" className="p-8 text-red-700">
            {error}
            <Button variant="outline" onClick={() => void reload()} className="ml-3">
              Thử lại
            </Button>
          </div>
        ) : loading ? (
          <p role="status" className="p-10">
            Đang tải phiên đấu…
          </p>
        ) : !matches.length ? (
          <div className="px-6 py-16 text-center">
            <Gavel className="mx-auto mb-4 text-muted" />
            <h2>Chưa có phiên phù hợp</h2>
            <p className="mt-2 text-sm text-muted">Thử từ khóa khác hoặc xem lại toàn bộ phiên.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setQuery('');
                setStatus('all');
                setPage(1);
              }}
            >
              Xóa bộ lọc
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[740px] text-left text-sm">
              <thead className="bg-slate-50 text-muted">
                <tr>
                  {['Phiên / sản phẩm', 'Trạng thái', 'Giá hiện tại', 'Kết thúc', 'Chi tiết'].map(
                    (h) => (
                      <th key={h} className="px-5 py-4 font-medium">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {matches.slice((current - 1) * 8, current * 8).map((a) => (
                  <tr key={a.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={a.image}
                          alt=""
                          loading="lazy"
                          className="size-14 rounded-xl object-cover"
                        />
                        <div>
                          <Link
                            href={'/admin/auctions/' + a.id}
                            className="font-semibold hover:underline"
                          >
                            {a.title}
                          </Link>
                          <p className="mt-1 text-xs text-muted">
                            {a.id} · {a.seller}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <AuctionBadge status={a.status} />
                    </td>
                    <td className="px-5 py-4">
                      <strong className="tabular-nums">{auctionMoney(currentPrice(a))}</strong>
                      <p className="mt-1 text-xs text-muted">{a.bids.length} lượt trả giá</p>
                    </td>
                    <td className="px-5 py-4 text-muted">{auctionDate(a.endAt)}</td>
                    <td className="px-5 py-4">
                      <Button variant="ghost" asChild aria-label={'Xem ' + a.title}>
                        <Link href={'/admin/auctions/' + a.id}>
                          <ArrowUpRight size={18} />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <footer className="flex items-center justify-between gap-3 border-t border-line p-5 text-sm">
          <span className="text-muted">
            {matches.length} phiên · Trang {current}/{pages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" disabled={current <= 1} onClick={() => setPage(current - 1)}>
              Trước
            </Button>
            <Button
              variant="outline"
              disabled={current >= pages}
              onClick={() => setPage(current + 1)}
            >
              Sau
            </Button>
          </div>
        </footer>
      </section>
    </div>
  );
}
