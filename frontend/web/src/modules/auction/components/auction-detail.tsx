'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Box,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Gavel,
  Info,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trophy,
  WifiOff,
  ZoomIn,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { StoreHeader } from '@/components/layout/store-header';
import { useSession } from '@/modules/auth/hooks/use-session';
import { useBuyerAssistant } from '@/modules/chat/context/buyer-assistant-provider';
import { appConfig } from '@/configs/app.config';
import {
  auctionApi,
  currentPrice,
  hasCommittedBids,
  isAuctionOpenForBidding,
  nextPrice,
  type Auction,
  type AuctionCheckoutResult,
} from '../api/auction.api';
import {
  readAddresses,
  syncAddressesFromServer,
  type ShippingAddress,
} from '@/modules/user/utils/address-book';
import {
  AuctionBadge,
  auctionDate,
  auctionDateWithTz,
  auctionMoney,
  getDisplayTimezoneLabel,
} from './auction-ui';
import { Auction3DViewer } from './auction-3d-viewer';
import { getAuctionSocket } from '../utils/auction-socket';
import { SellerReputationTrigger } from '@/modules/user/components/seller-reputation-drawer';
import { useMyReputation } from '@/modules/user/hooks/use-my-reputation';

function remaining(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const hms = `${hours.toString().padStart(2, '0')} : ${mins
    .toString()
    .padStart(2, '0')} : ${secs.toString().padStart(2, '0')}`;
  return days > 0 ? `${days} ngày · ${hms}` : hms;
}

function formatDurationMinutes(seconds?: number): string {
  if (!seconds || seconds <= 0) return '5 phút';
  if (seconds % 60 === 0) return `${Math.round(seconds / 60)} phút`;
  return `${seconds} giây`;
}

export function AuctionDetail({ id }: { id: string }) {
  const requestVersion = useRef(0);
  const loadedAuctionId = useRef<string | null>(null);
  const bidInputRef = useRef<HTMLInputElement | null>(null);
  const bidSectionRef = useRef<HTMLDivElement | null>(null);
  const viewerOpenerRef = useRef<HTMLButtonElement | null>(null);
  const swipeStartXRef = useRef<number | null>(null);

  const { user, phase } = useSession();
  const { setAuctionContext } = useBuyerAssistant();
  const {
    data: myReputation,
    error: myReputationError,
    refresh: refreshMyReputation,
  } = useMyReputation(phase === 'ready' && user?.role === 'BUYER');
  const [uncertainSubmission, setUncertainSubmission] = useState<{
    amount: number;
    key: string;
  } | null>(null);

  const [auction, setAuction] = useState<Auction | null>(null);
  const [error, setError] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [offset, setOffset] = useState(0);
  const [amount, setAmount] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [hasNewBidsOnFirstPage, setHasNewBidsOnFirstPage] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [imageOpen, setImageOpen] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    amount: number;
    version: number;
    key: string;
  } | null>(null);
  const [buyNowConfirmOpen, setBuyNowConfirmOpen] = useState(false);
  const [buyNowBusy, setBuyNowBusy] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<ShippingAddress[]>([]);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [checkoutResult, setCheckoutResult] = useState<AuctionCheckoutResult | null>(null);
  const checkoutLockRef = useRef(false);
  const deadlineRefreshTriggeredRef = useRef(false);

  const prevStateRef = useRef<{
    status?: Auction['status'];
    endAt?: number;
    topBidId?: string;
    wasLeading?: boolean;
  }>({});

  const refresh = useCallback(
    async (manual = false) => {
      const request = ++requestVersion.current;
      if (manual) setRefreshing(true);
      try {
        const snapshot = await auctionApi.detail(id);
        if (request !== requestVersion.current) return;

        const nextAuction = snapshot.auction;
        const prev = prevStateRef.current;
        const topBid = nextAuction.bids[0];
        const isLeadingNow = Boolean(
          user?.id && topBid && (topBid.isMine || topBid.bidder === user.id),
        );

        // Chỉ thông báo trình đọc màn hình ở các mốc có ý nghĩa
        if (prev.status) {
          if (
            (nextAuction.status === 'EXTENDED' && prev.status !== 'EXTENDED') ||
            (prev.endAt && nextAuction.endAt > prev.endAt)
          ) {
            setAnnouncement('Phiên vừa gia hạn');
          } else if (
            prev.wasLeading &&
            !isLeadingNow &&
            isAuctionOpenForBidding(nextAuction.status)
          ) {
            setAnnouncement('Bạn bị vượt giá');
          } else if (
            isAuctionOpenForBidding(prev.status) &&
            (nextAuction.status === 'ENDED' || nextAuction.status === 'CANCELLED')
          ) {
            setAnnouncement('Phiên đã đóng');
          }
        }

        if (prev.topBidId && topBid?.id && prev.topBidId !== topBid.id) {
          setPage((currPage) => {
            if (currPage > 1) setHasNewBidsOnFirstPage(true);
            return currPage;
          });
        }

        prevStateRef.current = {
          status: nextAuction.status,
          endAt: nextAuction.endAt,
          topBidId: topBid?.id,
          wasLeading: isLeadingNow,
        };

        loadedAuctionId.current = id;
        setAuction(nextAuction);
        setOffset(snapshot.serverTime - Date.now());
        setLastSyncedAt(Date.now());
        setError('');
        setIsOffline(false);
      } catch (e) {
        if (request === requestVersion.current) {
          const message = e instanceof Error ? e.message : 'Không tải được phiên đấu.';
          if (loadedAuctionId.current === id) {
            setIsOffline(true);
          } else {
            setError(message);
          }
        }
      } finally {
        if (manual && request === requestVersion.current) {
          setRefreshing(false);
        }
      }
    },
    [id, user?.id],
  );

  useEffect(() => {
    void refresh();
    let debounceTimer: number | null = null;
    const scheduleRefresh = () => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        void refresh();
      }, 250);
    };

    const off = auctionApi.subscribe(scheduleRefresh);
    const socket = id && appConfig.auctionSource === 'api' ? getAuctionSocket() : null;
    let hasConnectedOnce = Boolean(socket?.connected);
    const joinRoom = () => {
      socket?.emit('join_auction', id);
      if (hasConnectedOnce) {
        scheduleRefresh();
      }
      hasConnectedOnce = true;
    };
    const onBidPlaced = (event?: { auctionId?: string }) => {
      if (!event?.auctionId || String(event.auctionId) === String(id)) {
        scheduleRefresh();
      }
    };
    socket?.on('auction:bid_placed', onBidPlaced);
    socket?.on('auction:buy_now', onBidPlaced);
    socket?.on('auction:updated', onBidPlaced);
    socket?.on('auction:cancelled', onBidPlaced);
    socket?.on('auction:started', onBidPlaced);
    socket?.on('auction:ended', onBidPlaced);
    const onOutbid = (data?: {
      auctionId?: string;
      outbidUserId?: string;
      nextMinBid?: number;
    }) => {
      if (data?.auctionId && String(data.auctionId) !== String(id)) return;
      if (data?.outbidUserId && user?.id && data.outbidUserId === user.id) {
        setAnnouncement('Bạn bị vượt giá');
        setNotice(
          data.nextMinBid
            ? `Bạn vừa bị vượt giá. Mức tối thiểu mới là ${auctionMoney(data.nextMinBid)}.`
            : 'Bạn vừa bị vượt giá.',
        );
      }
      scheduleRefresh();
    };
    socket?.on('auction:outbid', onOutbid);
    socket?.on('connect', joinRoom);
    if (socket?.connected) socket.emit('join_auction', id);

    // Không polling HTTP 3 giây liên tục — chỉ đồng bộ qua Socket.IO & khi mạng hồi phục
    const onOnline = () => {
      setIsOffline(false);
      void refresh(true);
    };
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      requestVersion.current++;
      if (debounceTimer) window.clearTimeout(debounceTimer);
      off();
      socket?.off('connect', joinRoom);
      socket?.off('auction:bid_placed', onBidPlaced);
      socket?.off('auction:buy_now', onBidPlaced);
      socket?.off('auction:updated', onBidPlaced);
      socket?.off('auction:cancelled', onBidPlaced);
      if (socket?.connected) socket.emit('leave_auction', id);
      socket?.off('auction:outbid', onOutbid);
      socket?.off('auction:started', onBidPlaced);
      socket?.off('auction:ended', onBidPlaced);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [id, refresh, user?.id]);

  useEffect(() => {
    setNow(Date.now() + offset);
    const timer = setInterval(() => {
      if (!document.hidden) setNow(Date.now() + offset);
    }, 1000);
    return () => clearInterval(timer);
  }, [offset]);

  // Khi phiên đã ENDED và hạn thanh toán paymentDueAt vừa điểm (còn <= 0ms),
  // gọi refresh() đúng 1 lần để đồng bộ trạng thái TIMEOUT / PAID từ Backend (không polling lặp).
  useEffect(() => {
    if (!auction || auction.status !== 'ENDED') {
      deadlineRefreshTriggeredRef.current = false;
      return;
    }
    const paySt = (auction.settlement?.paymentStatus || '').toUpperCase();
    const dueAt = auction.settlement?.paymentDueAt;
    if (paySt === 'PENDING' && dueAt && now >= dueAt && !deadlineRefreshTriggeredRef.current) {
      deadlineRefreshTriggeredRef.current = true;
      const t = window.setTimeout(() => {
        void refresh(true);
      }, 1500);
      return () => window.clearTimeout(t);
    }
  }, [auction, now, refresh]);

  useEffect(() => {
    if (!auction) {
      setAuctionContext(null);
      return;
    }
    setAuctionContext({
      id: auction.id,
      title: auction.title,
      status: auction.status,
      currentPrice: currentPrice(auction),
      endAt: auction.endAt,
      startAt: auction.startAt,
    });
    return () => setAuctionContext(null);
  }, [auction, setAuctionContext]);

  const galleryImages = useMemo(() => {
    if (!auction) return ['/images/nexus-product-placeholder.svg'];
    const list = auction.images?.filter(Boolean) ?? [];
    return list.length > 0 ? list : [auction.image || '/images/nexus-product-placeholder.svg'];
  }, [auction]);

  const safeImageIndex = Math.min(imageIndex, galleryImages.length - 1);
  const currentImage = galleryImages[safeImageIndex] || '/images/nexus-product-placeholder.svg';

  useEffect(() => {
    if (!user?.id || user.role !== 'BUYER') {
      setSavedAddresses([]);
      return;
    }
    setSavedAddresses(readAddresses(user.id));
    void syncAddressesFromServer(user.id).then((list) => {
      setSavedAddresses(list);
    });
  }, [user?.id, user?.role]);

  const isOwnAuction = Boolean(user?.id && auction?.sellerId && auction.sellerId === user.id);
  const reputationBlocked = Boolean(user?.role === 'BUYER' && myReputation && !myReputation.canBid);

  const allowed =
    phase === 'ready' &&
    !!user &&
    user.role === 'BUYER' &&
    user.status === 'ACTIVE' &&
    !isOwnAuction &&
    !reputationBlocked &&
    (!user.permissions || user.permissions.includes('AUCTION.BID'));

  const isOpenForBidding =
    !!auction && isAuctionOpenForBidding(auction.status) && now < auction.endAt;
  const minBid = auction ? nextPrice(auction) : 0;
  const isFirstBid = auction ? !hasCommittedBids(auction) : true;

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
      setLastSyncedAt(Date.now());
      setAmount('');
      setPage(1);
      setHasNewBidsOnFirstPage(false);
      setConfirmation(null);
      setUncertainSubmission(null);
      setNotice(
        appConfig.auctionSource === 'mock'
          ? `Đã ghi nhận ${auctionMoney(confirmation.amount)} (cục bộ).`
          : result.status === 'EXTENDED'
            ? `Đã ghi nhận ${auctionMoney(confirmation.amount)}. Phiên được tự động gia hạn thêm 5 phút.`
            : `Đã ghi nhận ${auctionMoney(confirmation.amount)} lúc ${new Date().toLocaleTimeString('vi-VN')}.`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Không gửi được giá.';
      const maybeNetwork = /timeout|network|kết nối|failed to fetch|mất mạng/i.test(msg);
      if (maybeNetwork) {
        // Mục 3.6 & G01: Giữ khóa cũ, đồng bộ lại trước khi cho thử lại
        setUncertainSubmission({ amount: confirmation.amount, key: confirmation.key });
        setConfirmation(null);
        setNotice(
          'Mất kết nối sau khi gửi. Hệ thống đang giữ mã yêu cầu cũ — vui lòng đồng bộ lại lịch sử trước khi thử lại.',
        );
      } else {
        setConfirmation(null);
        setNotice(msg);
      }
      await refresh(true);
    } finally {
      setBusy(false);
    }
  }

  async function confirmBuyNow() {
    if (!auction || buyNowBusy || !user || !allowed || !auction.buyNowPrice) return;
    setBuyNowBusy(true);
    setNotice('');
    try {
      const result = await auctionApi.buyNow(id);
      requestVersion.current++;
      setAuction(result);
      setLastSyncedAt(Date.now());
      setBuyNowConfirmOpen(false);
      setNotice('Mua ngay thành công! Bạn đã giành chiến thắng phiên đấu giá này.');
      setAnnouncement('Bạn đã mua ngay thành công và thắng phiên đấu giá.');

      // Tự động tạo đơn trúng đấu giá và chuyển sang trang VietQR PayOS nếu đã có địa chỉ nhận hàng
      const defaultAddr = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
      if (defaultAddr && appConfig.auctionSource === 'api') {
        void handleWinnerCheckout(result, true);
      }
    } catch (e) {
      setBuyNowConfirmOpen(false);
      setNotice(e instanceof Error ? e.message : 'Không thể thực hiện mua ngay.');
      await refresh(true);
    } finally {
      setBuyNowBusy(false);
    }
  }

  async function handleWinnerCheckout(targetAuction?: Auction, autoRedirectToPayOs = true) {
    const activeAuction = targetAuction || auction;
    if (!activeAuction || !user || checkoutBusy || checkoutLockRef.current) return;
    const defaultAddr = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
    if (!defaultAddr) {
      setCheckoutError('Cần địa chỉ nhận hàng mặc định trước khi tạo đơn.');
      return;
    }
    checkoutLockRef.current = true;
    setCheckoutBusy(true);
    setCheckoutError('');
    try {
      const idempotencyKey = `auction-checkout:${activeAuction.id}:${user.id}`;
      const res = await auctionApi.checkout(
        activeAuction.id,
        {
          fullName: defaultAddr.recipientName,
          phone: defaultAddr.phone,
          province: defaultAddr.province,
          ward: defaultAddr.ward || undefined,
          addressLine: defaultAddr.street,
          country: 'VN',
        },
        idempotencyKey,
      );
      setCheckoutResult(res);
      setNotice(`Đã tạo đơn #${res.orderCode || res.orderId}.`);
      try {
        sessionStorage.setItem('nexus-pending-payos-order', res.orderId);
        sessionStorage.setItem('nexus-pending-payos-auction', activeAuction.id);
      } catch {
        // Ignore sessionStorage errors
      }
      const payUrl = res.payment?.checkoutUrl?.trim();
      if (autoRedirectToPayOs && payUrl && /^https?:\/\//i.test(payUrl)) {
        window.location.assign(payUrl);
        return;
      }
      void refresh(true);
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : 'Không thể tạo đơn thanh toán.');
    } finally {
      checkoutLockRef.current = false;
      setCheckoutBusy(false);
    }
  }

  const history = auction?.bids ?? [];
  const pageSize = 5;
  const pages = Math.max(1, Math.ceil(history.length / pageSize));
  const visiblePage = Math.min(page, pages);
  const buyerHasBid = Boolean(
    user?.role === 'BUYER' && history.some((b) => b.isMine || b.bidder === user.id),
  );
  const buyerIsLeading = Boolean(
    user?.role === 'BUYER' && history[0] && (history[0].isMine || history[0].bidder === user.id),
  );
  const buyerWon = Boolean(
    user?.id &&
    auction?.status === 'ENDED' &&
    !isOffline &&
    (auction.settlement?.winnerId ? auction.settlement.winnerId === user.id : buyerIsLeading),
  );

  const timezoneLabel = useMemo(() => getDisplayTimezoneLabel(), []);
  const longDescription = (auction?.description?.length ?? 0) > 180;

  return (
    <>
      <StoreHeader />
      <main className="nexus-container py-6 pb-28 sm:py-10 lg:pb-14">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/auctions"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted hover:text-ink"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Tất cả phiên đấu giá
          </Link>
          {user?.role === 'BUYER' && (
            <Link
              href="/account/auctions"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 text-xs font-semibold text-ink hover:bg-stone-50"
            >
              <Gavel size={14} aria-hidden="true" />
              Phiên của tôi
            </Link>
          )}
        </div>

        {/* Thông báo mốc quan trọng cho trình đọc màn hình */}
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </span>

        {isOffline && auction && (
          <div
            role="status"
            className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950"
          >
            <div className="flex items-center gap-2">
              <WifiOff className="size-4 shrink-0 text-amber-700" aria-hidden="true" />
              <span>
                Đang mất kết nối. Đang hiển thị bản ghi lúc{' '}
                <strong>{lastSyncedAt ? auctionDate(lastSyncedAt) : 'trước đó'}</strong> — hệ thống
                sẽ đồng bộ lại trước khi xác nhận đặt giá.
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={refreshing}
              onClick={() => void refresh(true)}
              className="min-h-9 rounded-xl border-amber-300 bg-white text-xs font-semibold text-amber-900"
            >
              <RefreshCw
                className={`mr-1.5 size-3.5 ${refreshing ? 'motion-safe:animate-spin' : ''}`}
                aria-hidden="true"
              />
              Tải lại
            </Button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm"
          >
            <p className="font-medium text-red-900">{error}</p>
            <Button variant="outline" className="mt-3 min-h-11" onClick={() => void refresh(true)}>
              Thử lại
            </Button>
          </div>
        )}

        {!auction && !error && (
          <div role="status" className="h-96 animate-pulse rounded-3xl bg-stone-100">
            <span className="sr-only">Đang tải phiên đấu…</span>
          </div>
        )}

        {auction && (
          <>
            <div className="grid items-start gap-8 lg:grid-cols-[1.08fr_1fr] lg:gap-12">
              {/* CỘT TRÁI: NHẬN DIỆN SẢN PHẨM (GALLERY + TÙY CHỌN 3D + MÔ TẢ + NGƯỜI BÁN) */}
              <section aria-label="Nhận diện sản phẩm" className="min-w-0 space-y-4">
                {show3D && auction.model3d?.url ? (
                  <Auction3DViewer
                    model={auction.model3d}
                    title={auction.title}
                    fallbackImage={currentImage}
                    onClose={() => {
                      setShow3D(false);
                      window.setTimeout(() => viewerOpenerRef.current?.focus(), 40);
                    }}
                  />
                ) : (
                  <div className="space-y-3">
                    <div
                      className="relative overflow-hidden rounded-3xl border border-line bg-stone-100"
                      onTouchStart={(e) => {
                        swipeStartXRef.current = e.touches[0]?.clientX ?? null;
                      }}
                      onTouchEnd={(e) => {
                        const startX = swipeStartXRef.current;
                        const endX = e.changedTouches[0]?.clientX ?? null;
                        swipeStartXRef.current = null;
                        if (startX === null || endX === null || galleryImages.length <= 1) return;
                        const delta = endX - startX;
                        if (Math.abs(delta) < 35) return;
                        setImageIndex((prev) =>
                          delta < 0
                            ? (prev + 1) % galleryImages.length
                            : (prev - 1 + galleryImages.length) % galleryImages.length,
                        );
                      }}
                    >
                      <img
                        src={currentImage}
                        alt={auction.title}
                        className="aspect-[5/4] max-h-[340px] w-full object-cover sm:max-h-[460px]"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/images/nexus-product-placeholder.svg';
                        }}
                      />

                      <span className="absolute top-4 left-4 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-stone-900 shadow-xs">
                        {auction.condition}
                      </span>

                      <div className="absolute top-4 right-4 flex items-center gap-2">
                        {auction.model3d?.url && (
                          <Button
                            ref={viewerOpenerRef}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShow3D(true)}
                            className="min-h-11 gap-1.5 rounded-xl bg-white/95 px-3 text-xs font-semibold text-stone-900 shadow-xs hover:bg-white"
                          >
                            <Box className="size-4 text-emerald-700" aria-hidden="true" />
                            Xem 3D
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          aria-label="Xem ảnh lớn"
                          onClick={() => setImageOpen(true)}
                          className="min-h-11 gap-1.5 rounded-xl bg-white/95 px-3 text-xs font-semibold text-stone-900 shadow-xs hover:bg-white"
                        >
                          <ZoomIn className="size-4" aria-hidden="true" />
                          <span className="hidden sm:inline">Phóng to</span>
                        </Button>
                      </div>

                      {galleryImages.length > 1 && (
                        <>
                          <button
                            type="button"
                            aria-label="Ảnh trước"
                            onClick={() =>
                              setImageIndex(
                                (prev) => (prev - 1 + galleryImages.length) % galleryImages.length,
                              )
                            }
                            className="absolute top-1/2 left-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-stone-900 shadow-sm hover:bg-white focus-visible:outline-2 focus-visible:outline-emerald-700"
                          >
                            <ChevronLeft className="size-5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            aria-label="Ảnh tiếp theo"
                            onClick={() =>
                              setImageIndex((prev) => (prev + 1) % galleryImages.length)
                            }
                            className="absolute top-1/2 right-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-stone-900 shadow-sm hover:bg-white focus-visible:outline-2 focus-visible:outline-emerald-700"
                          >
                            <ChevronRight className="size-5" aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Dải ảnh chi tiết */}
                    {galleryImages.length > 1 && (
                      <div
                        className="flex gap-2.5 overflow-x-auto pb-1"
                        role="group"
                        aria-label="Dải ảnh sản phẩm"
                      >
                        {galleryImages.map((src, idx) => (
                          <button
                            key={`${src}-${idx}`}
                            type="button"
                            aria-label={`Xem ảnh ${idx + 1}`}
                            aria-current={idx === safeImageIndex ? 'true' : undefined}
                            onClick={() => setImageIndex(idx)}
                            className={`size-16 shrink-0 overflow-hidden rounded-2xl border-2 bg-stone-100 transition focus-visible:outline-2 focus-visible:outline-emerald-700 ${
                              idx === safeImageIndex
                                ? 'border-emerald-700 ring-2 ring-emerald-700/20'
                                : 'border-line hover:border-stone-400'
                            }`}
                          >
                            <img
                              src={src}
                              alt=""
                              className="size-full object-cover"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = '/images/nexus-product-placeholder.svg';
                              }}
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Mô tả sản phẩm (thu gọn nếu dài) */}
                <div className="rounded-3xl border border-line bg-white p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-bold text-stone-900">Mô tả & tình trạng</h2>
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
                      {auction.condition}
                    </span>
                  </div>
                  <p
                    className={`mt-3 text-sm leading-6 text-stone-700 ${
                      !descriptionExpanded && longDescription ? 'line-clamp-3' : ''
                    }`}
                  >
                    {auction.description}
                  </p>
                  {longDescription && (
                    <button
                      type="button"
                      onClick={() => setDescriptionExpanded((v) => !v)}
                      className="mt-2 inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-emerald-800 underline underline-offset-4"
                    >
                      {descriptionExpanded ? 'Thu gọn mô tả' : 'Xem toàn bộ mô tả'}
                    </button>
                  )}
                </div>

                {/* Thông tin người bán */}
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
                      <ShieldCheck className="size-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs text-muted">Người bán tổ chức phiên</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-stone-900">{auction.seller}</p>
                        <SellerReputationTrigger
                          sellerId={auction.sellerId}
                          sellerName={auction.seller}
                        />
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full border border-line bg-stone-50 px-3 py-1 text-[11px] font-semibold text-stone-700">
                    {auction.visibility === 'RESTRICTED' ? 'Phiên hạn chế' : 'Phiên công khai'}
                  </span>
                </div>
              </section>

              {/* CỘT PHẢI: QUYẾT ĐỊNH ĐẶT GIÁ / KẾT QUẢ SAU ĐÓNG */}
              <section
                ref={bidSectionRef}
                aria-label="Quyết định đặt giá"
                className="min-w-0 space-y-5"
              >
                <div>
                  <p className="text-xs font-bold tracking-[.18em] text-emerald-800">
                    NEXUS AUCTIONS · {auction.id}
                  </p>
                  <h1 className="mt-2 text-2xl leading-tight font-bold tracking-tight text-stone-950 sm:text-4xl">
                    {auction.title}
                  </h1>
                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    <AuctionBadge status={auction.status} />
                    <span className="text-xs text-muted">
                      Kết thúc:{' '}
                      <strong className="text-stone-800">{auctionDateWithTz(auction.endAt)}</strong>
                    </span>
                  </div>
                </div>

                {/* Trạng thái cá nhân của Buyer khi đang tham gia */}
                {isOpenForBidding && buyerHasBid && (
                  <div
                    role="status"
                    className={`rounded-2xl border p-4 text-sm ${
                      buyerIsLeading
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                        : 'border-amber-200 bg-amber-50 text-amber-950'
                    }`}
                  >
                    <strong className="block">
                      {buyerIsLeading
                        ? 'Bạn đang dẫn đầu phiên đấu giá'
                        : 'Bạn vừa bị vượt giá — cân nhắc mức đặt mới'}
                    </strong>
                    <p className="mt-1 text-xs opacity-90">
                      {buyerIsLeading
                        ? 'Theo dõi đến mốc kết thúc để nhận thông báo kết quả chính thức.'
                        : `Mức tối thiểu mới hiện là ${auctionMoney(minBid)}.`}
                    </p>
                  </div>
                )}

                <div className="rounded-3xl border border-line bg-white p-5 shadow-xs sm:p-7">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-muted">
                        {auction.status === 'ENDED'
                          ? 'Mức giá chốt cuối cùng'
                          : isFirstBid
                            ? 'Giá khởi điểm (chưa có lượt)'
                            : 'Mức giá dẫn hiện tại'}
                      </p>
                      <p className="mt-1.5 text-3xl font-bold tracking-tight text-stone-950 tabular-nums sm:text-4xl">
                        {auctionMoney(currentPrice(auction))}
                      </p>
                    </div>

                    {['ACTIVE', 'EXTENDED', 'SCHEDULED'].includes(auction.status) && (
                      <div className="rounded-2xl border border-line bg-stone-50 px-4 py-2.5 text-right">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted">
                          <Clock3 className="size-3.5" aria-hidden="true" />
                          {auction.status === 'SCHEDULED' ? 'Bắt đầu sau' : 'Còn lại'}
                        </span>
                        <p className="mt-0.5 text-lg font-bold text-stone-950 tabular-nums">
                          {remaining(
                            (auction.status === 'SCHEDULED' ? auction.startAt : auction.endAt) -
                              now,
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3 border-y border-line py-4 text-xs sm:text-sm">
                    <div>
                      <p className="text-muted">Bước giá</p>
                      <strong className="mt-0.5 block tabular-nums">
                        {auctionMoney(auction.increment)}
                      </strong>
                    </div>
                    <div>
                      <p className="text-muted">Tối thiểu tiếp theo</p>
                      <strong className="mt-0.5 block text-emerald-800 tabular-nums">
                        {auctionMoney(minBid)}
                      </strong>
                    </div>
                    <div>
                      <p className="text-muted">Số lượt</p>
                      <strong className="mt-0.5 block tabular-nums">
                        {auction.bidCount === null
                          ? 'Đang cập nhật'
                          : `${auction.bidCount ?? history.length} lượt`}
                      </strong>
                    </div>
                  </div>

                  {/* FORM ĐẶT GIÁ HOẶC KHỐI KẾT QUẢ SAU KHI ĐÓNG */}
                  {isOpenForBidding ? (
                    <form
                      className="mt-5 space-y-4"
                      onSubmit={(e) => {
                        e.preventDefault();
                        setNotice('');
                        if (isOffline) {
                          setNotice(
                            'Đang mất kết nối. Vui lòng tải lại dữ liệu trước khi đặt giá.',
                          );
                          return;
                        }
                        const value = Number(amount || minBid);
                        if (!Number.isSafeInteger(value) || value < minBid) {
                          setNotice(
                            `Mức giá phải là số nguyên VND và tối thiểu ${auctionMoney(minBid)}.`,
                          );
                          return;
                        }
                        setConfirmation({
                          amount: value,
                          version: auction.version,
                          key: crypto.randomUUID(),
                        });
                      }}
                    >
                      <div>
                        <label
                          htmlFor="auction-amount"
                          className="mb-1.5 block text-sm font-semibold text-stone-900"
                        >
                          Mức giá bạn muốn đặt (VND)
                        </label>
                        <Input
                          ref={bidInputRef}
                          id="auction-amount"
                          type="number"
                          inputMode="numeric"
                          step="1"
                          min={minBid}
                          max={1_000_000_000_000}
                          value={amount}
                          placeholder={String(minBid)}
                          onChange={(e) => setAmount(e.target.value)}
                          aria-describedby="minimum-bid-hint"
                          disabled={!allowed || busy}
                          className="min-h-11 text-base font-semibold tabular-nums"
                        />
                        <p id="minimum-bid-hint" className="mt-2 text-xs text-stone-600">
                          {isFirstBid
                            ? `Lượt đầu từ ${auctionMoney(minBid)} · Bước giá ${auctionMoney(auction.increment)}.`
                            : `Mức tối thiểu tiếp theo là ${auctionMoney(minBid)} (giá dẫn + bước giá).`}
                        </p>
                        {auction.demoMode && (
                          <p className="mt-1 text-xs font-medium text-emerald-800">
                            Quy đổi demo: 1 ₫ tương đương{' '}
                            {(auction.demoMultiplier ?? 1_000_000).toLocaleString('vi-VN')} ₫ giá
                            trị minh họa.
                          </p>
                        )}
                        {user?.role === 'BUYER' && (
                          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-stone-50 px-3 py-2 text-xs">
                            {myReputation ? (
                              <>
                                <span
                                  className={
                                    myReputation.canBid
                                      ? 'font-medium text-stone-700'
                                      : 'font-semibold text-red-700'
                                  }
                                >
                                  Uy tín {myReputation.score}/100 ·{' '}
                                  {myReputation.canBid
                                    ? 'Đủ điểm đặt giá'
                                    : 'Cần 50 điểm để đặt giá'}
                                </span>
                                <Link
                                  href={`/account/reputation?returnTo=${encodeURIComponent('/auctions/' + id)}`}
                                  className="font-semibold text-emerald-800 underline underline-offset-4 hover:text-emerald-950"
                                >
                                  Xem nhiệm vụ
                                </Link>
                              </>
                            ) : myReputationError ? (
                              <>
                                <span className="text-amber-800">Chưa kiểm tra được uy tín</span>
                                <button
                                  type="button"
                                  onClick={refreshMyReputation}
                                  className="font-semibold text-emerald-800 underline underline-offset-4"
                                >
                                  Thử lại
                                </button>
                              </>
                            ) : (
                              <span className="text-stone-500">
                                Đang kiểm tra điều kiện uy tín…
                              </span>
                            )}
                          </div>
                        )}
                        {uncertainSubmission && (
                          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                            <span>
                              Chưa rõ kết quả lượt {auctionMoney(uncertainSubmission.amount)}. Đồng
                              bộ rồi gửi lại cùng khóa?
                            </span>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => void refresh(true)}
                                className="h-8 rounded-lg bg-white px-2.5 text-xs"
                              >
                                Đồng bộ
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() =>
                                  setConfirmation({
                                    amount: uncertainSubmission.amount,
                                    version: auction.version,
                                    key: uncertainSubmission.key,
                                  })
                                }
                                className="h-8 rounded-lg bg-emerald-700 px-2.5 text-xs text-white"
                              >
                                Gửi lại
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {[0, 1, 2].map((n) => {
                          const suggested = minBid + n * auction.increment;
                          return (
                            <Button
                              key={n}
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!allowed || busy}
                              onClick={() => setAmount(String(suggested))}
                              className="min-h-11 rounded-xl px-3.5 text-xs font-semibold tabular-nums"
                            >
                              {auctionMoney(suggested)}
                            </Button>
                          );
                        })}
                      </div>

                      {!user ? (
                        <Button
                          asChild
                          size="lg"
                          className="min-h-12 w-full gap-2 rounded-2xl bg-emerald-700 text-sm font-semibold text-white hover:bg-emerald-800"
                        >
                          <Link href={'/login?next=' + encodeURIComponent('/auctions/' + id)}>
                            <Gavel size={18} aria-hidden="true" />
                            Đăng nhập để đặt giá
                            <ArrowUpRight size={18} aria-hidden="true" />
                          </Link>
                        </Button>
                      ) : (
                        <div className="space-y-2.5">
                          <Button
                            type="submit"
                            size="lg"
                            disabled={!allowed || busy || buyNowBusy || !!error || isOffline}
                            className="min-h-12 w-full gap-2 rounded-2xl bg-emerald-700 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-stone-300 disabled:text-stone-600"
                          >
                            <Gavel size={18} aria-hidden="true" />
                            Đặt giá
                            <ArrowUpRight size={18} aria-hidden="true" />
                          </Button>
                          {auction.buyNowPrice &&
                            auction.buyNowPrice > 0 &&
                            isFirstBid &&
                            appConfig.auctionSource === 'api' && (
                              <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                disabled={!allowed || busy || buyNowBusy || !!error || isOffline}
                                onClick={() => setBuyNowConfirmOpen(true)}
                                className="min-h-11 w-full rounded-2xl border-emerald-700/40 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
                              >
                                Mua ngay lập tức ·{' '}
                                <span className="tabular-nums">
                                  {auctionMoney(auction.buyNowPrice)}
                                </span>
                              </Button>
                            )}
                        </div>
                      )}

                      {user && !allowed && (
                        <p className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs leading-5 text-amber-950">
                          {isOwnAuction
                            ? 'Bạn là người bán tổ chức phiên này nên không được phép tự đặt giá.'
                            : user.role !== 'BUYER'
                              ? 'Chỉ tài khoản Buyer đang hoạt động mới có quyền tham gia đặt giá.'
                              : 'Tài khoản hiện không đủ quyền hoặc không ở trạng thái hoạt động để đặt giá.'}
                        </p>
                      )}
                    </form>
                  ) : (
                    /* KHỐI KẾT QUẢ CÔNG KHAI SAU KHI ĐÓNG / HỦY / SẮP MỞ */
                    (() => {
                      if (auction.status === 'CANCELLED') {
                        return (
                          <div className="mt-5 space-y-2 rounded-2xl border border-red-200 bg-red-50/70 p-5 text-sm">
                            <p className="font-bold text-red-900">Phiên đấu giá đã bị hủy</p>
                            <p className="text-xs leading-5 text-red-800/90">
                              {auction.cancelReason ||
                                'Phiên đã ngừng nhận giá và không phát sinh đơn hàng.'}
                            </p>
                          </div>
                        );
                      }

                      if (auction.status === 'SCHEDULED') {
                        return (
                          <div className="mt-5 space-y-2 rounded-2xl border border-sky-200 bg-sky-50/70 p-5 text-sm">
                            <p className="font-bold text-sky-950">Phiên sắp diễn ra</p>
                            <p className="text-xs leading-5 text-sky-900">
                              Mở lúc <strong>{auctionDateWithTz(auction.startAt)}</strong> · Giá
                              khởi điểm{' '}
                              <strong className="tabular-nums">
                                {auctionMoney(auction.startingPrice)}
                              </strong>
                            </p>
                          </div>
                        );
                      }

                      const settlement = auction.settlement;
                      const topBid = history[0];
                      const hasWinner = Boolean(
                        settlement?.winnerId ||
                        settlement?.outcome === 'WON' ||
                        (history.length > 0 && topBid),
                      );
                      const finalPrice =
                        settlement?.winningBidAmount ??
                        settlement?.finalPrice ??
                        currentPrice(auction);
                      const closedAt = settlement?.settledAt ?? auction.endAt;
                      const isPrivilegedViewer = Boolean(
                        user &&
                        (user.role === 'ADMIN' ||
                          user.role === 'SUPPORT_STAFF' ||
                          user.id === auction.sellerId),
                      );
                      const winnerLabel = buyerWon
                        ? 'Bạn'
                        : isPrivilegedViewer && settlement?.winnerName
                          ? settlement.winnerName
                          : settlement?.winnerAlias ||
                            topBid?.displayAlias ||
                            (settlement?.winnerId
                              ? `Buyer ••••${settlement.winnerId.slice(-4).toUpperCase()}`
                              : 'Người thắng phiên');
                      const payStatus = (settlement?.paymentStatus || '').toUpperCase();
                      const isPaid = payStatus === 'PAID' || payStatus === 'COMPLETED';
                      const isTimeout =
                        payStatus === 'TIMEOUT' || payStatus === 'TIMEOUT_PENALIZED';
                      const resolvedOrderId =
                        checkoutResult?.orderId || settlement?.orderId || null;
                      const resolvedOrderCode =
                        checkoutResult?.orderCode || settlement?.orderCode || resolvedOrderId;
                      const resolvedCheckoutUrl =
                        checkoutResult?.payment?.checkoutUrl || settlement?.paymentUrl || null;

                      if (!hasWinner) {
                        return (
                          <div className="mt-5 space-y-1.5 rounded-2xl border border-line bg-stone-50 p-5 text-sm">
                            <p className="font-bold text-stone-900">
                              Phiên đã kết thúc · Chưa có lượt đặt
                            </p>
                            <p className="text-xs text-stone-600 tabular-nums">
                              Đóng lúc {auctionDateWithTz(closedAt)} · Không phát sinh đơn hàng.
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div
                          id="winner-checkout"
                          className={`mt-5 space-y-4 rounded-2xl border p-5 text-sm ${
                            buyerWon
                              ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/90 via-white to-amber-50/40'
                              : 'border-amber-200/80 bg-gradient-to-br from-amber-50/60 via-white to-stone-50'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`grid size-8 place-items-center rounded-xl ${
                                  buyerWon
                                    ? 'bg-emerald-700 text-white'
                                    : 'bg-amber-500/15 text-amber-800'
                                }`}
                              >
                                <Trophy className="size-4" aria-hidden="true" />
                              </span>
                              <div>
                                <p className="font-bold text-stone-950">
                                  {buyerWon
                                    ? 'Chúc mừng! Bạn đã thắng phiên này'
                                    : 'Kết quả phiên đấu giá'}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {settlement?.closedReason === 'BUY_NOW' && (
                                <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-800">
                                  Chốt bằng Mua ngay
                                </span>
                              )}
                              {isPaid && (
                                <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-900">
                                  Đã thanh toán
                                </span>
                              )}
                              {isTimeout && (
                                <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-800">
                                  Quá hạn 24h
                                </span>
                              )}
                            </div>
                          </div>

                          <dl className="grid grid-cols-1 gap-3 rounded-xl border border-stone-200/80 bg-white/90 p-3.5 text-xs sm:grid-cols-3">
                            <div>
                              <dt className="text-stone-500">Người chiến thắng</dt>
                              <dd className="mt-0.5 font-semibold text-stone-950">{winnerLabel}</dd>
                            </div>
                            <div>
                              <dt className="text-stone-500">Giá trúng đấu giá</dt>
                              <dd className="mt-0.5 text-sm font-bold text-emerald-800 tabular-nums">
                                {auctionMoney(finalPrice)}
                              </dd>
                              {auction.demoMode && (
                                <dd className="text-[11px] text-stone-500 tabular-nums">
                                  ≈{' '}
                                  {(
                                    finalPrice * (auction.demoMultiplier ?? 1_000_000)
                                  ).toLocaleString('vi-VN')}{' '}
                                  ₫
                                </dd>
                              )}
                            </div>
                            <div>
                              <dt className="text-stone-500">Thời điểm chốt</dt>
                              <dd className="mt-0.5 font-medium text-stone-900 tabular-nums">
                                {auctionDateWithTz(closedAt)}
                              </dd>
                            </div>
                          </dl>

                          {buyerWon && (
                            <div className="space-y-3 border-t border-stone-200/70 pt-3">
                              {isPaid ? (
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <p className="text-xs font-medium text-emerald-900">
                                    Đơn #{resolvedOrderCode || '—'} đã thanh toán thành công.
                                  </p>
                                  {resolvedOrderId && (
                                    <Button
                                      asChild
                                      className="min-h-11 rounded-xl bg-emerald-700 text-xs font-semibold text-white hover:bg-emerald-800"
                                    >
                                      <Link
                                        href={`/account/orders/${encodeURIComponent(resolvedOrderId)}`}
                                      >
                                        Xem đơn mua
                                      </Link>
                                    </Button>
                                  )}
                                </div>
                              ) : isTimeout ? (
                                <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800">
                                  Đã quá hạn thanh toán 24 giờ theo quy định SRS. Quyền tạo đơn đã
                                  đóng.
                                </p>
                              ) : resolvedOrderId ? (
                                <div className="space-y-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-950">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-semibold">
                                      Đơn thắng đấu giá #{resolvedOrderCode}
                                    </p>
                                    {settlement?.paymentDueAt && (
                                      <span className="text-stone-700 tabular-nums">
                                        Hạn:{' '}
                                        <strong>
                                          {auctionDateWithTz(settlement.paymentDueAt)}
                                        </strong>
                                        {settlement.paymentDueAt > now && (
                                          <span className="ml-1.5 rounded-md bg-amber-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-900">
                                            Còn {remaining(settlement.paymentDueAt - now)}
                                          </span>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {resolvedCheckoutUrl ? (
                                      <Button
                                        asChild
                                        className="min-h-11 rounded-xl bg-emerald-700 text-xs font-semibold text-white hover:bg-emerald-800"
                                      >
                                        <a
                                          href={resolvedCheckoutUrl}
                                          onClick={() => {
                                            try {
                                              if (resolvedOrderId) {
                                                sessionStorage.setItem(
                                                  'nexus-pending-payos-order',
                                                  resolvedOrderId,
                                                );
                                              }
                                              sessionStorage.setItem(
                                                'nexus-pending-payos-auction',
                                                auction.id,
                                              );
                                            } catch {
                                              // Ignore storage errors
                                            }
                                          }}
                                        >
                                          Thanh toán VietQR PayOS
                                          <ArrowUpRight
                                            className="ml-1 size-3.5"
                                            aria-hidden="true"
                                          />
                                        </a>
                                      </Button>
                                    ) : (
                                      <Button
                                        type="button"
                                        disabled={checkoutBusy}
                                        onClick={() => void handleWinnerCheckout(auction, true)}
                                        className="min-h-11 rounded-xl bg-emerald-700 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-70"
                                      >
                                        {checkoutBusy ? (
                                          <>
                                            <Loader2
                                              className="mr-1.5 size-4 animate-spin"
                                              aria-hidden="true"
                                            />
                                            Đang mở cổng PayOS…
                                          </>
                                        ) : (
                                          <>
                                            Thanh toán lại qua VietQR PayOS
                                            <ArrowUpRight
                                              className="ml-1 size-3.5"
                                              aria-hidden="true"
                                            />
                                          </>
                                        )}
                                      </Button>
                                    )}
                                    <Button
                                      asChild
                                      variant={resolvedCheckoutUrl ? 'outline' : 'default'}
                                      className={`min-h-11 rounded-xl text-xs font-semibold ${
                                        resolvedCheckoutUrl
                                          ? 'bg-white'
                                          : 'bg-emerald-700 text-white hover:bg-emerald-800'
                                      }`}
                                    >
                                      <Link
                                        href={`/account/orders/${encodeURIComponent(resolvedOrderId)}`}
                                      >
                                        {resolvedCheckoutUrl
                                          ? 'Xem đơn hàng'
                                          : 'Thanh toán & Xem đơn'}
                                      </Link>
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2.5">
                                  {settlement?.paymentDueAt && (
                                    <p className="text-xs text-stone-700 tabular-nums">
                                      Hạn thanh toán:{' '}
                                      <strong>{auctionDateWithTz(settlement.paymentDueAt)}</strong>
                                      {settlement.paymentDueAt > now && (
                                        <span className="ml-1.5 rounded-md bg-amber-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-900">
                                          Còn {remaining(settlement.paymentDueAt - now)}
                                        </span>
                                      )}
                                    </p>
                                  )}
                                  {(() => {
                                    const defaultAddr =
                                      savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
                                    return defaultAddr ? (
                                      <p className="text-xs text-stone-700">
                                        Giao tới: <strong>{defaultAddr.recipientName}</strong> (
                                        {defaultAddr.phone}) — {defaultAddr.street},{' '}
                                        {defaultAddr.province}
                                      </p>
                                    ) : (
                                      <p className="text-xs text-amber-900">
                                        Thêm địa chỉ nhận hàng để tạo đơn thanh toán.
                                      </p>
                                    );
                                  })()}
                                  {checkoutError && (
                                    <p role="alert" className="text-xs font-medium text-red-700">
                                      {checkoutError}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap gap-2">
                                    {appConfig.auctionSource === 'api' &&
                                      savedAddresses.length > 0 && (
                                        <Button
                                          type="button"
                                          disabled={checkoutBusy}
                                          onClick={() => void handleWinnerCheckout()}
                                          className="min-h-11 rounded-xl bg-emerald-700 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-70"
                                        >
                                          {checkoutBusy ? (
                                            <>
                                              <Loader2
                                                className="mr-1.5 size-4 animate-spin"
                                                aria-hidden="true"
                                              />
                                              Đang tạo đơn hàng…
                                            </>
                                          ) : (
                                            'Tạo đơn thanh toán'
                                          )}
                                        </Button>
                                      )}
                                    <Button
                                      asChild
                                      variant="outline"
                                      className="min-h-11 rounded-xl bg-white text-xs font-semibold"
                                    >
                                      <Link href="/account/addresses">
                                        {savedAddresses.length > 0 ? 'Đổi địa chỉ' : 'Thêm địa chỉ'}
                                      </Link>
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}

                  {notice && (
                    <p
                      role="status"
                      className="mt-4 rounded-xl border border-line bg-stone-50 p-3.5 text-xs font-medium text-stone-900"
                    >
                      {notice}
                    </p>
                  )}
                </div>

                {/* CÁCH PHIÊN NÀY HOẠT ĐỘNG (THU GỌN / MỞ RỘNG TỪ CHÍNH SÁCH HIỆU LỰC) */}
                <section className="rounded-3xl border border-line bg-white">
                  <button
                    type="button"
                    aria-expanded={rulesExpanded}
                    onClick={() => setRulesExpanded((v) => !v)}
                    className="flex min-h-12 w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-bold text-stone-900 focus-visible:outline-2 focus-visible:outline-emerald-700 rounded-3xl"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Info className="size-4 text-emerald-700" aria-hidden="true" />
                      Cách phiên này hoạt động
                    </span>
                    <ChevronDown
                      className={`size-4 text-muted transition-transform ${rulesExpanded ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                  {rulesExpanded && (
                    <dl className="space-y-3 border-t border-line px-5 py-4 text-xs sm:text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted">Giá mở (lượt đầu)</dt>
                        <dd className="font-semibold tabular-nums">
                          {auctionMoney(auction.startingPrice)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted">Mức tăng tối thiểu</dt>
                        <dd className="font-semibold tabular-nums">
                          {auctionMoney(auction.increment)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted">Giờ kết thúc ({timezoneLabel})</dt>
                        <dd className="text-right font-semibold">{auctionDate(auction.endAt)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted">Gia hạn tự động (chống bắn tỉa)</dt>
                        <dd className="text-right font-medium text-stone-800">
                          Cộng {formatDurationMinutes(auction.extensionDurationSeconds)} khi có lượt
                          trong {formatDurationMinutes(auction.extensionWindowSeconds)} cuối
                          {auction.maxExtensions ? ` (tối đa ${auction.maxExtensions} lần)` : ''}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted">Hạn thanh toán sau khi thắng</dt>
                        <dd className="font-semibold">{auction.paymentWindowHours ?? 24} giờ</dd>
                      </div>
                    </dl>
                  )}
                </section>
              </section>
            </div>

            {/* LỊCH SỬ TRẢ GIÁ */}
            <section
              aria-label="Lịch sử trả giá"
              className="mt-10 rounded-3xl border border-line bg-white p-5 sm:p-7"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-stone-950">Lịch sử trả giá</h2>
                  <p className="text-xs text-muted">
                    Xếp lượt mới nhất trước · Giữ nguyên vị trí khi bạn đang xem trang cũ
                  </p>
                </div>
                {hasNewBidsOnFirstPage && visiblePage > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setPage(1);
                      setHasNewBidsOnFirstPage(false);
                    }}
                    className="min-h-11 rounded-xl bg-emerald-700 px-3.5 text-xs font-semibold text-white hover:bg-emerald-800"
                  >
                    Có lượt mới · Xem đầu danh sách
                  </Button>
                )}
              </div>

              {!history.length ? (
                <p className="py-10 text-center text-sm text-muted">
                  {auction.bidHistoryAvailable === false
                    ? 'Backend chưa cung cấp lịch sử trả giá cho phiên này (G09).'
                    : 'Chưa có lượt trả giá nào. Bạn có thể là người đặt mức đầu tiên.'}
                </p>
              ) : (
                <ol className="mt-4 divide-y divide-line">
                  {history
                    .slice((visiblePage - 1) * pageSize, visiblePage * pageSize)
                    .map((bid, i) => {
                      const isSelf = Boolean(bid.isMine || (user?.id && bid.bidder === user.id));
                      const label = isSelf
                        ? 'Bạn'
                        : bid.displayAlias ||
                          (bid.bidder.startsWith('Người') || bid.bidder.startsWith('Thành viên')
                            ? bid.bidder
                            : `Thành viên •${bid.bidder.slice(-3)}`);
                      return (
                        <li
                          key={bid.id}
                          className="flex items-center justify-between gap-3 py-3.5 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 font-semibold text-stone-900">
                              <span>{label}</span>
                              {isSelf && (
                                <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                  Lượt của bạn
                                </span>
                              )}
                            </p>
                            <p className="mt-0.5 text-xs text-muted tabular-nums">
                              {auctionDate(bid.time)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-stone-950 tabular-nums">
                              {auctionMoney(bid.amount)}
                            </p>
                            {i === 0 && visiblePage === 1 && (
                              <span className="text-[11px] font-semibold text-emerald-700">
                                Dẫn đầu
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                </ol>
              )}

              {pages > 1 && (
                <nav
                  aria-label="Phân trang lịch sử trả giá"
                  className="mt-4 flex items-center justify-between border-t border-line pt-4"
                >
                  <Button
                    variant="outline"
                    disabled={visiblePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="min-h-11 px-4"
                  >
                    Trước
                  </Button>
                  <span className="text-xs font-medium text-muted tabular-nums">
                    Trang {visiblePage} / {pages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={visiblePage >= pages}
                    onClick={() => setPage((p) => Math.min(pages, p + 1))}
                    className="min-h-11 px-4"
                  >
                    Sau
                  </Button>
                </nav>
              )}
            </section>
          </>
        )}
      </main>

      {/* THANH HÀNH ĐỘNG DƯỚI CÙNG TRÊN DI ĐỘNG (MOBILE STICKY ACTION BAR) */}
      {auction && isOpenForBidding && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] text-muted">Tối thiểu tiếp theo</p>
              <p className="truncate text-base font-bold text-stone-950 tabular-nums">
                {auctionMoney(minBid)}
              </p>
            </div>
            {!user ? (
              <Button
                asChild
                className="min-h-11 shrink-0 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                <Link href={'/login?next=' + encodeURIComponent('/auctions/' + id)}>
                  Đăng nhập để đặt giá
                </Link>
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => {
                  bidSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  window.setTimeout(() => bidInputRef.current?.focus(), 250);
                }}
                className="min-h-11 shrink-0 gap-1.5 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                <Gavel size={16} aria-hidden="true" />
                Đặt giá
              </Button>
            )}
          </div>
        </div>
      )}

      {/* DIALOG PHÓNG TO ẢNH */}
      <Dialog open={imageOpen} onOpenChange={setImageOpen}>
        <DialogContent className="max-w-3xl p-5">
          <DialogTitle>Hình ảnh sản phẩm</DialogTitle>
          <DialogDescription>{auction?.title}</DialogDescription>
          {auction && (
            <img
              src={currentImage}
              alt={auction.title}
              className="mt-4 max-h-[65vh] w-full rounded-2xl object-contain"
            />
          )}
          <DialogClose asChild>
            <Button variant="outline" className="mt-4 min-h-11 w-full">
              Đóng ảnh
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>

      {/* DIALOG XÁC NHẬN ĐẶT GIÁ */}
      <Dialog
        open={!!confirmation}
        onOpenChange={(open) => {
          if (!open && !busy) setConfirmation(null);
        }}
      >
        <DialogContent className="p-6 sm:p-7">
          <DialogTitle>Xác nhận mức giá</DialogTitle>
          <DialogDescription className="mt-1.5 text-sm text-stone-700">
            {auction?.title}
          </DialogDescription>
          <div className="my-4 rounded-2xl border border-line bg-stone-50 p-4">
            <p className="text-xs text-stone-500">Số tiền cam kết</p>
            <p className="mt-1 text-3xl font-bold text-emerald-800 tabular-nums">
              {auctionMoney(confirmation?.amount ?? 0)}
            </p>
            {auction?.demoMode && (
              <p className="mt-1 text-xs text-stone-600 tabular-nums">
                Quy đổi demo: tương đương{' '}
                {(
                  (confirmation?.amount ?? 0) * (auction.demoMultiplier ?? 1_000_000)
                ).toLocaleString('vi-VN')}{' '}
                ₫ giá trị minh họa.
              </p>
            )}
            <p className="mt-2.5 text-xs text-stone-600">
              Nếu thắng phiên, bạn cần thanh toán đơn hàng trong vòng{' '}
              <strong>{auction?.paymentWindowHours ?? 24} giờ</strong> từ khi đơn sẵn sàng.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <DialogClose asChild>
              <Button variant="outline" disabled={busy} className="min-h-11">
                Quay lại
              </Button>
            </DialogClose>
            <Button
              disabled={busy}
              onClick={() => void confirmBid()}
              className="min-h-11 bg-emerald-700 text-white hover:bg-emerald-800"
            >
              {busy ? 'Đang gửi giá…' : `Xác nhận đặt ${auctionMoney(confirmation?.amount ?? 0)}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG XÁC NHẬN MUA NGAY (BUY IT NOW) */}
      <Dialog
        open={buyNowConfirmOpen}
        onOpenChange={(open) => {
          if (!open && !buyNowBusy) setBuyNowConfirmOpen(false);
        }}
      >
        <DialogContent className="p-6 sm:p-7">
          <DialogTitle>Xác nhận mua ngay lập tức</DialogTitle>
          <DialogDescription className="mt-2">
            Phiên đấu giá sẽ kết thúc ngay lập tức và bạn trở thành người chiến thắng với mức giá
            mua ngay.
          </DialogDescription>
          <p className="my-5 text-3xl font-bold text-emerald-800 tabular-nums">
            {auctionMoney(auction?.buyNowPrice ?? 0)}
          </p>
          <div className="flex flex-wrap justify-end gap-3">
            <DialogClose asChild>
              <Button variant="outline" disabled={buyNowBusy} className="min-h-11">
                Quay lại
              </Button>
            </DialogClose>
            <Button
              disabled={buyNowBusy}
              onClick={() => void confirmBuyNow()}
              className="min-h-11 bg-emerald-700 text-white hover:bg-emerald-800"
            >
              {buyNowBusy ? 'Đang xử lý…' : 'Xác nhận mua ngay'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
