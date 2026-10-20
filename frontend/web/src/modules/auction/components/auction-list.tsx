'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Search, ArrowUpRight, Gavel } from 'lucide-react';
import { StoreHeader } from '@/components/layout/store-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { auctionApi, auctionStatusLabel, currentPrice, type Auction } from '../api/auction.api';
export function AuctionList() {
  const [rows, setRows] = useState<Auction[]>([]),
    [q, setQ] = useState(''),
    [tab, setTab] = useState('all'),
    [sort, setSort] = useState('ending'),
    [page, setPage] = useState(1),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
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
    const timer = setInterval(() => void load(), 3000);
    const off = auctionApi.subscribe(() => void load());
    return () => {
      ignore = true;
      clearInterval(timer);
      off();
    };
  }, []);
  const matching = rows
    .filter(
      (a) =>
        (tab === 'all' || a.status === tab) &&
        `${a.title} ${a.seller}`.toLocaleLowerCase('vi').includes(q.trim().toLocaleLowerCase('vi')),
    )
    .sort((a, b) =>
      sort === 'price'
        ? currentPrice(a) - currentPrice(b)
        : sort === 'popular'
          ? b.bids.length - a.bids.length
          : a.endAt - b.endAt,
    );
  const pages = Math.max(1, Math.ceil(matching.length / 8)),
    actual = Math.min(page, pages);
  return (
    <>
      <StoreHeader />
      <main className="nexus-container py-10">
        <section className="relative overflow-hidden rounded-3xl bg-brand-dark px-6 py-10 text-white sm:px-10 sm:py-14">
          <div
            className="absolute -top-20 -right-16 size-80 rounded-full border border-white/15"
            aria-hidden="true"
          />
          <p className="text-xs font-bold tracking-[.25em] text-white/70">
            NEXUS / AUCTION COLLECTION
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
            Món đồ có giá trị.
            <br />
            Cơ hội dành cho bạn.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-white/80">
            Từ những thiết bị đáng sở hữu đến món đồ sưu tầm. Khám phá phiên đang diễn ra và tìm mức
            giá của riêng bạn.
          </p>
        </section>
        <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Lọc trạng thái phiên">
          {[['all', 'Tất cả'], ...Object.entries(auctionStatusLabel)].map(([key, label]) => (
            <Button
              key={key}
              variant={key === tab ? 'default' : 'outline'}
              aria-pressed={key === tab}
              onClick={() => {
                setTab(key);
                setPage(1);
              }}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="my-6 flex flex-col items-stretch justify-between gap-3 sm:flex-row">
          <label className="flex items-center gap-3 sm:w-96">
            <Search size={18} />
            <span className="sr-only">Tìm phiên đấu</span>
            <Input
              value={q}
              placeholder="Tìm món đồ hoặc người bán…"
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger aria-label="Sắp xếp phiên" className="w-full sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ending">Kết thúc sớm nhất</SelectItem>
              <SelectItem value="price">Giá tăng dần</SelectItem>
              <SelectItem value="popular">Nhiều lượt trả giá</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {error && (
          <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4">
            {error}
          </p>
        )}
        {loading ? (
          <p role="status">Đang tải phiên đấu…</p>
        ) : !matching.length ? (
          <div className="rounded-3xl border border-line py-16 text-center">
            <Gavel className="mx-auto mb-4 text-muted" />
            <h2 className="text-xl font-bold">Chưa tìm thấy phiên phù hợp</h2>
            <Button
              variant="ghost"
              onClick={() => {
                setQ('');
                setTab('all');
              }}
            >
              Xóa bộ lọc
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {matching.slice((actual - 1) * 8, actual * 8).map((a) => (
              <article
                key={a.id}
                className="group overflow-hidden rounded-2xl border border-line bg-white transition-shadow hover:shadow-lg"
              >
                <Link
                  href={'/auctions/' + a.id}
                  className="block focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <div className="relative overflow-hidden">
                    <img
                      loading="lazy"
                      src={a.image}
                      alt={a.title}
                      className="aspect-[4/3] w-full object-cover transition-transform motion-safe:group-hover:scale-105"
                    />
                    <span className="absolute top-3 left-3 rounded-full bg-white px-3 py-2 text-[11px] font-semibold">
                      {auctionStatusLabel[a.status]}
                    </span>
                  </div>
                  <div className="p-5">
                    <p className="text-xs text-muted">{a.seller}</p>
                    <h2 className="mt-2 line-clamp-2 min-h-12 font-semibold">{a.title}</h2>
                    <p className="mt-4 text-xl font-bold text-brand-dark">
                      {currentPrice(a).toLocaleString('vi-VN')} ₫
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-xs text-muted">
                      <span>{a.bids.length} lượt trả giá</span>
                      <ArrowUpRight size={18} />
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      {a.status === 'SCHEDULED' ? 'Bắt đầu' : 'Kết thúc'}:{' '}
                      {new Date(a.status === 'SCHEDULED' ? a.startAt : a.endAt).toLocaleString(
                        'vi-VN',
                      )}
                    </p>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
        <nav aria-label="Phân trang phiên đấu" className="mt-8 flex items-center justify-between">
          <span className="text-sm text-muted">
            {matching.length} phiên · Trang {actual}/{pages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" disabled={actual === 1} onClick={() => setPage(actual - 1)}>
              Trước
            </Button>
            <Button
              variant="outline"
              disabled={actual === pages}
              onClick={() => setPage(actual + 1)}
            >
              Sau
            </Button>
          </div>
        </nav>
      </main>
    </>
  );
}
