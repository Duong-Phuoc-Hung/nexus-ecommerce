'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Clock3, Gavel, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { StoreHeader } from '@/components/layout/store-header';
import { useSession } from '@/modules/auth/hooks/use-session';
import { appConfig } from '@/configs/app.config';
import {
  auctionApi,
  auctionStatusLabel,
  currentPrice,
  nextPrice,
  type Auction,
} from '../api/auction.api';

const money = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
const date = (n: number) => new Date(n).toLocaleString('vi-VN');
function remaining(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 3600)
    .toString()
    .padStart(2, '0')} : ${Math.floor((s % 3600) / 60)
    .toString()
    .padStart(2, '0')} : ${(s % 60).toString().padStart(2, '0')}`;
}
export function AuctionDetail({ id }: { id: string }) {
  const requestVersion = useRef(0);
  const [imageOpen, setImageOpen] = useState(false);
  const { user, phase } = useSession();
  const [auction, setAuction] = useState<Auction | null>(null),
    [error, setError] = useState('');
  const [now, setNow] = useState(0),
    [offset, setOffset] = useState(0),
    [amount, setAmount] = useState('');
  const [page, setPage] = useState(1),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  const [confirmation, setConfirmation] = useState<{
    amount: number;
    version: number;
    key: string;
  } | null>(null);
  const refresh = useCallback(async () => {
    const request = ++requestVersion.current;
    try {
      const snapshot = await auctionApi.detail(id);
      if (request !== requestVersion.current) return;
      setAuction(snapshot.auction);
      setOffset(snapshot.serverTime - Date.now());
      setError('');
    } catch (e) {
      if (request === requestVersion.current)
        setError(e instanceof Error ? e.message : 'Không tải được phiên đấu.');
    }
  }, [id]);
  useEffect(() => {
    void refresh();
    const off = auctionApi.subscribe(() => void refresh());
    const timer = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 3000);
    return () => {
      requestVersion.current++;
      off();
      clearInterval(timer);
    };
  }, [refresh]);
  useEffect(() => {
    setNow(Date.now() + offset);
    const timer = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(timer);
  }, [offset]);
  const allowed =
    process.env.NODE_ENV === 'development' &&
    appConfig.auctionSource === 'mock' &&
    phase === 'ready' &&
    !!user &&
    user.role === 'BUYER' &&
    user.status === 'ACTIVE' &&
    (!user.permissions || user.permissions.includes('AUCTION.BID'));
  async function confirmBid() {
    if (!confirmation || !auction || busy || !user || !allowed) return;
    setBusy(true);
    setNotice('');
    try {
      const result = await auctionApi.bid(
        id,
        confirmation.amount,
        user,
        confirmation.version,
        confirmation.key,
      );
      requestVersion.current++;
      setAuction(result);
      setAmount('');
      setPage(1);
      setConfirmation(null);
      setNotice('Đã ghi nhận giá trên thiết bị này. Chưa gửi giao dịch lên máy chủ.');
    } catch (e) {
      setConfirmation(null);
      setNotice(e instanceof Error ? e.message : 'Không gửi được giá.');
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  const active = auction?.status === 'ACTIVE' && now < auction.endAt;
  const history = auction?.bids ?? [],
    pages = Math.max(1, Math.ceil(history.length / 5)),
    visiblePage = Math.min(page, pages);
  return (
    <>
      <StoreHeader />
      <main className="nexus-container py-8 sm:py-12">
        <Link
          href="/auctions"
          className="mb-7 inline-flex min-h-11 items-center gap-2 text-sm text-muted"
        >
          <ArrowLeft size={16} />
          Tất cả phiên đấu
        </Link>
        {error && (
          <div role="alert" className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <p>{error}</p>
            <Button variant="outline" className="mt-3" onClick={() => void refresh()}>
              Thử lại
            </Button>
          </div>
        )}
        {!auction && !error && (
          <div role="status" className="h-96 animate-pulse rounded-3xl bg-stone-100">
            {' '}
            <span className="sr-only">Đang tải phiên đấu…</span>
          </div>
        )}
        {auction && (
          <>
            <div className="grid items-start gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
              <section aria-label="Thông tin món đồ" className="min-w-0">
                <Button variant="outline" className="mb-3" onClick={() => setImageOpen(true)}>
                  Xem ảnh lớn
                </Button>
                <div className="relative overflow-hidden rounded-3xl bg-stone-100">
                  <img
                    src={auction.image}
                    alt={auction.title}
                    className="aspect-[5/4] w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/images/nexus-product-placeholder.svg';
                    }}
                  />
                  <span className="absolute top-5 left-5 rounded-full bg-white/95 px-4 py-2 text-xs font-semibold shadow-sm">
                    {auction.condition}
                  </span>
                </div>
                <div className="mt-5 flex items-center gap-3 rounded-2xl border border-line p-5">
                  <ShieldCheck className="text-brand-dark" />
                  <div>
                    <p className="text-xs text-muted">Thông tin người bán</p>
                    <p className="font-semibold">{auction.seller}</p>
                  </div>
                </div>
              </section>
              <section className="min-w-0">
                <p className="mb-3 text-xs font-bold tracking-[.2em] text-brand-dark">
                  NEXUS AUCTIONS / {auction.id}
                </p>
                <h1 className="text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
                  {auction.title}
                </h1>
                <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-2 text-xs font-bold text-brand-dark">
                  <span className="size-2 rounded-full bg-current" />
                  {auctionStatusLabel[auction.status]}
                </span>
                <div className="mt-6 rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8">
                  <p className="text-sm text-muted">
                    {auction.status === 'ENDED' ? 'Mức giá cuối cùng' : 'Mức giá hiện tại'}
                  </p>
                  <p className="mt-2 text-4xl font-bold tracking-tight text-brand-dark">
                    {money(currentPrice(auction))}
                  </p>
                  <div className="mt-6 grid grid-cols-2 gap-4 border-y border-line py-5 text-sm">
                    <div>
                      <p className="text-muted">Bước giá</p>
                      <strong>{money(auction.increment)}</strong>
                    </div>
                    <div>
                      <p className="text-muted">Lượt trả giá</p>
                      <strong>
                        {auction.bidCount === null
                          ? 'Đang cập nhật'
                          : `${auction.bidCount ?? history.length} lượt`}
                      </strong>
                    </div>
                  </div>
                  {['ACTIVE', 'SCHEDULED'].includes(auction.status) && (
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-sm text-muted">
                        <Clock3 size={16} />
                        {auction.status === 'ACTIVE' ? 'Còn lại' : 'Bắt đầu sau'}
                      </span>
                      <span className="text-xl font-bold tabular-nums">
                        {remaining(
                          (auction.status === 'ACTIVE' ? auction.endAt : auction.startAt) - now,
                        )}
                      </span>
                    </div>
                  )}
                  {active ? (
                    <form
                      className="mt-6"
                      onSubmit={(e) => {
                        e.preventDefault();
                        setNotice('');
                        const value = Number(amount || nextPrice(auction));
                        if (!Number.isSafeInteger(value) || value < nextPrice(auction)) {
                          setNotice('Giá chưa đạt mức tối thiểu. Hãy kiểm tra lại.');
                          return;
                        }
                        setConfirmation({
                          amount: value,
                          version: auction.version,
                          key: crypto.randomUUID(),
                        });
                      }}
                    >
                      <label htmlFor="auction-amount" className="mb-2 block text-sm font-semibold">
                        Giá bạn muốn đặt (VND)
                      </label>
                      <Input
                        id="auction-amount"
                        type="number"
                        step="1"
                        min={nextPrice(auction)}
                        max={1_000_000_000_000}
                        value={amount}
                        placeholder={String(nextPrice(auction))}
                        onChange={(e) => setAmount(e.target.value)}
                        aria-describedby="minimum-bid"
                        disabled={!allowed || busy}
                      />
                      <p id="minimum-bid" className="mt-2 text-xs text-muted">
                        Tối thiểu {money(nextPrice(auction))}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[0, 1, 2].map((n) => (
                          <Button
                            key={n}
                            variant="outline"
                            size="sm"
                            disabled={!allowed || busy}
                            onClick={() =>
                              setAmount(String(nextPrice(auction) + n * auction.increment))
                            }
                          >
                            {money(nextPrice(auction) + n * auction.increment)}
                          </Button>
                        ))}
                      </div>
                      <Button
                        type="submit"
                        className="mt-5 w-full gap-2"
                        size="lg"
                        disabled={!allowed || busy || !!error}
                      >
                        <Gavel size={18} />
                        Đặt giá <ArrowUpRight size={18} />
                      </Button>
                      {!allowed && (
                        <p className="mt-3 text-sm text-muted">
                          {appConfig.auctionSource === 'api'
                            ? 'Backend chưa hoàn thiện xử lý đặt giá trực tuyến.'
                            : user && user.role !== 'BUYER'
                              ? 'Tài khoản này không có quyền đặt giá.'
                              : 'Chức năng đặt giá hiện chưa khả dụng.'}
                        </p>
                      )}
                      {!user && (
                        <Link
                          className="mt-3 block py-2 text-center text-sm underline"
                          href={'/login?next=' + encodeURIComponent('/auctions/' + id)}
                        >
                          Đăng nhập tài khoản của bạn
                        </Link>
                      )}
                    </form>
                  ) : (
                    <div className="mt-5 rounded-xl bg-stone-50 p-4 text-sm">
                      {auction.status === 'CANCELLED'
                        ? `Phiên đã hủy. ${auction.cancelReason ?? ''}`
                        : auction.status === 'SCHEDULED'
                          ? 'Phiên chưa bắt đầu. Hãy quay lại đúng thời gian để tham gia.'
                          : auction.bidHistoryAvailable === false
                            ? 'Phiên đã kết thúc; backend chưa cung cấp lịch sử trả giá.'
                            : history.length
                              ? 'Phiên đã kết thúc. Đang chờ xác nhận kết quả; chưa phát sinh đơn hàng.'
                              : 'Phiên kết thúc mà chưa có lượt trả giá.'}
                    </div>
                  )}
                  {notice && (
                    <p role="status" className="mt-4 rounded-xl border border-line p-4 text-sm">
                      {notice}
                    </p>
                  )}
                </div>
              </section>
            </div>
            {active && user?.role === 'BUYER' && history.some((b) => b.bidder === user.id) && (
              <div
                role="status"
                className="mt-6 rounded-2xl border border-line bg-slate-50 p-5 text-sm"
              >
                <strong>
                  {history[0]?.bidder === user.id
                    ? 'Bạn đang dẫn đầu phiên đấu'
                    : 'Mức giá của bạn đã được vượt qua'}
                </strong>
                <p className="mt-2 text-muted">
                  {history[0]?.bidder === user.id
                    ? 'Theo dõi phiên đến khi kết thúc để nhận kết quả xác nhận.'
                    : 'Xem mức giá mới nhất trước khi quyết định trả giá tiếp.'}
                </p>
              </div>
            )}
            <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
              <section className="rounded-3xl border border-line p-6 sm:p-8">
                <h2 className="text-xl font-bold">Câu chuyện món đồ</h2>
                <p className="mt-4 leading-7 text-muted">{auction.description}</p>
                <dl className="mt-6 space-y-4 border-t border-line pt-5 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt>Giá khởi điểm</dt>
                    <dd className="font-semibold">{money(auction.startingPrice)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Bắt đầu</dt>
                    <dd>{date(auction.startAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Kết thúc</dt>
                    <dd>{date(auction.endAt)}</dd>
                  </div>
                </dl>
              </section>
              <section className="rounded-3xl border border-line p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Lịch sử trả giá</h2>
                  <span className="text-xs text-muted">Mới nhất trước</span>
                </div>
                {!history.length ? (
                  <p className="py-10 text-center text-muted">
                    {auction.bidHistoryAvailable === false
                      ? 'Backend chưa cung cấp lịch sử trả giá cho phiên này.'
                      : 'Chưa có lượt trả giá nào.'}
                  </p>
                ) : (
                  <ol className="mt-4 divide-y divide-line">
                    {history.slice((visiblePage - 1) * 5, visiblePage * 5).map((bid, i) => (
                      <li key={bid.id} className="flex items-center justify-between gap-3 py-4">
                        <div>
                          <p className="text-sm font-semibold">
                            {bid.bidder === user?.id
                              ? 'Bạn'
                              : bid.bidder.startsWith('Người') || bid.bidder.startsWith('Bạn')
                                ? bid.bidder
                                : 'Thành viên •' + bid.bidder.slice(-3)}
                          </p>
                          <p className="mt-1 text-xs text-muted">{date(bid.time)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-brand-dark">{money(bid.amount)}</p>
                          {i === 0 && visiblePage === 1 && (
                            <span className="text-xs text-muted">Cao nhất</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
                {pages > 1 && (
                  <nav
                    aria-label="Trang lịch sử"
                    className="mt-4 flex items-center justify-between"
                  >
                    <Button
                      variant="outline"
                      disabled={visiblePage <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Trước
                    </Button>
                    <span className="text-sm">
                      {visiblePage} / {pages}
                    </span>
                    <Button
                      variant="outline"
                      disabled={visiblePage >= pages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Sau
                    </Button>
                  </nav>
                )}
              </section>
            </div>
          </>
        )}
      </main>
      <Dialog open={imageOpen} onOpenChange={setImageOpen}>
        <DialogContent className="max-w-3xl p-5">
          <DialogTitle>Hình ảnh sản phẩm</DialogTitle>
          <DialogDescription>{auction?.title}</DialogDescription>
          {auction && (
            <img
              src={auction.image}
              alt={auction.title}
              className="mt-4 max-h-[65vh] w-full rounded-2xl object-contain"
            />
          )}
          <DialogClose asChild>
            <Button variant="outline" className="mt-4 w-full">
              Đóng ảnh
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!confirmation}
        onOpenChange={(open) => {
          if (!open && !busy) setConfirmation(null);
        }}
      >
        <DialogContent className="p-7">
          <DialogTitle>Xác nhận mức giá</DialogTitle>
          <DialogDescription className="mt-3">
            Thao tác này chỉ lưu trên trình duyệt để kiểm tra giao diện. Không tạo giao dịch, thanh
            toán hoặc quyền mua hàng.
          </DialogDescription>
          <p className="my-6 text-3xl font-bold text-brand-dark">
            {money(confirmation?.amount ?? 0)}
          </p>
          <div className="flex gap-3">
            <DialogClose asChild>
              <Button variant="outline" disabled={busy}>
                Quay lại
              </Button>
            </DialogClose>
            <Button disabled={busy} onClick={() => void confirmBid()}>
              {busy ? 'Đang ghi nhận…' : 'Xác nhận giá'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
