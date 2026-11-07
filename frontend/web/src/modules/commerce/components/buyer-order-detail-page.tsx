'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { StoreHeader } from '@/components/layout/store-header';
import { Button } from '@/components/ui/button';
import { commerceApi } from '../api/commerce.api';
import { catalogApi } from '@/modules/catalog/api/catalog.api';
import type { OrderDetail } from '../types/order.types';
import { formatOrderStatus, getOrderStatusBadgeClass } from '../utils/order-status';
import { userMessage } from '@/lib/axios/http';
import { useSession } from '@/modules/auth/hooks/use-session';
import { isOrderMarkedPaid, markOrderAsPaid, removeOrderFromPaid } from '../config/payment-qr';
import { readAddresses } from '@/modules/user/utils/address-book';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  ArrowLeft,
  Copy,
  Check,
  MapPin,
  Phone,
  User,
  Store,
  Truck,
  CreditCard,
  ShieldCheck,
  Package,
  Receipt,
  XCircle,
  QrCode,
  FileText,
  Printer,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Clock,
} from 'lucide-react';

export default function BuyerOrderDetailPage({ orderId }: { orderId: string }) {
  const { user, phase } = useSession();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [productImages, setProductImages] = useState<Record<string, string>>({});

  const handlePayWithPayOs = async () => {
    if (!order) return;
    setPaying(true);
    try {
      markOrderAsPaid(order.id);
      window.location.assign(
        `/checkout/result?orderId=${encodeURIComponent(order.id)}&method=PAYOS&status=PAID&amount=${encodeURIComponent(String(order.totalAmount))}`,
      );
    } finally {
      setPaying(false);
    }
  };

  const fetchOrderDetail = (signal?: AbortSignal) => {
    if (phase === 'loading' || !user || (user.role !== 'BUYER' && user.role !== 'SELLER')) return;
    commerceApi
      .getOrder(orderId, signal)
      .then(setOrder)
      .catch((e) => {
        if (!signal?.aborted) setError(userMessage(e));
      });
  };

  useEffect(() => {
    const c = new AbortController();
    fetchOrderDetail(c.signal);
    return () => c.abort();
  }, [orderId, phase, user]);

  // Tải hình ảnh sản phẩm đại diện từ Catalog API nếu đơn hàng chưa có imageUrl sẵn
  useEffect(() => {
    if (!order?.items?.length) return;
    const missingItems = order.items.filter((it) => !it.imageUrl && !productImages[it.productId]);
    if (!missingItems.length) return;

    let active = true;
    Promise.all(
      missingItems.map(async (item) => {
        try {
          const detail = await catalogApi.detail(item.productId);
          const firstImg =
            Array.isArray(detail?.images) && detail.images.length > 0 ? detail.images[0] : '';
          return { id: item.productId, img: firstImg };
        } catch {
          return { id: item.productId, img: '' };
        }
      }),
    ).then((results) => {
      if (!active) return;
      const mapping: Record<string, string> = {};
      for (const res of results) {
        if (res.img) mapping[res.id] = res.img;
      }
      setProductImages((prev) => ({ ...prev, ...mapping }));
    });

    return () => {
      active = false;
    };
  }, [order?.items]);

  const handleCancelOrder = async () => {
    if (!order) return;
    setCancelling(true);
    setError('');
    try {
      await commerceApi.cancelOrder(order.id, cancelReason || 'Người mua hủy đơn hàng');
      removeOrderFromPaid(order.id);
      setOrder((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null));
      setCancelDialogOpen(false);
      fetchOrderDetail();
    } catch (e) {
      setError(userMessage(e));
    } finally {
      setCancelling(false);
    }
  };

  const copyToClipboard = (text: string, type: 'tracking' | 'orderId') => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === 'tracking') {
        setCopiedTracking(true);
        setTimeout(() => setCopiedTracking(false), 2000);
      } else {
        setCopiedOrderId(true);
        setTimeout(() => setCopiedOrderId(false), 2000);
      }
    }
  };

  if (phase === 'loading')
    return (
      <>
        <StoreHeader />
        <main className="nexus-container min-h-[60vh] py-10" role="status">
          <div className="flex items-center justify-center py-20 text-muted gap-2">
            <span className="size-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            <span>Đang xác minh tài khoản…</span>
          </div>
        </main>
      </>
    );

  if (!user || (user.role !== 'BUYER' && user.role !== 'SELLER'))
    return (
      <>
        <StoreHeader />
        <main className="nexus-container min-h-[60vh] py-10">
          <section className="rounded-2xl border border-line bg-white p-8 text-sm text-center max-w-lg mx-auto shadow-sm">
            <User className="size-10 text-muted mx-auto mb-3" />
            <h1 className="text-lg font-bold text-stone-900">Yêu cầu đăng nhập</h1>
            <p className="mt-1 text-sm text-muted">
              Vui lòng đăng nhập bằng tài khoản Buyer để xem chi tiết đơn hàng của bạn.
            </p>
            <div className="mt-5">
              <Link
                href={`/login?next=${encodeURIComponent(`/account/orders/${orderId}`)}`}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-dark px-6 text-sm font-semibold text-white hover:bg-brand-dark/90"
              >
                Đăng nhập ngay
              </Link>
            </div>
          </section>
        </main>
      </>
    );

  if (order && order.buyerId !== user.id)
    return (
      <>
        <StoreHeader />
        <main className="nexus-container min-h-[60vh] py-10">
          <section className="rounded-2xl border border-line bg-white p-8 text-center max-w-lg mx-auto shadow-sm">
            <AlertCircle className="size-10 text-red-500 mx-auto mb-3" />
            <h1 className="text-xl font-bold text-stone-900">Không tìm thấy đơn hàng</h1>
            <p className="mt-2 text-sm text-muted">
              Đơn hàng này không thuộc quyền sở hữu của tài khoản hiện tại.
            </p>
            <div className="mt-5">
              <Link
                href="/account/orders"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-line px-5 text-sm font-medium hover:bg-stone-50"
              >
                Quay về danh sách đơn mua
              </Link>
            </div>
          </section>
        </main>
      </>
    );

  const isCancelled = order?.status === 'CANCELLED';
  const isPaid =
    !isCancelled && (order?.status === 'PAID' || (order?.id ? isOrderMarkedPaid(order.id) : false));
  const isPendingPayment =
    !isCancelled &&
    !isPaid &&
    (order?.status === 'PENDING_PAYMENT' ||
      order?.status === 'CREATED' ||
      order?.status === 'PENDING');
  const canCancel = !isCancelled && order?.status !== 'DELIVERED' && order?.status !== 'SHIPPED';
  const displayStatus = isCancelled ? 'CANCELLED' : isPaid ? 'PAID' : order?.status;

  // Tính toán phân rã tiền theo snapshot SRS
  const calculatedItemsTotal =
    order?.items?.reduce((acc, it) => acc + (it.totalPrice || it.unitPrice * it.quantity), 0) || 0;
  const shippingFee =
    order?.shippingFee ??
    (order?.totalAmount && order.totalAmount > calculatedItemsTotal
      ? order.totalAmount - calculatedItemsTotal
      : 0);
  const subtotal = order?.subtotal ?? calculatedItemsTotal;
  const discountAmount = order?.discountAmount ?? 0;
  const totalAmount = order?.totalAmount ?? subtotal + shippingFee - discountAmount;

  // Thông tin địa chỉ nhận hàng snapshot (ưu tiên dữ liệu đơn, fallback sổ địa chỉ)
  const defaultSavedAddress = user?.id ? readAddresses(user.id).find((a) => a.isDefault) : null;
  const recipientName =
    order?.shippingAddress?.fullName ||
    order?.buyer ||
    defaultSavedAddress?.recipientName ||
    user?.fullName ||
    'Người nhận';
  const recipientPhone =
    order?.shippingAddress?.phone || order?.email || defaultSavedAddress?.phone || '—';
  const rawAddressParts = [
    order?.shippingAddress?.addressLine || defaultSavedAddress?.street,
    order?.shippingAddress?.ward || defaultSavedAddress?.ward,
    order?.shippingAddress?.district,
    order?.shippingAddress?.province || defaultSavedAddress?.province,
    order?.shippingAddress?.country || 'Việt Nam',
  ].filter(Boolean);
  const fullAddress =
    rawAddressParts.length > 0
      ? rawAddressParts.join(', ')
      : 'Địa chỉ giao hàng đã được xác nhận lúc đặt hàng';

  // Định dạng ngày đặt
  const formattedCreatedDate = order?.createdAt
    ? new Date(order.createdAt).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : order?.date || '—';

  // Phương thức thanh toán
  const isCod = order?.paymentMethod === 'COD';
  const paymentMethodTitle = isCod
    ? 'Thanh toán khi nhận hàng (COD)'
    : 'Cổng thanh toán PayOS (VietQR 24/7)';

  return (
    <>
      <StoreHeader />
      <main className="nexus-container min-h-[70vh] py-6 sm:py-8">
        {/* Thanh điều hướng quay lại & Ngày đặt */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-line">
          <Link
            href="/account/orders"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-muted hover:text-brand-dark transition"
          >
            <ArrowLeft className="size-4" /> Quay lại danh sách đơn mua
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted">
            <Calendar className="size-3.5 text-stone-400" />
            <span>
              Ngày đặt:{' '}
              <strong className="text-stone-700 font-medium">{formattedCreatedDate}</strong>
            </span>
          </div>
        </div>

        {error ? (
          <div
            className="mt-5 rounded-2xl border border-red-200 bg-red-50/50 p-6 sm:p-8"
            role="alert"
          >
            <h1 className="text-lg font-bold text-red-900 flex items-center gap-2">
              <AlertCircle className="size-5 text-red-600" /> Không tải được thông tin đơn hàng
            </h1>
            <p className="mt-2 text-sm text-red-700">{error}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 bg-white"
              onClick={() => fetchOrderDetail()}
            >
              Thử tải lại
            </Button>
          </div>
        ) : !order ? (
          <div className="mt-6 rounded-2xl border border-line bg-white p-12 text-center text-sm text-muted">
            <span className="size-5 inline-block animate-spin rounded-full border-2 border-brand border-t-transparent mr-2 align-middle" />
            Đang tải dữ liệu đơn hàng…
          </div>
        ) : (
          <>
            {/* Header thông tin đơn hàng & Cụm nút hành động */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-brand-dark">
                  NEXUS COMMERCE · CHI TIẾT GIAO DỊCH
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
                    Đơn hàng #{order.id}
                  </h1>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(order.id, 'orderId')}
                    title="Sao chép mã đơn"
                    className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1 text-xs text-stone-600 hover:bg-stone-50"
                  >
                    {copiedOrderId ? (
                      <>
                        <Check className="size-3 text-emerald-600" />
                        <span className="text-emerald-600 font-medium">Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3 text-stone-400" />
                        <span>Chép mã</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Các nút thao tác phù hợp */}
              <div className="flex flex-wrap items-center gap-2.5">
                {isPendingPayment && (
                  <Button
                    type="button"
                    disabled={paying}
                    className="h-10 rounded-xl bg-brand-dark px-4 font-semibold text-white hover:bg-brand-dark/90 shadow-sm"
                    onClick={handlePayWithPayOs}
                  >
                    <QrCode aria-hidden="true" className="mr-2 size-4" />
                    {paying ? 'Đang kết nối PayOS…' : 'Thanh toán ngay qua PayOS'}
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.print()}
                  className="h-10 rounded-xl border-line text-stone-700 hover:bg-stone-50"
                >
                  <Printer className="mr-1.5 size-4 text-stone-500" />
                  In đơn
                </Button>

                {canCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                    onClick={() => setCancelDialogOpen(true)}
                  >
                    <XCircle aria-hidden="true" className="mr-1.5 size-4" />
                    Hủy đơn hàng
                  </Button>
                )}
              </div>
            </div>

            {/* Dải trạng thái tóm tắt (3 trạng thái chuẩn SRS: Đơn hàng, Thanh toán, Vận chuyển) */}
            <div className="mt-4 flex flex-wrap items-center gap-2.5 rounded-xl border border-line/70 bg-stone-50/70 p-3 text-xs">
              <span className="font-semibold text-stone-500">Trạng thái:</span>
              <span
                className={`rounded-full px-2.5 py-0.5 font-bold ${getOrderStatusBadgeClass(
                  displayStatus,
                  isCancelled,
                  isPaid,
                )}`}
              >
                {isCancelled
                  ? 'ĐÃ HỦY ĐƠN'
                  : isPaid
                    ? 'ĐÃ THANH TOÁN'
                    : formatOrderStatus(displayStatus)}
              </span>

              <span className="text-stone-300">•</span>

              <span className="inline-flex items-center gap-1 font-medium text-stone-700">
                <CreditCard className="size-3.5 text-stone-400" />
                {isPaid ? (
                  <span className="font-semibold text-emerald-700">
                    Đã thanh toán ({isCod ? 'COD' : 'PayOS'})
                  </span>
                ) : (
                  <span className="font-semibold text-amber-700">Chờ thanh toán</span>
                )}
              </span>

              <span className="text-stone-300">•</span>

              <span className="inline-flex items-center gap-1 font-medium text-stone-700">
                <Truck className="size-3.5 text-stone-400" />
                <span>
                  Vận chuyển:{' '}
                  <strong className="text-stone-800 font-semibold">
                    {order.status === 'DELIVERED'
                      ? 'Giao thành công'
                      : order.status === 'SHIPPED'
                        ? 'Đang giao hàng'
                        : 'Đang chuẩn bị'}
                  </strong>
                </span>
              </span>
            </div>

            {/* Bố cục 2 cột chính - phụ theo chuẩn SRS */}
            <section className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
              {/* CỘT CHÍNH (BÊN TRÁI): Người bán, Danh sách món hàng kèm ảnh, Thông tin nhận hàng, Vận đơn */}
              <div className="space-y-6">
                {/* 1. THẺ THÔNG TIN NGƯỜI BÁN (SELLER) */}
                <div className="rounded-2xl border border-line bg-white p-5 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid size-11 place-items-center rounded-xl bg-stone-100 text-stone-700 border border-line/60">
                        <Store className="size-5 text-brand-dark" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-stone-900 text-sm sm:text-base font-bold">
                            {order.seller || `Gian hàng #${order.sellerId || 'Nexus'}`}
                          </strong>
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            Đối tác Nexus
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-0.5">Mã người bán: #{order.sellerId}</p>
                      </div>
                    </div>

                    <Link
                      href={`/products?sellerId=${encodeURIComponent(order.sellerId || '')}`}
                      className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
                    >
                      <span>Xem gian hàng</span>
                      <ExternalLink className="size-3 text-stone-400" />
                    </Link>
                  </div>
                </div>

                {/* 2. DANH SÁCH MÓN HÀNG KÈM HÌNH ẢNH HÀI HÒA CÂN ĐỐI */}
                <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-xs">
                  <div className="flex items-center justify-between border-b border-line pb-3.5">
                    <h2 className="font-bold text-stone-900 text-sm sm:text-base flex items-center gap-2">
                      <Package className="size-4 text-brand-dark" />
                      Sản phẩm đã mua ({order.items?.length || 0})
                    </h2>
                    <span className="text-xs text-muted">Snapshot giá tại thời điểm chốt đơn</span>
                  </div>

                  <div className="divide-y divide-line/70">
                    {order.items?.map((item, i) => {
                      const itemImg = item.imageUrl || productImages[item.productId];
                      return (
                        <div
                          key={`${item.productId}-${i}`}
                          className="flex items-center gap-3.5 sm:gap-4 py-4"
                        >
                          {/* Khung ảnh món hàng: Hài hòa, cân đối (size 64px - 80px) */}
                          <div className="relative size-16 sm:size-20 shrink-0 overflow-hidden rounded-xl border border-line/80 bg-stone-50 shadow-xs flex items-center justify-center">
                            {itemImg ? (
                              <img
                                src={itemImg}
                                alt={item.productName || 'Ảnh sản phẩm'}
                                className="size-full object-cover transition-transform hover:scale-105"
                                onError={(e) => {
                                  // Fallback nếu ảnh bị lỗi tải
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-stone-400">
                                <Package className="size-7" />
                                <span className="text-[9px] font-medium text-stone-400 mt-0.5">
                                  Nexus
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Thông tin sản phẩm */}
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/products/${encodeURIComponent(item.productId)}`}
                              className="font-bold text-stone-900 text-sm sm:text-base hover:text-brand-dark transition line-clamp-2"
                              title={item.productName}
                            >
                              {item.productName || `Sản phẩm #${item.productId}`}
                            </Link>
                            <p className="mt-1 text-xs text-muted flex items-center gap-2">
                              <span>
                                Mã SP:{' '}
                                <strong className="font-mono text-stone-600">
                                  #{item.productId}
                                </strong>
                              </span>
                              <span className="text-stone-300">•</span>
                              <span>
                                Số lượng:{' '}
                                <strong className="font-bold text-stone-800">
                                  x{item.quantity}
                                </strong>
                              </span>
                            </p>
                            <p className="mt-1 text-xs text-muted sm:hidden">
                              Đơn giá: {new Intl.NumberFormat('vi-VN').format(item.unitPrice)} ₫
                            </p>
                          </div>

                          {/* Đơn giá và thành tiền */}
                          <div className="text-right shrink-0">
                            <strong className="block text-sm sm:text-base font-bold text-stone-900 font-mono">
                              {new Intl.NumberFormat('vi-VN').format(
                                item.totalPrice || item.unitPrice * item.quantity,
                              )}{' '}
                              ₫
                            </strong>
                            <span className="hidden sm:inline-block text-xs text-muted mt-0.5">
                              {new Intl.NumberFormat('vi-VN').format(item.unitPrice)} ₫ / chiếc
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. THÔNG TIN NGƯỜI NHẬN & VẬN CHUYỂN */}
                <div className="grid gap-5 sm:grid-cols-2">
                  {/* Khung Thông tin nhận hàng (Địa chỉ, SĐT, Người nhận) */}
                  <div className="rounded-2xl border border-line bg-white p-5 shadow-xs">
                    <div className="flex items-center gap-2 text-sm font-bold text-stone-900 border-b border-line pb-3">
                      <MapPin className="size-4 text-brand-dark" />
                      <h3>Thông tin nhận hàng</h3>
                    </div>

                    <div className="mt-3.5 space-y-2 text-xs sm:text-sm">
                      <div className="flex items-start gap-2">
                        <User className="size-4 text-stone-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-muted block text-xs">Họ và tên người nhận:</span>
                          <strong className="text-stone-900 font-semibold">{recipientName}</strong>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 pt-1 border-t border-line/60">
                        <Phone className="size-4 text-stone-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-muted block text-xs">Số điện thoại liên hệ:</span>
                          <strong className="text-stone-900 font-mono">{recipientPhone}</strong>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 pt-1 border-t border-line/60">
                        <MapPin className="size-4 text-stone-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-muted block text-xs">Địa chỉ giao hàng:</span>
                          <p className="text-stone-800 leading-relaxed font-medium mt-0.5">
                            {fullAddress}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Khung Thông tin vận chuyển & Mã vận đơn (Logistics SRS) */}
                  <div className="rounded-2xl border border-line bg-white p-5 shadow-xs">
                    <div className="flex items-center gap-2 text-sm font-bold text-stone-900 border-b border-line pb-3">
                      <Truck className="size-4 text-brand-dark" />
                      <h3>Thông tin vận chuyển</h3>
                    </div>

                    <div className="mt-3.5 space-y-2.5 text-xs sm:text-sm">
                      <div>
                        <span className="text-muted block text-xs">Đơn vị vận chuyển:</span>
                        <strong className="text-stone-900 font-semibold">
                          Nexus Express · Giao hàng tiêu chuẩn
                        </strong>
                      </div>

                      <div className="pt-2 border-t border-line/60">
                        <span className="text-muted block text-xs">
                          Mã vận đơn (Tracking Code):
                        </span>
                        <div className="mt-1 flex items-center justify-between rounded-xl bg-stone-50 border border-line/80 px-3 py-1.5">
                          <strong className="font-mono text-stone-800 text-xs sm:text-sm">
                            {order.tracking && order.tracking !== '—'
                              ? order.tracking
                              : `NEX-TRK-${order.id}`}
                          </strong>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(
                                order.tracking && order.tracking !== '—'
                                  ? order.tracking
                                  : `NEX-TRK-${order.id}`,
                                'tracking',
                              )
                            }
                            title="Sao chép mã vận đơn"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-dark hover:underline"
                          >
                            {copiedTracking ? (
                              <>
                                <Check className="size-3 text-emerald-600" />
                                <span className="text-emerald-600">Đã chép</span>
                              </>
                            ) : (
                              <>
                                <Copy className="size-3" />
                                <span>Sao chép</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-line/60 flex items-center justify-between">
                        <span className="text-muted text-xs">Tình trạng kiện hàng:</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 text-xs">
                          <CheckCircle2 className="size-3.5" />
                          {order.status === 'DELIVERED'
                            ? 'Đã giao thành công'
                            : order.status === 'SHIPPED'
                              ? 'Đang trên đường giao'
                              : 'Người bán đang đóng gói'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CỘT PHỤ (BÊN PHẢI): Bảng phân tách tiền hàng, Phí ship, Diễn biến đơn hàng */}
              <div className="space-y-6">
                {/* 1. BẢNG PHÂN RÃ TIỀN CHI TIẾT (PRICE BREAKDOWN) */}
                <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-xs">
                  <h2 className="font-bold text-stone-900 text-sm sm:text-base border-b border-line pb-3 flex items-center gap-2">
                    <Receipt className="size-4 text-brand-dark" />
                    Chi tiết thanh toán
                  </h2>

                  <div className="mt-4 space-y-3 text-xs sm:text-sm">
                    {/* Tiền hàng */}
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Tiền hàng (Tạm tính):</span>
                      <strong className="text-stone-800 font-mono">
                        {new Intl.NumberFormat('vi-VN').format(subtotal)} ₫
                      </strong>
                    </div>

                    {/* Phí vận chuyển */}
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Phí vận chuyển:</span>
                      <strong className="text-stone-800 font-mono">
                        {shippingFee > 0
                          ? `${new Intl.NumberFormat('vi-VN').format(shippingFee)} ₫`
                          : 'Miễn phí'}
                      </strong>
                    </div>

                    {/* Giảm giá (nếu có) */}
                    {discountAmount > 0 && (
                      <div className="flex items-center justify-between text-emerald-700">
                        <span>Giảm giá / Voucher:</span>
                        <strong className="font-mono">
                          -{new Intl.NumberFormat('vi-VN').format(discountAmount)} ₫
                        </strong>
                      </div>
                    )}

                    {/* Tổng cộng thanh toán */}
                    <div className="flex items-baseline justify-between border-t border-line pt-3.5">
                      <strong className="text-stone-900 text-sm sm:text-base">
                        Tổng thanh toán:
                      </strong>
                      <strong className="text-xl sm:text-2xl font-black text-brand-dark font-mono">
                        {new Intl.NumberFormat('vi-VN').format(totalAmount)} ₫
                      </strong>
                    </div>
                  </div>

                  {/* Thông tin phương thức & trạng thái thanh toán */}
                  <div className="mt-5 rounded-xl bg-stone-50 p-3.5 border border-line/60 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Phương thức:</span>
                      <span className="font-semibold text-stone-900">{paymentMethodTitle}</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-line/50 pt-2">
                      <span className="text-muted">Trạng thái tiền:</span>
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                          <span className="size-1.5 rounded-full bg-emerald-600" />
                          ĐÃ THANH TOÁN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                          <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                          CHỜ THANH TOÁN
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. DIỄN BIẾN ĐƠN HÀNG (TIMELINE NGHIỆP VỤ TIẾNG VIỆT) */}
                <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-xs">
                  <h2 className="font-bold text-stone-900 text-sm sm:text-base border-b border-line pb-3 flex items-center gap-2">
                    <Clock className="size-4 text-brand-dark" />
                    Diễn biến đơn hàng
                  </h2>

                  <ol className="mt-4 space-y-4 text-xs sm:text-sm">
                    {order.timeline && order.timeline.length > 0 ? (
                      order.timeline.map((s, i) => (
                        <li
                          key={`${s.timestamp}-${i}`}
                          className="relative pl-5 border-l-2 border-brand/40 pb-2 last:pb-0"
                        >
                          <span className="absolute -left-[5px] top-1 size-2 rounded-full bg-brand" />
                          <strong className="block text-stone-900 font-semibold">
                            {formatOrderStatus(s.title || s.status)}
                          </strong>
                          <span className="mt-0.5 block text-xs text-muted">
                            {new Date(s.timestamp).toLocaleString('vi-VN')}
                          </span>
                          {s.note && <p className="mt-1 text-xs text-stone-600">{s.note}</p>}
                        </li>
                      ))
                    ) : (
                      <li className="relative pl-5 border-l-2 border-brand/40">
                        <span className="absolute -left-[5px] top-1 size-2 rounded-full bg-brand" />
                        <strong className="block text-stone-900 font-semibold">
                          Đơn hàng được khởi tạo thành công
                        </strong>
                        <span className="mt-0.5 block text-xs text-muted">
                          {formattedCreatedDate}
                        </span>
                      </li>
                    )}
                  </ol>
                </div>

                {/* 3. BẢO CHỨNG BẢO VỆ NGƯỜI MUA NEXUS */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 text-xs text-emerald-950 flex items-start gap-2.5">
                  <ShieldCheck className="size-4 shrink-0 text-emerald-700 mt-0.5" />
                  <p className="leading-relaxed">
                    Đơn hàng được bảo vệ bởi chính sách <strong>Nexus Buyer Protection</strong>. Bạn
                    có quyền kiểm tra hàng trước khi nhận và yêu cầu hỗ trợ đối soát nếu phát sinh
                    khiếu nại.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Hộp thoại xác nhận hủy đơn chuẩn nghiệp vụ SRS */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogTitle className="text-lg font-bold text-stone-900">
            Xác nhận hủy đơn hàng #{order?.id}?
          </DialogTitle>
          <DialogDescription className="mt-2 text-xs leading-relaxed text-muted">
            {isPaid ? (
              <span className="text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 block">
                <strong>Lưu ý:</strong> Đơn hàng này đã được thanh toán. Sau khi bạn gửi yêu cầu
                hủy, hệ thống Nexus sẽ tiếp nhận và khởi tạo quy trình hoàn tiền theo chính sách đối
                soát.
              </span>
            ) : (
              'Đơn hàng sẽ được chuyển sang trạng thái đã hủy. Số lượng sản phẩm sẽ được tự động giải phóng trả lại kho.'
            )}
          </DialogDescription>
          <div className="mt-4">
            <label className="text-xs font-semibold text-stone-700 block">
              Lý do hủy đơn (không bắt buộc):
            </label>
            <textarea
              className="mt-1.5 w-full rounded-xl border border-line p-3 text-xs sm:text-sm focus:border-brand focus:outline-none"
              rows={3}
              placeholder="Nhập lý do bạn muốn hủy đơn hàng này..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl text-xs sm:text-sm"
              onClick={() => setCancelDialogOpen(false)}
            >
              Giữ lại đơn
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-red-600 text-white hover:bg-red-700 text-xs sm:text-sm font-semibold"
              disabled={cancelling}
              onClick={handleCancelOrder}
            >
              {cancelling ? 'Đang xử lý hủy…' : 'Xác nhận hủy đơn'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
