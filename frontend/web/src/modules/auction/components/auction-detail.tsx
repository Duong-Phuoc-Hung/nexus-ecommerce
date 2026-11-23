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
  RefreshCw,
  ShieldCheck,
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
import { SellerReputationTrigger } from '@/modules/user/components/seller-reputation-drawer';

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
  const bidInputRef = useRef<HTMLInputElement | null>(null);
  const bidSectionRef = useRef<HTMLDivElement | null>(null);
  const viewerOpenerRef = useRef<HTMLButtonElement | null>(null);
  const swipeStartXRef = useRef<number | null>(null);

  const { user, phase } = useSession();
  const { setAuctionContext } = useBuyerAssistant();

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

        setAuction(nextAuction);
        setOffset(snapshot.serverTime - Date.now());
        setLastSyncedAt(Date.now());
        setError('');
        setIsOffline(false);
      } catch (e) {
        if (request === requestVersion.current) {
          const message = e instanceof Error ? e.message : 'Không tải được phiên đấu.';
          if (auction) {
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
    [auction, id, user?.id],
  );

  useEffect(() => {
    void refresh();
    const off = auctionApi.subscribe(() => void refresh());
    const timer = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 3000);
    const onOnline = () => {
      setIsOffline(false);
      void refresh(true);
    };
    const onOffline = () => setIsOffline(true);
    const onVisibility = () => {
      if (!document.hidden) void refresh();
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      requestVersion.current++;
      off();
      clearInterval(timer);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh]);

  useEffect(() => {
    setNow(Date.now() + offset);
    const timer = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(timer);
  }, [offset]);

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

  const allowed =
    phase === 'ready' &&
    !!user &&
    user.role === 'BUYER' &&
    user.status === 'ACTIVE' &&
    !isOwnAuction &&
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
      setNotice(
        appConfig.auctionSource === 'mock'
          ? 'Đã ghi nhận giá trên thiết bị này (chế độ thử nghiệm cục bộ).'
          : result.status === 'EXTENDED'
            ? 'Đặt giá thành công! Phiên vừa được tự động gia hạn thêm thời gian.'
            : 'Đặt giá thành công!',
      );
    } catch (e) {
      setConfirmation(null);
      setNotice(e instanceof Error ? e.message : 'Không gửi được giá.');
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
    } catch (e) {
      setBuyNowConfirmOpen(false);
      setNotice(e instanceof Error ? e.message : 'Không thể thực hiện mua ngay.');
      await refresh(true);
    } finally {
      setBuyNowBusy(false);
    }
  }

  async function handleWinnerCheckout() {
    if (!auction || !user || checkoutBusy) return;
    const defaultAddr = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
    if (!defaultAddr) {
      setCheckoutError(
        'Bạn chưa có địa chỉ nhận hàng mặc định. Hãy bổ sung địa chỉ trước khi chốt đơn.',
      );
      return;
    }
    setCheckoutBusy(true);
    setCheckoutError('');
    try {
      const res = await auctionApi.checkout(auction.id, {
        fullName: defaultAddr.recipientName,
        phone: defaultAddr.phone,
        province: defaultAddr.province,
        ward: defaultAddr.ward || undefined,
        addressLine: defaultAddr.street,
        country: 'VN',
      });
      setCheckoutResult(res);
      setNotice(
        'Tạo đơn hàng thắng đấu giá thành công! Vui lòng hoàn tất thanh toán VietQR PayOS.',
      );
    } catch (e) {
      setCheckoutError(
        e instanceof Error ? e.message : 'Không thể tạo đơn thanh toán cho phiên này.',
      );
    } finally {
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
                            ? `Bạn có thể đặt từ ${auctionMoney(minBid)} cho lượt đầu.`
                            : `Mức tối thiểu tiếp theo là ${auctionMoney(minBid)} (giá dẫn + bước giá).`}
                        </p>
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
                    /* KHỐI KẾT QUẢ SAU KHI ĐÓNG / HỦY / SẮP MỞ */
                    <div className="mt-5 space-y-3 rounded-2xl border border-line bg-stone-50 p-5 text-sm">
                      {auction.status === 'CANCELLED' ? (
                        <>
                          <p className="font-bold text-red-800">Phiên đấu giá đã bị hủy</p>
                          <p className="text-xs leading-5 text-stone-700">
                            {auction.cancelReason ||
                              'Phiên đã ngừng nhận giá theo quyết định điều hành và không phát sinh đơn hàng.'}
                          </p>
                        </>
                      ) : auction.status === 'SCHEDULED' ? (
                        <>
                          <p className="font-bold text-sky-900">Phiên chưa bắt đầu</p>
                          <p className="text-xs leading-5 text-stone-700">
                            Thời gian mở phiên:{' '}
                            <strong>{auctionDateWithTz(auction.startAt)}</strong>. Hãy quay lại đúng
                            giờ để đặt mức đầu từ{' '}
                            <strong>{auctionMoney(auction.startingPrice)}</strong>.
                          </p>
                        </>
                      ) : buyerWon ? (
                        <>
                          <p className="font-bold text-emerald-900">
                            Chúc mừng! Bạn là người thắng phiên đấu giá
                          </p>
                          <p className="text-xs leading-5 text-stone-700">
                            Giá chốt:{' '}
                            <strong className="tabular-nums">
                              {auctionMoney(
                                auction.settlement?.finalPrice ?? currentPrice(auction),
                              )}
                            </strong>
                            {auction.settlement?.paymentDueAt && (
                              <>
                                {' '}
                                · Hạn thanh toán:{' '}
                                <strong>
                                  {auctionDateWithTz(auction.settlement.paymentDueAt)}
                                </strong>
                              </>
                            )}
                          </p>
                          {checkoutResult ? (
                            <div className="space-y-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-950">
                              <p className="font-semibold">
                                Đã tạo đơn hàng #
                                {checkoutResult.orderCode || checkoutResult.orderId}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {checkoutResult.payment?.checkoutUrl && (
                                  <Button
                                    asChild
                                    className="min-h-11 rounded-xl bg-emerald-700 text-xs font-semibold text-white hover:bg-emerald-800"
                                  >
                                    <a
                                      href={checkoutResult.payment.checkoutUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Thanh toán VietQR PayOS
                                      <ArrowUpRight className="ml-1 size-3.5" aria-hidden="true" />
                                    </a>
                                  </Button>
                                )}
                                <Button
                                  asChild
                                  variant="outline"
                                  className="min-h-11 rounded-xl bg-white text-xs font-semibold"
                                >
                                  <Link
                                    href={`/account/orders/${encodeURIComponent(checkoutResult.orderId)}`}
                                  >
                                    Xem đơn hàng
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          ) : auction.settlement?.orderId ? (
                            <Button
                              asChild
                              className="min-h-11 w-full rounded-xl bg-emerald-700 text-white hover:bg-emerald-800"
                            >
                              <Link
                                href={`/account/orders/${encodeURIComponent(auction.settlement.orderId)}`}
                              >
                                Tới đơn hàng & thanh toán
                              </Link>
                            </Button>
                          ) : (
                            <div className="space-y-2.5">
                              {(() => {
                                const defaultAddr =
                                  savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
                                return defaultAddr ? (
                                  <p className="text-xs text-stone-700">
                                    Giao tới:{' '}
                                    <strong>
                                      {defaultAddr.recipientName} ({defaultAddr.phone})
                                    </strong>{' '}
                                    — {defaultAddr.street}, {defaultAddr.province}.
                                  </p>
                                ) : (
                                  <p className="text-xs text-amber-900">
                                    Bạn cần có địa chỉ nhận hàng để chốt đơn thắng đấu giá và tạo mã
                                    VietQR thanh toán.
                                  </p>
                                );
                              })()}
                              {checkoutError && (
                                <p role="alert" className="text-xs font-medium text-red-700">
                                  {checkoutError}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-2">
                                {appConfig.auctionSource === 'api' && savedAddresses.length > 0 && (
                                  <Button
                                    type="button"
                                    disabled={checkoutBusy}
                                    onClick={() => void handleWinnerCheckout()}
                                    className="min-h-11 rounded-xl bg-emerald-700 text-xs font-semibold text-white hover:bg-emerald-800"
                                  >
                                    {checkoutBusy
                                      ? 'Đang tạo đơn…'
                                      : 'Chốt đơn & Thanh toán VietQR'}
                                  </Button>
                                )}
                                <Button
                                  asChild
                                  variant="outline"
                                  className="min-h-11 rounded-xl text-xs font-semibold"
                                >
                                  <Link href="/account/addresses">
                                    {savedAddresses.length > 0
                                      ? 'Đổi địa chỉ nhận hàng'
                                      : 'Bổ sung địa chỉ nhận hàng'}
                                  </Link>
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={refreshing}
                                  onClick={() => void refresh(true)}
                                  className="min-h-11 rounded-xl text-xs font-semibold"
                                >
                                  <RefreshCw
                                    className={`mr-1.5 size-3.5 ${refreshing ? 'motion-safe:animate-spin' : ''}`}
                                    aria-hidden="true"
                                  />
                                  Tải lại trạng thái đơn
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-stone-900">Phiên đấu giá đã kết thúc</p>
                          <p className="text-xs leading-5 text-stone-700">
                            {auction.bidHistoryAvailable === false
                              ? 'Phiên đã đóng; hệ thống đang chờ backend đồng bộ kết quả chốt và lịch sử.'
                              : history.length > 0
                                ? 'Phiên đã chốt mức giá cuối. Xem lịch sử trả giá bên dưới để đối chiếu.'
                                : 'Phiên kết thúc mà chưa có lượt trả giá nào; không phát sinh đơn hàng.'}
                          </p>
                        </>
                      )}
                    </div>
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
          <DialogDescription className="mt-2">
            {appConfig.auctionSource === 'mock'
              ? 'Thao tác này chỉ lưu cục bộ ở chế độ phát triển để kiểm tra luồng giao diện.'
              : 'Xác nhận gửi mức giá của bạn tới máy chủ Nexus.'}
          </DialogDescription>
          <p className="my-5 text-3xl font-bold text-emerald-800 tabular-nums">
            {auctionMoney(confirmation?.amount ?? 0)}
          </p>
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
              {busy ? 'Đang gửi giá…' : 'Xác nhận đặt giá'}
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
