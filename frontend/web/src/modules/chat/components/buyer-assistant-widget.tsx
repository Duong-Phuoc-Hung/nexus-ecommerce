'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  CreditCard,
  Headphones,
  ImagePlus,
  Loader2,
  MessageCircle,
  Package,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
  Store,
  Truck,
  X,
} from 'lucide-react';
import { useSession } from '@/modules/auth/hooks/use-session';
import { canOpenPostDeliveryCase, formatOrderStatus } from '@/modules/commerce/utils/order-status';
import type { OrderDetail } from '@/modules/commerce/types/order.types';
import { buyerAssistantApi } from '../api/buyer-assistant.api';
import { useBuyerAssistant } from '../context/buyer-assistant-provider';
import { BuyerInboxPanel } from './buyer-inbox-panel';
import type {
  AssistantActionLink,
  AssistantChatMessage,
  OrderChoiceItem,
  OrderDualStatusCardData,
} from '../types/buyer-assistant.types';

const money = (amount: number) => `${Math.round(amount || 0).toLocaleString('vi-VN')} ₫`;

const ALLOWED_VISION_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type AllowedVisionMime = (typeof ALLOWED_VISION_MIMES)[number];
const MAX_VISION_IMAGE_BYTES = 5 * 1024 * 1024;

const DAMAGE_TYPE_LABELS: Record<string, string> = {
  NỨT_VỠ: 'Nứt / vỡ',
  MÓP_MÉO: 'Móp méo',
  ƯỚT_RÁCH: 'Ướt / rách',
  SAI_HÀNG: 'Sai sản phẩm',
  BÌNH_THƯỜNG: 'Nguyên vẹn',
  KHÁC: 'Cần kiểm tra',
};

const SEVERITY_LABELS: Record<string, string> = {
  CAO: 'Mức độ cao',
  TRUNG_BÌNH: 'Mức độ trung bình',
  THẤP: 'Mức độ thấp',
};

function readFileAsBase64(file: File): Promise<{ dataUrl: string; base64: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const commaIdx = dataUrl.indexOf(',');
      if (commaIdx === -1) {
        reject(new Error('Không đọc được nội dung ảnh.'));
        return;
      }
      resolve({ dataUrl, base64: dataUrl.slice(commaIdx + 1) });
    };
    reader.onerror = () => reject(new Error('Không đọc được tệp ảnh.'));
    reader.readAsDataURL(file);
  });
}

function formatVietnamTime(value: string | number): string {
  return new Date(value).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function makeLocalId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function BuyerAssistantWidget() {
  const { user } = useSession();
  const {
    isOpen,
    setIsOpen,
    toggleOpen,
    pageKind,
    pathname,
    isHiddenRoute,
    productContext,
    auctionContext,
    checkoutContext,
    activeOrder,
    selectOrder,
    messages,
    setMessages,
    draftText,
    setDraftText,
    unreadCount,
    activeWidgetView,
    openMessagesInbox,
    openAssistantChat,
    aiConversationIds,
    setAiConversationId,
    pendingAutoPrompt,
    clearPendingAutoPrompt,
    handoffToOrderChannel,
  } = useBuyerAssistant();

  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersList, setOrdersList] = useState<OrderChoiceItem[]>([]);
  const [ordersError, setOrdersError] = useState('');

  const triggerBtnRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const visionFileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollBottomRef = useRef<HTMLDivElement | null>(null);
  const prevOpenRef = useRef<boolean>(false);

  // Quản lý focus chuẩn A11y: mở bảng -> focus vào ô nhập; bấm Escape -> đóng & trả focus về nút tròn
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      window.setTimeout(() => {
        if (activeWidgetView === 'ASSISTANT') {
          inputRef.current?.focus();
        } else {
          dialogRef.current?.focus();
        }
      }, 40);
    } else if (!isOpen && prevOpenRef.current) {
      triggerBtnRef.current?.focus();
    }
    prevOpenRef.current = isOpen;
  }, [activeWidgetView, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, setIsOpen]);

  // Reset danh sách đơn cached ở widget khi đổi tài khoản
  useEffect(() => {
    setOrdersList([]);
    setPickerOpen(false);
    setOrdersError('');
  }, [user?.id]);

  // Lời chào ban đầu gọn gàng, không chữ thừa
  useEffect(() => {
    if (!isOpen || messages.length > 0) return;
    let greeting = 'Mình là Trợ lý Nexus. Bạn cần kiểm tra đơn hàng hay hỏi quy định sàn?';
    if (pageKind === 'ORDER_DETAIL' && activeOrder) {
      greeting = `Đang xem đơn #${activeOrder.id}. Mình có thể kiểm tra thanh toán, vận chuyển hoặc nối bạn với người bán.`;
    } else if (pageKind === 'CART_CHECKOUT') {
      greeting = 'Mình có thể giải thích chi tiết tiền hàng, phí giao hoặc kiểm tra thanh toán.';
    } else if (pageKind === 'AUCTION_DETAIL' && auctionContext) {
      greeting = `Bạn đang xem phiên "${auctionContext.title}". Hỏi mình cách đấu giá hoặc hạn thanh toán nhé.`;
    } else if (pageKind === 'PRODUCT_DETAIL' && productContext) {
      greeting = `Bạn đang xem "${productContext.title}". Cần hỏi thông số, đổi trả hay xem đơn đã đặt?`;
    }
    setMessages([
      {
        id: makeLocalId('welcome'),
        sender: 'ASSISTANT',
        text: greeting,
        createdAt: new Date().toISOString(),
      },
    ]);
  }, [activeOrder, auctionContext, isOpen, messages.length, pageKind, productContext, setMessages]);

  const scrollToBottom = useCallback(() => {
    window.setTimeout(() => {
      scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, []);

  const appendAssistantMessage = useCallback(
    (msg: Omit<AssistantChatMessage, 'id' | 'sender' | 'createdAt'>) => {
      setMessages((prev) => [
        ...prev,
        {
          id: makeLocalId('ai'),
          sender: 'ASSISTANT',
          createdAt: new Date().toISOString(),
          ...msg,
        },
      ]);
      scrollToBottom();
    },
    [scrollToBottom, setMessages],
  );

  // Tải danh sách đơn của chính Buyer kèm ảnh sản phẩm
  const loadMyOrders = useCallback(async (): Promise<OrderChoiceItem[]> => {
    if (!user || user.role !== 'BUYER') return [];
    setLoadingOrders(true);
    setOrdersError('');
    try {
      const items = await buyerAssistantApi.listBuyerOrdersWithThumbnails(user.id, 12);
      setOrdersList(items);
      return items;
    } catch {
      setOrdersError('Chưa tải được danh sách đơn hàng.');
      return [];
    } finally {
      setLoadingOrders(false);
    }
  }, [user]);

  type OrderInspectionIntent = 'PAYMENT' | 'SHIPMENT' | 'GENERAL' | 'ITEMS';

  // Kiểm tra trạng thái kép Thanh toán + Vận chuyển cho 1 đơn cụ thể thuộc Buyer
  const inspectAndShowOrderCard = useCallback(
    async (
      orderId: string,
      options?: {
        intent?: OrderInspectionIntent;
        introText?: string;
        rawQuery?: string;
      },
    ) => {
      if (!user || user.role !== 'BUYER') {
        appendAssistantMessage({
          text: 'Vui lòng đăng nhập tài khoản Buyer để kiểm tra đơn hàng của bạn.',
          actions: [{ label: 'Đăng nhập ngay', action: 'OPEN_LOGIN', variant: 'primary' }],
        });
        return;
      }

      const ownedOrder = await buyerAssistantApi.getOwnedOrderDetail(orderId, user.id);
      if (!ownedOrder) {
        // Không làm lộ sự tồn tại / thông tin đơn không thuộc tài khoản hiện tại
        appendAssistantMessage({
          text: 'Không tìm thấy đơn hàng này trong tài khoản của bạn.',
          actions: [
            { label: 'Chọn từ Đơn của tôi', action: 'SWITCH_ORDER', variant: 'primary' },
            { label: 'Xem danh sách đơn', action: 'OPEN_ORDERS_LIST', variant: 'secondary' },
          ],
        });
        return;
      }

      selectOrder(ownedOrder, activeOrder?.id !== ownedOrder.id);
      const rawCard: OrderDualStatusCardData =
        await buyerAssistantApi.inspectOrderDualStatus(ownedOrder);

      // Phân tích ý định câu hỏi (Intent) nếu chưa được chỉ định
      let detectedIntent: OrderInspectionIntent = options?.intent || 'GENERAL';
      if (!options?.intent && options?.rawQuery) {
        const lq = options.rawQuery.toLowerCase();
        if (
          lq.includes('thanh toán') ||
          lq.includes('trừ tiền') ||
          lq.includes('tiền') ||
          lq.includes('payos') ||
          lq.includes('vietqr') ||
          lq.includes('chuyển khoản') ||
          lq.includes('đã trả') ||
          lq.includes('escrow')
        ) {
          detectedIntent = 'PAYMENT';
        } else if (
          lq.includes('tới đâu') ||
          lq.includes('ở đâu') ||
          lq.includes('đang ở đâu') ||
          lq.includes('vận chuyển') ||
          lq.includes('vận đơn') ||
          lq.includes('bưu tá') ||
          lq.includes('giao') ||
          lq.includes('bao giờ') ||
          lq.includes('khi nào') ||
          lq.includes('ghn') ||
          lq.includes('ghtk') ||
          lq.includes('lộ trình') ||
          lq.includes('lấy hàng')
        ) {
          detectedIntent = 'SHIPMENT';
        } else if (
          lq.includes('món') ||
          lq.includes('sản phẩm') ||
          lq.includes('mua gì') ||
          lq.includes('hàng gì') ||
          lq.includes('gồm những gì')
        ) {
          detectedIntent = 'ITEMS';
        }
      }

      const card: OrderDualStatusCardData = {
        ...rawCard,
        focusSection:
          detectedIntent === 'PAYMENT'
            ? 'PAYMENT'
            : detectedIntent === 'SHIPMENT'
              ? 'SHIPMENT'
              : 'ALL',
      };

      // Xây dựng câu trả lời chính xác, thông minh và phù hợp 100% với loại câu hỏi
      let summaryText = options?.introText || '';
      if (!summaryText) {
        if (detectedIntent === 'PAYMENT') {
          const paidTime = card.payment.paidAt
            ? ` lúc ${formatVietnamTime(card.payment.paidAt)}`
            : '';
          if (card.payment.status === 'PAID') {
            summaryText =
              `💳 Xác nhận thanh toán đơn #${card.orderId}:\n\n` +
              `• Trạng thái: ĐÃ THANH TOÁN THÀNH CÔNG\n` +
              `• Số tiền đã trả: ${money(card.totalAmount)}${paidTime}\n` +
              `• Cổng giao dịch: PayOS (VietQR)\n` +
              `• Cơ chế bảo vệ: Khoản tiền được Nexus Escrow bảo chứng an toàn 100%, chỉ giải ngân cho Người bán sau khi bạn nhận hàng nguyên vẹn và xác nhận hài lòng.`;
          } else if (card.payment.status === 'PENDING') {
            const expTime = card.payment.expiresAt
              ? ` (Hết hạn lúc: ${formatVietnamTime(card.payment.expiresAt)})`
              : '';
            summaryText =
              `💳 Tình trạng thanh toán đơn #${card.orderId}:\n\n` +
              `• Trạng thái: CHƯA HOÀN TẤT THANH TOÁN${expTime}\n` +
              `• Số tiền cần thanh toán: ${money(card.totalAmount)}\n` +
              `• Giao dịch PayOS chưa được ghi nhận thành công. Bạn vui lòng quét lại mã VietQR hoặc bấm "Kiểm tra lại" bên dưới nếu đã chuyển tiền.`;
          } else if (card.payment.status === 'COD') {
            summaryText =
              `💵 Hình thức thanh toán đơn #${card.orderId}:\n\n` +
              `• Phương thức: Thanh toán khi nhận hàng (COD)\n` +
              `• Số tiền thu hộ: ${money(card.totalAmount)}\n` +
              `• Bạn sẽ thanh toán số tiền này trực tiếp cho nhân viên bưu tá khi nhận kiện hàng.`;
          } else if (card.payment.status === 'CANCELLED') {
            summaryText =
              `🚫 Trạng thái thanh toán đơn #${card.orderId}:\n\n` +
              `• Đơn hàng đã bị hủy. Nếu bạn đã chuyển khoản trước đó, hệ thống sẽ tự động hoàn tiền về tài khoản nguồn trong vòng 24-48 giờ làm việc.`;
          } else {
            summaryText = `💳 Trạng thái thanh toán đơn #${card.orderId}: ${card.payment.label}.`;
          }
        } else if (detectedIntent === 'SHIPMENT') {
          const carrierInfo = [
            card.shipment.carrier,
            card.shipment.trackingCode ? `Mã vận đơn: ${card.shipment.trackingCode}` : '',
          ]
            .filter(Boolean)
            .join(' · ');
          const loc = card.shipment.currentLocation
            ? `\n• Vị trí hiện tại: ${card.shipment.currentLocation}`
            : '';
          const est = card.shipment.estimatedDeliveryAt
            ? `\n• Dự kiến giao hàng: ${formatVietnamTime(card.shipment.estimatedDeliveryAt)}`
            : '';
          const upd = card.shipment.updatedAt
            ? `\n• Cập nhật lần cuối: ${formatVietnamTime(card.shipment.updatedAt)}`
            : '';

          if (card.shipment.state === 'HAS_SHIPMENT') {
            summaryText =
              `🚚 Tiến trình vận chuyển đơn #${card.orderId}:\n\n` +
              `• Trạng thái bưu tá: ${card.shipment.label.toUpperCase()}\n` +
              (carrierInfo ? `• Đơn vị vận chuyển: ${carrierInfo}\n` : '') +
              `${loc}${est}${upd}\n\n` +
              `Đơn vị vận chuyển đang xử lý tiếp nhận để phát kiện hàng đến địa chỉ của bạn.`;
          } else if (card.shipment.state === 'PREPARING') {
            summaryText =
              `📦 Tiến trình đơn hàng #${card.orderId}:\n\n` +
              `• Trạng thái: Shop đang chuẩn bị hàng\n` +
              `• Đơn hàng đã được thanh toán thành công. Người bán đang đóng gói sản phẩm trước khi bàn giao cho bưu tá lấy hàng.`;
          } else if (card.shipment.state === 'NO_SHIPMENT_INFO') {
            summaryText =
              `📦 Tiến trình đơn hàng #${card.orderId}:\n\n` +
              `• Trạng thái: Đang tiếp nhận xử lý tại kho\n` +
              `• Kiện hàng chưa phát sinh mã vận đơn. Người bán đang chuẩn bị đóng gói sản phẩm.`;
          } else if (card.shipment.state === 'INTERRUPTED') {
            summaryText =
              `⚠️ Vận chuyển đơn #${card.orderId}:\n\n` +
              `• Dịch vụ đối tác bưu chính tạm thời gián đoạn cập nhật. Bạn có thể bấm "Xem đơn" để tra cứu thêm hoặc liên hệ nhân viên hỗ trợ.`;
          } else {
            summaryText = `🚚 Tiến trình vận chuyển đơn #${card.orderId}: ${card.shipment.label}.`;
          }
        } else if (detectedIntent === 'ITEMS') {
          const items = ownedOrder.items || [];
          const itemsList = items
            .map(
              (it, idx) =>
                `  ${idx + 1}. ${it.productName} (Số lượng: ${it.quantity}) - ${money(it.unitPrice)}`,
            )
            .join('\n');
          summaryText =
            `🛍️ Chi tiết sản phẩm đơn #${card.orderId}:\n\n` +
            `${itemsList || '  Chưa có danh sách món hàng.'}\n\n` +
            `• Tổng thanh toán: ${money(card.totalAmount)}\n` +
            `• Trạng thái: ${card.payment.label} · ${card.shipment.label}`;
        } else {
          // GENERAL: Trạng thái tổng quan cân bằng cả hai
          summaryText =
            `📋 Tổng quan trạng thái đơn #${card.orderId}:\n\n` +
            `• Tổng giá trị: ${money(card.totalAmount)}\n` +
            `• Thanh toán: ${card.payment.label}\n` +
            `• Vận chuyển: ${card.shipment.label}` +
            (card.shipment.currentLocation ? ` (${card.shipment.currentLocation})` : '');
        }
      }

      const actions: AssistantActionLink[] = [
        {
          label: 'Xem đơn',
          action: 'OPEN_ORDER_DETAIL',
          orderId: card.orderId,
          variant: 'primary',
        },
        {
          label: 'Nhắn người bán',
          action: 'CHAT_SELLER',
          orderId: card.orderId,
          variant: 'secondary',
        },
        {
          label: 'Gặp hỗ trợ',
          action: 'CHAT_SUPPORT',
          orderId: card.orderId,
          variant: 'secondary',
        },
      ];
      if (card.payment.canRetryPaymentCheck) {
        actions.unshift({
          label: 'Kiểm tra lại',
          action: 'RETRY_PAYMENT',
          orderId: card.orderId,
          variant: 'primary',
        });
      }

      appendAssistantMessage({
        text: summaryText,
        orderCard: card,
        actions,
      });
    },
    [activeOrder?.id, appendAssistantMessage, selectOrder, user],
  );

  const handleSelectOrderChoice = useCallback(
    async (choice: OrderChoiceItem) => {
      setPickerOpen(false);
      setBusy(true);
      try {
        await inspectAndShowOrderCard(choice.id);
      } finally {
        setBusy(false);
      }
    },
    [inspectAndShowOrderCard],
  );

  // Nút "Đơn của tôi" hoặc "Đổi đơn"
  const handleOpenOrderPicker = useCallback(async () => {
    if (!user) {
      appendAssistantMessage({
        text: 'Bạn cần đăng nhập để xem đơn hàng của mình.',
        actions: [{ label: 'Đăng nhập', action: 'OPEN_LOGIN', variant: 'primary' }],
      });
      return;
    }
    if (user.role !== 'BUYER') {
      appendAssistantMessage({
        text: 'Tính năng theo dõi đơn mua chỉ áp dụng cho tài khoản Buyer.',
      });
      return;
    }
    setPickerOpen(true);
    const items = await loadMyOrders();
    if (items.length === 0) {
      setPickerOpen(false);
      appendAssistantMessage({
        text: 'Bạn chưa có đơn hàng nào trong tài khoản.',
        actions: [{ label: 'Xem danh sách đơn', action: 'OPEN_ORDERS_LIST', variant: 'secondary' }],
      });
    }
  }, [appendAssistantMessage, loadMyOrders, user]);

  // Hỏi chính sách qua BE `POST /api/v1/chat/faq`
  const handlePolicyFaq = useCallback(
    async (question: string) => {
      try {
        const res = await buyerAssistantApi.queryFaq(question);
        appendAssistantMessage({
          text: res.answer,
          citations: res.citations,
          isGrounded: res.isGrounded,
          actions:
            !res.isGrounded || res.canEscalate
              ? [
                  {
                    label: activeOrder ? 'Gặp hỗ trợ' : 'Chọn đơn để gặp hỗ trợ',
                    action: activeOrder ? 'CHAT_SUPPORT' : 'SWITCH_ORDER',
                    orderId: activeOrder?.id,
                    variant: !res.isGrounded ? 'primary' : 'secondary',
                  },
                ]
              : undefined,
        });
      } catch {
        appendAssistantMessage({
          text: 'Chưa kết nối được mục chính sách lúc này. Bạn có thể thử lại hoặc gặp nhân viên hỗ trợ.',
          failed: true,
          retryPayload: question,
          actions: activeOrder
            ? [{ label: 'Gặp hỗ trợ', action: 'CHAT_SUPPORT', orderId: activeOrder.id }]
            : undefined,
        });
      }
    },
    [activeOrder, appendAssistantMessage],
  );

  // Hỏi đáp trực tiếp qua Google Gemini AI (`POST /api/v1/chat/ask`), fallback về FAQ nếu lỗi
  const handleAskGemini = useCallback(
    async (question: string) => {
      try {
        const recentHistory = messages
          .filter((m) => m.sender === 'USER' || m.sender === 'ASSISTANT')
          .slice(-4)
          .map((m) => ({ role: m.sender, text: m.text }));

        const res = await buyerAssistantApi.askAi(question, {
          pageKind,
          orderId: activeOrder?.id,
          product: productContext
            ? {
                id: productContext.id,
                title: productContext.title,
                price: productContext.price,
                stock: productContext.stock,
                condition: productContext.condition,
              }
            : undefined,
          auction: auctionContext
            ? {
                id: auctionContext.id,
                title: auctionContext.title,
                status: auctionContext.status,
                currentPrice: auctionContext.currentPrice,
              }
            : undefined,
          checkout: checkoutContext
            ? {
                stage: checkoutContext.stage,
                itemsCount: checkoutContext.itemsCount,
                subtotal: checkoutContext.subtotal,
              }
            : undefined,
          history: recentHistory,
        });

        appendAssistantMessage({
          text: res.answer,
          aiModel: res.isLiveAi ? res.modelUsed : undefined,
        });
      } catch {
        await handlePolicyFaq(question);
      }
    },
    [
      activeOrder?.id,
      appendAssistantMessage,
      auctionContext,
      checkoutContext,
      handlePolicyFaq,
      messages,
      pageKind,
      productContext,
    ],
  );

  // Giám định ảnh hàng hóa bằng Google Gemini Vision (`POST /api/v1/chat/assess-image`)
  const handleVisionFileChange = useCallback(
    async (file: File | null | undefined) => {
      if (!file || busy) return;
      if (!user) {
        appendAssistantMessage({
          text: 'Đăng nhập để dùng AI kiểm tra ảnh tình trạng sản phẩm cho đơn hàng của bạn.',
          actions: [{ label: 'Đăng nhập', action: 'OPEN_LOGIN', variant: 'primary' }],
        });
        return;
      }

      const mime = file.type.toLowerCase() as AllowedVisionMime;
      if (!ALLOWED_VISION_MIMES.includes(mime)) {
        appendAssistantMessage({
          text: 'Vui lòng chọn ảnh định dạng JPG, PNG hoặc WEBP.',
        });
        return;
      }
      if (file.size > MAX_VISION_IMAGE_BYTES) {
        appendAssistantMessage({
          text: 'Ảnh vượt quá giới hạn 5 MB. Vui lòng chọn ảnh dung lượng nhỏ hơn.',
        });
        return;
      }

      setBusy(true);
      try {
        const { dataUrl, base64 } = await readFileAsBase64(file);
        const expectedItem =
          activeOrder?.items?.[0]?.productName || productContext?.title || undefined;

        setMessages((prev) => [
          ...prev,
          {
            id: makeLocalId('usr-img'),
            sender: 'USER',
            text: expectedItem
              ? `Kiểm tra ảnh tình trạng sản phẩm: ${expectedItem}`
              : 'Kiểm tra ảnh tình trạng sản phẩm',
            imagePreviewUrl: dataUrl,
            createdAt: new Date().toISOString(),
          },
        ]);
        scrollToBottom();

        const verdict = await buyerAssistantApi.assessDamageImage({
          imageBase64: base64,
          mimeType: mime,
          expectedItem,
        });

        const isOfflineFallback = Boolean(verdict.summary?.startsWith('[MOCK]'));
        const cleanSummary = isOfflineFallback
          ? verdict.summary.replace(/^\[MOCK\]\s*/i, '')
          : verdict.summary;

        const actions: AssistantActionLink[] = [];
        if (verdict.is_damaged || isOfflineFallback) {
          if (activeOrder && canOpenPostDeliveryCase(activeOrder.status)) {
            actions.push({
              label: 'Tạo khiếu nại đơn này',
              action: 'OPEN_COMPLAINT',
              orderId: activeOrder.id,
              variant: 'primary',
            });
          } else if (activeOrder) {
            actions.push({
              label: 'Gặp hỗ trợ',
              action: 'CHAT_SUPPORT',
              orderId: activeOrder.id,
              variant: 'primary',
            });
          } else {
            actions.push({
              label: 'Chọn đơn để khiếu nại',
              action: 'SWITCH_ORDER',
              variant: 'primary',
            });
          }
          if (activeOrder) {
            actions.push({
              label: 'Nhắn người bán',
              action: 'CHAT_SELLER',
              orderId: activeOrder.id,
              variant: 'secondary',
            });
          }
        }

        appendAssistantMessage({
          text: verdict.is_damaged
            ? 'Đã hoàn tất phân tích hình ảnh sản phẩm:'
            : 'Kết quả kiểm tra hình ảnh sản phẩm:',
          damageCard: {
            isDamaged: verdict.is_damaged,
            damageType: verdict.damage_type,
            severity: verdict.severity,
            summary: cleanSummary,
            expectedItem,
            isOfflineFallback,
          },
          actions: actions.length > 0 ? actions : undefined,
        });
      } catch {
        appendAssistantMessage({
          text: 'Chưa thể phân tích ảnh lúc này. Bạn thử gửi lại hoặc liên hệ hỗ trợ trực tiếp nhé.',
          actions: activeOrder
            ? [{ label: 'Gặp hỗ trợ', action: 'CHAT_SUPPORT', orderId: activeOrder.id }]
            : undefined,
        });
      } finally {
        setBusy(false);
        if (visionFileInputRef.current) {
          visionFileInputRef.current.value = '';
        }
      }
    },
    [
      activeOrder,
      appendAssistantMessage,
      busy,
      productContext?.title,
      scrollToBottom,
      setMessages,
      user,
    ],
  );

  // Xử lý câu hỏi & hành động của Buyer theo đúng ngữ cảnh + dữ liệu thật
  const submitQuery = useCallback(
    async (rawText: string, options?: { reuseMessageId?: string }) => {
      const text = rawText.trim();
      if (!text || busy) return;

      if (!options?.reuseMessageId) {
        setMessages((prev) => [
          ...prev,
          {
            id: makeLocalId('usr'),
            sender: 'USER',
            text,
            createdAt: new Date().toISOString(),
          },
        ]);
        setDraftText('');
        scrollToBottom();
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== options.reuseMessageId));
      }

      setBusy(true);
      const q = text.toLowerCase();

      try {
        // 1. Chưa đăng nhập -> chỉ cho hỏi chính sách công khai; cần xem đơn/hỗ trợ -> mời đăng nhập
        const asksPrivateOrderOrSupport =
          q.includes('đơn') ||
          q.includes('thanh toán') ||
          q.includes('trừ tiền') ||
          q.includes('vận chuyển') ||
          q.includes('vận đơn') ||
          q.includes('gặp hỗ trợ') ||
          q.includes('người bán') ||
          q.includes('khiếu nại') ||
          q.includes('hủy');

        if (!user && asksPrivateOrderOrSupport && !q.includes('chính sách')) {
          appendAssistantMessage({
            text: 'Đăng nhập để mình kiểm tra đúng đơn hàng và nối tới người bán hoặc hỗ trợ cho bạn nhé.',
            actions: [{ label: 'Đăng nhập', action: 'OPEN_LOGIN', variant: 'primary' }],
          });
          return;
        }

        // 2. Giải thích các dòng tiền ở Giỏ hàng / Checkout / Chi tiết đơn
        if (
          q.includes('tổng cao') ||
          q.includes('phí giao') ||
          q.includes('dòng tiền') ||
          q.includes('giải thích tổng tiền') ||
          q.includes('giá món')
        ) {
          if (activeOrder) {
            const sub = activeOrder.subtotal ?? null;
            const ship = activeOrder.shippingFee ?? null;
            const disc = activeOrder.discountAmount ?? null;
            const total = activeOrder.totalAmount ?? activeOrder.total ?? null;
            appendAssistantMessage({
              text: `Chi tiết tiền của đơn #${activeOrder.id}:`,
              breakdownCard: {
                title: `Đơn hàng #${activeOrder.id}`,
                orderId: activeOrder.id,
                subtotal: sub,
                shippingFee: ship,
                discountAmount: disc,
                totalAmount: total,
              },
              actions: [
                {
                  label: 'Xem đơn',
                  action: 'OPEN_ORDER_DETAIL',
                  orderId: activeOrder.id,
                  variant: 'secondary',
                },
              ],
            });
            return;
          }

          if (checkoutContext && (checkoutContext.subtotal > 0 || checkoutContext.totalAmount)) {
            appendAssistantMessage({
              text:
                checkoutContext.shippingFee == null && checkoutContext.stage === 'CART'
                  ? 'Phí vận chuyển sẽ được tính ở bước Checkout sau khi chọn địa chỉ giao.'
                  : 'Bảng tổng hợp các dòng tiền hiện tại:',
              breakdownCard: {
                title: checkoutContext.orderId
                  ? `Đơn #${checkoutContext.orderId}`
                  : 'Tạm tính thanh toán hiện tại',
                orderId: checkoutContext.orderId,
                subtotal: checkoutContext.subtotal,
                shippingFee: checkoutContext.shippingFee,
                discountAmount: checkoutContext.discountAmount,
                totalAmount: checkoutContext.totalAmount ?? checkoutContext.subtotal,
              },
            });
            return;
          }
        }

        // 3. Kiểm tra thanh toán ("Trừ tiền rồi sao còn chờ?", "Kiểm tra thanh toán")
        const explicitOrdInQuery =
          text.match(/(?:NEX-TRK-)?((?:NX-)?ORD-(?:AUC-)?[a-zA-Z0-9-]+)/i)?.[1] ||
          text.match(/#([a-zA-Z0-9_-]+)/)?.[1]?.replace(/^NEX-TRK-/i, '');

        if (
          q.includes('trừ tiền') ||
          q.includes('kiểm tra thanh toán') ||
          q.includes('còn chờ') ||
          q.includes('payos') ||
          (q.includes('thanh toán') &&
            (q.includes('chưa') ||
              q.includes('được chưa') ||
              q.includes('thế nào') ||
              q.includes('sao') ||
              q.includes('xác nhận')))
        ) {
          const targetOrderId = explicitOrdInQuery || activeOrder?.id || checkoutContext?.orderId;
          if (targetOrderId && user) {
            await inspectAndShowOrderCard(targetOrderId, { intent: 'PAYMENT', rawQuery: text });
            return;
          }
          await handleOpenOrderPicker();
          return;
        }

        // 4. Nói chuyện với người thật ("sai món", "gặp người thật", "gặp hỗ trợ", "nhắn người bán")
        if (
          q.includes('người thật') ||
          q.includes('gặp hỗ trợ') ||
          q.includes('nhắn người bán') ||
          q.includes('sai món') ||
          q.includes('vỡ') ||
          q.includes('khiếu nại')
        ) {
          if (activeOrder) {
            appendAssistantMessage({
              text: `Bạn muốn trao đổi trực tiếp cho đơn #${activeOrder.id} qua kênh nào?`,
              actions: [
                {
                  label: 'Nhắn người bán',
                  action: 'CHAT_SELLER',
                  orderId: activeOrder.id,
                  variant: 'secondary',
                },
                {
                  label: 'Gặp hỗ trợ',
                  action: 'CHAT_SUPPORT',
                  orderId: activeOrder.id,
                  variant: 'primary',
                },
                ...(canOpenPostDeliveryCase(activeOrder.status)
                  ? [
                      {
                        label: 'Mở bản xem trước khiếu nại',
                        action: 'OPEN_COMPLAINT' as const,
                        orderId: activeOrder.id,
                        variant: 'secondary' as const,
                      },
                    ]
                  : []),
              ],
            });
            return;
          }
          await handleOpenOrderPicker();
          return;
        }

        // 5. Hỏi hủy đơn hoặc đổi trả ("Hủy giúp tôi", "Còn được trả hàng không?")
        if (q.includes('hủy') || q.includes('trả hàng') || q.includes('đổi trả')) {
          if (activeOrder) {
            const st = (activeOrder.status || '').toUpperCase();
            const canCancel = ['PENDING', 'PENDING_PAYMENT', 'CREATED', 'PLACED', 'PAID'].includes(
              st,
            );
            const isDelivered = canOpenPostDeliveryCase(st);
            appendAssistantMessage({
              text: canCancel
                ? `Đơn #${activeOrder.id} hiện ở trạng thái "${formatOrderStatus(st)}". Bạn có thể mở trang chi tiết đơn để xem điều kiện hoàn tiền và tự bấm xác nhận hủy.`
                : isDelivered
                  ? `Đơn #${activeOrder.id} đã giao. Chức năng tự hủy đã đóng; bạn có thể mở mục Trả hàng / Khiếu nại trên đơn hoặc nhắn hỗ trợ kiểm tra điều kiện.`
                  : `Đơn #${activeOrder.id} đang ở trạng thái "${formatOrderStatus(st)}". Chức năng tự hủy không khả dụng ở bước này — hãy liên hệ hỗ trợ để kiểm tra giúp bạn.`,
              actions: [
                {
                  label: 'Mở chi tiết đơn',
                  action: 'OPEN_ORDER_DETAIL',
                  orderId: activeOrder.id,
                  variant: 'primary',
                },
                {
                  label: 'Gặp hỗ trợ',
                  action: 'CHAT_SUPPORT',
                  orderId: activeOrder.id,
                  variant: 'secondary',
                },
              ],
            });
            return;
          }
          await handlePolicyFaq(text);
          return;
        }

        // 6. Hỏi phiên đấu giá ("Tôi trúng phiên này thì còn bao lâu?", "hạn thanh toán")
        if (q.includes('trúng') || q.includes('còn bao lâu') || q.includes('đấu giá')) {
          if (auctionContext) {
            const ended = Date.now() >= auctionContext.endAt;
            const endStr = formatVietnamTime(auctionContext.endAt);
            if (ended) {
              appendAssistantMessage({
                text: `Phiên "${auctionContext.title}" đã kết thúc lúc ${endStr}. Nếu bạn là người thắng, hệ thống đang chốt đơn; khi có đơn, bạn vào Đơn của tôi để xem hạn thanh toán chính xác.`,
                actions: user
                  ? [{ label: 'Đơn của tôi', action: 'SWITCH_ORDER', variant: 'primary' }]
                  : [{ label: 'Đăng nhập', action: 'OPEN_LOGIN', variant: 'primary' }],
              });
              return;
            }
            appendAssistantMessage({
              text: `Phiên "${auctionContext.title}" dự kiến kết thúc lúc ${endStr} (giờ Việt Nam). Sau khi có kết quả trúng, hệ thống áp dụng hạn thanh toán theo đơn hàng tạo ra (mặc định SRS là 24 giờ nếu phiên không có cấu hình khác).`,
            });
            return;
          }
          await handlePolicyFaq(text);
          return;
        }

        // 7. Hỏi mã đơn hoặc tên món trong đơn ("Đơn tai nghe tới đâu rồi?", "Đơn của tôi", "#17", "NEX-TRK-ORD-...")
        const explicitOrdMatch = text.match(
          /(?:NEX-TRK-)?((?:NX-)?ORD-(?:AUC-)?[a-zA-Z0-9-]+)/i,
        )?.[1];
        const hashMatch = text.match(/#([a-zA-Z0-9_-]+)/)?.[1]?.replace(/^NEX-TRK-/i, '');
        const asksTracking =
          Boolean(explicitOrdMatch || hashMatch) ||
          q.includes('tới đâu') ||
          q.includes('đơn của tôi') ||
          q.includes('giao chưa') ||
          q.includes('vận đơn') ||
          q.includes('tra cứu') ||
          q.includes('đơn ') ||
          q.startsWith('đơn');

        if (q === 'đơn của tôi') {
          await handleOpenOrderPicker();
          return;
        }

        if (asksTracking) {
          let detectedIntent: OrderInspectionIntent = 'GENERAL';
          if (
            q.includes('thanh toán') ||
            q.includes('trừ tiền') ||
            q.includes('tiền') ||
            q.includes('payos') ||
            q.includes('vietqr') ||
            q.includes('đã trả')
          ) {
            detectedIntent = 'PAYMENT';
          } else if (
            q.includes('tới đâu') ||
            q.includes('ở đâu') ||
            q.includes('đang ở đâu') ||
            q.includes('vận chuyển') ||
            q.includes('vận đơn') ||
            q.includes('bưu tá') ||
            q.includes('giao') ||
            q.includes('bao giờ') ||
            q.includes('khi nào') ||
            q.includes('lộ trình') ||
            q.includes('ghn') ||
            q.includes('ghtk')
          ) {
            detectedIntent = 'SHIPMENT';
          } else if (
            q.includes('món') ||
            q.includes('sản phẩm') ||
            q.includes('mua gì') ||
            q.includes('hàng gì') ||
            q.includes('gồm những gì')
          ) {
            detectedIntent = 'ITEMS';
          }

          if (
            activeOrder &&
            (q.includes('đơn này') ||
              q.includes('đơn tới đâu') ||
              q.includes(`#${activeOrder.id.toLowerCase()}`))
          ) {
            await inspectAndShowOrderCard(activeOrder.id, {
              intent: detectedIntent,
              rawQuery: text,
            });
            return;
          }

          if (!user) return;
          const myOrders = await loadMyOrders();

          // Nếu có mã rõ ràng dạng (NEX-TRK-)ORD-..., #... hoặc toàn số
          const idCandidate = explicitOrdMatch || hashMatch || text.match(/\b(\d{1,12})\b/)?.[1];
          if (idCandidate) {
            await inspectAndShowOrderCard(idCandidate, {
              intent: detectedIntent,
              rawQuery: text,
            });
            return;
          }

          // Tìm theo tên món hàng trong câu hỏi (vd: "tai nghe")
          const stopWords = new Set([
            'đơn',
            'tới',
            'đâu',
            'rồi',
            'của',
            'tôi',
            'mình',
            'giao',
            'chưa',
            'hỏi',
            'về',
            'kiểm',
            'tra',
          ]);
          const keywords = q
            .replace(/[?.,!#]/g, ' ')
            .split(/\s+/)
            .filter((w) => w.length >= 2 && !stopWords.has(w));

          const matches =
            keywords.length > 0
              ? myOrders.filter((ord) =>
                  keywords.some((kw) => ord.title.toLowerCase().includes(kw)),
                )
              : [];

          if (matches.length === 1) {
            await inspectAndShowOrderCard(matches[0].id, {
              intent: detectedIntent,
              rawQuery: text,
            });
            return;
          }
          if (matches.length > 1) {
            appendAssistantMessage({
              text: `Mình thấy ${matches.length} đơn khớp nội dung này. Chọn đơn bạn muốn xem nhé:`,
              orderChoices: matches.slice(0, 3),
            });
            return;
          }

          if (myOrders.length > 0) {
            appendAssistantMessage({
              text:
                keywords.length > 0
                  ? 'Chưa thấy đơn nào trùng tên món vừa nhập. Bạn chọn trong các đơn gần đây nhé:'
                  : 'Chọn đơn bạn muốn kiểm tra nhé:',
              orderChoices: myOrders.slice(0, 3),
            });
          } else {
            appendAssistantMessage({
              text: 'Bạn chưa có đơn hàng nào trong tài khoản.',
              actions: [
                { label: 'Xem danh sách đơn', action: 'OPEN_ORDERS_LIST', variant: 'secondary' },
              ],
            });
          }
          return;
        }

        // 8. Hỏi chi tiết sản phẩm đang xem
        if (pageKind === 'PRODUCT_DETAIL' && productContext && q.includes('thông số')) {
          appendAssistantMessage({
            text: `Sản phẩm "${productContext.title}" hiện niêm yết ở mức ${
              productContext.price !== undefined
                ? money(productContext.price)
                : 'theo trang chi tiết'
            }${
              productContext.stock !== null && productContext.stock !== undefined
                ? ` · Còn ${productContext.stock} sản phẩm`
                : ''
            }${productContext.condition ? ` · Tình trạng: ${productContext.condition}` : ''}.`,
          });
          return;
        }

        // 9. Khi đã đăng nhập và đang bám 1 đơn cụ thể -> gọi phòng AI_BOT chung trên chat-service
        if (user && activeOrder) {
          let convId = aiConversationIds[activeOrder.id];
          if (!convId) {
            const conv = await buyerAssistantApi.openConversation({
              orderId: activeOrder.id,
              channelType: 'AI_BOT',
              sellerId: activeOrder.sellerId || undefined,
            });
            convId = conv.id;
            setAiConversationId(activeOrder.id, convId);
          }

          const sent = await buyerAssistantApi.sendMessage(convId, text, undefined, {
            clientMessageId: makeLocalId('ai-msg'),
            context: {
              pageKind,
              productId: productContext?.id,
              auctionId: auctionContext?.id,
              orderId: activeOrder.id,
            },
          });
          if (sent.reply) {
            appendAssistantMessage({
              text: sent.reply.content,
              actions: [
                {
                  label: 'Nhắn người bán',
                  action: 'CHAT_SELLER',
                  orderId: activeOrder.id,
                  variant: 'secondary',
                },
                {
                  label: 'Gặp hỗ trợ',
                  action: 'CHAT_SUPPORT',
                  orderId: activeOrder.id,
                  variant: 'secondary',
                },
              ],
            });
          } else {
            await handlePolicyFaq(text);
          }
          return;
        }

        // 10. Mặc định: Trả lời thông minh qua Google Gemini AI (`POST /api/v1/chat/ask`), fallback về FAQ
        await handleAskGemini(text);
      } catch {
        appendAssistantMessage({
          text: 'Chưa gửi được yêu cầu do kết nối gián đoạn. Nội dung của bạn vẫn được giữ lại để thử lại.',
          failed: true,
          retryPayload: text,
        });
      } finally {
        setBusy(false);
      }
    },
    [
      activeOrder,
      aiConversationIds,
      appendAssistantMessage,
      auctionContext,
      busy,
      checkoutContext,
      handleAskGemini,
      handleOpenOrderPicker,
      handlePolicyFaq,
      inspectAndShowOrderCard,
      loadMyOrders,
      pageKind,
      productContext,
      scrollToBottom,
      setAiConversationId,
      setDraftText,
      setMessages,
      user,
    ],
  );

  // Tự động chạy câu hỏi được kích hoạt từ trang Chi tiết đơn (`openAssistantWithOrder`)
  useEffect(() => {
    if (isOpen && pendingAutoPrompt) {
      const q = pendingAutoPrompt;
      clearPendingAutoPrompt();
      void submitQuery(q);
    }
  }, [clearPendingAutoPrompt, isOpen, pendingAutoPrompt, submitQuery]);

  const handleActionClick = (act: AssistantActionLink) => {
    if (act.action === 'OPEN_LOGIN') {
      setIsOpen(false);
      window.location.assign(`/login?next=${encodeURIComponent(pathname || '/')}`);
      return;
    }
    if (act.action === 'OPEN_ORDERS_LIST') {
      setIsOpen(false);
      window.location.assign('/account/orders');
      return;
    }
    if (act.action === 'SWITCH_ORDER') {
      void handleOpenOrderPicker();
      return;
    }
    if (act.action === 'RETRY_PAYMENT' || act.action === 'RETRY_SHIPMENT') {
      const id = act.orderId || activeOrder?.id;
      if (id) {
        setBusy(true);
        void inspectAndShowOrderCard(id).finally(() => setBusy(false));
      }
      return;
    }
    if (act.action === 'OPEN_ORDER_DETAIL' && act.orderId) {
      setIsOpen(false);
      window.location.assign(`/account/orders/${encodeURIComponent(act.orderId)}`);
      return;
    }
    if (act.action === 'CHAT_SELLER' && act.orderId) {
      handoffToOrderChannel(act.orderId, 'SELLER');
      return;
    }
    if (act.action === 'CHAT_SUPPORT' && act.orderId) {
      const existingAiConvId = aiConversationIds[act.orderId];
      if (existingAiConvId && user?.id) {
        void buyerAssistantApi.requestBotHandover(existingAiConvId, user.id).catch(() => {});
      }
      handoffToOrderChannel(act.orderId, 'SUPPORT');
      return;
    }
    if (act.action === 'OPEN_COMPLAINT' && act.orderId) {
      const lastUserMsg = [...messages].reverse().find((m) => m.sender === 'USER')?.text;
      handoffToOrderChannel(act.orderId, 'SUPPORT', {
        openComplaintModal: true,
        prefillSummary: lastUserMsg,
      });
    }
  };

  // Chip gợi ý đầu tiên theo đúng vị trí trang
  const quickChips = useMemo(() => {
    if (pageKind === 'ORDER_DETAIL' && activeOrder) {
      return [
        { label: 'Đơn tới đâu rồi?', prompt: `Đơn #${activeOrder.id} tới đâu rồi?` },
        { label: 'Kiểm tra thanh toán', prompt: 'Kiểm tra thanh toán' },
        {
          label: 'Kiểm tra ảnh hàng lỗi',
          onClick: () => visionFileInputRef.current?.click(),
        },
        {
          label: 'Nhắn người bán',
          onClick: () => handoffToOrderChannel(activeOrder.id, 'SELLER'),
        },
        {
          label: 'Gặp hỗ trợ',
          onClick: () => {
            const existingAiConvId = aiConversationIds[activeOrder.id];
            if (existingAiConvId && user?.id) {
              void buyerAssistantApi.requestBotHandover(existingAiConvId, user.id).catch(() => {});
            }
            handoffToOrderChannel(activeOrder.id, 'SUPPORT');
          },
        },
      ];
    }
    if (pageKind === 'CART_CHECKOUT') {
      return [
        { label: 'Giải thích tổng tiền', prompt: 'Sao tổng cao hơn giá món?' },
        { label: 'Kiểm tra thanh toán', prompt: 'Kiểm tra thanh toán' },
        { label: 'Đơn của tôi', onClick: () => void handleOpenOrderPicker() },
      ];
    }
    if (pageKind === 'AUCTION_DETAIL') {
      return [
        { label: 'Hạn thanh toán sau khi thắng', prompt: 'Tôi trúng phiên này thì còn bao lâu?' },
        { label: 'Cách đấu giá', prompt: 'Quy định tham gia đấu giá trên Nexus như thế nào?' },
        { label: 'Đơn của tôi', onClick: () => void handleOpenOrderPicker() },
      ];
    }
    if (pageKind === 'PRODUCT_DETAIL') {
      return [
        { label: 'Thông số & tình trạng', prompt: 'Cho mình xem thông số và tình trạng món này' },
        {
          label: 'Chính sách đổi trả',
          prompt: 'Chính sách trả hàng và hoàn tiền của Nexus là gì?',
        },
        { label: 'Đơn của tôi', onClick: () => void handleOpenOrderPicker() },
      ];
    }
    return [
      { label: 'Đơn của tôi', onClick: () => void handleOpenOrderPicker() },
      { label: 'Hỏi chính sách', prompt: 'Chính sách hủy đơn và hoàn tiền của Nexus là gì?' },
      { label: 'Gặp hỗ trợ', prompt: 'Tôi muốn gặp hỗ trợ' },
    ];
  }, [activeOrder, handleOpenOrderPicker, handoffToOrderChannel, pageKind]);

  if (isHiddenRoute) return null;

  // Trên trang giỏ/checkout mobile, nhấc nút lên trên nhẹ để không đè CTA cuối trang
  const isCheckoutOrCart = pathname.startsWith('/cart') || pathname.startsWith('/checkout');
  const buttonPositionClass = isCheckoutOrCart
    ? 'bottom-20 right-4 sm:bottom-6 sm:right-6'
    : 'bottom-5 right-4 sm:bottom-6 sm:right-6';

  return (
    <div className="print:hidden">
      {/* NÚT TRÒN ĐỎ NEXUS NỔI */}
      {!isOpen && (
        <button
          ref={triggerBtnRef}
          type="button"
          onClick={toggleOpen}
          aria-label={
            unreadCount > 0
              ? `Mở tin nhắn & trợ lý Nexus, ${unreadCount} tin chưa đọc`
              : 'Mở trợ lý Nexus'
          }
          aria-expanded={false}
          className={`fixed ${buttonPositionClass} z-40 grid size-13 place-items-center rounded-full bg-gradient-to-br from-[#9e0b0f] to-[#ed1c24] text-white shadow-xl transition-transform hover:scale-105 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#9e0b0f]`}
        >
          <MessageCircle className="size-6" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 grid min-w-5 h-5 place-items-center rounded-full border-2 border-[#9e0b0f] bg-white px-1 text-[11px] font-bold text-[#9e0b0f] tabular-nums">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* BẢNG HỘI THOẠI TRỢ LÝ NEXUS */}
      {isOpen && (
        <section
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-label="Hộp thoại & Trợ lý Nexus"
          className="fixed inset-x-2 bottom-2 top-14 z-50 flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(640px,calc(100dvh-48px))] sm:w-[410px]"
        >
          {/* Header gọn gàng */}
          <header className="flex items-center justify-between gap-2 border-b border-line bg-gradient-to-r from-[#9e0b0f] to-[#c8141c] px-4 py-3 text-white">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-white/15">
                {user?.role === 'BUYER' && activeWidgetView !== 'ASSISTANT' ? (
                  <MessageCircle className="size-4.5" aria-hidden="true" />
                ) : (
                  <Bot className="size-4.5" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0">
                {user?.role === 'BUYER' ? (
                  <div
                    className="flex items-center gap-1 rounded-xl bg-black/15 p-0.5"
                    role="tablist"
                    aria-label="Chế độ trò chuyện"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeWidgetView !== 'ASSISTANT'}
                      onClick={openMessagesInbox}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-white ${
                        activeWidgetView !== 'ASSISTANT'
                          ? 'bg-white text-[#9e0b0f] shadow-2xs'
                          : 'text-white/90 hover:bg-white/10'
                      }`}
                    >
                      <span>Tin nhắn</span>
                      {unreadCount > 0 && (
                        <span
                          className={`grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold tabular-nums ${
                            activeWidgetView !== 'ASSISTANT'
                              ? 'bg-[#ed1c24] text-white'
                              : 'bg-white text-[#9e0b0f]'
                          }`}
                        >
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeWidgetView === 'ASSISTANT'}
                      onClick={openAssistantChat}
                      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-white ${
                        activeWidgetView === 'ASSISTANT'
                          ? 'bg-white text-[#9e0b0f] shadow-2xs'
                          : 'text-white/90 hover:bg-white/10'
                      }`}
                    >
                      Trợ lý AI
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-bold leading-none">Trợ lý Nexus</strong>
                    {activeOrder && (
                      <span className="rounded-full bg-white/20 px-2 py-0.5 font-mono text-[11px] font-semibold">
                        #{activeOrder.id}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {user?.role === 'BUYER' && activeWidgetView === 'ASSISTANT' && (
                <button
                  type="button"
                  onClick={() => void handleOpenOrderPicker()}
                  className="rounded-lg border border-white/30 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20"
                >
                  {activeOrder ? 'Đổi đơn' : 'Chọn đơn'}
                </button>
              )}
              <button
                type="button"
                aria-label="Đóng hộp thoại"
                onClick={() => setIsOpen(false)}
                className="grid size-8 place-items-center rounded-lg text-white/90 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
              >
                <X className="size-4.5" aria-hidden="true" />
              </button>
            </div>
          </header>

          {user?.role === 'BUYER' && activeWidgetView !== 'ASSISTANT' ? (
            <BuyerInboxPanel />
          ) : (
            <>
              {/* Bộ chọn đơn nhanh (Đơn của tôi / Đổi đơn) kèm ảnh sản phẩm */}
              {pickerOpen && (
                <div className="border-b border-line bg-stone-50 p-3 max-h-60 overflow-y-auto">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-800">Chọn đơn hàng của bạn</span>
                    <button
                      type="button"
                      onClick={() => setPickerOpen(false)}
                      className="text-xs font-medium text-muted hover:text-stone-900"
                    >
                      Đóng
                    </button>
                  </div>

                  {loadingOrders ? (
                    <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted">
                      <Loader2 className="size-4 animate-spin text-brand-dark" />
                      <span>Đang tải đơn của bạn…</span>
                    </div>
                  ) : ordersError ? (
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                      <span>{ordersError}</span>
                      <button
                        type="button"
                        onClick={() => void loadMyOrders()}
                        className="font-bold underline"
                      >
                        Thử lại
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {ordersList.map((ord) => (
                        <button
                          key={ord.id}
                          type="button"
                          onClick={() => void handleSelectOrderChoice(ord)}
                          className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition ${
                            activeOrder?.id === ord.id
                              ? 'border-brand bg-white ring-1 ring-brand/30'
                              : 'border-line bg-white hover:border-stone-300'
                          }`}
                        >
                          <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-stone-100">
                            {ord.imageUrl ? (
                              <img src={ord.imageUrl} alt="" className="size-full object-cover" />
                            ) : (
                              <Package className="size-5 text-stone-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1 text-xs">
                              <strong className="font-mono text-stone-900">#{ord.id}</strong>
                              <span className="text-[11px] font-semibold text-brand-dark">
                                {money(ord.totalAmount)}
                              </span>
                            </div>
                            <p className="truncate text-xs font-medium text-stone-800">
                              {ord.title}
                            </p>
                            <div className="flex items-center justify-between text-[11px] text-muted">
                              <span>{formatOrderStatus(ord.status)}</span>
                              <span>{new Date(ord.createdAt).toLocaleDateString('vi-VN')}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Danh sách tin nhắn */}
              <div className="flex-1 overflow-y-auto bg-stone-50/60 p-3.5 space-y-3">
                {messages.map((msg) => {
                  if (msg.sender === 'SYSTEM') {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <span className="rounded-full border border-line bg-white px-3 py-1 text-[11px] font-semibold text-stone-700">
                          {msg.text}
                        </span>
                      </div>
                    );
                  }

                  const isUser = msg.sender === 'USER';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed ${
                          isUser
                            ? 'bg-stone-900 text-white'
                            : msg.failed
                              ? 'border border-red-200 bg-red-50 text-red-900'
                              : 'border border-line bg-white text-stone-900 shadow-2xs'
                        }`}
                      >
                        {msg.imagePreviewUrl && (
                          <div className="mb-2 overflow-hidden rounded-xl border border-white/15 bg-black/10">
                            <img
                              src={msg.imagePreviewUrl}
                              alt="Ảnh sản phẩm đính kèm"
                              className="max-h-44 w-full object-cover"
                            />
                          </div>
                        )}

                        <p className="whitespace-pre-line">{msg.text}</p>

                        {/* Thẻ kết quả thẩm định ảnh từ Gemini Vision */}
                        {msg.damageCard && (
                          <div
                            className={`mt-2.5 rounded-xl border p-3 text-xs space-y-2 ${
                              msg.damageCard.isDamaged
                                ? 'border-red-200 bg-red-50/70'
                                : 'border-emerald-200 bg-emerald-50/60'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <span className="inline-flex items-center gap-1 font-semibold text-stone-900">
                                <Sparkles className="size-3.5 text-brand-dark" />
                                <span>
                                  {DAMAGE_TYPE_LABELS[msg.damageCard.damageType] ||
                                    msg.damageCard.damageType}
                                </span>
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  msg.damageCard.isDamaged
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {msg.damageCard.isDamaged
                                  ? SEVERITY_LABELS[msg.damageCard.severity] ||
                                    msg.damageCard.severity
                                  : 'Bình thường'}
                              </span>
                            </div>
                            <p className="leading-relaxed text-stone-800">
                              {msg.damageCard.summary}
                            </p>
                            {msg.damageCard.expectedItem && (
                              <p className="text-[11px] text-stone-500">
                                Đối chiếu: {msg.damageCard.expectedItem}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Thẻ tách riêng Thanh toán & Vận chuyển với hiệu ứng Focus theo loại câu hỏi */}
                        {msg.orderCard && (
                          <div className="mt-2.5 rounded-xl border border-line bg-stone-50/80 p-3 space-y-2.5 text-xs">
                            <div className="flex items-center justify-between border-b border-line pb-1.5">
                              <div className="flex items-center gap-1.5">
                                <strong className="font-mono text-stone-900">
                                  Đơn {msg.orderCard.orderNumberLabel}
                                </strong>
                                {msg.orderCard.focusSection === 'PAYMENT' && (
                                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                                    Thanh toán
                                  </span>
                                )}
                                {msg.orderCard.focusSection === 'SHIPMENT' && (
                                  <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">
                                    Vận chuyển
                                  </span>
                                )}
                              </div>
                              <span className="font-bold text-brand-dark">
                                {money(msg.orderCard.totalAmount)}
                              </span>
                            </div>

                            {/* Dòng 1: Thanh toán */}
                            <div
                              className={`flex items-start gap-2 rounded-lg p-2 transition-colors ${
                                msg.orderCard.focusSection === 'PAYMENT'
                                  ? 'border border-emerald-200 bg-emerald-50/90 shadow-2xs'
                                  : 'bg-white/60'
                              }`}
                            >
                              <CreditCard
                                className={`size-3.5 shrink-0 mt-0.5 ${
                                  msg.orderCard.focusSection === 'PAYMENT'
                                    ? 'text-emerald-700'
                                    : 'text-stone-500'
                                }`}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] text-muted block font-medium">
                                    Thanh toán
                                  </span>
                                  {msg.orderCard.focusSection === 'PAYMENT' && (
                                    <span className="text-[10px] font-bold text-emerald-700">
                                      ✓ Trọng tâm câu hỏi
                                    </span>
                                  )}
                                </div>
                                <span
                                  className={`font-semibold ${
                                    msg.orderCard.payment.status === 'PAID'
                                      ? 'text-emerald-700'
                                      : msg.orderCard.payment.status === 'PENDING'
                                        ? 'text-amber-700'
                                        : 'text-stone-900'
                                  }`}
                                >
                                  {msg.orderCard.payment.label}
                                </span>
                                {msg.orderCard.payment.paidAt && (
                                  <span className="block text-[11px] text-muted">
                                    Lúc {formatVietnamTime(msg.orderCard.payment.paidAt)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Dòng 2: Vận chuyển */}
                            <div
                              className={`flex items-start gap-2 rounded-lg p-2 transition-colors ${
                                msg.orderCard.focusSection === 'SHIPMENT'
                                  ? 'border border-sky-200 bg-sky-50/90 shadow-2xs'
                                  : 'bg-white/60'
                              }`}
                            >
                              <Truck
                                className={`size-3.5 shrink-0 mt-0.5 ${
                                  msg.orderCard.focusSection === 'SHIPMENT'
                                    ? 'text-sky-700'
                                    : 'text-stone-500'
                                }`}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] text-muted block font-medium">
                                    Vận chuyển
                                  </span>
                                  {msg.orderCard.focusSection === 'SHIPMENT' && (
                                    <span className="text-[10px] font-bold text-sky-700">
                                      ✓ Trọng tâm câu hỏi
                                    </span>
                                  )}
                                </div>
                                <span className="font-semibold text-stone-900">
                                  {msg.orderCard.shipment.label}
                                </span>
                                {(msg.orderCard.shipment.carrier ||
                                  msg.orderCard.shipment.trackingCode) && (
                                  <span className="block text-[11px] text-stone-600">
                                    {[
                                      msg.orderCard.shipment.carrier,
                                      msg.orderCard.shipment.trackingCode,
                                    ]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </span>
                                )}
                                {msg.orderCard.shipment.currentLocation && (
                                  <span className="block text-[11px] text-stone-700">
                                    📍 {msg.orderCard.shipment.currentLocation}
                                  </span>
                                )}
                                {msg.orderCard.shipment.updatedAt && (
                                  <span className="block text-[11px] text-muted">
                                    Cập nhật {formatVietnamTime(msg.orderCard.shipment.updatedAt)}
                                  </span>
                                )}
                                {msg.orderCard.shipment.estimatedDeliveryAt && (
                                  <span className="block text-[11px] text-emerald-700 font-medium">
                                    Dự kiến giao:{' '}
                                    {formatVietnamTime(msg.orderCard.shipment.estimatedDeliveryAt)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Danh sách chọn nhanh tối đa 3 đơn khi hỏi trùng tên sản phẩm */}
                        {msg.orderChoices && msg.orderChoices.length > 0 && (
                          <div className="mt-2.5 space-y-1.5">
                            {msg.orderChoices.map((ord) => (
                              <button
                                key={ord.id}
                                type="button"
                                onClick={() => void handleSelectOrderChoice(ord)}
                                className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-stone-50 p-2 text-left hover:border-brand hover:bg-white transition"
                              >
                                <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-white">
                                  {ord.imageUrl ? (
                                    <img
                                      src={ord.imageUrl}
                                      alt=""
                                      className="size-full object-cover"
                                    />
                                  ) : (
                                    <Package className="size-4 text-stone-400" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <strong className="font-mono text-stone-900">#{ord.id}</strong>
                                    <span className="font-semibold text-brand-dark">
                                      {money(ord.totalAmount)}
                                    </span>
                                  </div>
                                  <p className="truncate text-xs font-medium text-stone-800">
                                    {ord.title}
                                  </p>
                                  <span className="text-[10px] text-muted">
                                    {formatOrderStatus(ord.status)} ·{' '}
                                    {new Date(ord.createdAt).toLocaleDateString('vi-VN')}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Bảng giải thích các dòng tiền */}
                        {msg.breakdownCard && (
                          <div className="mt-2.5 rounded-xl border border-line bg-stone-50 p-2.5 text-xs space-y-1">
                            <strong className="block text-stone-900">
                              {msg.breakdownCard.title}
                            </strong>
                            {msg.breakdownCard.subtotal != null && (
                              <div className="flex justify-between text-stone-700">
                                <span>Tiền hàng</span>
                                <span className="font-mono">
                                  {money(msg.breakdownCard.subtotal)}
                                </span>
                              </div>
                            )}
                            {msg.breakdownCard.shippingFee != null && (
                              <div className="flex justify-between text-stone-700">
                                <span>Phí vận chuyển</span>
                                <span className="font-mono">
                                  {money(msg.breakdownCard.shippingFee)}
                                </span>
                              </div>
                            )}
                            {msg.breakdownCard.discountAmount != null &&
                              msg.breakdownCard.discountAmount > 0 && (
                                <div className="flex justify-between text-emerald-700">
                                  <span>Giảm giá</span>
                                  <span className="font-mono">
                                    -{money(msg.breakdownCard.discountAmount)}
                                  </span>
                                </div>
                              )}
                            {msg.breakdownCard.totalAmount != null && (
                              <div className="flex justify-between border-t border-line pt-1 font-bold text-stone-900">
                                <span>Tổng cộng</span>
                                <span className="font-mono text-brand-dark">
                                  {money(msg.breakdownCard.totalAmount)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Nguồn dẫn chính sách từ BE FAQ */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1 border-t border-line pt-2">
                            {msg.citations.map((c, idx) => (
                              <span
                                key={`${c.source}-${idx}`}
                                className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-700"
                              >
                                <CheckCircle2 className="size-3 text-emerald-600" />
                                {c.title || c.source}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Nút hành động ngay dưới thẻ/tin nhắn */}
                        {(msg.actions?.length || msg.failed) && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5 pt-1">
                            {msg.failed && msg.retryPayload && (
                              <button
                                type="button"
                                onClick={() =>
                                  void submitQuery(msg.retryPayload!, { reuseMessageId: msg.id })
                                }
                                className="inline-flex items-center gap-1 rounded-lg bg-brand-dark px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-brand"
                              >
                                <RotateCcw className="size-3" />
                                Thử lại
                              </button>
                            )}
                            {msg.actions?.map((act, idx) => (
                              <button
                                key={`${act.action}-${idx}`}
                                type="button"
                                onClick={() => handleActionClick(act)}
                                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                                  act.variant === 'primary'
                                    ? 'bg-brand-dark text-white hover:bg-brand'
                                    : 'border border-line bg-stone-50 text-stone-800 hover:bg-stone-100'
                                }`}
                              >
                                {act.action === 'CHAT_SELLER' && <Store className="size-3" />}
                                {act.action === 'CHAT_SUPPORT' && <Headphones className="size-3" />}
                                {act.action === 'OPEN_COMPLAINT' && (
                                  <ShieldAlert className="size-3" />
                                )}
                                {act.action === 'RETRY_PAYMENT' && <RefreshCw className="size-3" />}
                                <span>{act.label}</span>
                                {act.action === 'OPEN_ORDER_DETAIL' && (
                                  <ArrowRight className="size-3" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {busy && (
                  <div className="flex items-center gap-2 text-xs text-muted px-1">
                    <Loader2 className="size-3.5 animate-spin text-brand-dark" />
                    <span>Đang kiểm tra…</span>
                  </div>
                )}
                <div ref={scrollBottomRef} />
              </div>

              {/* Gợi ý thao tác nhanh theo ngữ cảnh trang */}
              <div className="border-t border-line bg-white px-3 pt-2.5 pb-1.5 flex flex-wrap gap-1.5">
                {quickChips.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if ('onClick' in chip && chip.onClick) {
                        chip.onClick();
                      } else if ('prompt' in chip && chip.prompt) {
                        void submitQuery(chip.prompt);
                      }
                    }}
                    className="rounded-full border border-line bg-stone-50 px-2.5 py-1 text-[11px] font-semibold text-stone-800 hover:border-brand/40 hover:bg-brand-soft/40 disabled:opacity-50"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Thanh nhập câu hỏi + đính kèm ảnh kiểm tra AI */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitQuery(draftText);
                }}
                className="flex items-center gap-2 border-t border-line bg-white p-3"
              >
                <input
                  ref={visionFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => void handleVisionFileChange(e.target.files?.[0])}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => visionFileInputRef.current?.click()}
                  title="Gửi ảnh kiểm tra tình trạng sản phẩm"
                  aria-label="Gửi ảnh kiểm tra tình trạng sản phẩm"
                  className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-stone-50 text-stone-700 transition hover:border-brand/40 hover:bg-brand-soft/40 hover:text-brand-dark disabled:opacity-45"
                >
                  <ImagePlus className="size-4" aria-hidden="true" />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  placeholder={
                    activeOrder
                      ? `Hỏi về đơn #${activeOrder.id} hoặc gửi ảnh kiểm tra…`
                      : 'Nhập câu hỏi hoặc gửi ảnh kiểm tra…'
                  }
                  aria-label="Nhập câu hỏi cho Trợ lý Nexus"
                  className="h-10 flex-1 rounded-xl border border-line bg-stone-50 px-3 text-xs sm:text-sm text-stone-900 focus:border-brand focus:bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={busy || !draftText.trim()}
                  aria-label="Gửi tin nhắn"
                  className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-dark text-white hover:bg-brand disabled:opacity-45"
                >
                  <Send className="size-4" aria-hidden="true" />
                </button>
              </form>
            </>
          )}
        </section>
      )}
    </div>
  );
}
