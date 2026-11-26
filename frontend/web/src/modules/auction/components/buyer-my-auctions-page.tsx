'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Clock3,
  CreditCard,
  Gavel,
  RefreshCw,
  ShieldAlert,
  Trophy,
} from 'lucide-react';
import { StoreHeader } from '@/components/layout/store-header';
import { Button } from '@/components/ui/button';
import { requestApi } from '@/lib/axios/api-client';
import { unwrap } from '@/lib/axios/http';
import { useSession } from '@/modules/auth/hooks/use-session';
import {
  auctionApi,
  currentPrice,
  isAuctionOpenForBidding,
  type Auction,
} from '../api/auction.api';
import { AuctionBadge, auctionDateWithTz, auctionMoney } from './auction-ui';

type GroupKey = 'participating' | 'payment' | 'ended';

type PersonalState =
  | 'LEADING'
  | 'OUTBID'
  | 'PAYMENT_DUE'
  | 'WON_PAID'
  | 'WON_PENDING_ORDER'
  | 'PAYMENT_TIMEOUT'
  | 'LOST'
  | 'CANCELLED';

type MyAuctionRow = {
  auction: Auction;
  group: GroupKey;
  personalState: PersonalState;
  myLatestBid: number;
  leadingOrFinalPrice: number;
  nextDeadlineLabel: string;
  nextDeadlineAt: number | null;
  actionLabel: string;
  actionHref: string;
};

const PERSONAL_BADGE: Record<PersonalState, { label: string; className: string }> = {
  LEADING: {
    label: 'Đang dẫn đầu',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  },
  OUTBID: {
    label: 'Bị vượt giá',
    className: 'border-amber-300 bg-amber-50 text-amber-950',
  },
  PAYMENT_DUE: {
    label: 'Đã tạo đơn · Chờ thanh toán',
    className: 'border-red-200 bg-red-50 text-red-800',
  },
  WON_PENDING_ORDER: {
    label: 'Thắng phiên · Chờ tạo đơn',
    className: 'border-amber-200 bg-amber-50 text-amber-950',
  },
  WON_PAID: {
    label: 'Đã thanh toán thành công',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  },
  PAYMENT_TIMEOUT: {
    label: 'Quá hạn thanh toán (24h)',
    className: 'border-red-200 bg-red-50 text-red-800',
  },
  LOST: {
    label: 'Chưa thắng',
    className: 'border-stone-200 bg-stone-100 text-stone-700',
  },
  CANCELLED: {
    label: 'Phiên đã hủy',
    className: 'border-red-200 bg-red-50 text-red-800',
  },
};

function classifyMyAuction(auction: Auction, userId: string): MyAuctionRow | null {
  const myBids = auction.bids.filter((bid) => bid.isMine || bid.bidder === userId);
  const isWinner = Boolean(
    auction.settlement?.winnerId
      ? auction.settlement.winnerId === userId
      : auction.status === 'ENDED' &&
          auction.bids[0] &&
          (auction.bids[0].isMine || auction.bids[0].bidder === userId),
  );

  // Restricted auctions only appear if the current user is a participant or winner.
  if (auction.visibility === 'RESTRICTED' && myBids.length === 0 && !isWinner) {
    return null;
  }

  if (myBids.length === 0 && !isWinner) {
    return null;
  }

  const leadingOrFinalPrice =
    auction.settlement?.winningBidAmount ?? auction.settlement?.finalPrice ?? currentPrice(auction);
  const myBidsMax = myBids.reduce((max, bid) => Math.max(max, bid.amount), 0);
  // Mục 2: Người thắng bắt buộc lấy giá thắng làm mức đặt của mình, không bao giờ để "Chưa ghi nhận"
  const myLatestBid = isWinner ? Math.max(myBidsMax, leadingOrFinalPrice) : myBidsMax;
  const topBid = auction.bids[0];
  const isLeading = !!topBid && (topBid.isMine || topBid.bidder === userId);

  if (isAuctionOpenForBidding(auction.status)) {
    return {
      auction,
      group: 'participating',
      personalState: isLeading ? 'LEADING' : 'OUTBID',
      myLatestBid,
      leadingOrFinalPrice,
      nextDeadlineLabel: auction.status === 'EXTENDED' ? 'Đóng sau gia hạn' : 'Đóng phiên',
      nextDeadlineAt: auction.endAt,
      actionLabel: isLeading ? 'Mở phiên' : 'Đặt giá lại',
      actionHref: `/auctions/${encodeURIComponent(auction.id)}`,
    };
  }

  if (auction.status === 'CANCELLED') {
    return {
      auction,
      group: 'ended',
      personalState: 'CANCELLED',
      myLatestBid,
      leadingOrFinalPrice,
      nextDeadlineLabel: 'Thời điểm đóng',
      nextDeadlineAt: auction.endAt,
      actionLabel: 'Xem kết quả',
      actionHref: `/auctions/${encodeURIComponent(auction.id)}`,
    };
  }

  if (auction.status === 'ENDED' && isWinner) {
    const paymentStatus = (auction.settlement?.paymentStatus || '').toUpperCase();
    const isPaid = paymentStatus === 'PAID' || paymentStatus === 'COMPLETED';
    const isTimeout = paymentStatus === 'TIMEOUT' || paymentStatus === 'TIMEOUT_PENALIZED';
    const orderId = auction.settlement?.orderId;
    const orderCode = auction.settlement?.orderCode || orderId;

    if (isPaid) {
      return {
        auction,
        group: 'ended',
        personalState: 'WON_PAID',
        myLatestBid,
        leadingOrFinalPrice,
        nextDeadlineLabel: 'Đã chốt lúc',
        nextDeadlineAt: auction.settlement?.settledAt ?? auction.endAt,
        actionLabel: orderId ? 'Xem đơn mua' : 'Xem kết quả',
        actionHref: orderId
          ? `/account/orders/${encodeURIComponent(orderId)}`
          : `/auctions/${encodeURIComponent(auction.id)}`,
      };
    }

    if (isTimeout) {
      return {
        auction,
        group: 'ended',
        personalState: 'PAYMENT_TIMEOUT',
        myLatestBid,
        leadingOrFinalPrice,
        nextDeadlineLabel: 'Hết hạn lúc',
        nextDeadlineAt: auction.settlement?.paymentDueAt ?? auction.endAt,
        actionLabel: 'Xem chi tiết',
        actionHref: `/auctions/${encodeURIComponent(auction.id)}`,
      };
    }

    return {
      auction,
      group: 'payment',
      personalState: orderId ? 'PAYMENT_DUE' : 'WON_PENDING_ORDER',
      myLatestBid,
      leadingOrFinalPrice,
      nextDeadlineLabel: auction.settlement?.paymentDueAt ? 'Hạn thanh toán' : 'Kết thúc phiên',
      nextDeadlineAt: auction.settlement?.paymentDueAt ?? auction.endAt,
      actionLabel: orderId ? `Thanh toán đơn #${orderCode}` : 'Tạo đơn thanh toán',
      actionHref: orderId
        ? `/account/orders/${encodeURIComponent(orderId)}`
        : `/auctions/${encodeURIComponent(auction.id)}#winner-checkout`,
    };
  }

  return {
    auction,
    group: 'ended',
    personalState: 'LOST',
    myLatestBid,
    leadingOrFinalPrice,
    nextDeadlineLabel: 'Đã kết thúc',
    nextDeadlineAt: auction.endAt,
    actionLabel: 'Xem kết quả',
    actionHref: `/auctions/${encodeURIComponent(auction.id)}`,
  };
}

export function BuyerMyAuctionsPage() {
  const { user, phase, error: sessionError, retry } = useSession();
  const [rows, setRows] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeGroup, setActiveGroup] = useState<GroupKey>('participating');
  const [hasIncompleteHistory, setHasIncompleteHistory] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!user) {
        setRows([]);
        setLoading(false);
        return;
      }
      if (silent) setRefreshing(true);
      else setLoading(true);

      try {
        // Ưu tiên gọi 1 request GET /api/v1/auctions/my theo tài khoản đang đăng nhập (B3)
        let loadedFromMyEndpoint = false;
        try {
          const myRaw = await requestApi('/auctions/my');
          const myData = unwrap<{ items?: Array<Record<string, unknown>> }>(myRaw);
          if (myData && Array.isArray(myData.items)) {
            const mapped: Auction[] = myData.items.map((item) => {
              const rawStatus = String(item.status ?? 'ACTIVE').toUpperCase();
              const normalizedStatus = (
                rawStatus === 'SETTLED' || rawStatus === 'CLOSED' || rawStatus === 'COMPLETED'
                  ? 'ENDED'
                  : rawStatus
              ) as Auction['status'];
              const isWinnerItem =
                Boolean(item.isWinner) ||
                item.personalStatus === 'WON_AWAITING_PAYMENT' ||
                item.personalStatus === 'PAID' ||
                item.personalStatus === 'PAYMENT_TIMEOUT';
              const winAmount = Number(
                item.winningBidAmount ?? item.highestBidAmount ?? item.currentHighestBid ?? 0,
              );
              const myBidAmount = isWinnerItem
                ? Math.max(Number(item.myLastBid ?? 0), winAmount)
                : Number(item.myLastBid ?? 0);

              return {
                id: String(item.id),
                productId: String(item.productId ?? ''),
                title: String(item.title ?? `Phiên #${item.id}`),
                image:
                  typeof item.imageUrl === 'string' && item.imageUrl.trim()
                    ? item.imageUrl.trim()
                    : '/images/nexus-product-placeholder.svg',
                seller:
                  typeof item.sellerName === 'string' && item.sellerName.trim()
                    ? item.sellerName.trim()
                    : 'Người bán Nexus',
                sellerId: String(item.sellerId ?? ''),
                condition: '',
                description: '',
                startingPrice: Number(item.startingPrice ?? 0),
                increment: 1,
                nextMinBid: Number(item.nextMinBid ?? item.startingPrice ?? 0),
                currentHighestBid: winAmount,
                bidCount: Number(item.bidCount ?? 0),
                bidHistoryAvailable: true,
                startAt: new Date(String(item.startTime ?? Date.now())).getTime(),
                endAt: new Date(String(item.actualEndTime ?? item.endTime ?? Date.now())).getTime(),
                status: normalizedStatus,
                version: 1,
                demoMode: Boolean(item.demoMode),
                demoMultiplier: Number(item.demoMultiplier ?? 1),
                cancelReason: typeof item.cancelReason === 'string' ? item.cancelReason : undefined,
                bids: [
                  {
                    id: `my-${item.id}`,
                    bidder: user.id,
                    displayAlias: 'Bạn',
                    isMine: true,
                    amount: myBidAmount,
                    time: Date.now(),
                  },
                  ...(!item.isLeading && !isWinnerItem
                    ? [
                        {
                          id: `lead-${item.id}`,
                          bidder: 'other',
                          displayAlias: 'Người dẫn đầu',
                          isMine: false,
                          amount: winAmount,
                          time: Date.now() + 1,
                        },
                      ]
                    : []),
                ].sort((a, b) => b.amount - a.amount),
                settlement: {
                  outcome: isWinnerItem
                    ? 'WON'
                    : item.personalStatus === 'CANCELLED'
                      ? 'CANCELLED'
                      : 'LOST',
                  winnerId: isWinnerItem || item.isLeading ? user.id : null,
                  winnerAlias: typeof item.winnerAlias === 'string' ? item.winnerAlias : null,
                  finalPrice: winAmount,
                  winningBidAmount: winAmount,
                  settledAt: item.settledAt ? new Date(String(item.settledAt)).getTime() : null,
                  paymentDueAt: item.paymentDueAt
                    ? new Date(String(item.paymentDueAt)).getTime()
                    : null,
                  orderId: typeof item.orderId === 'string' ? item.orderId : null,
                  orderCode: typeof item.orderCode === 'string' ? item.orderCode : null,
                  paymentUrl: typeof item.paymentUrl === 'string' ? item.paymentUrl : null,
                  paymentStatus: typeof item.paymentStatus === 'string' ? item.paymentStatus : null,
                  canCheckout: Boolean(item.canCheckout),
                },
              };
            });
            setRows(mapped);
            setHasIncompleteHistory(false);
            setError('');
            loadedFromMyEndpoint = true;
          }
        } catch {
          // Fallback về danh sách phiên chuẩn nếu đang chạy chế độ mock
        }

        if (!loadedFromMyEndpoint) {
          const list = await auctionApi.list();
          const hydrated = await Promise.all(
            list.map(async (item) => {
              if (item.bids.length > 0 || item.bidHistoryAvailable === false) return item;
              try {
                const { auction } = await auctionApi.detail(item.id);
                return auction;
              } catch {
                return item;
              }
            }),
          );
          setRows(hydrated);
          setHasIncompleteHistory(hydrated.some((item) => item.bidHistoryAvailable === false));
          setError('');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Chưa tải được danh sách phiên của bạn.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user],
  );

  // Reset state immediately when switching accounts or logging out.
  useEffect(() => {
    setRows([]);
    setError('');
    setHasIncompleteHistory(false);
    if (phase === 'ready' && user) {
      void load(false);
    } else if (phase === 'ready') {
      setLoading(false);
    }
  }, [load, phase, user?.id]);

  useEffect(() => {
    if (!user) return;
    const off = auctionApi.subscribe(() => {
      void load(true);
    });
    return off;
  }, [load, user]);

  const classified = useMemo(() => {
    if (!user) return [];
    return rows
      .map((auction) => classifyMyAuction(auction, user.id))
      .filter((item): item is MyAuctionRow => item !== null)
      .sort((a, b) => (a.nextDeadlineAt ?? 0) - (b.nextDeadlineAt ?? 0));
  }, [rows, user]);

  const groups = useMemo(
    () => ({
      participating: classified.filter((item) => item.group === 'participating'),
      payment: classified.filter((item) => item.group === 'payment'),
      ended: classified
        .filter((item) => item.group === 'ended')
        .sort((a, b) => (b.nextDeadlineAt ?? 0) - (a.nextDeadlineAt ?? 0)),
    }),
    [classified],
  );

  const tabs: Array<{ key: GroupKey; label: string; count: number }> = [
    { key: 'participating', label: 'Đang tham gia', count: groups.participating.length },
    { key: 'payment', label: 'Cần thanh toán', count: groups.payment.length },
    { key: 'ended', label: 'Đã kết thúc', count: groups.ended.length },
  ];

  const activeItems = groups[activeGroup];

  return (
    <>
      <StoreHeader />
      <main className="nexus-container py-8 sm:py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/account"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-950"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Quay lại Tài khoản
          </Link>
          {user && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void load(true)}
              disabled={refreshing || loading}
              className="min-h-11 rounded-xl border-stone-300"
            >
              <RefreshCw
                className={`size-4 ${refreshing ? 'motion-safe:animate-spin' : ''}`}
                aria-hidden="true"
              />
              Cập nhật trạng thái
            </Button>
          )}
        </div>

        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-emerald-800 uppercase">
              Tài khoản Buyer · Đấu giá
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-950 sm:text-3xl">
              Phiên của tôi
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              Theo dõi các phiên bạn đang đặt giá, phiên cần thanh toán và lịch sử kết quả trên tài
              khoản này.
            </p>
          </div>
          <Button
            asChild
            className="min-h-11 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800"
          >
            <Link href="/auctions">
              <Gavel className="size-4" aria-hidden="true" />
              Khám phá phiên đấu giá
            </Link>
          </Button>
        </header>

        {phase === 'loading' ? (
          <p
            role="status"
            className="rounded-2xl border border-stone-200 bg-white p-8 text-sm text-stone-600"
          >
            Đang xác minh phiên đăng nhập…
          </p>
        ) : phase === 'error' ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800"
          >
            <p>{sessionError}</p>
            <Button type="button" variant="outline" onClick={retry} className="mt-4 min-h-11">
              Thử lại
            </Button>
          </div>
        ) : !user ? (
          <section className="rounded-2xl border border-stone-200 bg-white p-8 text-center sm:p-12">
            <Gavel className="mx-auto size-9 text-stone-400" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold text-stone-950">
              Đăng nhập để xem phiên đấu giá của bạn
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
              Danh sách phiên đã tham gia, tình trạng vượt giá và hạn thanh toán luôn đồng bộ theo
              tài khoản Buyer.
            </p>
            <Button
              asChild
              className="mt-6 min-h-11 rounded-xl bg-emerald-700 px-6 text-white hover:bg-emerald-800"
            >
              <Link href="/login?next=%2Faccount%2Fauctions">Đăng nhập</Link>
            </Button>
          </section>
        ) : (
          <div className="space-y-6">
            {hasIncompleteHistory && (
              <div
                role="status"
                className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-950"
              >
                <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>
                  Một số phiên từ máy chủ chưa cung cấp danh sách lượt trả giá theo tài khoản. Khi
                  API tổng hợp <code>Phiên của tôi</code> hoàn tất phía Backend, toàn bộ lịch sử
                  tham gia sẽ đồng bộ tự động tại đây.
                </p>
              </div>
            )}

            <div
              role="tablist"
              aria-label="Nhóm phiên đấu giá của tôi"
              className="grid grid-cols-1 gap-2.5 sm:grid-cols-3"
            >
              {tabs.map((tab) => {
                const selected = activeGroup === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveGroup(tab.key)}
                    className={
                      'flex min-h-14 items-center justify-between rounded-2xl border px-5 py-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ' +
                      (selected
                        ? 'border-emerald-700 bg-emerald-50/70 text-emerald-950'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300')
                    }
                  >
                    <span className="font-semibold">{tab.label}</span>
                    <span
                      className={
                        'inline-flex min-w-8 items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ' +
                        (selected
                          ? 'bg-emerald-700 text-white'
                          : tab.key === 'payment' && tab.count > 0
                            ? 'bg-red-100 text-red-800'
                            : 'bg-stone-100 text-stone-700')
                      }
                    >
                      {loading ? '—' : tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {error && (
              <div
                role="alert"
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800"
              >
                <span>{error}</span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void load(false)}
                  className="min-h-11"
                >
                  Tải lại
                </Button>
              </div>
            )}

            {loading ? (
              <div
                role="status"
                className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-600"
              >
                Đang đồng bộ danh sách phiên của bạn…
              </div>
            ) : activeItems.length === 0 ? (
              <section className="rounded-2xl border border-stone-200 bg-white px-6 py-14 text-center">
                {activeGroup === 'payment' ? (
                  <CreditCard className="mx-auto size-8 text-stone-400" aria-hidden="true" />
                ) : activeGroup === 'ended' ? (
                  <Trophy className="mx-auto size-8 text-stone-400" aria-hidden="true" />
                ) : (
                  <Gavel className="mx-auto size-8 text-stone-400" aria-hidden="true" />
                )}
                <h2 className="mt-4 text-lg font-semibold text-stone-950">
                  {activeGroup === 'participating'
                    ? 'Bạn chưa tham gia phiên đang mở nào'
                    : activeGroup === 'payment'
                      ? 'Không có phiên nào cần thanh toán'
                      : 'Chưa có phiên đã kết thúc'}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
                  {activeGroup === 'participating'
                    ? 'Khi bạn đặt giá trên một phiên công khai, phiên sẽ xuất hiện ngay tại đây để bạn theo dõi trạng thái dẫn đầu hoặc bị vượt giá.'
                    : activeGroup === 'payment'
                      ? 'Mọi phiên bạn thắng và đang chờ thanh toán sẽ hiển thị tại đây cùng hạn thanh toán và lối mở đơn.'
                      : 'Lịch sử các phiên đã đóng hoặc đã hủy mà bạn từng tham gia sẽ được lưu tại mục này.'}
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="mt-6 min-h-11 rounded-xl border-stone-300"
                >
                  <Link href="/auctions">Xem danh sách đấu giá</Link>
                </Button>
              </section>
            ) : (
              <ul className="space-y-4">
                {activeItems.map((item) => {
                  const badge = PERSONAL_BADGE[item.personalState];
                  const isUrgentAction =
                    item.personalState === 'OUTBID' ||
                    item.personalState === 'PAYMENT_DUE' ||
                    item.personalState === 'WON_PENDING_ORDER';

                  return (
                    <li
                      key={item.auction.id}
                      className="rounded-2xl border border-stone-200 bg-white p-4 transition-shadow hover:shadow-sm sm:p-5"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                          <img
                            src={item.auction.image}
                            alt={item.auction.title}
                            loading="lazy"
                            onError={(event) => {
                              if (
                                !event.currentTarget.src.endsWith(
                                  '/images/nexus-product-placeholder.svg',
                                )
                              ) {
                                event.currentTarget.src = '/images/nexus-product-placeholder.svg';
                              }
                            }}
                            className="size-20 shrink-0 rounded-xl border border-stone-100 bg-stone-50 object-cover sm:size-24"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <AuctionBadge status={item.auction.status} />
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            </div>
                            <h2 className="mt-2 truncate text-base font-semibold text-stone-950 sm:text-lg">
                              <Link
                                href={`/auctions/${encodeURIComponent(item.auction.id)}`}
                                className="hover:underline"
                              >
                                {item.auction.title}
                              </Link>
                            </h2>
                            <p className="mt-1 text-xs text-stone-500">
                              Người bán: {item.auction.seller} · Mã phiên: {item.auction.id}
                            </p>

                            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:flex sm:flex-wrap sm:items-center">
                              <div>
                                <dt className="text-stone-500">Giá gần nhất của bạn</dt>
                                <dd className="mt-0.5 text-sm font-semibold text-stone-900 tabular-nums">
                                  {item.myLatestBid > 0
                                    ? auctionMoney(item.myLatestBid)
                                    : 'Chưa ghi nhận'}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-stone-500">
                                  {item.auction.status === 'ENDED'
                                    ? 'Giá chốt'
                                    : 'Giá dẫn hiện tại'}
                                </dt>
                                <dd className="mt-0.5 text-sm font-bold text-stone-950 tabular-nums">
                                  {auctionMoney(item.leadingOrFinalPrice)}
                                </dd>
                              </div>
                              {item.nextDeadlineAt && (
                                <div>
                                  <dt className="text-stone-500">{item.nextDeadlineLabel}</dt>
                                  <dd className="mt-0.5 inline-flex items-center gap-1 text-sm font-medium text-stone-800 tabular-nums">
                                    <Clock3
                                      className="size-3.5 text-stone-400"
                                      aria-hidden="true"
                                    />
                                    {auctionDateWithTz(item.nextDeadlineAt)}
                                  </dd>
                                </div>
                              )}
                            </dl>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center justify-end md:pl-4">
                          <Button
                            asChild
                            variant={isUrgentAction ? 'default' : 'outline'}
                            className={
                              isUrgentAction
                                ? 'min-h-11 w-full rounded-xl bg-emerald-700 px-5 text-white hover:bg-emerald-800 md:w-auto'
                                : 'min-h-11 w-full rounded-xl border-stone-300 px-5 text-stone-900 hover:bg-stone-50 md:w-auto'
                            }
                          >
                            <Link href={item.actionHref}>
                              <span>{item.actionLabel}</span>
                              <ArrowUpRight className="size-4" aria-hidden="true" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </main>
    </>
  );
}
