'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Pencil, ExternalLink, Ban, Clock3, Gavel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useSession } from '@/modules/auth/hooks/use-session';
import { appConfig } from '@/configs/app.config';
import { useAuctions } from '@/modules/auction/hooks/use-auctions';
import { auctionApi, currentPrice, canManageAuction } from '@/modules/auction/api/auction.api';
import { AuctionBadge, auctionDate, auctionMoney } from '@/modules/auction/components/auction-ui';
export function AuctionManagementDetail({ id }: { id: string }) {
  const { rows, loading, error, reload } = useAuctions();
  const { user } = useSession();
  const a = rows.find((row) => row.id === id);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [notice, setNotice] = useState('');
  async function cancel() {
    if (!a || !user || busy) return;
    setBusy(true);
    setFailure('');
    try {
      await auctionApi.cancel(a.id, reason, a.version, user);
      setOpen(false);
      setNotice('Phiên đã chuyển sang trạng thái đã hủy.');
      await reload();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Không thể hủy phiên.');
    } finally {
      setBusy(false);
    }
  }
  if (appConfig.auctionSource !== 'mock')
    return (
      <p>
        Chức năng quản lý phiên đang được hoàn thiện.{' '}
        <Link href="/admin/auctions" className="underline">
          Về danh sách
        </Link>
      </p>
    );
  if (loading) return <p role="status">Đang tải chi tiết phiên…</p>;
  if (error || !a)
    return (
      <div role="alert">
        <h1>Chưa mở được phiên đấu</h1>
        <p>{error || 'Phiên không tồn tại hoặc đã được gỡ.'}</p>
        <Button variant="outline" asChild>
          <Link href="/admin/auctions">Về danh sách</Link>
        </Button>
      </div>
    );
  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild>
        <Link href="/admin/auctions">
          <ArrowLeft size={16} />
          Danh sách phiên đấu
        </Link>
      </Button>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-widest text-muted">
            CHI TIẾT PHIÊN · {a.id}
          </p>
          <h1>{a.title}</h1>
          <AuctionBadge status={a.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={'/auctions/' + id}>
              <ExternalLink size={16} />
              Xem trang Buyer
            </Link>
          </Button>
          {a.status === 'SCHEDULED' && canManageAuction(user, 'AUCTION.UPDATE') && (
            <Button asChild>
              <Link href={'/admin/auctions/' + id + '/edit'}>
                <Pencil size={16} />
                Sửa phiên
              </Link>
            </Button>
          )}
          {['SCHEDULED', 'ACTIVE'].includes(a.status) &&
            canManageAuction(user, 'AUCTION.ADMIN_CANCEL') && (
              <Button
                variant="outline"
                className="admin-danger"
                onClick={() => {
                  setFailure('');
                  setReason('');
                  setOpen(true);
                }}
              >
                <Ban size={16} />
                Hủy phiên
              </Button>
            )}
        </div>
      </header>
      {notice && (
        <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-800">
          {notice}
        </p>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_2fr]">
        <section className="overflow-hidden rounded-3xl border border-line bg-white">
          <img src={a.image} alt={a.title} className="aspect-[4/3] w-full object-cover" />
          <div className="space-y-3 p-6">
            <h2>Thông tin sản phẩm</h2>
            <p className="text-sm text-muted">{a.description}</p>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted">Người bán</dt>
                <dd className="mt-1 font-semibold">{a.seller}</dd>
              </div>
              <div>
                <dt className="text-muted">Tình trạng</dt>
                <dd className="mt-1">{a.condition}</dd>
              </div>
              <div>
                <dt className="text-muted">Mã sản phẩm</dt>
                <dd className="mt-1 break-all">{a.productId}</dd>
              </div>
            </dl>
          </div>
        </section>
        <div className="space-y-6">
          <section className="rounded-3xl border border-line bg-white p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Giá cao nhất hiện tại</span>
              <Gavel className="text-brand-dark" size={24} />
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-brand-dark">
              {auctionMoney(currentPrice(a))}
            </p>
            <div className="mt-6 grid gap-4 border-t border-line pt-6 sm:grid-cols-2">
              {[
                ['Giá khởi điểm', auctionMoney(a.startingPrice)],
                ['Bước giá', auctionMoney(a.increment)],
                ['Bắt đầu', auctionDate(a.startAt)],
                ['Kết thúc', auctionDate(a.endAt)],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-muted">{label}</p>
                  <p className="mt-1 font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-3xl border border-line bg-white p-6">
            <h2 className="flex items-center gap-2">
              <Clock3 size={18} />
              Diễn biến phiên
            </h2>
            <ol className="mt-5 space-y-5 border-l-2 border-line pl-5 text-sm">
              <li>
                <strong>Đã lên lịch</strong>
                <p className="mt-1 text-muted">Bắt đầu lúc {auctionDate(a.startAt)}</p>
              </li>
              <li>
                <strong>{a.bids.length} lượt trả giá</strong>
                <p className="mt-1 text-muted">Giá và lịch sử được cập nhật khi có thay đổi.</p>
              </li>
              <li>
                <strong>
                  {a.status === 'CANCELLED'
                    ? 'Đã hủy'
                    : a.status === 'ENDED'
                      ? 'Đã kết thúc'
                      : 'Thời điểm đóng phiên'}
                </strong>
                <p className="mt-1 text-muted">{a.cancelReason || auctionDate(a.endAt)}</p>
              </li>
            </ol>
            {a.status === 'ENDED' && (
              <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                {a.bids.length
                  ? 'Đang chờ xác nhận kết quả phiên. Chưa phát sinh đơn hàng.'
                  : 'Phiên kết thúc mà chưa có lượt trả giá.'}
              </p>
            )}
          </section>
          <section className="rounded-3xl border border-line bg-white p-6">
            <h2>Lịch sử trả giá</h2>
            {!a.bids.length ? (
              <p className="py-8 text-center text-sm text-muted">Chưa có lượt trả giá.</p>
            ) : (
              <ol className="mt-4 max-h-80 divide-y divide-line overflow-y-auto">
                {a.bids.map((bid, index) => (
                  <li key={bid.id} className="flex justify-between gap-3 py-4 text-sm">
                    <div>
                      <strong>Thành viên •{bid.bidder.slice(-3)}</strong>
                      <p className="mt-1 text-xs text-muted">{auctionDate(bid.time)}</p>
                    </div>
                    <div className="text-right">
                      <strong>{auctionMoney(bid.amount)}</strong>
                      {index === 0 && <p className="mt-1 text-xs text-emerald-700">Cao nhất</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent className="admin-dialog p-7">
          <DialogTitle>Hủy phiên đấu?</DialogTitle>
          <DialogDescription className="mt-3">
            Phiên sẽ ngừng nhận giá. Kiểm tra kỹ thông tin và ghi rõ lý do trước khi xác nhận.
          </DialogDescription>
          <div className="my-5 rounded-xl bg-slate-50 p-4 text-sm font-semibold">{a.title}</div>
          <label htmlFor="cancel-reason" className="text-sm font-semibold">
            Lý do hủy <span className="admin-danger">*</span>
          </label>
          <textarea
            id="cancel-reason"
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-2 min-h-28 w-full rounded-xl border border-line p-3 text-sm focus-visible:outline-brand"
            placeholder="Nêu lý do và nội dung cần lưu ý…"
            aria-describedby={failure ? 'cancel-error' : undefined}
          />
          {failure && (
            <p id="cancel-error" role="alert" className="mt-2 text-sm text-red-700">
              {failure}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>
              Giữ phiên
            </Button>
            <Button
              className="admin-danger"
              disabled={busy || !reason.trim() || !canManageAuction(user, 'AUCTION.ADMIN_CANCEL')}
              onClick={() => void cancel()}
            >
              {busy ? 'Đang xử lý…' : 'Xác nhận hủy'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
