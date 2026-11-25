'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Check,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  Gavel,
  Pencil,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { appConfig } from '@/configs/app.config';
import { useSession } from '@/modules/auth/hooks/use-session';
import {
  auctionApi,
  canManageAuction,
  currentPrice,
  hasCommittedBids,
  isAuctionOpenForBidding,
  type Auction,
  type AuctionAuditEntry,
  type AuctionBid,
} from '@/modules/auction/api/auction.api';
import {
  AuctionBadge,
  auctionDateWithTz,
  auctionMoney,
  getDisplayTimezoneLabel,
} from '@/modules/auction/components/auction-ui';
import { getAuctionSocket } from '@/modules/auction/utils/auction-socket';

const BID_PAGE_SIZE = 10;

function maskParticipant(bid: AuctionBid, canInspectFull: boolean): string {
  if (bid.displayAlias) return bid.displayAlias;
  if (canInspectFull && bid.bidder.length <= 16) return bid.bidder;
  const suffix = bid.bidder.slice(-4) || '0000';
  return `Buyer •••${suffix}`;
}

function buildFallbackTimeline(auction: Auction): AuctionAuditEntry[] {
  const entries: AuctionAuditEntry[] = [
    {
      id: `${auction.id}-scheduled`,
      action: 'AUCTION_SCHEDULED',
      label: 'Thiết lập và lên lịch phiên đấu',
      timestamp: auction.startAt - 3600_000,
      actor: 'Hệ thống / Quản trị',
      detail: `Giá khởi điểm ${auctionMoney(auction.startingPrice)}, bước giá ${auctionMoney(auction.increment)}.`,
    },
  ];

  if (auction.status !== 'SCHEDULED') {
    entries.push({
      id: `${auction.id}-opened`,
      action: 'AUCTION_OPENED',
      label: 'Mở phiên nhận giá',
      timestamp: auction.startAt,
      actor: 'Hệ thống đấu giá',
      detail: `Phạm vi ${auction.visibility === 'RESTRICTED' ? 'Hạn chế' : 'Công khai'}.`,
    });
  }

  if (auction.originalEndAt && auction.endAt > auction.originalEndAt) {
    entries.push({
      id: `${auction.id}-extended`,
      action: 'AUCTION_EXTENDED',
      label: 'Gia hạn tự động (chống sniping)',
      timestamp: auction.originalEndAt,
      actor: 'Hệ thống đấu giá',
      detail: `Giờ đóng chuyển từ ${auctionDateWithTz(auction.originalEndAt)} sang ${auctionDateWithTz(auction.endAt)}.`,
    });
  }

  if (auction.status === 'ENDED') {
    entries.push({
      id: `${auction.id}-ended`,
      action: 'AUCTION_ENDED',
      label: 'Đóng phiên đấu giá',
      timestamp: auction.endAt,
      actor: 'Hệ thống đấu giá',
      detail: hasCommittedBids(auction)
        ? `Chốt với mức giá dẫn ${auctionMoney(currentPrice(auction))}.`
        : 'Đóng phiên không có lượt trả giá hợp lệ.',
    });
  }

  if (auction.settlement?.orderId) {
    entries.push({
      id: `${auction.id}-order`,
      action: 'ORDER_CREATED',
      label: 'Chuyển sang Commerce tạo đơn',
      timestamp: auction.settlement.settledAt ?? auction.endAt,
      actor: 'Commerce Service',
      detail: `Mã đơn ${auction.settlement.orderId}.`,
    });
  }

  if (auction.status === 'CANCELLED') {
    entries.push({
      id: `${auction.id}-cancelled`,
      action: 'AUCTION_CANCELLED',
      label: 'Hủy phiên đấu giá',
      timestamp: auction.endAt,
      actor: 'Quản trị viên',
      publicReason: auction.cancelReason || 'Phiên bị hủy bởi quản trị hệ thống.',
      internalNote: auction.internalCancelNote,
    });
  }

  return entries;
}

export function AuctionManagementDetail({ id }: { id: string }) {
  const { user } = useSession();

  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [syncError, setSyncError] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const [copiedId, setCopiedId] = useState(false);
  const [bidQuery, setBidQuery] = useState('');
  const [bidTab, setBidTab] = useState<'committed' | 'rejected'>('committed');
  const [bidPage, setBidPage] = useState(1);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelPublicReason, setCancelPublicReason] = useState('');
  const [cancelInternalNote, setCancelInternalNote] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [cancelConflict, setCancelConflict] = useState(false);
  const [notice, setNotice] = useState('');

  const safeBackButtonRef = useRef<HTMLButtonElement | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        const result = await auctionApi.detail(id);
        setAuction(result.auction);
        setLastSyncedAt(result.serverTime || Date.now());
        setLoadError('');
        setSyncError('');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Chưa tải được hồ sơ phiên đấu.';
        if (silent) {
          // Keep last confirmed snapshot during transient refresh failure (A2 spec).
          setSyncError(msg);
        } else {
          setLoadError(msg);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    void load(false);
    const off = auctionApi.subscribe(() => void load(true));
    const socket = getAuctionSocket();
    socket.emit('join_auction', id);
    const onSocketUpdate = (data?: { auctionId?: string }) => {
      if (data?.auctionId && String(data.auctionId) !== String(id)) return;
      void load(true);
    };
    socket.on('auction:bid_placed', onSocketUpdate);
    socket.on('auction:buy_now', onSocketUpdate);
    socket.on('auction:updated', onSocketUpdate);
    socket.on('auction:cancelled', onSocketUpdate);
    socket.on('auction:started', onSocketUpdate);
    socket.on('auction:ended', onSocketUpdate);
    return () => {
      off();
      socket.emit('leave_auction', id);
      socket.off('auction:bid_placed', onSocketUpdate);
      socket.off('auction:buy_now', onSocketUpdate);
      socket.off('auction:updated', onSocketUpdate);
      socket.off('auction:cancelled', onSocketUpdate);
      socket.off('auction:started', onSocketUpdate);
      socket.off('auction:ended', onSocketUpdate);
    };
  }, [id, load]);

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(true);
      window.setTimeout(() => setCopiedId(false), 2000);
    } catch {
      setCopiedId(false);
    }
  };

  const committedBids = useMemo(
    () => (auction?.bids ?? []).filter((b) => (b.status ?? 'COMMITTED') === 'COMMITTED'),
    [auction?.bids],
  );

  const rejectedBids = useMemo(
    () => (auction?.bids ?? []).filter((b) => b.status === 'REJECTED'),
    [auction?.bids],
  );

  const filteredBids = useMemo(() => {
    const source = bidTab === 'committed' ? committedBids : rejectedBids;
    const needle = bidQuery.trim().toLocaleLowerCase('vi');
    if (!needle) return source;
    return source.filter((bid) =>
      `${bid.id} ${bid.key ?? ''} ${bid.errorCode ?? ''}`.toLocaleLowerCase('vi').includes(needle),
    );
  }, [bidQuery, bidTab, committedBids, rejectedBids]);

  const bidPages = Math.max(1, Math.ceil(filteredBids.length / BID_PAGE_SIZE));
  const safeBidPage = Math.min(bidPage, bidPages);
  const pageBids = filteredBids.slice(
    (safeBidPage - 1) * BID_PAGE_SIZE,
    safeBidPage * BID_PAGE_SIZE,
  );

  const timeline = useMemo(() => {
    if (!auction) return [];
    return auction.auditTrail?.length ? auction.auditTrail : buildFallbackTimeline(auction);
  }, [auction]);

  const canEdit =
    !!auction && auction.status === 'SCHEDULED' && canManageAuction(user, 'AUCTION.UPDATE');
  const canCancel =
    !!auction &&
    (auction.status === 'SCHEDULED' || isAuctionOpenForBidding(auction.status)) &&
    canManageAuction(user, 'AUCTION.ADMIN_CANCEL');
  const canInspectFullBidder = canManageAuction(user, 'AUCTION.AUDIT_READ');

  async function confirmCancel() {
    if (!auction || !user || cancelBusy) return;
    setCancelBusy(true);
    setCancelError('');
    setCancelConflict(false);
    try {
      await auctionApi.cancel(auction.id, cancelReason, auction.version, user, {
        publicReason: cancelPublicReason || undefined,
        internalNote: cancelInternalNote || undefined,
      });
      setCancelOpen(false);
      setCancelReason('');
      setCancelPublicReason('');
      setCancelInternalNote('');
      setNotice('Phiên đã chuyển sang trạng thái Đã hủy và ghi nhận lý do vào nhật ký.');
      await load(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể hủy phiên đấu giá.';
      setCancelError(msg);
      if (
        (err instanceof Error && 'code' in err && (err as { code?: string }).code === 'CONFLICT') ||
        msg.toLocaleLowerCase('vi').includes('đã thay đổi') ||
        msg.toLocaleLowerCase('vi').includes('đã đóng')
      ) {
        setCancelConflict(true);
      }
    } finally {
      setCancelBusy(false);
    }
  }

  if (loading && !auction) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild className="min-h-11">
          <Link href="/admin/auctions">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Danh sách phiên đấu
          </Link>
        </Button>
        <p
          role="status"
          className="rounded-2xl border border-stone-200 bg-white p-8 text-sm text-stone-600"
        >
          Đang tải hồ sơ phiên đấu giá…
        </p>
      </div>
    );
  }

  if (loadError || !auction) {
    return (
      <div role="alert" className="space-y-4 rounded-2xl border border-red-200 bg-white p-8">
        <h1 className="text-xl font-bold text-stone-950">Chưa mở được hồ sơ phiên đấu</h1>
        <p className="text-sm text-red-700">{loadError || 'Phiên không tồn tại hoặc đã bị gỡ.'}</p>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => void load(false)}
            className="min-h-11"
          >
            Thử lại
          </Button>
          <Button asChild variant="ghost" className="min-h-11">
            <Link href="/admin/auctions">Về danh sách phiên đấu</Link>
          </Button>
        </div>
      </div>
    );
  }

  const affectedBidCount = auction.bidCount ?? committedBids.length;
  const tzLabel = getDisplayTimezoneLabel();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" asChild className="min-h-11 rounded-xl">
          <Link href="/admin/auctions">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Danh sách phiên đấu
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="min-h-11 rounded-xl border-stone-300"
          >
            <RefreshCw
              className={`size-4 ${refreshing ? 'motion-safe:animate-spin' : ''}`}
              aria-hidden="true"
            />
            Đồng bộ
          </Button>
          <Button asChild variant="outline" className="min-h-11 rounded-xl border-stone-300">
            <Link href={`/auctions/${encodeURIComponent(auction.id)}`}>
              <ExternalLink className="size-4" aria-hidden="true" />
              Xem trang Buyer
            </Link>
          </Button>
        </div>
      </div>

      {/* Header + Section 5: Status-based actions */}
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <AuctionBadge status={auction.status} />
            <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-700">
              {auction.visibility === 'RESTRICTED' ? 'Phiên hạn chế' : 'Phiên công khai'}
            </span>
            <span className="text-xs text-stone-500 tabular-nums">
              Phiên bản v{auction.version}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-950">{auction.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
            <span>Mã phiên:</span>
            <code className="rounded-md bg-stone-100 px-2 py-0.5 font-mono text-stone-900">
              {auction.id}
            </code>
            <button
              type="button"
              onClick={() => void handleCopyId()}
              className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-stone-200 px-2.5 text-xs font-medium text-stone-700 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-emerald-700"
            >
              {copiedId ? (
                <>
                  <Check className="size-3.5 text-emerald-700" aria-hidden="true" />
                  Đã sao chép
                </>
              ) : (
                <>
                  <Copy className="size-3.5" aria-hidden="true" />
                  Sao chép
                </>
              )}
            </button>
          </div>
        </div>

        {/* Section 5: Action buttons strictly gated by state & permission */}
        <div className="flex flex-wrap items-center gap-2.5">
          {canEdit && (
            <Button
              asChild
              className="min-h-11 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800"
            >
              <Link href={`/admin/auctions/${encodeURIComponent(auction.id)}/edit`}>
                <Pencil className="size-4" aria-hidden="true" />
                Sửa cấu hình
              </Link>
            </Button>
          )}
          {canCancel && (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 rounded-xl border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
              onClick={() => {
                setCancelError('');
                setCancelConflict(false);
                setCancelReason('');
                setCancelOpen(true);
              }}
            >
              <Ban className="size-4" aria-hidden="true" />
              Hủy phiên
            </Button>
          )}
        </div>
      </header>

      {notice && (
        <p
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-sm font-medium text-emerald-900"
        >
          {notice}
        </p>
      )}

      {syncError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-sm text-amber-950"
        >
          <span>
            Không thể đồng bộ dữ liệu mới nhất ({syncError}). Đang giữ nguyên bản ghi xác nhận gần
            nhất.
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={() => void load(true)}
            className="min-h-10 rounded-xl border-amber-300 bg-white text-xs"
          >
            Thử đồng bộ lại
          </Button>
        </div>
      )}

      {/* Section 1: Overview (Tổng quan) */}
      <section className="grid gap-6 xl:grid-cols-[1fr_1.7fr]">
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <img
            src={auction.image}
            alt={auction.title}
            className="aspect-[16/10] w-full bg-stone-50 object-cover"
          />
          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-stone-950">Thông tin sản phẩm</h2>
              <Link
                href={`/products/${encodeURIComponent(auction.productId)}`}
                className="text-xs font-semibold text-emerald-800 hover:underline"
              >
                Trang sản phẩm
              </Link>
            </div>
            <p className="text-sm leading-6 text-stone-600">{auction.description}</p>
            <dl className="grid gap-3 border-t border-stone-100 pt-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">Seller sở hữu</dt>
                <dd className="text-right font-semibold text-stone-900">{auction.seller}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">Mã sản phẩm</dt>
                <dd className="break-all text-right font-mono text-xs text-stone-700">
                  {auction.productId}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">Tình trạng</dt>
                <dd className="text-right font-medium text-stone-900">{auction.condition}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">Phạm vi truy cập</dt>
                <dd className="text-right font-medium text-stone-900">
                  {auction.visibility === 'RESTRICTED' ? 'Hạn chế theo quyền' : 'Công khai'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-base font-semibold text-stone-950">
                <Gavel className="size-4 text-emerald-700" aria-hidden="true" />
                Tổng quan giá, lịch và luật áp dụng
              </h2>
              <span className="text-xs text-stone-500">Múi giờ hiển thị: {tzLabel}</span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-stone-50 p-4">
                <p className="text-xs text-stone-500">Giá dẫn hiện tại</p>
                <p className="mt-1 text-2xl font-bold text-stone-950 tabular-nums">
                  {auctionMoney(currentPrice(auction))}
                </p>
                <p className="mt-1 text-xs text-stone-500 tabular-nums">
                  {affectedBidCount} lượt trả giá hợp lệ
                </p>
              </div>
              <div className="rounded-xl bg-stone-50 p-4">
                <p className="text-xs text-stone-500">Giá khởi điểm</p>
                <p className="mt-1 text-lg font-bold text-stone-900 tabular-nums">
                  {auctionMoney(auction.startingPrice)}
                </p>
                <p className="mt-1 text-xs text-stone-500 tabular-nums">
                  Bước giá: +{auctionMoney(auction.increment)}
                </p>
              </div>
              <div className="rounded-xl bg-stone-50 p-4">
                <p className="text-xs text-stone-500">Giá mua ngay</p>
                <p className="mt-1 text-lg font-bold text-stone-900 tabular-nums">
                  {auction.buyNowPrice ? auctionMoney(auction.buyNowPrice) : 'Không bật'}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  Hạn thanh toán: {auction.paymentWindowHours ?? 24} giờ
                </p>
              </div>
            </div>

            <dl className="mt-5 grid gap-4 border-t border-stone-100 pt-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-stone-500">Giờ mở phiên</dt>
                <dd className="mt-1 font-semibold text-stone-900 tabular-nums">
                  {auctionDateWithTz(auction.startAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500">Giờ đóng hiệu lực</dt>
                <dd className="mt-1 font-semibold text-stone-950 tabular-nums">
                  {auctionDateWithTz(auction.endAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500">Giờ đóng gốc ban đầu</dt>
                <dd className="mt-1 font-medium text-stone-700 tabular-nums">
                  {auctionDateWithTz(auction.originalEndAt ?? auction.endAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500">Luật gia hạn chống sniping</dt>
                <dd className="mt-1 text-stone-700">
                  Cửa sổ {Math.round((auction.extensionWindowSeconds ?? 300) / 60)} phút cuối, cộng{' '}
                  {Math.round((auction.extensionDurationSeconds ?? 300) / 60)} phút (đã dùng{' '}
                  {auction.extensionsUsed ?? 0}/{auction.maxExtensions ?? 5} lần).
                </dd>
              </div>
            </dl>
          </div>

          {/* Section 4: Settlement & Order (Chốt và đơn hàng) */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base font-semibold text-stone-950">
                <Receipt className="size-4 text-emerald-700" aria-hidden="true" />
                Chốt kết quả và đơn hàng
              </h2>
              <div className="flex items-center gap-2 text-xs text-stone-500">
                {lastSyncedAt && (
                  <span className="tabular-nums">Đồng bộ: {auctionDateWithTz(lastSyncedAt)}</span>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void load(true)}
                  disabled={refreshing}
                  className="min-h-9 rounded-lg border-stone-300 text-xs"
                >
                  Tải lại
                </Button>
              </div>
            </div>

            <dl className="mt-4 grid gap-4 rounded-xl border border-stone-100 bg-stone-50/70 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs text-stone-500">Kết quả chốt</dt>
                <dd className="mt-1 font-semibold text-stone-950">
                  {auction.status === 'CANCELLED'
                    ? 'Đã hủy phiên'
                    : auction.status !== 'ENDED'
                      ? 'Chưa kết thúc'
                      : auction.settlement?.outcome === 'WON' || hasCommittedBids(auction)
                        ? 'Có người thắng'
                        : 'Không có lượt giá'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500">Giá chốt</dt>
                <dd className="mt-1 font-bold text-stone-950 tabular-nums">
                  {auction.status === 'ENDED' && hasCommittedBids(auction)
                    ? auctionMoney(auction.settlement?.finalPrice ?? currentPrice(auction))
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500">Mã đơn Commerce</dt>
                <dd className="mt-1 font-mono text-xs font-semibold text-stone-900">
                  {auction.settlement?.orderId ?? 'Chưa phát sinh đơn'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500">Trạng thái thanh toán</dt>
                <dd className="mt-1 font-medium text-stone-800">
                  {auction.settlement?.paymentStatus ||
                    (auction.status === 'ENDED' && hasCommittedBids(auction)
                      ? 'Đang chờ Commerce đồng bộ'
                      : '—')}
                </dd>
              </div>
            </dl>

            {auction.settlement?.paymentDueAt && (
              <p className="mt-3 text-xs text-stone-600 tabular-nums">
                Hạn thanh toán:{' '}
                <strong>{auctionDateWithTz(auction.settlement.paymentDueAt)}</strong>
              </p>
            )}

            <p className="mt-4 flex items-start gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs text-stone-600">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-stone-500" aria-hidden="true" />
              <span>
                Mọi can thiệp tài chính (hoàn tiền, hủy thanh toán hoặc chỉnh sửa đơn sau chốt) phải
                thực hiện qua luồng quản trị đơn hàng/tài chính có thẩm quyền riêng, không thao tác
                trực tiếp trong hồ sơ đấu giá.
              </span>
            </p>
          </section>
        </div>
      </section>

      {/* Section 2: Bid history (Lịch sử giá) & Section 3: Timeline (Dòng thời gian) */}
      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-stone-950">
                Lịch sử trả giá &amp; đối soát
              </h2>
              <p className="mt-0.5 text-xs text-stone-500">
                Tách biệt lượt hợp lệ đã commit khỏi các yêu cầu lỗi kỹ thuật; hỗ trợ tra cứu theo
                mã lượt hoặc mã đối soát (idempotency key).
              </p>
            </div>
            <div role="tablist" aria-label="Phân loại lịch sử giá" className="flex gap-1.5">
              <button
                type="button"
                role="tab"
                aria-selected={bidTab === 'committed'}
                onClick={() => {
                  setBidTab('committed');
                  setBidPage(1);
                }}
                className={
                  'min-h-10 rounded-lg border px-3 text-xs font-semibold ' +
                  (bidTab === 'committed'
                    ? 'border-emerald-700 bg-emerald-50 text-emerald-950'
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50')
                }
              >
                Đã commit ({committedBids.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={bidTab === 'rejected'}
                onClick={() => {
                  setBidTab('rejected');
                  setBidPage(1);
                }}
                className={
                  'min-h-10 rounded-lg border px-3 text-xs font-semibold ' +
                  (bidTab === 'rejected'
                    ? 'border-red-600 bg-red-50 text-red-900'
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50')
                }
              >
                Lỗi kỹ thuật ({rejectedBids.length})
              </button>
            </div>
          </div>

          <div className="mt-4">
            <label className="relative block">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-stone-400"
              />
              <span className="sr-only">Tìm theo mã lượt hoặc mã đối soát</span>
              <Input
                value={bidQuery}
                onChange={(e) => {
                  setBidQuery(e.target.value);
                  setBidPage(1);
                }}
                placeholder="Tìm mã lượt hoặc mã đối soát (idempotency key)…"
                className="min-h-11 rounded-xl pl-10 text-sm"
              />
            </label>
          </div>

          {auction.bidHistoryAvailable === false ? (
            <p className="mt-6 rounded-xl bg-stone-50 p-5 text-sm text-stone-600">
              API phiên hiện tại chưa trả danh sách chi tiết lượt trả giá cho quản trị viên (cần
              Backend hoàn thiện endpoint lịch sử có phân trang).
            </p>
          ) : pageBids.length === 0 ? (
            <p className="py-10 text-center text-sm text-stone-500">
              {bidQuery.trim()
                ? 'Không tìm thấy lượt nào khớp với mã đối soát này.'
                : bidTab === 'rejected'
                  ? 'Chưa ghi nhận lỗi kỹ thuật nào trong dữ liệu phiên.'
                  : 'Chưa có lượt trả giá hợp lệ nào.'}
            </p>
          ) : (
            <>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-xs sm:text-sm">
                  <thead className="border-b border-stone-200 text-xs text-stone-500">
                    <tr>
                      <th className="py-2.5 pr-3 font-medium">Mã lượt / đối soát</th>
                      <th className="px-3 py-2.5 font-medium">Người tham gia</th>
                      <th className="px-3 py-2.5 text-right font-medium">Mức giá</th>
                      <th className="py-2.5 pl-3 text-right font-medium">Thời điểm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {pageBids.map((bid, idx) => (
                      <tr key={bid.id}>
                        <td className="py-3 pr-3 align-top">
                          <p className="font-mono text-xs text-stone-900">{bid.id}</p>
                          {bid.key && (
                            <p className="mt-0.5 font-mono text-[11px] text-stone-500">
                              Key: {bid.key}
                            </p>
                          )}
                          {bid.errorCode && (
                            <p className="mt-0.5 text-[11px] font-medium text-red-700">
                              Mã lỗi: {bid.errorCode}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3 align-top text-stone-700">
                          {maskParticipant(bid, canInspectFullBidder)}
                        </td>
                        <td className="px-3 py-3 text-right align-top">
                          <span className="font-semibold text-stone-950 tabular-nums">
                            {auctionMoney(bid.amount)}
                          </span>
                          {bidTab === 'committed' && safeBidPage === 1 && idx === 0 && (
                            <span className="ml-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                              Cao nhất
                            </span>
                          )}
                        </td>
                        <td className="py-3 pl-3 text-right align-top text-xs text-stone-500 tabular-nums">
                          {auctionDateWithTz(bid.time)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {bidPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4 text-xs text-stone-600">
                  <span className="tabular-nums">
                    Trang {safeBidPage}/{bidPages} · {filteredBids.length} dòng
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={safeBidPage <= 1}
                      onClick={() => setBidPage(safeBidPage - 1)}
                      className="min-h-9 rounded-lg"
                    >
                      Trước
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={safeBidPage >= bidPages}
                      onClick={() => setBidPage(safeBidPage + 1)}
                      className="min-h-9 rounded-lg"
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Section 3: Timeline (Dòng thời gian) */}
        <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-stone-950">
            <Clock3 className="size-4 text-emerald-700" aria-hidden="true" />
            Dòng thời gian &amp; nhật ký thay đổi
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            Tách biệt lý do hiển thị cho Buyer và ghi chú vận hành nội bộ.
          </p>

          <ol className="mt-5 space-y-5 border-l-2 border-stone-200 pl-4 text-sm">
            {timeline.map((entry) => (
              <li key={entry.id} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-white bg-emerald-700"
                />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <strong className="text-stone-950">{entry.label}</strong>
                  <span className="text-xs text-stone-500 tabular-nums">
                    {auctionDateWithTz(entry.timestamp)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-stone-500">Chủ thể: {entry.actor}</p>
                {entry.detail && (
                  <p className="mt-1.5 text-xs leading-5 text-stone-700">{entry.detail}</p>
                )}
                {entry.publicReason && (
                  <div className="mt-2 rounded-lg border border-red-200 bg-red-50/70 p-2.5 text-xs text-red-900">
                    <span className="font-semibold">Lý do hiển thị cho Buyer:</span>{' '}
                    {entry.publicReason}
                  </div>
                )}
                {entry.internalNote && (
                  <div className="mt-2 rounded-lg border border-stone-200 bg-stone-50 p-2.5 text-xs text-stone-700">
                    <span className="inline-flex items-center gap-1 font-semibold text-stone-900">
                      <FileText className="size-3" aria-hidden="true" />
                      Ghi chú nội bộ:
                    </span>{' '}
                    {entry.internalNote}
                  </div>
                )}
              </li>
            ))}
          </ol>

          {appConfig.auctionSource === 'api' && !auction.auditTrail?.length && (
            <p className="mt-5 rounded-xl bg-stone-50 px-3.5 py-2.5 text-xs text-stone-500">
              Đang hiển thị các mốc vòng đời cơ bản. Nhật ký audit đầy đủ theo từng thao tác sửa/hủy
              sẽ đồng bộ khi Backend bổ sung bảng audit (G08).
            </p>
          )}
        </section>
      </div>

      {/* Cancel auction confirmation modal (A2 spec: focus initially on safe "Quay lại" button) */}
      <Dialog
        open={cancelOpen}
        onOpenChange={(next) => {
          if (!cancelBusy) setCancelOpen(next);
        }}
      >
        <DialogContent
          className="admin-dialog max-w-lg p-6 sm:p-7"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            safeBackButtonRef.current?.focus();
          }}
        >
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-stone-950">
            <AlertTriangle className="size-5 text-red-600" aria-hidden="true" />
            Xác nhận hủy phiên đấu giá
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-stone-600">
            Hành động này sẽ chấm dứt ngay việc nhận giá và không thể hoàn tác. Kiểm tra phạm vi ảnh
            hưởng trước khi xác nhận.
          </DialogDescription>

          <div className="my-4 space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm">
            <p className="font-semibold text-stone-950">{auction.title}</p>
            <p className="font-mono text-xs text-stone-600">Mã phiên: {auction.id}</p>
            <p className="text-xs text-red-800">
              Ảnh hưởng: <strong>{affectedBidCount} lượt trả giá</strong> sẽ bị vô hiệu hóa; phiên
              chuyển sang trạng thái Đã hủy và không phát sinh đơn thắng.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <label htmlFor="admin-cancel-reason" className="font-semibold text-stone-900">
                Lý do hủy phiên <span className="text-red-600">*</span>
              </label>
              <span className="text-xs text-stone-500 tabular-nums">{cancelReason.length}/500</span>
            </div>
            <textarea
              id="admin-cancel-reason"
              maxLength={500}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="Ghi rõ nguyên nhân sự cố hoặc quyết định điều hành (1–500 ký tự)…"
              aria-describedby={cancelError ? 'admin-cancel-error' : undefined}
              className="w-full rounded-xl border border-stone-300 p-3 text-sm text-stone-900 focus-visible:outline-2 focus-visible:outline-emerald-700"
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="admin-cancel-public"
                className="block text-xs font-semibold text-stone-800"
              >
                Lý do công khai cho Buyer (tùy chọn)
              </label>
              <Input
                id="admin-cancel-public"
                maxLength={250}
                value={cancelPublicReason}
                onChange={(e) => setCancelPublicReason(e.target.value)}
                placeholder="Bỏ trống để dùng thông báo chung"
                className="mt-1 min-h-10 rounded-xl text-xs"
              />
            </div>
            <div>
              <label
                htmlFor="admin-cancel-internal"
                className="block text-xs font-semibold text-stone-800"
              >
                Ghi chú nội bộ (chỉ Admin xem)
              </label>
              <Input
                id="admin-cancel-internal"
                maxLength={250}
                value={cancelInternalNote}
                onChange={(e) => setCancelInternalNote(e.target.value)}
                placeholder="Mã biên bản / đối soát nội bộ…"
                className="mt-1 min-h-10 rounded-xl text-xs"
              />
            </div>
          </div>

          {cancelError && (
            <div
              id="admin-cancel-error"
              role="alert"
              className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800"
            >
              <p>{cancelError}</p>
              {cancelConflict && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCancelOpen(false);
                    void load(true);
                  }}
                  className="mt-2 min-h-9 rounded-lg border-red-300 bg-white text-xs text-red-900"
                >
                  Tải lại trạng thái mới nhất
                </Button>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button
              ref={safeBackButtonRef}
              type="button"
              variant="outline"
              disabled={cancelBusy}
              onClick={() => setCancelOpen(false)}
              className="min-h-11 rounded-xl border-stone-300"
            >
              Quay lại
            </Button>
            <Button
              type="button"
              disabled={
                cancelBusy ||
                cancelReason.trim().length < 1 ||
                cancelReason.length > 500 ||
                !canCancel
              }
              onClick={() => void confirmCancel()}
              className="min-h-11 rounded-xl bg-red-600 text-white hover:bg-red-700"
            >
              {cancelBusy ? 'Đang xử lý…' : 'Hủy phiên đấu giá'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
