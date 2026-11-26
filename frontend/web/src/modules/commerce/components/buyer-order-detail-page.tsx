'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { StoreHeader } from '@/components/layout/store-header';
import { Button } from '@/components/ui/button';
import { commerceApi } from '../api/commerce.api';
import { catalogApi } from '@/modules/catalog/api/catalog.api';
import type { OrderDetail } from '../types/order.types';
import {
  canOpenPostDeliveryCase,
  formatOrderStatus,
  getOrderStatusBadgeClass,
} from '../utils/order-status';
import { requestApi } from '@/lib/axios/api-client';
import { unwrap, userMessage } from '@/lib/axios/http';
import { useSession } from '@/modules/auth/hooks/use-session';
import { readAddresses } from '@/modules/user/utils/address-book';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { BuyerOrderConversationPanel } from './buyer-order-conversation-panel';
import { BuyerOrderReviewCard } from './buyer-order-review-card';
import { AuctionOrderSourceBanner } from './auction-order-badge';
import {
  getOrderPaymentPresentation,
  type LivePaymentStatusSnapshot,
} from '../utils/order-payment-presentation';
import type {
  ComplaintCaseType,
  OrderConversationCaseSummary,
  OrderDisputeVerdict,
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
  Info,
  MessageSquare,
  ShoppingBag,
} from 'lucide-react';
import { isSimulationModeEnabled, orderConversationsApi } from '../api/order-conversations.api';

const CANCEL_REASON_PRESETS = [
  'Muốn thay đổi địa chỉ hoặc số điện thoại nhận hàng',
  'Muốn thay đổi sản phẩm hoặc số lượng trong đơn',
  'Tìm thấy sản phẩm khác phù hợp hơn',
  'Thủ tục thanh toán gặp trục trặc / Đặt nhầm phương thức',
  'Đổi ý, chưa có nhu cầu mua lúc này',
  'Lý do khác',
] as const;

const CONFIRMED_CASES_STORAGE_PREFIX = 'nexus-order-confirmed-cases-v2';

const CASE_TYPE_LABELS: Record<ComplaintCaseType, string> = {
  DAMAGED_ITEM: 'Báo hàng vỡ / Hư hỏng khi nhận',
  WRONG_ITEM: 'Giao sai mẫu / Thiếu phụ kiện',
  DELIVERY_ISSUE: 'Sự cố giao nhận / Chưa nhận hàng',
  RETURN_REQUEST: 'Yêu cầu trả hàng / Hoàn tiền',
  OTHER: 'Khiếu nại khác',
};

const CASE_STATUS_LABELS: Record<OrderConversationCaseSummary['status'], string> = {
  OPEN: 'Đã tiếp nhận',
  INVESTIGATING: 'Đang xác minh',
  ESCALATED_DISPUTE: 'Đang giải quyết khiếu nại',
  RESOLVED: 'Đã xử lý xong',
  REJECTED: 'Đã từ chối',
};

function getCaseStorageKey(buyerId: string): string {
  return `${CONFIRMED_CASES_STORAGE_PREFIX}:${buyerId}`;
}

function readConfirmedOrderCases(
  orderIdentifiers: string | string[],
  buyerId?: string,
): OrderConversationCaseSummary[] {
  if (typeof window === 'undefined' || !buyerId) return [];
  const candidates = new Set(
    (Array.isArray(orderIdentifiers) ? orderIdentifiers : [orderIdentifiers])
      .map((v) => String(v || '').trim())
      .filter(Boolean),
  );
  try {
    const raw = window.sessionStorage.getItem(getCaseStorageKey(buyerId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is OrderConversationCaseSummary =>
      Boolean(
        item &&
        typeof item === 'object' &&
        (candidates.has(String(item.orderId)) ||
          (item.orderCode && candidates.has(String(item.orderCode)))) &&
        (!item.buyerId || item.buyerId === buyerId),
      ),
    );
  } catch {
    return [];
  }
}

function saveConfirmedOrderCase(
  created: OrderConversationCaseSummary,
  buyerId?: string,
): OrderConversationCaseSummary[] {
  const ownerId = created.buyerId || buyerId;
  if (typeof window === 'undefined' || !ownerId) return [created];
  try {
    const storageKey = getCaseStorageKey(ownerId);
    const raw = window.sessionStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    const safeList: OrderConversationCaseSummary[] = Array.isArray(parsed) ? parsed : [];
    const record: OrderConversationCaseSummary = { ...created, buyerId: ownerId };
    const next = [record, ...safeList.filter((c) => c.caseId !== record.caseId)].slice(0, 30);
    window.sessionStorage.setItem(storageKey, JSON.stringify(next));
    return next.filter((c) => String(c.orderId) === String(record.orderId));
  } catch {
    return [created];
  }
}

function mergeOrderCases(
  serverCases: OrderConversationCaseSummary[],
  localCases: OrderConversationCaseSummary[],
): OrderConversationCaseSummary[] {
  const byId = new Map<string, OrderConversationCaseSummary>();
  for (const local of localCases) {
    byId.set(local.caseId, local);
  }
  for (const srv of serverCases) {
    const prev = byId.get(srv.caseId);
    byId.set(srv.caseId, {
      ...(prev || srv),
      ...srv,
      items: srv.items.length > 0 ? srv.items : prev?.items || [],
      description: srv.description || prev?.description || '',
      contactPhone: srv.contactPhone || prev?.contactPhone || '',
      refundRequestStatus: prev?.refundRequestStatus,
      refundRequestError: prev?.refundRequestError,
    });
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function readDemoDisputeVerdict(orderIds: string[], buyerId: string): OrderDisputeVerdict | null {
  if (typeof window === 'undefined' || !buyerId) return null;
  for (const id of orderIds) {
    const cleanId = String(id || '').trim();
    if (!cleanId) continue;
    try {
      const raw = window.localStorage.getItem(`nexus_dispute_verdict_${cleanId}`);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') continue;
      if (parsed.buyerId && String(parsed.buyerId) !== buyerId) continue;
      if (parsed.orderId && !orderIds.includes(String(parsed.orderId))) continue;
      const decision =
        typeof parsed.decision === 'string' ? parsed.decision.trim().toUpperCase() : '';
      const note = typeof parsed.note === 'string' ? parsed.note.trim() : '';
      const rawAmount = parsed.refundAmount;
      const refundAmount =
        typeof rawAmount === 'number' && Number.isFinite(rawAmount)
          ? rawAmount
          : typeof rawAmount === 'string' &&
              rawAmount.trim() !== '' &&
              Number.isFinite(Number(rawAmount))
            ? Number(rawAmount)
            : null;
      if (!decision && !note) continue;
      return {
        decision,
        note,
        refundAmount,
        refundChannel: typeof parsed.refundChannel === 'string' ? parsed.refundChannel : null,
        issuedAt: typeof parsed.issuedAt === 'string' ? parsed.issuedAt : null,
      };
    } catch {
      // Bỏ qua JSON demo hỏng
    }
  }
  return null;
}

function isCaseStillOpen(c: OrderConversationCaseSummary): boolean {
  return ['OPEN', 'INVESTIGATING', 'ESCALATED_DISPUTE'].includes(c.status) && !c.verdict?.decision;
}

function pickPrimaryDisputeCase(
  cases: OrderConversationCaseSummary[],
): OrderConversationCaseSummary | null {
  if (!cases.length) return null;
  const openCases = cases
    .filter(isCaseStillOpen)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (openCases.length > 0) return openCases[0];

  const sortedByUpdate = [...cases].sort((a, b) => {
    const tsA = new Date(
      a.verdict?.issuedAt || a.resolvedAt || a.updatedAt || a.createdAt,
    ).getTime();
    const tsB = new Date(
      b.verdict?.issuedAt || b.resolvedAt || b.updatedAt || b.createdAt,
    ).getTime();
    return tsB - tsA;
  });
  return sortedByUpdate[0] || null;
}

function formatVndAmount(amount: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(amount))}đ`;
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
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [casesError, setCasesError] = useState('');
  const [reviewRevision, setReviewRevision] = useState(0);
  const [returnCarrier, setReturnCarrier] = useState('GHN');
  const [returnTrackingCode, setReturnTrackingCode] = useState('');
  const [returnNote, setReturnNote] = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnNotice, setReturnNotice] = useState('');
  const [returnError, setReturnError] = useState('');
  const [retryingRefundCaseId, setRetryingRefundCaseId] = useState('');
  const [renewingPayosLink, setRenewingPayosLink] = useState(false);

  const [livePaymentStatus, setLivePaymentStatus] = useState<LivePaymentStatusSnapshot | null>(
    null,
  );
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [invoiceMeta, setInvoiceMeta] = useState<{
    invoiceCode: string;
    issuedAt: string;
    loading: boolean;
    error?: string;
  } | null>(null);
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
    if (typeof window === 'undefined' || !order) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'invoice') {
      setReceiptOpen(true);
    }
  }, [order]);

  useEffect(() => {
    if (!receiptOpen || !order) return;
    const targetId = order.internalId || order.id;
    let active = true;
    setInvoiceMeta((prev) =>
      prev && prev.invoiceCode ? prev : { invoiceCode: '', issuedAt: '', loading: true },
    );
    requestApi(`/orders/${encodeURIComponent(targetId)}/invoice`)
      .then((raw) => {
        if (!active) return;
        const data = unwrap<{ invoiceCode?: string; issuedAt?: string }>(raw);
        setInvoiceMeta({
          invoiceCode: String(data?.invoiceCode || ''),
          issuedAt: String(data?.issuedAt || ''),
          loading: false,
        });
      })
      .catch((err) => {
        if (!active) return;
        setInvoiceMeta({
          invoiceCode: '',
          issuedAt: '',
          loading: false,
          error: userMessage(err),
        });
      });
    return () => {
      active = false;
    };
  }, [receiptOpen, order]);

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
        if (c.signal.aborted) return;
        setLivePaymentStatus(res);
        // Nếu getPaymentStatus vừa đồng bộ đơn từ PENDING_PAYMENT sang PAID, cập nhật ngay state đơn hàng
        const liveOrdSt = (res.orderStatus || '').toUpperCase();
        const livePaySt = (res.paymentStatus || '').toUpperCase();
        if (
          (liveOrdSt === 'PAID' || livePaySt === 'PAID' || livePaySt === 'SUCCEEDED') &&
          order.status === 'PENDING_PAYMENT'
        ) {
          setOrder((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'PAID',
                  orderStatus: 'PAID',
                  paymentStatus: 'PAID',
                }
              : prev,
          );
          if (order.auctionId) {
            void requestApi(`/auctions/${encodeURIComponent(order.auctionId)}`).catch(() => {});
          }
        }
      })
      .catch(() => {
        // Giữ nguyên dữ liệu đơn nếu BE chưa trả hoặc mạng gián đoạn
      });
    return () => c.abort();
  }, [order, user?.role]);

  const loadOrderCases = useCallback(
    async (signal?: AbortSignal) => {
      if (!user?.id || user.role !== 'BUYER' || !order) {
        if (!user?.id || user.role !== 'BUYER') {
          setConfirmedCases([]);
          setCasesError('');
        }
        return;
      }

      const candidateIds = Array.from(
        new Set(
          [order?.id, order?.internalId, orderId]
            .map((v) => String(v || '').trim())
            .filter(Boolean),
        ),
      );
      const res = await orderConversationsApi.listOrderCases(candidateIds, user.id, signal);
      if (signal?.aborted) return;
      const localCases = readConfirmedOrderCases(candidateIds, user.id);

      if (res.errorMessage) {
        setCasesError('Chưa tải được kết quả · Thử lại');
      } else {
        setCasesError('');
      }

      let merged = res.unavailable ? localCases : mergeOrderCases(res.cases, localCases);

      // Ưu tiên dữ liệu API; chỉ dùng khóa demo local nếu chưa có phán quyết từ BE
      const demoVerdict = isSimulationModeEnabled()
        ? readDemoDisputeVerdict(candidateIds, user.id)
        : null;
      if (demoVerdict && merged.length > 0 && !merged.some((c) => Boolean(c.verdict?.decision))) {
        const target = pickPrimaryDisputeCase(merged);
        if (target) {
          merged = merged.map((c) =>
            c.caseId === target.caseId
              ? {
                  ...c,
                  status: demoVerdict.decision === 'REJECT_BUYER' ? 'REJECTED' : 'RESOLVED',
                  verdict: demoVerdict,
                  resolutionSummary: demoVerdict.note || c.resolutionSummary,
                }
              : c,
          );
        }
      }

      setConfirmedCases(merged);
    },
    [order?.id, order?.internalId, orderId, user?.id, user?.role],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const cid = params.get('caseId')?.trim();
    if (cid) setSelectedCaseId(cid);
  }, [orderId]);

  useEffect(() => {
    const c = new AbortController();
    void loadOrderCases(c.signal);
    return () => c.abort();
  }, [loadOrderCases]);

  const fetchOrderDetail = useCallback(
    (signal?: AbortSignal) => {
      if (phase === 'loading' || !user || (user.role !== 'BUYER' && user.role !== 'SELLER')) return;
      commerceApi
        .getOrder(orderId, signal)
        .then(setOrder)
        .catch((e) => {
          if (!signal?.aborted) setError(userMessage(e));
        });
    },
    [orderId, phase, user],
  );

  useEffect(() => {
    const c = new AbortController();
    fetchOrderDetail(c.signal);
    return () => c.abort();
  }, [fetchOrderDetail]);

  // Chỉ đồng bộ lại khi người dùng thực sự rời tab > 60 giây rồi quay lại (tránh spam request khi click chuyển cửa sổ)
  useEffect(() => {
    if (typeof window === 'undefined' || user?.role !== 'BUYER') return;
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
      } else if (
        document.visibilityState === 'visible' &&
        hiddenAt > 0 &&
        Date.now() - hiddenAt > 60_000
      ) {
        hiddenAt = 0;
        fetchOrderDetail();
        void loadOrderCases();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchOrderDetail, loadOrderCases, user?.role]);

  // Tải hình ảnh sản phẩm đại diện từ Catalog API nếu đơn hàng chưa có imageUrl sẵn
  useEffect(() => {
    if (!order?.items?.length) return;
    const missingItems = order.items.filter(
      (it) => !it.imageUrl && !(it.productId in productImages),
    );
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

  const handlePayNowWithPayOs = async () => {
    if (!order || renewingPayosLink) return;
    const targetOrderId = order.internalId || order.id;
    try {
      sessionStorage.setItem('nexus-pending-payos-order', targetOrderId);
      if (order.auctionId) {
        sessionStorage.setItem('nexus-pending-payos-auction', order.auctionId);
      }
    } catch {
      // Ignore storage errors
    }

    const existingUrl = livePaymentStatus?.checkoutUrl?.trim();
    if (existingUrl && /^https?:\/\//i.test(existingUrl)) {
      window.location.assign(existingUrl);
      return;
    }

    setRenewingPayosLink(true);
    setError('');
    try {
      const linkRes = await commerceApi.getPaymentLink(targetOrderId, true);
      if (linkRes?.checkoutUrl && /^https?:\/\//i.test(linkRes.checkoutUrl)) {
        window.location.assign(linkRes.checkoutUrl);
        return;
      }
      setError('Không thể khởi tạo liên kết thanh toán PayOS lúc này. Vui lòng thử lại.');
    } catch (e) {
      setError(userMessage(e));
    } finally {
      setRenewingPayosLink(false);
    }
  };

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
    if (!canOpenCase) return;
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
    saveConfirmedOrderCase(createdCase, user?.id);
    setConfirmedCases((previous) => [
      createdCase,
      ...previous.filter((c) => c.caseId !== createdCase.caseId),
    ]);
    if (typeof window !== 'undefined') {
      const disputePayload = {
        orderId: String(order?.id || createdCase.orderId),
        orderCode: order?.orderCode || String(order?.id || createdCase.orderId),
        caseId: createdCase.caseId,
        customer:
          recipientName && recipientName !== '—' ? recipientName : order?.buyer || 'Tran Che Thien',
        type: CASE_TYPE_LABELS[createdCase.type] || createdCase.type,
        reason: createdCase.description,
        status: 'PENDING',
        createdAt: createdCase.createdAt || new Date().toISOString(),
      };
      localStorage.setItem(
        `nexus_order_dispute_${createdCase.orderId}`,
        JSON.stringify(disputePayload),
      );
      if (order?.id) {
        localStorage.setItem(`nexus_order_dispute_${order.id}`, JSON.stringify(disputePayload));
      }
      if (order?.orderCode) {
        localStorage.setItem(
          `nexus_order_dispute_${order.orderCode}`,
          JSON.stringify(disputePayload),
        );
      }
      window.dispatchEvent(new Event('storage'));
    }
  };

  const handleRetryRefundFromCard = async (c: OrderConversationCaseSummary) => {
    if (!order || retryingRefundCaseId) return;
    setRetryingRefundCaseId(c.caseId);
    try {
      await commerceApi.requestRefund(
        order.internalId || order.id,
        `[${c.caseId}] ${c.description}`,
      );
      const updated: OrderConversationCaseSummary = {
        ...c,
        refundRequestStatus: 'SUBMITTED',
        refundRequestError: undefined,
      };
      handleCaseCreated(updated);
    } catch (e) {
      const updated: OrderConversationCaseSummary = {
        ...c,
        refundRequestStatus: 'FAILED',
        refundRequestError: userMessage(e),
      };
      handleCaseCreated(updated);
    } finally {
      setRetryingRefundCaseId('');
    }
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
        'Đã xác nhận nhận hàng thành công. Bạn có thể đánh giá người bán và sản phẩm ngay bên dưới.',
      );
      setReviewRevision((v) => v + 1);
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
  const isDelivered = canOpenPostDeliveryCase(order?.status);
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
  const hasOpenComplaint =
    user.role === 'BUYER' && !isCancelled && !isRefunded && confirmedCases.some(isCaseStillOpen);
  const isRefundApprovedPending =
    user.role === 'BUYER' &&
    !isCancelled &&
    !isRefunded &&
    confirmedCases.some((c) => c.verdict?.decision === 'REFUND_BUYER');
  const primaryDisputeCase =
    user.role === 'BUYER'
      ? selectedCaseId
        ? (confirmedCases.find((c) => c.caseId === selectedCaseId) ??
          pickPrimaryDisputeCase(confirmedCases))
        : pickPrimaryDisputeCase(confirmedCases)
      : null;

  const scrollToSection = (sectionId: string) => {
    if (typeof document === 'undefined') return;
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmitReturnTracking = async (caseId: string) => {
    if (!returnTrackingCode.trim() || returnSubmitting) return;
    setReturnSubmitting(true);
    setReturnError('');
    setReturnNotice('');
    try {
      await orderConversationsApi.submitReturnShipment(caseId, {
        carrier: returnCarrier.trim(),
        trackingCode: returnTrackingCode.trim(),
        note: returnNote.trim() || undefined,
      });
      setReturnNotice(`Đã ghi nhận mã vận đơn hoàn trả ${returnTrackingCode.trim()}.`);
      setReturnTrackingCode('');
      setReturnNote('');
      await loadOrderCases();
    } catch (e) {
      setReturnError(userMessage(e));
    } finally {
      setReturnSubmitting(false);
    }
  };

  const canCancel =
    user.role === 'BUYER' &&
    ['PENDING', 'PENDING_PAYMENT', 'CREATED', 'PLACED', 'PAID'].includes(order?.status ?? '');
  const canOpenCase = user.role === 'BUYER' && isDelivered && !hasOpenComplaint;
  const canRequestReturn = user.role === 'BUYER' && isDelivered && !hasOpenComplaint;
  const buyerReceivedAt = order?.buyerReceivedAt ?? null;
  const canConfirmReceipt =
    user.role === 'BUYER' &&
    order?.status === 'DELIVERED' &&
    !buyerReceivedAt &&
    !isCancelled &&
    !isRefunded;
  const displayStatus = isCancelled
    ? 'CANCELLED'
    : isRefunded
      ? 'REFUNDED'
      : hasOpenComplaint
        ? 'REFUND_REQUESTED'
        : isRefundApprovedPending
          ? 'APPROVED_REFUND'
          : order?.status;

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

  // Các bước tiến trình chuẩn sàn TMĐT (Đặt đơn -> Thanh toán -> Vận chuyển -> Nhận hàng -> Giải quyết khiếu nại nếu mở/duyệt hoàn)
  const lifecycleSteps: Array<{
    key: string;
    label: string;
    sub: string;
    done: boolean;
    active: boolean;
    isAlert?: boolean;
  }> = [
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
      active: false,
      isAlert: isCancelled || isRefunded,
    },
    ...(hasOpenComplaint || isRefundApprovedPending
      ? [
          {
            key: 'DISPUTE',
            label: hasOpenComplaint ? 'Đang giải quyết khiếu nại' : 'Đã duyệt hoàn tiền',
            sub: hasOpenComplaint ? 'Trọng tài đang đối soát' : 'Chờ hệ thống hoàn tiền',
            done: false,
            active: true,
            isAlert: false,
          },
        ]
      : []),
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
                  CHI TIẾT ĐƠN HÀNG
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
                <div className="mt-2.5">
                  <AuctionOrderSourceBanner order={order} />
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
                    onClick={() => triggerOrderComplaintFlow('RETURN_REQUEST')}
                  >
                    <RotateCcw aria-hidden="true" className="mr-1.5 size-4" />
                    Yêu cầu trả hàng / Hoàn tiền
                  </Button>
                )}

                {user.role === 'BUYER' && isDelivered && !hasOpenComplaint && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => scrollToSection('order-review-section')}
                    className="h-10 rounded-xl border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100"
                  >
                    Đánh giá đơn hàng
                  </Button>
                )}

                {(effectiveIsPaid || isDelivered) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setReceiptOpen(true)}
                    className="h-10 rounded-xl border-line bg-white text-stone-700 hover:bg-stone-50"
                  >
                    <Receipt className="mr-1.5 size-4 text-brand-dark" />
                    Xem biên nhận
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

                {/* 2. Hành động Thanh toán VietQR PayOS cho đơn đang chờ thanh toán */}
                {user.role === 'BUYER' &&
                  isPendingPayment &&
                  !effectiveIsPaid &&
                  !isCod &&
                  !livePaymentStatus?.expired && (
                    <Button
                      type="button"
                      disabled={renewingPayosLink}
                      onClick={() => void handlePayNowWithPayOs()}
                      className="h-10 rounded-xl bg-emerald-700 px-4 font-semibold text-white hover:bg-emerald-800 shadow-xs disabled:opacity-70"
                    >
                      <CreditCard aria-hidden="true" className="mr-1.5 size-4" />
                      {renewingPayosLink ? 'Đang tạo mã QR PayOS…' : 'Thanh toán VietQR PayOS'}
                    </Button>
                  )}

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
                tabIndex={-1}
                className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-950"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  <span>{confirmReceiptNotice}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => scrollToSection('order-review-section')}
                    className="rounded-lg bg-emerald-700 px-3 py-1.5 font-semibold text-white hover:bg-emerald-800"
                  >
                    Đánh giá đơn hàng ngay
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReceiptNotice('')}
                    className="text-emerald-800 hover:underline font-semibold"
                  >
                    Đóng
                  </button>
                </div>
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
                  {hasOpenComplaint
                    ? 'Đang giải quyết khiếu nại'
                    : isRefundApprovedPending
                      ? 'Đã duyệt hoàn tiền'
                      : paymentView?.orderStatusLabel || 'Đang xử lý'}
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
                {hasOpenComplaint
                  ? 'Đơn hàng đang có hồ sơ khiếu nại chờ phân xử.'
                  : isRefundApprovedPending
                    ? 'Đã duyệt hoàn tiền — chờ hệ thống cập nhật giao dịch hoàn.'
                    : canCancel
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

            {/* THẺ PHÁN QUYẾT & KHIẾU NẠI Ở ĐẦU TRANG (D1-D5: chọn theo caseId, tách Quyết định vs Tiến độ hoàn tiền, form mã vận đơn hoàn trả) */}
            {user.role === 'BUYER' && (primaryDisputeCase || casesError) && (
              <section
                id="order-dispute-section"
                aria-label="Trạng thái khiếu nại và phán quyết"
                className="mt-5 scroll-mt-24 space-y-3"
              >
                {confirmedCases.length > 1 && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-stone-600">
                      Hồ sơ khiếu nại của đơn ({confirmedCases.length}):
                    </span>
                    {confirmedCases.map((c) => {
                      const active = primaryDisputeCase?.caseId === c.caseId;
                      return (
                        <button
                          key={c.caseId}
                          type="button"
                          onClick={() => setSelectedCaseId(c.caseId)}
                          className={`rounded-full border px-3 py-1 font-mono text-[11px] font-semibold transition ${
                            active
                              ? 'border-stone-900 bg-stone-900 text-white'
                              : 'border-line bg-white text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          {c.caseId}
                        </button>
                      );
                    })}
                  </div>
                )}

                {casesError && !primaryDisputeCase && (
                  <div
                    role="alert"
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50/70 px-4 py-3 text-xs font-medium text-red-800"
                  >
                    <span>{casesError}</span>
                    <button
                      type="button"
                      onClick={() => void loadOrderCases()}
                      className="font-bold underline underline-offset-2 hover:text-red-950"
                    >
                      Thử lại
                    </button>
                  </div>
                )}

                {primaryDisputeCase &&
                  (() => {
                    const v = primaryDisputeCase.verdict;
                    const decision = (v?.decision || '').toUpperCase();
                    const isOpen = isCaseStillOpen(primaryDisputeCase);

                    let toneBox = 'border-amber-300 bg-amber-50/70 text-amber-950';
                    let toneBadge = 'bg-amber-100 text-amber-900 border-amber-300';
                    let heading = 'Đã tiếp nhận · Đang xử lý';
                    // D5: Chỉ hiển thị hạn SLA khi server trả mốc thực tế
                    let detailText = primaryDisputeCase.slaDeadlineAt
                      ? `Hồ sơ đang được Trọng tài tiếp nhận và đối soát bằng chứng (hạn dự kiến: ${new Date(primaryDisputeCase.slaDeadlineAt).toLocaleString('vi-VN')}).`
                      : 'Hồ sơ đã được tiếp nhận và đang trong hàng đợi đối soát bằng chứng.';

                    if (decision === 'REFUND_BUYER') {
                      toneBox = 'border-emerald-300 bg-emerald-50/75 text-emerald-950';
                      toneBadge = 'bg-emerald-100 text-emerald-900 border-emerald-300';
                      heading = 'Chấp thuận hoàn tiền';
                      const amountText =
                        typeof v?.refundAmount === 'number' && Number.isFinite(v.refundAmount)
                          ? `Mức hoàn được duyệt: ${formatVndAmount(v.refundAmount)}${v.refundChannel ? ` qua ${v.refundChannel}` : ''}.`
                          : 'Mức hoàn đang được đối soát với hệ thống thanh toán.';
                      const noteText = v?.note ? ` Căn cứ: ${v.note}.` : '';
                      detailText = `${amountText}${noteText}`;
                    } else if (decision === 'REJECT_BUYER') {
                      toneBox = 'border-red-300 bg-red-50/75 text-red-950';
                      toneBadge = 'bg-red-100 text-red-900 border-red-300';
                      heading = 'Bác bỏ khiếu nại';
                      detailText = `Khiếu nại không được chấp thuận.${v?.note ? ` Căn cứ: ${v.note}.` : ''}`;
                    } else if (decision === 'REQUIRE_RETURN_FIRST') {
                      toneBox = 'border-amber-300 bg-amber-50/75 text-amber-950';
                      toneBadge = 'bg-amber-100 text-amber-900 border-amber-300';
                      heading = 'Cần trả hàng trước khi hoàn tiền';
                      detailText = v?.note
                        ? `Hướng dẫn hoàn trả: ${v.note}`
                        : 'Chờ hướng dẫn địa chỉ hoàn trả từ Bộ phận Hỗ trợ.';
                    } else if (!isOpen) {
                      toneBox = 'border-stone-300 bg-stone-50 text-stone-900';
                      toneBadge = 'bg-white text-stone-800 border-stone-300';
                      heading =
                        primaryDisputeCase.status === 'REJECTED'
                          ? 'Đã đóng · Bác bỏ'
                          : 'Đã xử lý xong';
                      detailText = primaryDisputeCase.resolutionSummary || 'Hồ sơ đã đóng.';
                    }

                    return (
                      <div
                        className={`rounded-2xl border p-4 sm:p-5 shadow-xs space-y-3 ${toneBox}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="text-sm sm:text-base font-bold">{heading}</strong>
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-bold ${toneBadge}`}
                            >
                              {primaryDisputeCase.caseId}
                            </span>
                            {/* D3: Tách bạch Tiến độ hoàn tiền với Quyết định trọng tài */}
                            {decision === 'REFUND_BUYER' && (
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                                  isRefunded
                                    ? 'border-emerald-400 bg-emerald-600 text-white'
                                    : 'border-amber-300 bg-white text-amber-900'
                                }`}
                              >
                                {isRefunded ? 'Tiền: Đã hoàn' : 'Tiền: Đã duyệt · Chờ hoàn'}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => void loadOrderCases()}
                            className="text-xs font-semibold underline underline-offset-2"
                          >
                            Làm mới kết quả
                          </button>
                        </div>

                        <p className="text-xs sm:text-sm leading-relaxed font-medium">
                          {detailText}
                        </p>

                        {/* D4: Form gửi mã vận đơn trả hàng khi phán quyết là REQUIRE_RETURN_FIRST */}
                        {decision === 'REQUIRE_RETURN_FIRST' && !isRefunded && (
                          <div className="rounded-xl border border-amber-200 bg-white p-3.5 text-xs text-stone-900 space-y-2.5">
                            <p className="font-semibold">
                              Gửi mã vận đơn trả hàng để xác nhận hoàn tiền
                            </p>
                            <div className="grid gap-2 sm:grid-cols-3">
                              <input
                                type="text"
                                value={returnCarrier}
                                onChange={(e) => setReturnCarrier(e.target.value)}
                                placeholder="Đơn vị vận chuyển (VD: GHN)"
                                className="h-9 rounded-lg border border-line px-2.5 text-xs"
                              />
                              <input
                                type="text"
                                value={returnTrackingCode}
                                onChange={(e) => setReturnTrackingCode(e.target.value)}
                                placeholder="Mã vận đơn trả hàng *"
                                className="h-9 rounded-lg border border-line px-2.5 text-xs"
                              />
                              <input
                                type="text"
                                value={returnNote}
                                onChange={(e) => setReturnNote(e.target.value)}
                                placeholder="Ghi chú gửi hàng (tùy chọn)"
                                className="h-9 rounded-lg border border-line px-2.5 text-xs"
                              />
                            </div>
                            {returnError && (
                              <p className="font-medium text-red-700">{returnError}</p>
                            )}
                            {returnNotice && (
                              <p className="font-medium text-emerald-800">{returnNotice}</p>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              disabled={returnSubmitting || !returnTrackingCode.trim()}
                              onClick={() =>
                                void handleSubmitReturnTracking(primaryDisputeCase.caseId)
                              }
                              className="h-9 rounded-lg bg-emerald-700 px-3.5 text-xs font-semibold text-white hover:bg-emerald-800"
                            >
                              {returnSubmitting ? 'Đang gửi…' : 'Gửi mã vận đơn trả hàng'}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
              </section>
            )}

            {/* DIỄN BIẾN ĐƠN HÀNG TOÀN CHIỀU RỘNG (Nằm ngay dưới thanh trạng thái theo đúng chuẩn SRS) */}
            <section
              aria-label="Diễn biến đơn hàng"
              className="mt-5 rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100 shadow-2xs">
                    <Clock className="size-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-stone-900 text-base sm:text-lg">
                      Diễn biến & Hành trình đơn hàng
                    </h2>
                    <p className="text-xs text-muted mt-0.5">
                      Cập nhật thời gian thực theo tiến trình giao dịch & đối tác vận chuyển Nexus
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    Đồng bộ trực tiếp
                  </span>
                </div>
              </div>

              {/* Thanh tiến trình đơn hàng nằm ngang (4 bước chuẩn hoặc 5 bước khi có khiếu nại / hoàn tiền) */}
              {(() => {
                const activeStepIdx = lifecycleSteps.findIndex((s) => s.active);
                return (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50/70 to-white p-5 sm:p-6 shadow-xs">
                    <div className="flex items-center justify-between mb-5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Tiến trình đơn hàng
                      </span>
                      {activeStepIdx !== -1 && (
                        <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-md border border-sky-200/60">
                          Bước {activeStepIdx + 1}/{lifecycleSteps.length}:{' '}
                          {lifecycleSteps[activeStepIdx]?.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-start overflow-x-auto pb-2 pt-1 gap-2">
                      {lifecycleSteps.map((step, idx) => {
                        const isCurrent = step.active && !step.isAlert;
                        const isDone = step.done && !isCurrent && !step.isAlert;
                        const isLineActive =
                          isDone || (activeStepIdx !== -1 && idx < activeStepIdx);

                        const StepIcon =
                          idx === 0
                            ? ShoppingBag
                            : idx === 1
                              ? CreditCard
                              : idx === 2
                                ? Truck
                                : idx === 3
                                  ? step.isAlert
                                    ? AlertCircle
                                    : CheckCircle2
                                  : LifeBuoy;

                        return (
                          <div
                            key={step.key}
                            className="relative flex-1 min-w-[140px] flex flex-col items-center text-center px-2 group"
                          >
                            {idx < lifecycleSteps.length - 1 && (
                              <div
                                aria-hidden="true"
                                className="absolute top-4 left-[calc(50%+22px)] right-[calc(-50%+22px)] h-0.5 rounded-full overflow-hidden bg-slate-200 z-0"
                              >
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    step.isAlert
                                      ? 'bg-red-400'
                                      : isLineActive
                                        ? 'bg-gradient-to-r from-emerald-500 to-sky-500'
                                        : 'bg-transparent'
                                  }`}
                                />
                              </div>
                            )}
                            <span
                              className={`relative z-10 flex size-9 items-center justify-center rounded-xl text-xs font-bold transition-all duration-200 ${
                                step.isAlert
                                  ? 'bg-red-600 text-white ring-4 ring-red-100 shadow-sm'
                                  : isCurrent
                                    ? 'bg-sky-600 text-white ring-4 ring-sky-100 shadow-md scale-105'
                                    : isDone
                                      ? 'bg-slate-800 text-white shadow-xs'
                                      : 'border-2 border-slate-200 bg-white text-slate-400'
                              }`}
                            >
                              {isDone ? (
                                <Check className="size-4 stroke-[2.5]" />
                              ) : (
                                <StepIcon className="size-4" />
                              )}
                            </span>
                            <strong
                              className={`mt-2.5 block text-xs sm:text-sm font-semibold transition ${
                                step.isAlert
                                  ? 'text-red-700'
                                  : isCurrent
                                    ? 'text-sky-700'
                                    : isDone
                                      ? 'text-slate-800'
                                      : 'text-slate-400'
                              }`}
                            >
                              {step.label}
                            </strong>
                            <span
                              className={`mt-0.5 block text-[11px] leading-tight ${
                                isCurrent
                                  ? 'text-sky-600 font-medium'
                                  : isDone
                                    ? 'text-slate-500'
                                    : 'text-slate-400'
                              }`}
                            >
                              {step.sub}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Nhật ký cập nhật trạng thái (Lưới thẻ ngang trực quan, thân thiện, không nằm dọc) */}
              {(() => {
                const parseTimelineEntry = (
                  rawTitleOrStatus: string,
                  rawNote?: string,
                  timestamp?: string | Date,
                ) => {
                  const text = (rawTitleOrStatus || '').toUpperCase().trim();
                  const note = (rawNote || '').trim();

                  let title = 'Cập nhật tiến trình';
                  let description = note || 'Hệ thống Nexus ghi nhận tiến trình đơn hàng.';
                  let iconKind:
                    'ORDER' | 'PROCESSING' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED' | 'REFUND' =
                    'ORDER';
                  let carrierBadge: string | null = null;

                  if (/ghn/i.test(note)) carrierBadge = 'GHN Express';
                  else if (/ghtk/i.test(note)) carrierBadge = 'GHTK';
                  else if (/viettel/i.test(note)) carrierBadge = 'Viettel Post';
                  else if (/vnpost/i.test(note)) carrierBadge = 'VNPost';

                  if (
                    text.includes('TẠO') ||
                    text.includes('CREATED') ||
                    text.includes('PLACED') ||
                    text.includes('ĐẶT HÀNG')
                  ) {
                    title = 'Khởi tạo đơn hàng thành công';
                    description = 'Đơn hàng đã được ghi nhận trên hệ thống sàn Nexus và chờ xử lý.';
                    iconKind = 'ORDER';
                  } else if (
                    text.includes('PROCESSING') ||
                    text.includes('ĐANG XỬ LÝ') ||
                    text.includes('ĐANG_XỬ_LÝ')
                  ) {
                    title = 'Xác nhận đơn & Đang chuẩn bị hàng';
                    description = carrierBadge
                      ? `Đối tác ${carrierBadge} đã tiếp nhận thông tin và đang điều phối nhân viên lấy kiện.`
                      : note || 'Người bán đang kiểm tra hàng hóa, đóng gói và sẵn sàng bàn giao.';
                    iconKind = 'PROCESSING';
                  } else if (
                    text.includes('SHIPPED') ||
                    text.includes('IN_TRANSIT') ||
                    text.includes('DELIVERING') ||
                    text.includes('ĐANG GIAO') ||
                    text.includes('ĐANG_GIAO')
                  ) {
                    title = 'Bưu tá đang vận chuyển đơn hàng';
                    description = carrierBadge
                      ? `Bưu tá ${carrierBadge} đang luân chuyển kiện hàng đến địa chỉ nhận của bạn.`
                      : note || 'Kiện hàng đang được bưu tá chuyển phát tới bạn.';
                    iconKind = 'SHIPPING';
                  } else if (
                    text.includes('DELIVERED') ||
                    text.includes('COMPLETED') ||
                    text.includes('ĐÃ GIAO') ||
                    text.includes('ĐÃ_GIAO')
                  ) {
                    title = 'Giao hàng thành công';
                    description =
                      note || 'Kiện hàng đã được phát tận tay người nhận an toàn, nguyên vẹn.';
                    iconKind = 'DELIVERED';
                  } else if (
                    text.includes('CANCELLED') ||
                    text.includes('CANCELED') ||
                    text.includes('ĐÃ HỦY')
                  ) {
                    title = 'Đơn hàng đã được hủy';
                    description = note || 'Đơn hàng đã dừng tiến trình xử lý theo yêu cầu.';
                    iconKind = 'CANCELLED';
                  } else if (text.includes('REFUND') || text.includes('HOÀN TIỀN')) {
                    title = 'Xử lý hoàn tiền hoàn tất';
                    description = note || 'Khoản thanh toán đã được hoàn trả về tài khoản nguồn.';
                    iconKind = 'REFUND';
                  } else {
                    title = formatOrderStatus(rawTitleOrStatus);
                    if (note) description = note;
                  }

                  let formattedTime = '';
                  if (timestamp) {
                    try {
                      const d = new Date(timestamp);
                      if (!isNaN(d.getTime())) {
                        const hh = String(d.getHours()).padStart(2, '0');
                        const mm = String(d.getMinutes()).padStart(2, '0');
                        const ss = String(d.getSeconds()).padStart(2, '0');
                        const dd = String(d.getDate()).padStart(2, '0');
                        const mo = String(d.getMonth() + 1).padStart(2, '0');
                        const yyyy = d.getFullYear();
                        formattedTime = `${hh}:${mm}:${ss} · ${dd}/${mo}/${yyyy}`;
                      }
                    } catch {
                      formattedTime = String(timestamp);
                    }
                  }

                  return { title, description, formattedTime, iconKind, carrierBadge };
                };

                const rawTimeline = order.timeline || [];
                const filteredTimeline = rawTimeline.filter((s, i, arr) => {
                  if (i === 0) return true;
                  const prev = arr[i - 1];
                  return (
                    (s.title || s.status) !== (prev.title || prev.status) ||
                    (s.note || '') !== (prev.note || '')
                  );
                });

                const effectiveList =
                  filteredTimeline.length > 0
                    ? filteredTimeline
                    : [
                        {
                          title: 'Đơn hàng được khởi tạo thành công',
                          status: 'PLACED',
                          note: 'Hệ thống đã ghi nhận sản phẩm, giá bán và địa chỉ nhận hàng.',
                          timestamp: order.createdAt || new Date(),
                        },
                      ];

                return (
                  <div className="mt-6 border-t border-slate-200/80 pt-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          Nhật ký hành trình đơn hàng
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                          {effectiveList.length} mốc cập nhật
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                        Trình bày ngang theo trình tự thời gian
                      </span>
                    </div>

                    {/* Dàn thẻ ngang dạng Responsive Grid đa cột, rộng rãi và cực kỳ dễ nhìn */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {effectiveList.map((s, i) => {
                        const isLatest = i === effectiveList.length - 1;
                        const parsed = parseTimelineEntry(s.title || s.status, s.note, s.timestamp);

                        const IconComponent =
                          parsed.iconKind === 'ORDER'
                            ? ShoppingBag
                            : parsed.iconKind === 'PROCESSING'
                              ? Package
                              : parsed.iconKind === 'SHIPPING'
                                ? Truck
                                : parsed.iconKind === 'DELIVERED'
                                  ? CheckCircle2
                                  : parsed.iconKind === 'CANCELLED'
                                    ? XCircle
                                    : RotateCcw;

                        return (
                          <div
                            key={`${s.timestamp}-${i}`}
                            className={`relative rounded-xl border p-4 transition-all duration-200 flex flex-col justify-between ${
                              isLatest
                                ? 'bg-gradient-to-br from-sky-50/90 via-white to-sky-50/40 border-sky-300 shadow-sm ring-1 ring-sky-200'
                                : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
                            }`}
                          >
                            {/* Header Card: Icon + Mốc thứ tự + Badge Mới nhất / Carrier */}
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`flex size-8 items-center justify-center rounded-lg ${
                                    isLatest
                                      ? 'bg-sky-600 text-white shadow-2xs'
                                      : parsed.iconKind === 'ORDER'
                                        ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200'
                                        : parsed.iconKind === 'PROCESSING'
                                          ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-200'
                                          : parsed.iconKind === 'SHIPPING'
                                            ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200'
                                            : parsed.iconKind === 'DELIVERED'
                                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                              : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  <IconComponent className="size-4" />
                                </span>
                                <span className="text-[11px] font-bold text-slate-400 font-mono">
                                  Mốc #{i + 1}
                                </span>
                              </div>

                              {isLatest ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-600 text-white shadow-2xs">
                                  <span className="size-1.5 rounded-full bg-white animate-ping" />
                                  Mới nhất
                                </span>
                              ) : (
                                parsed.carrierBadge && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                    {parsed.carrierBadge}
                                  </span>
                                )
                              )}
                            </div>

                            {/* Title & Desc */}
                            <div className="mb-3">
                              <h4
                                className={`text-sm font-bold leading-snug ${
                                  isLatest ? 'text-sky-950' : 'text-slate-800'
                                }`}
                              >
                                {parsed.title}
                              </h4>
                              <p className="mt-1 text-xs text-slate-600 leading-relaxed line-clamp-2">
                                {parsed.description}
                              </p>
                            </div>

                            {/* Footer Card: Thời gian ghi nhận */}
                            <div className="mt-auto pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                              <span className="flex items-center gap-1.5 text-slate-500 font-mono">
                                <Clock className="size-3 text-slate-400" />
                                {parsed.formattedTime}
                              </span>
                              {isLatest && parsed.carrierBadge && (
                                <span className="font-semibold text-sky-700 bg-sky-100/80 px-1.5 py-0.5 rounded text-[10px]">
                                  {parsed.carrierBadge}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </section>

            {/* TRUNG TÂM NHẮN TIN ĐƠN HÀNG (SELLER / SUPPORT) & TRỢ LÝ NEXUS (AI) & HỒ SƠ KHIẾU NẠI */}
            {user.role === 'BUYER' && (
              <BuyerOrderConversationPanel
                key={order.internalId || order.id}
                canOpenCase={canOpenCase}
                hasActiveCase={hasOpenComplaint}
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
                        <p className="text-xs text-muted mt-0.5">Gian hàng đối tác đã xác minh</p>
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
                    <span className="text-xs text-muted">Giá đã chốt lúc đặt đơn</span>
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
                          {[order.shippingCarrier, order.shippingServiceName]
                            .filter(Boolean)
                            .join(' · ') || 'Nexus Express · Giao hàng tiêu chuẩn'}
                        </strong>
                        {order.estimatedDeliveryAt && (
                          <span className="mt-0.5 block text-[11px] text-emerald-700">
                            Dự kiến giao:{' '}
                            {new Date(order.estimatedDeliveryAt).toLocaleDateString('vi-VN')}
                          </span>
                        )}
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

                {/* Đánh giá người bán & sản phẩm sau khi giao hoàn tất */}
                <BuyerOrderReviewCard
                  order={order}
                  buyerId={user.id}
                  buyerRole={user.role}
                  hasActiveDispute={confirmedCases.some(isCaseStillOpen)}
                  revision={reviewRevision}
                  onViewDispute={(cid) => {
                    if (cid) setSelectedCaseId(cid);
                    scrollToSection('order-dispute-section');
                  }}
                />
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
                        <span className="flex items-center gap-1.5">
                          <span>Giảm giá / Voucher</span>
                          {order.promoCode && (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-800 border border-emerald-200">
                              {order.promoCode}
                            </span>
                          )}
                        </span>
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

                  {(effectiveIsPaid || isDelivered) && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setReceiptOpen(true)}
                      className="mt-4 min-h-11 w-full rounded-xl border-stone-300 text-xs font-semibold text-stone-800"
                    >
                      <Receipt className="mr-1.5 size-4" aria-hidden="true" />
                      Xem biên nhận điện tử
                    </Button>
                  )}
                </div>

                {/* 2. HỒ SƠ HỖ TRỢ & XÁC NHẬN NHẬN HÀNG (Chỉ hiển thị khi có dữ liệu thực, bỏ nút/chữ trùng với thanh trao đổi) */}
                {user.role === 'BUYER' &&
                  (confirmedCases.length > 0 || (isDelivered && buyerReceivedAt)) && (
                    <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-xs">
                      <h2 className="font-bold text-stone-900 text-sm sm:text-base border-b border-line pb-3 flex items-center gap-2">
                        <LifeBuoy className="size-4 text-brand-dark" />
                        Hồ sơ đơn hàng
                      </h2>

                      <div className="mt-3.5 space-y-3 text-xs">
                        {isDelivered && buyerReceivedAt && (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-[11px] font-medium text-emerald-900 flex items-center gap-2">
                            <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
                            <span>
                              Đã xác nhận nhận hàng lúc{' '}
                              {new Date(buyerReceivedAt).toLocaleString('vi-VN')}
                            </span>
                          </div>
                        )}

                        {/* Danh sách hồ sơ đã được Fulfillment tiếp nhận */}
                        {confirmedCases.length > 0 && (
                          <div className="space-y-2.5">
                            <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
                              Hồ sơ hỗ trợ của đơn #{order.id}
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
                                <p className="text-[11px] text-muted line-clamp-2">
                                  {c.description}
                                </p>
                                {c.verdict?.decision ? (
                                  <div className="rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-[11px] text-stone-800 space-y-1">
                                    <strong className="block font-semibold text-stone-900">
                                      {c.verdict.decision === 'REFUND_BUYER'
                                        ? `Chấp thuận hoàn tiền${
                                            typeof c.verdict.refundAmount === 'number' &&
                                            Number.isFinite(c.verdict.refundAmount)
                                              ? ` (${formatVndAmount(c.verdict.refundAmount)}${
                                                  c.verdict.refundChannel
                                                    ? ` qua ${c.verdict.refundChannel}`
                                                    : ''
                                                })`
                                              : ' (Số tiền hoàn đang được cập nhật)'
                                          }`
                                        : c.verdict.decision === 'REJECT_BUYER'
                                          ? 'Bác bỏ khiếu nại'
                                          : c.verdict.decision === 'REQUIRE_RETURN_FIRST'
                                            ? 'Cần trả hàng trước khi hoàn tiền'
                                            : 'Kết luận phán quyết'}
                                    </strong>
                                    {c.verdict.note && (
                                      <p className="text-stone-700">Căn cứ: {c.verdict.note}</p>
                                    )}
                                  </div>
                                ) : (
                                  c.resolutionSummary && (
                                    <p className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-[11px] text-stone-800">
                                      <strong className="font-semibold">Kết quả xử lý:</strong>{' '}
                                      {c.resolutionSummary}
                                    </p>
                                  )
                                )}
                                {c.refundRequestStatus === 'SUBMITTED' && (
                                  <p className="text-[11px] font-medium text-emerald-800">
                                    ✓ Đã đồng bộ yêu cầu hoàn tiền sang hệ thống đơn hàng.
                                  </p>
                                )}
                                {c.refundRequestStatus === 'FAILED' && (
                                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 space-y-1.5">
                                    <p className="text-[11px] text-amber-950 font-medium">
                                      Bước gửi yêu cầu hoàn tiền sang đơn hàng chưa thành công
                                      {c.refundRequestError ? `: ${c.refundRequestError}` : '.'}
                                    </p>
                                    <button
                                      type="button"
                                      disabled={retryingRefundCaseId === c.caseId}
                                      onClick={() => void handleRetryRefundFromCard(c)}
                                      className="inline-flex items-center gap-1 rounded-lg border border-amber-400 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-950 hover:bg-amber-100"
                                    >
                                      <RotateCcw className="size-3" />
                                      <span>
                                        {retryingRefundCaseId === c.caseId
                                          ? 'Đang gửi lại...'
                                          : 'Thử gửi lại hoàn tiền'}
                                      </span>
                                    </button>
                                  </div>
                                )}
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
                                    <span>Mở chat Hỗ trợ</span>
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

      {/* Dialog Biên nhận điện tử khớp snapshot đơn hàng */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-lg p-6 sm:p-7">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-stone-950">
            <Receipt className="size-5 text-brand-dark" aria-hidden="true" />
            Hóa đơn &amp; biên nhận Nexus
          </DialogTitle>
          <DialogDescription className="mt-1 text-xs text-stone-500">
            Chứng từ điện tử lưu trữ theo bản ghi thanh toán của đơn hàng.
          </DialogDescription>

          {order && (
            <div className="mt-4 space-y-4 text-sm">
              <div className="rounded-xl border border-line bg-stone-50 p-4 text-xs space-y-1.5">
                {invoiceMeta?.invoiceCode ? (
                  <div className="flex justify-between gap-2 pb-1 border-b border-line">
                    <span className="text-muted">Số hóa đơn điện tử:</span>
                    <strong className="font-mono text-brand-dark">{invoiceMeta.invoiceCode}</strong>
                  </div>
                ) : invoiceMeta?.loading ? (
                  <div className="flex justify-between gap-2 pb-1 border-b border-line text-muted">
                    <span>Số hóa đơn điện tử:</span>
                    <span>Đang đồng bộ…</span>
                  </div>
                ) : null}
                {invoiceMeta?.issuedAt && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted">Ngày phát hành:</span>
                    <strong className="tabular-nums text-stone-900">
                      {new Date(invoiceMeta.issuedAt).toLocaleString('vi-VN')}
                    </strong>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <span className="text-muted">Mã đơn hàng:</span>
                  <strong className="font-mono text-stone-900">
                    {order.orderCode || order.id}
                  </strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted">Ngày tạo đơn:</span>
                  <strong className="tabular-nums text-stone-900">
                    {new Date(order.createdAt).toLocaleString('vi-VN')}
                  </strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted">Người mua:</span>
                  <strong className="text-stone-900">{order.buyer || user?.fullName}</strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted">Gian hàng:</span>
                  <strong className="text-stone-900">{order.seller || 'Gian hàng Nexus'}</strong>
                </div>
                {order.paymentTransactionId && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted">Mã giao dịch:</span>
                    <strong className="font-mono text-stone-900">
                      {order.paymentTransactionId}
                    </strong>
                  </div>
                )}
              </div>

              <ul className="divide-y divide-line border-y border-line py-1 text-xs">
                {order.items.map((item, idx) => (
                  <li
                    key={`${item.productId}-${idx}`}
                    className="flex justify-between gap-3 py-2.5"
                  >
                    <span className="text-stone-800">
                      {item.productName} × {item.quantity}
                    </span>
                    <strong className="shrink-0 tabular-nums text-stone-950">
                      {new Intl.NumberFormat('vi-VN').format(item.totalPrice)} ₫
                    </strong>
                  </li>
                ))}
              </ul>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Tiền hàng:</span>
                  <span className="tabular-nums font-medium">
                    {new Intl.NumberFormat('vi-VN').format(subtotal)} ₫
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Phí vận chuyển:</span>
                  <span className="tabular-nums font-medium">
                    {shippingFee > 0
                      ? `${new Intl.NumberFormat('vi-VN').format(shippingFee)} ₫`
                      : 'Miễn phí'}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Giảm giá:</span>
                    <span className="tabular-nums font-medium">
                      -{new Intl.NumberFormat('vi-VN').format(discountAmount)} ₫
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-line pt-2 text-sm font-bold text-stone-950">
                  <span>Tổng cộng:</span>
                  <span className="tabular-nums text-brand-dark">
                    {new Intl.NumberFormat('vi-VN').format(totalAmount)} ₫
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.print()}
              className="min-h-10 rounded-xl text-xs"
            >
              <Printer className="mr-1.5 size-3.5" aria-hidden="true" />
              In biên nhận
            </Button>
            <Button
              type="button"
              onClick={() => setReceiptOpen(false)}
              className="min-h-10 rounded-xl bg-brand-dark px-5 text-xs text-white"
            >
              Đóng
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
