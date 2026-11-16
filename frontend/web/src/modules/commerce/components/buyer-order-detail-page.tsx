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
import { readAddresses } from '@/modules/user/utils/address-book';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { BuyerOrderConversationPanel } from './buyer-order-conversation-panel';
import {
  getOrderPaymentPresentation,
  type LivePaymentStatusSnapshot,
} from '../utils/order-payment-presentation';
import type {
  ComplaintCaseType,
  OrderConversationCaseSummary,
} from '../types/order-conversation.types';
import { useBuyerAssistant } from '@/modules/chat/context/buyer-assistant-provider';
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
  Printer,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Clock,
  RotateCcw,
  LifeBuoy,
  FileWarning,
  Info,
  MessageSquare,
} from 'lucide-react';

const CANCEL_REASON_PRESETS = [
  'Muốn thay đổi địa chỉ hoặc số điện thoại nhận hàng',
  'Muốn thay đổi sản phẩm hoặc số lượng trong đơn',
  'Tìm thấy sản phẩm khác phù hợp hơn',
  'Thủ tục thanh toán gặp trục trặc / Đặt nhầm phương thức',
  'Đổi ý, chưa có nhu cầu mua lúc này',
  'Lý do khác',
] as const;

const CONFIRMED_CASES_STORAGE_KEY = 'nexus-order-confirmed-cases-v1';

const CASE_TYPE_LABELS: Record<ComplaintCaseType, string> = {
  DAMAGED_ITEM: 'Báo hàng vỡ / Hư hỏng khi nhận',
  WRONG_ITEM: 'Giao sai mẫu / Thiếu phụ kiện',
  DELIVERY_ISSUE: 'Sự cố giao nhận / Vận đơn',
  OTHER: 'Yêu cầu trả hàng / Hoàn tiền',
};

const CASE_STATUS_LABELS: Record<OrderConversationCaseSummary['status'], string> = {
  OPEN: 'Đã tiếp nhận',
  INVESTIGATING: 'Đang xác minh',
  ESCALATED_DISPUTE: 'Đang giải quyết khiếu nại',
  RESOLVED: 'Đã xử lý xong',
  REJECTED: 'Đã từ chối',
};

function readConfirmedOrderCases(orderId: string): OrderConversationCaseSummary[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(CONFIRMED_CASES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is OrderConversationCaseSummary =>
      Boolean(item && typeof item === 'object' && String(item.orderId) === String(orderId)),
    );
  } catch {
    return [];
  }
}

function saveConfirmedOrderCase(
  created: OrderConversationCaseSummary,
): OrderConversationCaseSummary[] {
  if (typeof window === 'undefined') return [created];
  try {
    const raw = window.sessionStorage.getItem(CONFIRMED_CASES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const safeList: OrderConversationCaseSummary[] = Array.isArray(parsed) ? parsed : [];
    const next = [created, ...safeList.filter((c) => c.caseId !== created.caseId)].slice(0, 30);
    window.sessionStorage.setItem(CONFIRMED_CASES_STORAGE_KEY, JSON.stringify(next));
    return next.filter((c) => String(c.orderId) === String(created.orderId));
  } catch {
    return [created];
  }
}

export default function BuyerOrderDetailPage({ orderId }: { orderId: string }) {
  const { user, phase } = useSession();
  const { setPageOrderContext, collapseAssistant } = useBuyerAssistant();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState('');

  // Cancel Order state + FE Validation
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelPreset, setCancelPreset] = useState<string>('');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelValidationError, setCancelValidationError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Confirm Receipt state ("Tôi đã nhận hàng")
  const [confirmReceiptDialogOpen, setConfirmReceiptDialogOpen] = useState(false);
  const [confirmingReceipt, setConfirmingReceipt] = useState(false);
  const [confirmReceiptError, setConfirmReceiptError] = useState('');
  const [confirmReceiptNotice, setConfirmReceiptNotice] = useState('');

  // Hồ sơ khiếu nại / trả hàng đã được Fulfillment xác nhận (HTTP 201 + caseId thật)
  const [confirmedCases, setConfirmedCases] = useState<OrderConversationCaseSummary[]>([]);

  const [livePaymentStatus, setLivePaymentStatus] = useState<LivePaymentStatusSnapshot | null>(
    null,
  );
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [conversationTrigger, setConversationTrigger] = useState<{
    action: 'OPEN_SELLER' | 'OPEN_SUPPORT' | 'OPEN_CASE_MODAL' | 'ASK_AI_SHIPMENT';
    caseType?: ComplaintCaseType;
    nonce: number;
  } | null>(null);

  useEffect(() => {
    setPageOrderContext(user?.role === 'BUYER' ? order : null);
    return () => setPageOrderContext(null);
  }, [order, setPageOrderContext, user?.role]);

  useEffect(() => {
    if (cancelDialogOpen || confirmReceiptDialogOpen) {
      collapseAssistant();
    }
  }, [cancelDialogOpen, collapseAssistant, confirmReceiptDialogOpen]);

  useEffect(() => {
    if (!order || user?.role !== 'BUYER') return;
    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') return;
    const c = new AbortController();
    commerceApi
      .getPaymentStatus(order.internalId || order.id, c.signal)
      .then((res) => {
        if (!c.signal.aborted) setLivePaymentStatus(res);
      })
      .catch(() => {
        // Giữ nguyên dữ liệu đơn nếu BE chưa trả hoặc mạng gián đoạn
      });
    return () => c.abort();
  }, [order, user?.role]);

  useEffect(() => {
    setConfirmedCases(readConfirmedOrderCases(orderId));
  }, [orderId]);

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

  const openCancelDialog = () => {
    setCancelPreset('');
    setCancelReason('');
    setCancelValidationError('');
    setCancelDialogOpen(true);
  };

  const handleSelectCancelPreset = (preset: string) => {
    setCancelPreset(preset);
    if (preset !== 'Lý do khác') {
      setCancelReason(preset);
      setCancelValidationError('');
    } else {
      setCancelReason('');
    }
  };

  const handleCancelOrder = async () => {
    if (!order || cancelling) return;
    const trimmedReason = cancelReason.trim();
    if (!cancelPreset) {
      setCancelValidationError('Vui lòng chọn một nhóm lý do hủy đơn hàng.');
      return;
    }
    if (trimmedReason.length < 10) {
      setCancelValidationError(
        'Vui lòng nhập lý do hủy đơn rõ ràng (tối thiểu 10 ký tự, không chỉ gồm khoảng trắng).',
      );
      return;
    }
    if (trimmedReason.length > 500) {
      setCancelValidationError('Lý do hủy đơn không được vượt quá 500 ký tự.');
      return;
    }

    setCancelValidationError('');
    setCancelling(true);
    setError('');
    try {
      await commerceApi.cancelOrder(order.id, trimmedReason);
      setOrder((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null));
      setCancelDialogOpen(false);
      fetchOrderDetail();
    } catch (e) {
      setCancelValidationError(userMessage(e));
    } finally {
      setCancelling(false);
    }
  };

  const scrollToConversationSection = () => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('buyer-order-chat-section');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const triggerOrderComplaintFlow = (caseType: ComplaintCaseType) => {
    setConversationTrigger({
      action: 'OPEN_CASE_MODAL',
      caseType,
      nonce: Date.now(),
    });
  };

  const triggerSupportChat = () => {
    setConversationTrigger({
      action: 'OPEN_SUPPORT',
      nonce: Date.now(),
    });
    scrollToConversationSection();
  };

  const handleCaseCreated = (createdCase: OrderConversationCaseSummary) => {
    setConfirmedCases(saveConfirmedOrderCase(createdCase));
  };

  const handleConfirmReceipt = async () => {
    if (!order || confirmingReceipt) return;
    setConfirmingReceipt(true);
    setConfirmReceiptError('');
    try {
      const updated = await commerceApi.confirmReceipt(order.internalId || order.id);
      const confirmedAt = updated.buyerReceivedAt || new Date().toISOString();
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              status: updated.status || prev.status,
              buyerReceivedAt: confirmedAt,
            }
          : prev,
      );
      setConfirmReceiptDialogOpen(false);
      setConfirmReceiptNotice(
        'Đã xác nhận nhận hàng thành công. Nếu sau này phát sinh lỗi sản phẩm, bạn vẫn có thể gửi Yêu cầu trả hàng / Khiếu nại.',
      );
      fetchOrderDetail();
    } catch (e) {
      setConfirmReceiptError(userMessage(e));
    } finally {
      setConfirmingReceipt(false);
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
  const isRefunded = order?.status === 'REFUNDED';
  const isDelivered = order?.status === 'DELIVERED';
  const isShipped = order?.status === 'SHIPPED';
  const isPaid =
    !isCancelled && !isRefunded && (order?.status === 'PAID' || isShipped || isDelivered);
  const isPendingPayment =
    !isCancelled &&
    !isRefunded &&
    !isPaid &&
    (order?.status === 'PENDING_PAYMENT' ||
      order?.status === 'CREATED' ||
      order?.status === 'PENDING' ||
      order?.status === 'PLACED');
  const canCancel =
    user.role === 'BUYER' &&
    ['PENDING', 'PENDING_PAYMENT', 'CREATED', 'PLACED', 'PAID'].includes(order?.status ?? '');
  const canRequestReturn = user.role === 'BUYER' && isDelivered;
  const buyerReceivedAt = order?.buyerReceivedAt ?? null;
  const canConfirmReceipt =
    user.role === 'BUYER' && isDelivered && !buyerReceivedAt && !isCancelled && !isRefunded;
  const displayStatus = isCancelled ? 'CANCELLED' : isRefunded ? 'REFUNDED' : order?.status;

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

  // Phương thức & trạng thái thanh toán dùng chung quy tắc với màn "Đơn hàng của tôi"
  const paymentView = order ? getOrderPaymentPresentation(order, livePaymentStatus) : null;
  const isCod = paymentView ? paymentView.methodKind === 'COD' : order?.paymentMethod === 'COD';
  const effectiveIsPaid = paymentView ? paymentView.isPaid : isPaid;
  const paymentMethodTitle =
    paymentView?.methodLabel || (isCod ? 'Trả khi nhận hàng' : 'Chưa có thông tin thanh toán');

  // Các bước tiến trình chuẩn sàn TMĐT (Đặt đơn -> Thanh toán -> Vận chuyển -> Nhận hàng)
  const lifecycleSteps = [
    {
      key: 'PLACED',
      label: 'Đặt đơn hàng',
      sub: formattedCreatedDate,
      done: true,
      active: isPendingPayment,
    },
    {
      key: 'PAID',
      label: isCod ? 'Thu tiền khi nhận (COD)' : 'Thanh toán',
      sub: effectiveIsPaid
        ? isCod
          ? 'Đã thu tiền'
          : 'Đã thanh toán'
        : isCancelled
          ? 'Đã dừng'
          : isCod
            ? 'Trả khi nhận hàng'
            : 'Chưa hoàn tất',
      done: effectiveIsPaid || isRefunded,
      active: order?.status === 'PAID',
    },
    {
      key: 'SHIPPED',
      label: 'Đang giao hàng',
      sub: isDelivered
        ? 'Đã hoàn tất giao'
        : isShipped
          ? 'Đang luân chuyển'
          : isCancelled
            ? 'Không giao'
            : 'Đang chuẩn bị kiện',
      done: isShipped || isDelivered,
      active: isShipped,
    },
    {
      key: 'FINAL',
      label: isCancelled ? 'Đã hủy đơn' : isRefunded ? 'Đã hoàn tiền' : 'Giao thành công',
      sub: isCancelled
        ? 'Đơn đã đóng'
        : isRefunded
          ? 'Hoàn tiền hoàn tất'
          : isDelivered
            ? buyerReceivedAt
              ? `Đã xác nhận nhận (${new Date(buyerReceivedAt).toLocaleDateString('vi-VN')})`
              : 'Vận đơn đã giao · Chờ xác nhận'
            : 'Dự kiến tiêu chuẩn',
      done: isDelivered || isCancelled || isRefunded,
      active: isDelivered || isCancelled || isRefunded,
      isAlert: isCancelled || isRefunded,
    },
  ];

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
            {/* Header thông tin đơn hàng & Cụm nút hành động chuẩn sàn TMĐT */}
            <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
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
                    className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-50 transition"
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

              {/* Cụm nút hành động chính được nhóm theo vòng đời đơn hàng */}
              <div aria-label="Thao tác đơn hàng" className="flex flex-wrap items-center gap-2">
                {canConfirmReceipt && (
                  <Button
                    type="button"
                    className="h-10 rounded-xl bg-emerald-600 px-4 font-semibold text-white hover:bg-emerald-700 shadow-xs"
                    onClick={() => {
                      setConfirmReceiptError('');
                      setConfirmReceiptDialogOpen(true);
                    }}
                  >
                    <CheckCircle2 aria-hidden="true" className="mr-1.5 size-4" />
                    Tôi đã nhận hàng
                  </Button>
                )}

                {canRequestReturn && (
                  <Button
                    type="button"
                    variant={canConfirmReceipt ? 'outline' : 'default'}
                    className={`h-10 rounded-xl px-4 font-semibold ${
                      canConfirmReceipt
                        ? 'border-brand/40 bg-white text-brand-dark hover:bg-brand-soft/40'
                        : 'bg-brand-dark text-white hover:bg-brand-dark/90 shadow-xs'
                    }`}
                    onClick={() => triggerOrderComplaintFlow('OTHER')}
                  >
                    <RotateCcw aria-hidden="true" className="mr-1.5 size-4" />
                    Yêu cầu trả hàng / Hoàn tiền
                  </Button>
                )}

                {/* 2. Nhóm nút Hỗ trợ / Khiếu nại & In hóa đơn */}
                {user.role === 'BUYER' && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl border-line bg-white text-stone-700 hover:bg-stone-50"
                    onClick={() =>
                      triggerOrderComplaintFlow(isDelivered ? 'DAMAGED_ITEM' : 'DELIVERY_ISSUE')
                    }
                  >
                    <LifeBuoy aria-hidden="true" className="mr-1.5 size-4 text-brand-dark" />
                    Khiếu nại / Hỗ trợ
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.print()}
                  className="h-10 rounded-xl border-line bg-white text-stone-700 hover:bg-stone-50"
                >
                  <Printer className="mr-1.5 size-4 text-stone-500" />
                  In đơn
                </Button>

                {/* 3. Hành động Hủy đơn (Chỉ mở khi đơn chưa bàn giao vận chuyển) */}
                {canCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl border-red-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-300"
                    onClick={openCancelDialog}
                  >
                    <XCircle aria-hidden="true" className="mr-1.5 size-4" />
                    Hủy đơn hàng
                  </Button>
                )}
              </div>
            </div>

            {confirmReceiptNotice && (
              <div
                role="status"
                className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-950"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  <span>{confirmReceiptNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmReceiptNotice('')}
                  className="text-emerald-800 hover:underline font-semibold shrink-0"
                >
                  Đóng
                </button>
              </div>
            )}

            {/* Dải trạng thái tóm tắt */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line/70 bg-stone-50/70 px-4 py-3 text-xs">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-semibold text-stone-500">Trạng thái:</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 font-bold ${getOrderStatusBadgeClass(
                    displayStatus,
                    isCancelled,
                    effectiveIsPaid,
                  )}`}
                >
                  {paymentView?.orderStatusLabel || 'Đang xử lý'}
                </span>

                <span className="text-stone-300">•</span>

                <span className="inline-flex items-center gap-1 font-medium text-stone-700">
                  <CreditCard className="size-3.5 text-stone-400" />
                  <span
                    className={`font-semibold ${
                      effectiveIsPaid
                        ? 'text-emerald-700'
                        : paymentView?.moneyStatusTone === 'info'
                          ? 'text-sky-800'
                          : 'text-stone-700'
                    }`}
                  >
                    {paymentView
                      ? `${paymentView.methodLabel ? `${paymentView.methodLabel} · ` : ''}${paymentView.moneyStatusLabel}`
                      : isRefunded
                        ? 'Đã hoàn tiền'
                        : isPaid
                          ? 'Đã thanh toán'
                          : 'Đã ghi nhận'}
                  </span>
                </span>

                <span className="text-stone-300">•</span>

                <span className="inline-flex items-center gap-1 font-medium text-stone-700">
                  <Truck className="size-3.5 text-stone-400" />
                  <span>
                    Vận chuyển:{' '}
                    <strong className="text-stone-800 font-semibold">
                      {isDelivered
                        ? 'Giao thành công'
                        : isShipped
                          ? 'Đang giao hàng'
                          : isCancelled
                            ? 'Đã hủy giao'
                            : 'Đang chuẩn bị'}
                    </strong>
                  </span>
                </span>
              </div>

              <span className="text-[11px] text-muted">
                {canCancel
                  ? 'Đơn chưa bàn giao vận chuyển — bạn vẫn có thể yêu cầu hủy đơn.'
                  : isDelivered
                    ? buyerReceivedAt
                      ? `Bạn đã xác nhận nhận hàng lúc ${new Date(buyerReceivedAt).toLocaleString('vi-VN')}.`
                      : 'Vận đơn đã giao — vui lòng kiểm tra hàng và xác nhận Tôi đã nhận hàng.'
                    : isShipped
                      ? 'Đơn đang trên đường giao — chức năng tự hủy đã khóa.'
                      : ''}
              </span>
            </div>

            {/* DIỄN BIẾN ĐƠN HÀNG TOÀN CHIỀU RỘNG (Nằm ngay dưới thanh trạng thái theo đúng chuẩn SRS) */}
            <section
              aria-label="Diễn biến đơn hàng"
              className="mt-5 rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3.5">
                <h2 className="font-bold text-stone-900 text-base sm:text-lg flex items-center gap-2">
                  <Clock className="size-4 text-brand-dark" />
                  Diễn biến đơn hàng
                </h2>
                <span className="text-xs text-muted">
                  Cập nhật theo thời gian thực từ hệ thống giao dịch & vận vận Nexus
                </span>
              </div>

              {/* Thanh 4 bước tiến trình tổng quan */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {lifecycleSteps.map((step, idx) => (
                  <div
                    key={step.key}
                    className={`rounded-xl border p-3 transition ${
                      step.isAlert
                        ? 'border-red-200 bg-red-50/50'
                        : step.done
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : 'border-line bg-stone-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-stone-500">Bước {idx + 1}</span>
                      {step.isAlert ? (
                        <XCircle className="size-4 text-red-600" />
                      ) : step.done ? (
                        <CheckCircle2 className="size-4 text-emerald-600" />
                      ) : (
                        <Clock className="size-4 text-stone-400" />
                      )}
                    </div>
                    <strong className="mt-1 block text-xs sm:text-sm font-bold text-stone-900">
                      {step.label}
                    </strong>
                    <span className="mt-0.5 block text-[11px] text-muted">{step.sub}</span>
                  </div>
                ))}
              </div>

              {/* Chi tiết mốc thời gian và ghi chú từ đơn */}
              <ol className="mt-5 grid gap-4 border-t border-line/60 pt-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {order.timeline && order.timeline.length > 0 ? (
                  order.timeline.map((s, i) => (
                    <li
                      key={`${s.timestamp}-${i}`}
                      className="relative pl-5 border-l-2 border-brand/40 pb-1"
                    >
                      <span className="absolute -left-[5px] top-1.5 size-2 rounded-full bg-brand" />
                      <strong className="block text-stone-900 font-semibold text-xs sm:text-sm">
                        {formatOrderStatus(s.title || s.status)}
                      </strong>
                      <span className="mt-0.5 block text-xs text-muted">
                        {new Date(s.timestamp).toLocaleString('vi-VN')}
                      </span>
                      {s.note && (
                        <p className="mt-1 text-xs text-stone-600 leading-relaxed">{s.note}</p>
                      )}
                    </li>
                  ))
                ) : (
                  <li className="relative pl-5 border-l-2 border-brand/40">
                    <span className="absolute -left-[5px] top-1.5 size-2 rounded-full bg-brand" />
                    <strong className="block text-stone-900 font-semibold text-xs sm:text-sm">
                      Đơn hàng được khởi tạo thành công
                    </strong>
                    <span className="mt-0.5 block text-xs text-muted">{formattedCreatedDate}</span>
                    <p className="mt-1 text-xs text-stone-600">
                      Hệ thống đã ghi nhận snapshot sản phẩm, giá bán và địa chỉ nhận hàng.
                    </p>
                  </li>
                )}
              </ol>
            </section>

            {/* TRUNG TÂM NHẮN TIN ĐƠN HÀNG (SELLER / SUPPORT) & TRỢ LÝ NEXUS (AI) & HỒ SƠ KHIẾU NẠI */}
            {user.role === 'BUYER' && (
              <BuyerOrderConversationPanel
                order={order}
                recipientName={recipientName}
                recipientPhone={recipientPhone}
                onCaseCreated={handleCaseCreated}
                externalTrigger={conversationTrigger}
              />
            )}

            {/* BỐ CỤC 2 CỘT CHÍNH - PHỤ THEO CHUẨN SRS */}
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

                    <div className="flex flex-wrap items-center gap-2">
                      {user.role === 'BUYER' && (
                        <button
                          type="button"
                          onClick={() => {
                            setConversationTrigger({
                              action: 'OPEN_SELLER',
                              nonce: Date.now(),
                            });
                            scrollToConversationSection();
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-brand/30 bg-brand/5 px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand/10 transition"
                        >
                          <MessageSquare className="size-3.5" />
                          <span>Nhắn người bán</span>
                        </button>
                      )}
                      <Link
                        href={`/products?sellerId=${encodeURIComponent(order.sellerId || '')}`}
                        className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
                      >
                        <span>Xem gian hàng</span>
                        <ExternalLink className="size-3 text-stone-400" />
                      </Link>
                    </div>
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
                          {isDelivered
                            ? 'Đã giao thành công'
                            : isShipped
                              ? 'Đang trên đường giao'
                              : isCancelled
                                ? 'Đã hủy vận đơn'
                                : 'Người bán đang đóng gói'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CỘT PHỤ (BÊN PHẢI): Bảng phân tách tiền hàng, Trung tâm Hỗ trợ/Trả hàng/Khiếu nại, Bảo chứng Nexus */}
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

                  {/* Thông tin phương thức & tình trạng tiền */}
                  <div className="mt-5 rounded-xl bg-stone-50 p-3.5 border border-line/60 text-xs space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted">Phương thức:</span>
                      <span className="font-semibold text-stone-900 text-right">
                        {paymentMethodTitle}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-line/50 pt-2">
                      <span className="text-muted">Tình trạng tiền:</span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          effectiveIsPaid
                            ? 'bg-emerald-100 text-emerald-800'
                            : paymentView?.moneyStatusTone === 'info'
                              ? 'bg-sky-100 text-sky-900'
                              : 'bg-stone-200/80 text-stone-700'
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            effectiveIsPaid
                              ? 'bg-emerald-600'
                              : paymentView?.moneyStatusTone === 'info'
                                ? 'bg-sky-600'
                                : 'bg-stone-500'
                          }`}
                        />
                        {paymentView?.moneyStatusLabel ||
                          (isPaid ? 'Đã thanh toán' : 'Đã ghi nhận')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. TRUNG TÂM THAO TÁC HẬU MÃI & HỖ TRỢ ĐƠN HÀNG (Gắn thẳng quy trình Fulfillment & Support) */}
                {user.role === 'BUYER' && (
                  <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-xs">
                    <h2 className="font-bold text-stone-900 text-sm sm:text-base border-b border-line pb-3 flex items-center gap-2">
                      <LifeBuoy className="size-4 text-brand-dark" />
                      Hỗ trợ & Quyền lợi sau thanh toán
                    </h2>

                    <div className="mt-3.5 space-y-3 text-xs">
                      {/* Quy tắc điều kiện theo trạng thái hiện tại */}
                      <div className="rounded-xl bg-stone-50 border border-line/70 p-3 space-y-1.5 text-stone-700 leading-relaxed">
                        <div className="flex items-start gap-2">
                          <Info className="size-3.5 text-brand-dark shrink-0 mt-0.5" />
                          <span>
                            {canCancel
                              ? isPaid
                                ? 'Đơn đã thanh toán và đang chờ chuẩn bị: Bạn có thể hủy đơn. Hệ thống sẽ ghi nhận lý do và chuyển sang đối soát hoàn tiền.'
                                : 'Đơn chưa bàn giao vận chuyển: Bạn có thể hủy đơn trực tiếp và tồn kho sẽ được hoàn lại.'
                              : isDelivered
                                ? buyerReceivedAt
                                  ? 'Bạn đã xác nhận nhận hàng. Nếu phát sinh lỗi kỹ thuật hoặc hư hỏng, bạn vẫn có thể mở hồ sơ trả hàng / khiếu nại.'
                                  : 'Vận đơn đã giao thành công: Hãy kiểm tra kiện hàng và bấm Tôi đã nhận hàng, hoặc mở hồ sơ trả hàng / khiếu nại nếu có vấn đề.'
                                : isShipped
                                  ? 'Kiện hàng đang trên đường giao: Không thể tự hủy đơn. Nếu phát sinh sự cố giao nhận, hãy mở hồ sơ Khiếu nại hoặc nhắn Hỗ trợ.'
                                  : 'Đơn hàng đã đóng. Bạn vẫn có thể nhắn Bộ phận Hỗ trợ nếu cần đối soát thanh toán.'}
                          </span>
                        </div>
                      </div>

                      {isDelivered && buyerReceivedAt && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-[11px] font-medium text-emerald-900 flex items-center gap-2">
                          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
                          <span>
                            Đã xác nhận nhận hàng lúc{' '}
                            {new Date(buyerReceivedAt).toLocaleString('vi-VN')}
                          </span>
                        </div>
                      )}

                      {canConfirmReceipt && (
                        <Button
                          type="button"
                          className="w-full h-9 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold justify-center"
                          onClick={() => {
                            setConfirmReceiptError('');
                            setConfirmReceiptDialogOpen(true);
                          }}
                        >
                          <CheckCircle2 className="mr-1.5 size-3.5" />
                          Tôi đã nhận hàng
                        </Button>
                      )}

                      {/* Nhóm nút thống nhất nối thẳng vào quy trình Fulfillment & Support */}
                      <div className="grid gap-2 pt-1 sm:grid-cols-2">
                        {canRequestReturn ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 rounded-xl border-brand/40 text-brand-dark hover:bg-brand-soft/40 text-xs font-semibold justify-center"
                            onClick={() => triggerOrderComplaintFlow('OTHER')}
                          >
                            <RotateCcw className="mr-1.5 size-3.5" />
                            Yêu cầu trả hàng
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 rounded-xl border-line text-stone-700 hover:bg-stone-50 text-xs font-semibold justify-center"
                            onClick={triggerSupportChat}
                          >
                            <MessageSquare className="mr-1.5 size-3.5 text-brand-dark" />
                            Nhắn Bộ phận Hỗ trợ
                          </Button>
                        )}

                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 rounded-xl border-line text-stone-700 hover:bg-stone-50 text-xs font-semibold justify-center"
                          onClick={() =>
                            triggerOrderComplaintFlow(
                              isDelivered ? 'DAMAGED_ITEM' : 'DELIVERY_ISSUE',
                            )
                          }
                        >
                          <FileWarning className="mr-1.5 size-3.5 text-brand-dark" />
                          Báo hàng vỡ / Khiếu nại
                        </Button>
                      </div>

                      {/* Danh sách hồ sơ đã được Fulfillment tiếp nhận (chỉ hiển thị khi BE trả HTTP 201 + caseId thật) */}
                      {confirmedCases.length > 0 && (
                        <div className="mt-3 space-y-2 border-t border-line pt-3">
                          <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            Hồ sơ hỗ trợ đã gửi cho đơn #{order.id}
                          </span>
                          {confirmedCases.map((c) => (
                            <div
                              key={c.caseId}
                              className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-[11px] font-bold text-brand-dark">
                                  {c.caseId}
                                </span>
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                                  {CASE_STATUS_LABELS[c.status] || 'Đã tiếp nhận'}
                                </span>
                              </div>
                              <p className="font-semibold text-stone-900">
                                {CASE_TYPE_LABELS[c.type] || c.type}
                              </p>
                              {c.items.length > 0 && (
                                <p className="text-[11px] text-stone-600">
                                  Sản phẩm:{' '}
                                  {c.items
                                    .map((it) => `${it.productName} (x${it.quantity})`)
                                    .join(', ')}
                                </p>
                              )}
                              <p className="text-[11px] text-muted line-clamp-2">{c.description}</p>
                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[10px] text-muted">
                                  {new Date(c.createdAt).toLocaleString('vi-VN')}
                                </span>
                                <button
                                  type="button"
                                  onClick={triggerSupportChat}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-dark hover:underline"
                                >
                                  <MessageSquare className="size-3" />
                                  <span>Theo dõi trong chat Hỗ trợ</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

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

      {/* HỘP THOẠI 1: XÁC NHẬN HỦY ĐƠN HÀNG (CÓ FE VALIDATION BẮT BUỘC CHỌN & NHẬP LÝ DO HỢP LỆ) */}
      <Dialog
        open={cancelDialogOpen}
        onOpenChange={(open) => {
          if (!cancelling) {
            setCancelDialogOpen(open);
            if (!open) setCancelValidationError('');
          }
        }}
      >
        <DialogContent className="max-w-lg p-6">
          <DialogTitle className="text-lg font-bold text-stone-900">
            Xác nhận hủy đơn hàng #{order?.id}?
          </DialogTitle>
          <DialogDescription className="mt-2 text-xs leading-relaxed text-muted">
            {isPaid ? (
              <span className="text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-200 block">
                <strong>Lưu ý đơn đã thanh toán:</strong> Sau khi xác nhận hủy, đơn hàng chuyển sang
                trạng thái Đã hủy và khởi tạo yêu cầu đối soát hoàn tiền về phương thức thanh toán
                ban đầu của bạn.
              </span>
            ) : (
              'Đơn hàng sẽ được chuyển sang trạng thái Đã hủy. Số lượng tồn kho của sản phẩm sẽ được giải phóng ngay lập tức.'
            )}
          </DialogDescription>

          <div className="mt-4 space-y-3">
            <div>
              <span className="text-xs font-semibold text-stone-800 block mb-2">
                1. Chọn nhóm lý do hủy đơn <span className="text-red-600">*</span>
              </span>
              <div className="grid gap-1.5">
                {CANCEL_REASON_PRESETS.map((preset) => {
                  const selected = cancelPreset === preset;
                  return (
                    <label
                      key={preset}
                      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-xs cursor-pointer transition ${
                        selected
                          ? 'border-brand bg-brand-soft/30 font-semibold text-stone-900'
                          : 'border-line bg-white text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="cancel-reason-preset"
                        className="accent-brand-dark"
                        checked={selected}
                        onChange={() => handleSelectCancelPreset(preset)}
                      />
                      <span>{preset}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="cancel-reason-input"
                  className="text-xs font-semibold text-stone-800 block"
                >
                  2. Chi tiết lý do hủy đơn <span className="text-red-600">*</span>
                </label>
                <span className="text-[11px] text-muted">
                  {cancelReason.trim().length}/500 ký tự
                </span>
              </div>
              <textarea
                id="cancel-reason-input"
                aria-invalid={Boolean(cancelValidationError)}
                aria-describedby={cancelValidationError ? 'cancel-reason-error' : undefined}
                className={`mt-1.5 w-full rounded-xl border p-3 text-xs sm:text-sm focus:outline-none ${
                  cancelValidationError
                    ? 'border-red-400 bg-red-50/30 focus:border-red-500'
                    : 'border-line bg-white focus:border-brand'
                }`}
                rows={3}
                maxLength={500}
                placeholder="Nhập cụ thể lý do hủy đơn (tối thiểu 10 ký tự)..."
                value={cancelReason}
                onChange={(e) => {
                  setCancelReason(e.target.value);
                  if (cancelValidationError) setCancelValidationError('');
                }}
              />
            </div>

            {cancelValidationError && (
              <p
                id="cancel-reason-error"
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 flex items-center gap-1.5"
              >
                <AlertCircle className="size-4 shrink-0 text-red-600" />
                <span>{cancelValidationError}</span>
              </p>
            )}
          </div>

          <div className="mt-5 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              disabled={cancelling}
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

      {/* HỘP THOẠI 2: XÁC NHẬN ĐÃ NHẬN HÀNG */}
      <Dialog
        open={confirmReceiptDialogOpen}
        onOpenChange={(open) => {
          if (!confirmingReceipt) {
            setConfirmReceiptDialogOpen(open);
            if (!open) setConfirmReceiptError('');
          }
        }}
      >
        <DialogContent className="max-w-md p-6">
          <DialogTitle className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-600" />
            <span>Xác nhận đã nhận được hàng?</span>
          </DialogTitle>
          <DialogDescription className="mt-2 text-xs leading-relaxed text-muted">
            Bạn xác nhận đã nhận kiện hàng cho đơn{' '}
            <strong className="font-mono text-stone-900">#{order?.id}</strong> và đã kiểm tra ngoại
            quan cơ bản.
          </DialogDescription>

          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-950 leading-relaxed">
            Nếu sau khi mở hộp phát sinh lỗi kỹ thuật, thiếu phụ kiện hoặc hư hỏng bên trong, bạn
            vẫn có thể gửi <strong>Yêu cầu trả hàng / Khiếu nại</strong> ngay trên trang đơn hàng
            này.
          </div>

          {confirmReceiptError && (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 flex items-start gap-2"
            >
              <AlertCircle className="size-4 shrink-0 text-red-600 mt-0.5" />
              <span>{confirmReceiptError}</span>
            </p>
          )}

          <div className="mt-5 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              disabled={confirmingReceipt}
              className="rounded-xl text-xs sm:text-sm"
              onClick={() => setConfirmReceiptDialogOpen(false)}
            >
              Kiểm tra lại
            </Button>
            <Button
              type="button"
              disabled={confirmingReceipt}
              className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs sm:text-sm font-semibold"
              onClick={handleConfirmReceipt}
            >
              {confirmingReceipt ? 'Đang ghi nhận…' : 'Xác nhận đã nhận hàng'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
