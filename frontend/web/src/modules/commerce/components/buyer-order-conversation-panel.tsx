'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronUp,
  Clock,
  Copy,
  FileText,
  Headphones,
  Image as ImageIcon,
  Loader2,
  Lock,
  MessageSquare,
  Paperclip,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
  Store,
  Truck,
  UserCheck,
  Wrench,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useSession } from '@/modules/auth/hooks/use-session';
import type { DamageAssessmentVerdict } from '@/modules/chat/api/buyer-assistant.api';
import { useBuyerAssistant } from '@/modules/chat/context/buyer-assistant-provider';
import {
  fetchReadOnlyOrderShipment,
  generateClientUuid,
  isSimulationModeEnabled,
  orderConversationsApi,
  type ReadOnlyOrderShipmentSnapshot,
} from '@/modules/commerce/api/order-conversations.api';
import type { OrderDetail } from '@/modules/commerce/types/order.types';
import type {
  ComplaintCaseType,
  ConversationAttachment,
  ConversationChannel,
  OrderConversation,
  OrderConversationCaseSummary,
  OrderMessage,
} from '@/modules/commerce/types/order-conversation.types';

const CASE_TYPE_OPTIONS: Array<{
  value: ComplaintCaseType;
  label: string;
  desc: string;
}> = [
  {
    value: 'DAMAGED_ITEM',
    label: 'Báo hàng vỡ / Hư hỏng khi nhận',
    desc: 'Sản phẩm bị móp méo, nứt vỡ, rách niêm phong hoặc hư hại khi giao tới.',
  },
  {
    value: 'WRONG_ITEM',
    label: 'Giao sai mẫu / Thiếu phụ kiện',
    desc: 'Nhận không đúng sản phẩm đã đặt hoặc thiếu số lượng, phụ kiện đi kèm.',
  },
  {
    value: 'DELIVERY_ISSUE',
    label: 'Sự cố giao nhận / Chậm trễ vận đơn',
    desc: 'Vận đơn báo đã giao nhưng chưa nhận được hàng hoặc quá hạn bàn giao.',
  },
  {
    value: 'OTHER',
    label: 'Yêu cầu trả hàng / Khiếu nại khác',
    desc: 'Mở hồ sơ đề nghị trả hàng đã giao hoặc đối soát thanh toán.',
  },
];

const CASE_CATEGORY_BY_TYPE: Record<ComplaintCaseType, string[]> = {
  DAMAGED_ITEM: [
    'Hàng bị vỡ / móp méo nặng khi mở hộp',
    'Niêm phong kiện hàng bị rách / ướt hỏng sản phẩm',
    'Sản phẩm điện tử / cơ khí không hoạt động khi nhận',
    'Hư hỏng bề mặt hoặc trầy xước nghiêm trọng',
  ],
  WRONG_ITEM: [
    'Giao sai mẫu mã / màu sắc / phiên bản so với đơn đặt',
    'Giao thiếu số lượng sản phẩm hoặc phụ kiện đi kèm',
    'Sản phẩm không đúng mô tả trong phiên đấu giá / niêm yết',
  ],
  DELIVERY_ISSUE: [
    'Vận đơn báo đã giao nhưng thực tế chưa nhận được hàng',
    'Đơn hàng quá hạn bàn giao vận chuyển nhiều ngày',
    'Hành trình vận đơn đứng yên bất thường trên hệ thống',
  ],
  OTHER: [
    'Yêu cầu trả hàng / hoàn tiền do sản phẩm lỗi kỹ thuật',
    'Đã thanh toán PayOS nhưng trạng thái đơn / hoàn tiền chưa khớp',
    'Người bán không phản hồi tin nhắn xử lý sự cố',
  ],
};

function formatVnd(amount: number): string {
  return `${Math.round(amount || 0).toLocaleString('vi-VN')} ₫`;
}

function isValidVietnamPhone(value: string): boolean {
  const cleaned = value.trim().replace(/[\s.-]/g, '');
  return /^(0|\+84)(3|5|7|8|9)\d{8}$/.test(cleaned);
}

function sanitizePhoneInput(raw: string): string {
  const withoutMinus = raw.replace(/-/g, '');
  const hasLeadingPlus = withoutMinus.startsWith('+');
  const digitsOnly = withoutMinus.replace(/\D/g, '');
  return hasLeadingPlus ? `+${digitsOnly.slice(0, 11)}` : digitsOnly.slice(0, 10);
}

export interface BuyerOrderConversationPanelProps {
  order: OrderDetail;
  recipientName: string;
  recipientPhone: string;
  onCaseCreated?: (createdCase: OrderConversationCaseSummary) => void;
  externalTrigger?: {
    action: 'OPEN_SELLER' | 'OPEN_SUPPORT' | 'OPEN_CASE_MODAL' | 'ASK_AI_SHIPMENT';
    caseType?: ComplaintCaseType;
    nonce: number;
  } | null;
}

export function BuyerOrderConversationPanel({
  order,
  recipientName,
  recipientPhone,
  onCaseCreated,
  externalTrigger,
}: BuyerOrderConversationPanelProps) {
  const { user } = useSession();
  const { collapseAssistant, openAssistantWithOrder, orderDetailTrigger } = useBuyerAssistant();

  const buyerId = user?.id || order.buyerId || 'buyer-current';
  const buyerName = recipientName && recipientName !== '—' ? recipientName : order.buyer || 'Bạn';
  const simEnabled = useMemo(() => isSimulationModeEnabled(), []);

  const sellerOptions = useMemo(() => {
    const defaultSellerId = order.sellerId || 'seller-nexus-default';
    const defaultSellerName = order.seller || `Gian hàng #${defaultSellerId.slice(0, 8)}`;
    return [{ sellerId: defaultSellerId, sellerName: defaultSellerName }];
  }, [order.seller, order.sellerId]);

  const [selectedSellerId, setSelectedSellerId] = useState<string>(
    () => sellerOptions[0]?.sellerId || 'seller-nexus-default',
  );

  // Trạng thái khung hội thoại trực tiếp với Người bán / Nhân viên Hỗ trợ
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState<boolean>(false);
  const [activeChannel, setActiveChannel] = useState<ConversationChannel>('SELLER');

  const [conversation, setConversation] = useState<OrderConversation | null>(null);
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [hasOlderMessages, setHasOlderMessages] = useState<boolean>(false);
  const [loadingConversation, setLoadingConversation] = useState<boolean>(false);
  const [loadingOlder, setLoadingOlder] = useState<boolean>(false);

  // Vận đơn chỉ đọc (?readOnly=true)
  const [shipmentSnapshot, setShipmentSnapshot] = useState<ReadOnlyOrderShipmentSnapshot | null>(
    null,
  );
  const [loadingShipment, setLoadingShipment] = useState<boolean>(false);

  // Composer
  const [composerText, setComposerText] = useState<string>('');
  const [composerError, setComposerError] = useState<string>('');
  const [pendingAttachments, setPendingAttachments] = useState<ConversationAttachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState<boolean>(false);
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const [simulateNextSendFailure, setSimulateNextSendFailure] = useState<boolean>(false);

  // Handoff & Escalate
  const [handoffLoading, setHandoffLoading] = useState<boolean>(false);
  const [escalateModalOpen, setEscalateModalOpen] = useState<boolean>(false);
  const [selectedShareSeqs, setSelectedShareSeqs] = useState<Record<number, boolean>>({});
  const [escalateReason, setEscalateReason] = useState<string>('');

  // Simulator bar (chỉ hiện khi URL có ?sim=1)
  const [showSimulatorBar, setShowSimulatorBar] = useState<boolean>(false);

  // Modal Khiếu nại 2 bước
  const [caseModalOpen, setCaseModalOpen] = useState<boolean>(false);
  const [caseStep, setCaseStep] = useState<'FORM' | 'REVIEW' | 'SUCCESS'>('FORM');
  const [caseType, setCaseType] = useState<ComplaintCaseType>('DAMAGED_ITEM');
  const [caseCategory, setCaseCategory] = useState<string>('');
  const [caseDescription, setCaseDescription] = useState<string>('');
  const [casePhone, setCasePhone] = useState<string>('');
  const [caseItemQuantities, setCaseItemQuantities] = useState<Record<string, number>>({});
  const [caseAttachments, setCaseAttachments] = useState<ConversationAttachment[]>([]);
  const [caseAiVerdict, setCaseAiVerdict] = useState<DamageAssessmentVerdict | null>(null);
  const [caseUploadingFile, setCaseUploadingFile] = useState<boolean>(false);
  const [caseFieldErrors, setCaseFieldErrors] = useState<{
    category?: string;
    items?: string;
    phone?: string;
    description?: string;
    attachments?: string;
    submit?: string;
  }>({});
  const [caseIdempotencyKey, setCaseIdempotencyKey] = useState<string>('');
  const [submittingCase, setSubmittingCase] = useState<boolean>(false);
  const [createdCaseResult, setCreatedCaseResult] = useState<OrderConversationCaseSummary | null>(
    null,
  );
  const [copiedCaseId, setCopiedCaseId] = useState<boolean>(false);

  const messageListBottomRef = useRef<HTMLDivElement | null>(null);
  const composerFileInputRef = useRef<HTMLInputElement | null>(null);
  const caseFileInputRef = useRef<HTMLInputElement | null>(null);
  const handledUrlTriggerRef = useRef<string>('');

  const selectedSeller = useMemo(
    () =>
      sellerOptions.find((s) => s.sellerId === selectedSellerId) || {
        sellerId: selectedSellerId,
        sellerName: order.seller || `Gian hàng #${selectedSellerId}`,
      },
    [order.seller, selectedSellerId, sellerOptions],
  );

  // Thu gọn bảng nổi Trợ lý Nexus khi Buyer mở hộp thoại trong trang để tránh che nội dung
  useEffect(() => {
    if (escalateModalOpen || caseModalOpen) {
      collapseAssistant();
    }
  }, [caseModalOpen, collapseAssistant, escalateModalOpen]);

  const refreshReadOnlyShipment = useCallback(async () => {
    setLoadingShipment(true);
    try {
      const snap = await fetchReadOnlyOrderShipment(order);
      setShipmentSnapshot(snap);
    } finally {
      setLoadingShipment(false);
    }
  }, [order]);

  useEffect(() => {
    void refreshReadOnlyShipment();
  }, [refreshReadOnlyShipment]);

  const openChannelWorkspace = useCallback(
    async (channel: ConversationChannel, sellerIdOverride?: string) => {
      const targetSellerId =
        channel === 'SELLER' ? sellerIdOverride || selectedSeller.sellerId : undefined;
      setIsWorkspaceOpen(true);
      setActiveChannel(channel);
      setLoadingConversation(true);
      setComposerError('');

      try {
        const opened = await orderConversationsApi.openOrGetConversation(order, buyerId, {
          orderId: String(order.id),
          channel,
          sellerId: targetSellerId,
          sellerName: selectedSeller.sellerName,
        });
        setConversation(opened.conversation);

        const listResult = await orderConversationsApi.listMessages(opened.conversation.id, {
          limit: 20,
        });
        setMessages(listResult.items);
        setHasOlderMessages(listResult.hasOlder);

        const maxSeq = listResult.items.reduce((acc, m) => Math.max(acc, m.seq), 0);
        if (maxSeq > opened.conversation.buyerLastReadSeq) {
          await orderConversationsApi.markAsRead(opened.conversation.id, maxSeq);
        }
      } catch (err) {
        setComposerError(
          err instanceof Error ? err.message : 'Chưa thể tải hội thoại lúc này. Vui lòng thử lại.',
        );
      } finally {
        setLoadingConversation(false);
      }
    },
    [buyerId, order, selectedSeller.sellerId, selectedSeller.sellerName],
  );

  const handleOpenCaseModal = useCallback(
    (
      initialType: ComplaintCaseType = 'DAMAGED_ITEM',
      prefill?: { category?: string; description?: string },
    ) => {
      collapseAssistant();
      setCaseType(initialType);
      const defaultCategories = CASE_CATEGORY_BY_TYPE[initialType];
      setCaseCategory(prefill?.category || defaultCategories[0] || '');
      setCaseDescription(prefill?.description || '');
      const defaultPhone = sanitizePhoneInput(recipientPhone || '');
      setCasePhone(isValidVietnamPhone(defaultPhone) ? defaultPhone : '');

      const initialQtyMap: Record<string, number> = {};
      for (const item of order.items || []) {
        initialQtyMap[item.productId] = item.quantity;
      }
      setCaseItemQuantities(initialQtyMap);
      setCaseFieldErrors({});
      setCaseStep('FORM');
      setCreatedCaseResult(null);
      setCaseAiVerdict(null);
      setCaseIdempotencyKey(generateClientUuid());
      setCaseModalOpen(true);
    },
    [collapseAssistant, order.items, recipientPhone],
  );

  // Polling có kiểm soát (`after=cursor`) khi khung hội thoại đang mở
  useEffect(() => {
    if (!isWorkspaceOpen || !conversation) return;

    const timer = window.setInterval(async () => {
      try {
        const highestSeq = messages.reduce(
          (max, m) => (m.seq > max && m.deliveryStatus !== 'failed' ? m.seq : max),
          0,
        );
        const polled = await orderConversationsApi.listMessages(conversation.id, {
          after: highestSeq,
        });
        if (polled.conversation) {
          setConversation(polled.conversation);
        } else if (polled.meta) {
          setConversation((prev) =>
            prev
              ? {
                  ...prev,
                  lastSeq: Math.max(prev.lastSeq, polled.meta?.lastSeq || 0),
                  buyerLastReadSeq: Math.max(
                    prev.buyerLastReadSeq,
                    polled.meta?.buyerLastReadSeq || 0,
                  ),
                  counterpartLastReadSeq: Math.max(
                    prev.counterpartLastReadSeq,
                    polled.meta?.counterpartLastReadSeq || 0,
                  ),
                }
              : prev,
          );
        }
        if (polled.items.length > 0) {
          setMessages((prev) => {
            const existingKeys = new Set(prev.map((m) => `${m.seq}-${m.clientMessageId}`));
            const merged = [...prev];
            for (const incoming of polled.items) {
              if (!existingKeys.has(`${incoming.seq}-${incoming.clientMessageId}`)) {
                merged.push(incoming);
              }
            }
            return merged.sort((a, b) => a.seq - b.seq);
          });
          const latestSeq = polled.items[polled.items.length - 1]?.seq || highestSeq;
          await orderConversationsApi.markAsRead(conversation.id, latestSeq);
        }
      } catch {
        // Bỏ qua lỗi mạng tạm thời trong lúc polling nền
      }
    }, 4500);

    return () => window.clearInterval(timer);
  }, [conversation, isWorkspaceOpen, messages]);

  // Đồng bộ từ các nút trong trang Chi tiết đơn (`buyer-order-detail-page.tsx`)
  useEffect(() => {
    if (!externalTrigger) return;
    if (externalTrigger.action === 'OPEN_SELLER') {
      void openChannelWorkspace('SELLER');
    } else if (externalTrigger.action === 'OPEN_SUPPORT') {
      void openChannelWorkspace('SUPPORT');
    } else if (externalTrigger.action === 'ASK_AI_SHIPMENT') {
      openAssistantWithOrder(order, `Đơn hàng #${order.id} đang giao tới đâu rồi?`);
    } else if (externalTrigger.action === 'OPEN_CASE_MODAL') {
      handleOpenCaseModal(externalTrigger.caseType || 'DAMAGED_ITEM');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalTrigger?.nonce]);

  // Đồng bộ 2 chiều từ Trợ lý Nexus nổi (cùng trang Chi tiết đơn)
  useEffect(() => {
    if (!orderDetailTrigger) return;
    if (orderDetailTrigger.openComplaintModal) {
      handleOpenCaseModal('DAMAGED_ITEM', {
        description: orderDetailTrigger.prefillSummary || '',
      });
      return;
    }
    void openChannelWorkspace(orderDetailTrigger.channel);
    if (orderDetailTrigger.prefillSummary) {
      setComposerText((prev) => prev || orderDetailTrigger.prefillSummary || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderDetailTrigger?.nonce]);

  // Đồng bộ khi Buyer chuyển hướng từ trang khác bằng ?chat=seller|support|complaint
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const chatParam = params.get('chat');
    if (!chatParam) return;
    const key = `${order.id}:${chatParam}`;
    if (handledUrlTriggerRef.current === key) return;
    handledUrlTriggerRef.current = key;

    const draftKey = `nexus-assistant-draft:${user?.id ?? 'guest'}:${order.id}`;
    let savedDraft = '';
    try {
      savedDraft = window.sessionStorage.getItem(draftKey) || '';
      if (savedDraft) window.sessionStorage.removeItem(draftKey);
    } catch {
      savedDraft = '';
    }

    if (chatParam === 'complaint') {
      handleOpenCaseModal('DAMAGED_ITEM', { description: savedDraft });
    } else if (chatParam === 'seller') {
      void openChannelWorkspace('SELLER');
      if (savedDraft) setComposerText((prev) => prev || savedDraft);
    } else if (chatParam === 'support') {
      void openChannelWorkspace('SUPPORT');
      if (savedDraft) setComposerText((prev) => prev || savedDraft);
    }
  }, [handleOpenCaseModal, openChannelWorkspace, order.id, user?.id]);

  const handleLoadOlderMessages = async () => {
    if (!conversation || messages.length === 0 || loadingOlder) return;
    const oldestSeq = messages[0].seq;
    setLoadingOlder(true);
    try {
      const older = await orderConversationsApi.listMessages(conversation.id, {
        before: oldestSeq,
        limit: 15,
      });
      setHasOlderMessages(older.hasOlder);
      if (older.items.length > 0) {
        setMessages((prev) => {
          const existingSeqs = new Set(prev.map((m) => m.seq));
          const prepended = older.items.filter((m) => !existingSeqs.has(m.seq));
          return [...prepended, ...prev].sort((a, b) => a.seq - b.seq);
        });
      }
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleComposerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !conversation) return;
    setComposerError('');
    setUploadingAttachment(true);
    try {
      for (const file of Array.from(files)) {
        const uploaded = await orderConversationsApi.uploadAttachment(conversation.id, file);
        setPendingAttachments((prev) => [...prev, uploaded]);
      }
    } catch (err) {
      setComposerError(err instanceof Error ? err.message : 'Chưa thể tải tệp đính kèm.');
    } finally {
      setUploadingAttachment(false);
      if (composerFileInputRef.current) {
        composerFileInputRef.current.value = '';
      }
    }
  };

  const handleSendMessage = async (retryMessage?: OrderMessage) => {
    if (!conversation) return;

    const rawBody = retryMessage ? retryMessage.body : composerText;
    const trimmedBody = rawBody.trim();
    const attachmentsToSend = retryMessage ? retryMessage.attachments || [] : pendingAttachments;

    if (!retryMessage) {
      if (trimmedBody.length === 0) {
        setComposerError('Vui lòng nhập nội dung tin nhắn trước khi gửi.');
        return;
      }
      if ([...trimmedBody].length > 4000) {
        setComposerError(
          `Nội dung tin nhắn tối đa 4.000 ký tự (hiện có ${[...trimmedBody].length} ký tự).`,
        );
        return;
      }
    }

    setComposerError('');
    const clientMessageId = retryMessage?.clientMessageId || generateClientUuid();
    const optimisticSeq =
      retryMessage?.seq || messages.reduce((max, m) => Math.max(max, m.seq), 0) + 1;

    const optimisticMsg: OrderMessage = {
      conversationId: conversation.id,
      seq: optimisticSeq,
      authorId: buyerId,
      authorName: buyerName,
      authorRole: 'BUYER',
      body: trimmedBody,
      clientMessageId,
      attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
      createdAt: retryMessage?.createdAt || new Date().toISOString(),
      deliveryStatus: 'sending',
    };

    if (retryMessage) {
      setMessages((prev) =>
        prev.map((m) => (m.clientMessageId === clientMessageId ? optimisticMsg : m)),
      );
    } else {
      setMessages((prev) => [...prev, optimisticMsg]);
      setComposerText('');
      setPendingAttachments([]);
    }

    setSendingMessage(true);
    try {
      const shouldFailNow = simulateNextSendFailure;
      if (simulateNextSendFailure) {
        setSimulateNextSendFailure(false);
      }

      const result = await orderConversationsApi.sendMessage(
        buyerId,
        buyerName,
        {
          conversationId: conversation.id,
          clientMessageId,
          text: trimmedBody,
          attachmentIds: attachmentsToSend.map((a) => a.attachmentId),
        },
        { simulateNetworkFailure: shouldFailNow },
      );

      setMessages((prev) =>
        prev.map((m) => (m.clientMessageId === clientMessageId ? result.message : m)),
      );
      if (result.conversation) {
        setConversation(result.conversation);
      }
      setTimeout(() => {
        messageListBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } catch (err) {
      const errorText =
        err instanceof Error ? err.message : 'Gửi tin nhắn chưa thành công. Vui lòng thử lại.';
      setMessages((prev) =>
        prev.map((m) =>
          m.clientMessageId === clientMessageId
            ? {
                ...m,
                deliveryStatus: 'failed',
                deliveryError: errorText,
              }
            : m,
        ),
      );
      setComposerError(errorText);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleRequestHumanHandoff = async (topicOverride?: string) => {
    if (!conversation) return;
    setHandoffLoading(true);
    setComposerError('');
    try {
      const res = await orderConversationsApi.requestHumanHandoff(buyerId, buyerName, {
        conversationId: conversation.id,
        orderId: String(order.id),
        topic: topicOverride || `Yêu cầu hỗ trợ trực tiếp cho đơn hàng #${order.id}.`,
      });
      if (res.conversation) {
        setConversation(res.conversation);
      }
      setMessages((prev) => [...prev, res.systemMessage]);
      setTimeout(() => {
        messageListBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    } catch (err) {
      setComposerError(
        err instanceof Error ? err.message : 'Chưa thể chuyển tới nhân viên hỗ trợ lúc này.',
      );
    } finally {
      setHandoffLoading(false);
    }
  };

  const handleConfirmEscalateToSupport = async () => {
    const sellerConvId = conversation?.id;
    const sharedMessages = messages
      .filter((m) => m.authorRole !== 'AI' && selectedShareSeqs[m.seq])
      .map((m) => ({
        seq: m.seq,
        authorRole: m.authorRole,
        body: m.body,
        createdAt: m.createdAt,
      }));

    setEscalateModalOpen(false);
    setComposerError('');
    try {
      await openChannelWorkspace('SUPPORT');

      const supportOpened = await orderConversationsApi.openOrGetConversation(order, buyerId, {
        orderId: String(order.id),
        channel: 'SUPPORT',
        requestHuman: true,
      });
      const res = await orderConversationsApi.requestHumanHandoff(buyerId, buyerName, {
        conversationId: supportOpened.conversation.id,
        orderId: String(order.id),
        topic:
          escalateReason.trim() ||
          `Chuyển tiếp từ hội thoại với ${selectedSeller.sellerName} sang Bộ phận Hỗ trợ (Đơn #${order.id}).`,
        sharedFromSellerConversationId: sellerConvId,
        sharedMessages,
      });
      const nextConv = res.conversation ?? supportOpened.conversation;
      setConversation(nextConv);
      const updatedList = await orderConversationsApi.listMessages(nextConv.id, {
        limit: 30,
      });
      setMessages(updatedList.items);
    } catch (err) {
      setComposerError(
        err instanceof Error ? err.message : 'Chưa thể chuyển tiếp sang Bộ phận Hỗ trợ.',
      );
    }
  };

  const handleCaseFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setCaseFieldErrors((prev) => ({ ...prev, attachments: undefined }));
    setCaseUploadingFile(true);
    try {
      let targetConv = conversation;
      if (!targetConv) {
        const opened = await orderConversationsApi.openOrGetConversation(order, buyerId, {
          orderId: String(order.id),
          channel: 'SUPPORT',
        });
        targetConv = opened.conversation;
        setConversation(opened.conversation);
      }
      for (const file of Array.from(files)) {
        const uploaded = await orderConversationsApi.uploadAttachment(targetConv.id, file);
        setCaseAttachments((prev) => [...prev, uploaded]);
        if (file.type.startsWith('image/')) {
          const firstItemName = order.items?.[0]?.productName || undefined;
          void orderConversationsApi
            .assessDamageImage(file, firstItemName)
            .then((verdict) => {
              if (verdict && !verdict.summary?.startsWith('[MOCK]')) {
                setCaseAiVerdict(verdict);
              }
            })
            .catch(() => {});
        }
      }
    } catch (err) {
      setCaseFieldErrors((prev) => ({
        ...prev,
        attachments: err instanceof Error ? err.message : 'Chưa thể tải lên tệp bằng chứng.',
      }));
    } finally {
      setCaseUploadingFile(false);
      if (caseFileInputRef.current) {
        caseFileInputRef.current.value = '';
      }
    }
  };

  const handleProceedToCaseReview = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof caseFieldErrors = {};

    if (!caseCategory.trim()) {
      errors.category = 'Vui lòng chọn phân loại sự cố.';
    }

    const selectedItems = (order.items || []).filter(
      (item) => (caseItemQuantities[item.productId] || 0) > 0,
    );
    if (selectedItems.length === 0) {
      errors.items = 'Vui lòng chọn ít nhất 1 sản phẩm bị ảnh hưởng.';
    } else {
      const invalidRange = selectedItems.some((item) => {
        const q = caseItemQuantities[item.productId] || 0;
        return !Number.isInteger(q) || q < 1 || q > item.quantity;
      });
      if (invalidRange) {
        errors.items = 'Số lượng khiếu nại không hợp lệ.';
      }
    }

    if (!isValidVietnamPhone(casePhone)) {
      errors.phone = 'Vui lòng nhập số điện thoại Việt Nam hợp lệ (bắt đầu bằng 0 hoặc +84).';
    }

    const trimmedDesc = caseDescription.trim();
    if (trimmedDesc.length < 15) {
      errors.description = `Vui lòng mô tả ít nhất 15 ký tự (hiện có ${trimmedDesc.length} ký tự).`;
    } else if (trimmedDesc.length > 1000) {
      errors.description = 'Mô tả không được vượt quá 1.000 ký tự.';
    }

    setCaseFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setCaseStep('REVIEW');
  };

  const handleConfirmSubmitCase = async () => {
    setSubmittingCase(true);
    setCaseFieldErrors((prev) => ({ ...prev, submit: undefined }));

    try {
      let targetConv = conversation;
      if (!targetConv) {
        const opened = await orderConversationsApi.openOrGetConversation(order, buyerId, {
          orderId: String(order.id),
          channel: 'SUPPORT',
        });
        targetConv = opened.conversation;
        setConversation(opened.conversation);
      }

      const selectedItemsPayload = (order.items || [])
        .filter((item) => (caseItemQuantities[item.productId] || 0) > 0)
        .map((item) => ({
          productId: item.productId,
          productName: item.productName || `Sản phẩm #${item.productId}`,
          quantity: caseItemQuantities[item.productId] || 1,
        }));

      const fullDescription = `[${caseCategory}] ${caseDescription.trim()}`;

      const result = await orderConversationsApi.createCaseFromConversation(
        buyerId,
        buyerName,
        {
          conversationId: targetConv.id,
          idempotencyKey: caseIdempotencyKey || generateClientUuid(),
          type: caseType,
          items: selectedItemsPayload,
          description: fullDescription,
          contactPhone: casePhone.trim(),
          attachmentIds: caseAttachments.map((a) => a.attachmentId),
          aiVerdict: caseAiVerdict,
          orderStatus: order.status,
        },
        String(order.id),
      );

      setCreatedCaseResult(result.caseSummary);
      if (result.conversation) {
        setConversation(result.conversation);
      }
      if (typeof window !== 'undefined') {
        const buyerEvidenceData = {
          photos: caseAttachments
            .filter((a) => a.mimeType?.startsWith('image/'))
            .map((a) => a.previewUrl),
          videos: caseAttachments
            .filter((a) => a.mimeType?.startsWith('video/'))
            .map((a) => a.previewUrl),
          note: caseDescription.trim(),
          submittedAt: new Date().toISOString(),
        };
        localStorage.setItem(`nexus_buyer_evidence_${order.id}`, JSON.stringify(buyerEvidenceData));
        if (order.orderCode) {
          localStorage.setItem(
            `nexus_buyer_evidence_${order.orderCode}`,
            JSON.stringify(buyerEvidenceData),
          );
        }
      }
      setMessages((prev) => {
        const exists = prev.some(
          (m) => m.clientMessageId === result.confirmationMessage.clientMessageId,
        );
        return exists ? prev : [...prev, result.confirmationMessage];
      });
      setCaseStep('SUCCESS');
      onCaseCreated?.(result.caseSummary);
    } catch (err) {
      setCaseFieldErrors((prev) => ({
        ...prev,
        submit:
          err instanceof Error
            ? err.message
            : 'Chưa thể gửi hồ sơ khiếu nại lúc này. Vui lòng thử lại.',
      }));
    } finally {
      setSubmittingCase(false);
    }
  };

  const handleSimulateAction = async (
    action:
      | 'SELLER_REPLY'
      | 'SUPPORT_CLAIM_AND_REPLY'
      | 'MARK_READ'
      | 'RESOLVE_AND_CLOSE'
      | 'REOPEN_THREAD',
  ) => {
    if (!conversation) return;
    const res = await orderConversationsApi.simulateCounterpartAction(conversation.id, action);
    setConversation(res.conversation);
    setMessages(res.messages);
    const maxSeq = res.messages.reduce((max, m) => Math.max(max, m.seq), 0);
    await orderConversationsApi.markAsRead(conversation.id, maxSeq);
  };

  const latestLinkedCase =
    conversation?.linkedCases && conversation.linkedCases.length > 0
      ? conversation.linkedCases[0]
      : null;

  const renderStateBadge = (conv: OrderConversation | null) => {
    if (!conv) return null;
    switch (conv.state) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
            <span className="size-1.5 rounded-full bg-emerald-600" />
            Đang mở
          </span>
        );
      case 'WAITING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
            <Clock className="size-3 text-amber-700" />
            Đang chờ nhân viên hỗ trợ
          </span>
        );
      case 'ASSIGNED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-900">
            <UserCheck className="size-3 text-sky-700" />
            {conv.assigneeName || 'Nhân viên Hỗ trợ'} đang phụ trách
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-stone-300 bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-700">
            <Lock className="size-3 text-stone-500" />
            Đã hoàn tất
          </span>
        );
    }
  };

  return (
    <>
      <section
        id="buyer-order-chat-section"
        aria-label="Trao đổi theo đơn hàng và Hỗ trợ"
        className="mt-5 scroll-mt-24 rounded-2xl border border-line bg-white p-4 sm:p-5 shadow-xs"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-dark border border-brand/20">
              <MessageSquare className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-stone-900 text-sm sm:text-base">
                  Trao đổi về đơn hàng #{order.id}
                </h2>
                {latestLinkedCase && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                    <CheckCircle2 className="size-3 text-emerald-600" />
                    Hồ sơ {latestLinkedCase.caseId}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted leading-relaxed">
                Nhắn trực tiếp cho{' '}
                <strong className="text-stone-800">{selectedSeller.sellerName}</strong>, kết nối{' '}
                <strong className="text-stone-800">Bộ phận Hỗ trợ</strong> hoặc mở Trợ lý Nexus để
                tra nhanh vận đơn và chính sách.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {sellerOptions.length > 1 && (
              <select
                aria-label="Chọn gian hàng cần nhắn"
                value={selectedSellerId}
                onChange={(e) => setSelectedSellerId(e.target.value)}
                className="rounded-xl border border-line bg-stone-50 px-2.5 py-2 text-xs font-semibold text-stone-800"
              >
                {sellerOptions.map((s) => (
                  <option key={s.sellerId} value={s.sellerId}>
                    {s.sellerName}
                  </option>
                ))}
              </select>
            )}

            <Button
              type="button"
              variant={isWorkspaceOpen && activeChannel === 'SELLER' ? 'default' : 'outline'}
              className={`rounded-xl text-xs font-semibold h-9 px-3.5 ${
                isWorkspaceOpen && activeChannel === 'SELLER'
                  ? 'bg-brand-dark text-white hover:bg-brand-dark/90'
                  : 'border-line text-stone-800 hover:bg-stone-50'
              }`}
              onClick={() => void openChannelWorkspace('SELLER')}
            >
              <Store className="mr-1.5 size-3.5" />
              Nhắn người bán
            </Button>

            <Button
              type="button"
              variant={isWorkspaceOpen && activeChannel === 'SUPPORT' ? 'default' : 'outline'}
              className={`rounded-xl text-xs font-semibold h-9 px-3.5 ${
                isWorkspaceOpen && activeChannel === 'SUPPORT'
                  ? 'bg-brand-dark text-white hover:bg-brand-dark/90'
                  : 'border-line text-stone-800 hover:bg-stone-50'
              }`}
              onClick={() => void openChannelWorkspace('SUPPORT')}
            >
              <Headphones className="mr-1.5 size-3.5" />
              Liên hệ hỗ trợ
            </Button>

            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-amber-300 bg-amber-50/70 text-amber-950 hover:bg-amber-100/80 text-xs font-semibold h-9 px-3"
              onClick={() => openAssistantWithOrder(order)}
            >
              <Sparkles className="mr-1.5 size-3.5 text-amber-700" />
              Hỏi Trợ lý Nexus
            </Button>

            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-red-200 bg-red-50/60 text-red-800 hover:bg-red-100/70 text-xs font-semibold h-9 px-3"
              onClick={() => handleOpenCaseModal('DAMAGED_ITEM')}
            >
              <ShieldAlert className="mr-1.5 size-3.5 text-red-600" />
              Báo hàng vỡ / Khiếu nại
            </Button>

            {isWorkspaceOpen && (
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl text-xs text-stone-500 hover:text-stone-800 h-9 px-2.5"
                onClick={() => setIsWorkspaceOpen(false)}
              >
                Thu gọn
                <ChevronUp className="ml-1 size-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* KHUNG HỘI THOẠI TRỰC TIẾP GIỮA BUYER VÀ SELLER / SUPPORT */}
        {isWorkspaceOpen && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-stone-50/50">
            <div className="border-b border-line bg-white px-4 py-3.5 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-xl border border-line bg-stone-100 p-0.5">
                    <button
                      type="button"
                      onClick={() => void openChannelWorkspace('SELLER')}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        activeChannel === 'SELLER'
                          ? 'bg-white text-stone-900 shadow-2xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <Store className="size-3.5 text-brand-dark" />
                      <span>Người bán ({selectedSeller.sellerName})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void openChannelWorkspace('SUPPORT')}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        activeChannel === 'SUPPORT'
                          ? 'bg-white text-stone-900 shadow-2xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <Headphones className="size-3.5 text-emerald-700" />
                      <span>Bộ phận Hỗ trợ</span>
                    </button>
                  </div>

                  {renderStateBadge(conversation)}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {activeChannel === 'SELLER' ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 rounded-xl border-line bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                      onClick={() => {
                        const initialSelection: Record<number, boolean> = {};
                        messages.forEach((m) => {
                          if (m.authorRole === 'BUYER' || m.authorRole === 'SELLER') {
                            initialSelection[m.seq] = true;
                          }
                        });
                        setSelectedShareSeqs(initialSelection);
                        setEscalateModalOpen(true);
                      }}
                    >
                      <Headphones className="mr-1.5 size-3.5 text-emerald-700" />
                      Chuyển sang Hỗ trợ
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        handoffLoading ||
                        conversation?.state === 'WAITING' ||
                        conversation?.state === 'ASSIGNED' ||
                        conversation?.state === 'CLOSED'
                      }
                      className="h-8 rounded-xl border-emerald-300 bg-emerald-50/70 px-3 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
                      onClick={() => void handleRequestHumanHandoff()}
                    >
                      <UserCheck className="mr-1.5 size-3.5 text-emerald-700" />
                      {conversation?.state === 'WAITING'
                        ? 'Đang chờ nhân viên...'
                        : conversation?.state === 'ASSIGNED'
                          ? `Đã kết nối ${conversation.assigneeName || 'Hỗ trợ'}`
                          : 'Gặp nhân viên'}
                    </Button>
                  )}

                  {simEnabled && (
                    <button
                      type="button"
                      onClick={() => setShowSimulatorBar((v) => !v)}
                      className="inline-flex items-center gap-1 rounded-xl border border-line bg-stone-50 px-2.5 py-1.5 text-[11px] font-semibold text-stone-600 hover:bg-stone-100"
                    >
                      <Wrench className="size-3" />
                      <span>Kiểm thử</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Thanh tóm tắt ngữ cảnh đơn & vận đơn chỉ đọc */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line/80 bg-stone-50 px-3.5 py-2 text-xs text-stone-700">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>
                    Mã đơn:{' '}
                    <strong className="font-mono font-bold text-stone-900">#{order.id}</strong>
                  </span>
                  <span className="text-stone-300">•</span>
                  <span>
                    Người nhận:{' '}
                    <strong className="font-semibold text-stone-900">{buyerName}</strong>
                  </span>
                  <span className="text-stone-300">•</span>
                  <span className="inline-flex items-center gap-1">
                    <Truck className="size-3.5 text-brand-dark" />
                    <span>Vận đơn:</span>
                    {loadingShipment ? (
                      <span className="text-muted">Đang kiểm tra...</span>
                    ) : shipmentSnapshot?.interrupted ? (
                      <strong className="text-amber-800">Chưa kiểm tra được vận đơn</strong>
                    ) : shipmentSnapshot?.hasShipment ? (
                      <strong className="text-stone-900">
                        {shipmentSnapshot.statusLabel}
                        {shipmentSnapshot.trackingCode
                          ? ` (${shipmentSnapshot.carrier || 'ĐVVC'}: ${shipmentSnapshot.trackingCode})`
                          : ''}
                      </strong>
                    ) : (
                      <strong className="text-stone-700">Chưa có vận đơn</strong>
                    )}
                  </span>
                  {shipmentSnapshot?.estimatedDeliveryAt && (
                    <>
                      <span className="text-stone-300">•</span>
                      <span>
                        Dự kiến giao:{' '}
                        <strong className="text-stone-900">
                          {new Date(shipmentSnapshot.estimatedDeliveryAt).toLocaleDateString(
                            'vi-VN',
                          )}
                        </strong>
                      </span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => void refreshReadOnlyShipment()}
                  className="inline-flex items-center gap-1 text-[11px] text-brand-dark hover:underline font-medium"
                >
                  <RefreshCw className="size-3" />
                  Làm mới vận đơn
                </button>
              </div>

              {/* Thanh mô phỏng (chỉ hiện khi ?sim=1) */}
              {simEnabled && showSimulatorBar && conversation && (
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-3 py-2 text-[11px]">
                  <span className="font-bold text-amber-950">
                    Mô phỏng đối tác ({activeChannel === 'SELLER' ? 'Seller' : 'Support'}):
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void handleSimulateAction('MARK_READ')}
                      className="rounded-lg border border-amber-300 bg-white px-2 py-1 font-semibold text-stone-800 hover:bg-amber-100"
                    >
                      Đối tác đã xem
                    </button>
                    {activeChannel === 'SELLER' ? (
                      <button
                        type="button"
                        onClick={() => void handleSimulateAction('SELLER_REPLY')}
                        className="rounded-lg border border-amber-300 bg-white px-2 py-1 font-semibold text-stone-800 hover:bg-amber-100"
                      >
                        Seller trả lời
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleSimulateAction('SUPPORT_CLAIM_AND_REPLY')}
                        className="rounded-lg border border-sky-300 bg-white px-2 py-1 font-semibold text-sky-900 hover:bg-sky-50"
                      >
                        Support nhận & trả lời
                      </button>
                    )}
                    {conversation.state !== 'CLOSED' ? (
                      <button
                        type="button"
                        onClick={() => void handleSimulateAction('RESOLVE_AND_CLOSE')}
                        className="rounded-lg border border-stone-300 bg-white px-2 py-1 font-semibold text-stone-700 hover:bg-stone-100"
                      >
                        Đóng hội thoại
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleSimulateAction('REOPEN_THREAD')}
                        className="rounded-lg border border-emerald-300 bg-white px-2 py-1 font-semibold text-emerald-800 hover:bg-emerald-50"
                      >
                        Mở lại
                      </button>
                    )}
                    <label className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-1 font-semibold text-red-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={simulateNextSendFailure}
                        onChange={(e) => setSimulateNextSendFailure(e.target.checked)}
                      />
                      <span>Giả lập lỗi gửi</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {conversation?.state === 'WAITING' && (
              <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-950 flex items-center gap-2">
                <Clock className="size-4 text-amber-700 shrink-0" />
                <span>
                  Yêu cầu hỗ trợ đang được xếp hàng cho nhân viên tiếp nhận. Bạn vẫn có thể nhắn
                  thêm hoặc tải ảnh bằng chứng ngay bên dưới.
                </span>
              </div>
            )}

            {latestLinkedCase && (
              <div className="border-b border-emerald-200 bg-emerald-50/80 px-4 py-2.5 text-xs text-emerald-950 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-700 shrink-0" />
                  <span>
                    Đã gắn với hồ sơ{' '}
                    <strong className="font-mono">{latestLinkedCase.caseId}</strong>
                  </span>
                </div>
                <span className="text-[11px] text-emerald-800">
                  Nhân viên Hỗ trợ sẽ đối soát bằng chứng trước khi quyết định hoàn tiền.
                </span>
              </div>
            )}

            {/* Danh sách tin nhắn */}
            <div className="max-h-[420px] min-h-[240px] overflow-y-auto p-4 sm:p-5 space-y-3.5">
              {loadingConversation ? (
                <div className="flex flex-col items-center justify-center py-12 text-xs text-muted gap-2">
                  <Loader2 className="size-5 animate-spin text-brand-dark" />
                  <span>Đang tải lịch sử hội thoại...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-xs text-muted">
                  Chưa có tin nhắn nào. Hãy nhập câu hỏi cho{' '}
                  {activeChannel === 'SELLER' ? selectedSeller.sellerName : 'Bộ phận Hỗ trợ'} ở ô
                  bên dưới.
                </div>
              ) : (
                <>
                  {hasOlderMessages && (
                    <div className="flex justify-center pb-2">
                      <button
                        type="button"
                        disabled={loadingOlder}
                        onClick={() => void handleLoadOlderMessages()}
                        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-50"
                      >
                        {loadingOlder && <Loader2 className="size-3 animate-spin" />}
                        <span>Xem tin nhắn cũ hơn</span>
                      </button>
                    </div>
                  )}

                  {messages.map((msg) => {
                    const isBuyer = msg.authorRole === 'BUYER';
                    const isSupport = msg.authorRole === 'SUPPORT_STAFF';
                    const isReadByCounterpart =
                      isBuyer &&
                      msg.deliveryStatus !== 'failed' &&
                      msg.deliveryStatus !== 'sending' &&
                      conversation !== null &&
                      msg.seq <= conversation.counterpartLastReadSeq;

                    return (
                      <div
                        key={`${msg.seq}-${msg.clientMessageId}`}
                        className={`flex flex-col ${isBuyer ? 'items-end' : 'items-start'}`}
                      >
                        <div className="mb-1 flex items-center gap-1.5 px-1 text-[11px]">
                          {isSupport ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-900 border border-emerald-200">
                              <Headphones className="size-3 text-emerald-700" />
                              {msg.authorName || 'Nhân viên Hỗ trợ'}
                            </span>
                          ) : isBuyer ? (
                            <span className="font-semibold text-stone-600">Bạn</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-stone-200/80 px-1.5 py-0.5 font-semibold text-stone-800">
                              <Store className="size-3 text-brand-dark" />
                              {msg.authorName || selectedSeller.sellerName}
                            </span>
                          )}
                          <span className="text-stone-400">
                            {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div
                          className={`max-w-[88%] sm:max-w-[76%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                            isBuyer
                              ? msg.deliveryStatus === 'failed'
                                ? 'border border-red-300 bg-red-50 text-red-950'
                                : 'bg-stone-900 text-white'
                              : isSupport
                                ? 'border border-emerald-200 bg-white text-stone-900'
                                : 'border border-line bg-white text-stone-900'
                          }`}
                        >
                          <div className="whitespace-pre-line break-words">{msg.body}</div>

                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-2">
                              {msg.attachments.map((att) => {
                                const isImage = att.mimeType.startsWith('image/');
                                return (
                                  <a
                                    key={att.attachmentId}
                                    href={att.previewUrl || '#'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`group flex items-center gap-2 rounded-xl border p-1.5 text-xs transition ${
                                      isBuyer
                                        ? 'border-stone-700 bg-stone-800 text-stone-100 hover:bg-stone-700'
                                        : 'border-line bg-stone-50 text-stone-800 hover:bg-stone-100'
                                    }`}
                                  >
                                    {isImage && att.previewUrl ? (
                                      <img
                                        src={att.previewUrl}
                                        alt={att.fileName}
                                        className="size-10 rounded-lg object-cover"
                                      />
                                    ) : (
                                      <FileText className="size-6 text-brand-dark shrink-0" />
                                    )}
                                    <div className="max-w-[140px] truncate pr-1">
                                      <span className="block truncate font-semibold text-[11px]">
                                        {att.fileName}
                                      </span>
                                      <span className="block text-[10px] opacity-75">
                                        {Math.max(1, Math.round(att.size / 1024))} KB
                                      </span>
                                    </div>
                                  </a>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {isBuyer && (
                          <div className="mt-1 flex items-center gap-2 px-1 text-[11px]">
                            {msg.deliveryStatus === 'sending' && (
                              <span className="inline-flex items-center gap-1 text-stone-500">
                                <Loader2 className="size-3 animate-spin" />
                                Đang gửi...
                              </span>
                            )}
                            {msg.deliveryStatus === 'failed' && (
                              <div className="flex flex-wrap items-center gap-2 text-red-600">
                                <span className="inline-flex items-center gap-1 font-semibold">
                                  <AlertCircle className="size-3" />
                                  Chưa gửi được
                                </span>
                                <button
                                  type="button"
                                  onClick={() => void handleSendMessage(msg)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-red-700"
                                >
                                  <RotateCcw className="size-3" />
                                  Gửi lại
                                </button>
                              </div>
                            )}
                            {(!msg.deliveryStatus || msg.deliveryStatus === 'sent') && (
                              <span
                                className={`inline-flex items-center gap-1 font-medium ${
                                  isReadByCounterpart ? 'text-emerald-700' : 'text-stone-500'
                                }`}
                              >
                                {isReadByCounterpart ? (
                                  <>
                                    <CheckCheck className="size-3.5 text-emerald-600" />
                                    <span>Đã xem</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="size-3.5 text-stone-400" />
                                    <span>Đã gửi</span>
                                  </>
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messageListBottomRef} />
                </>
              )}
            </div>

            {/* Ô soạn tin nhắn */}
            <div className="border-t border-line bg-white p-3.5 sm:p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-stone-800">
                  {activeChannel === 'SELLER'
                    ? `Gửi cho Người bán: ${selectedSeller.sellerName}`
                    : 'Gửi cho Bộ phận Hỗ trợ Nexus'}
                </span>
                <span
                  className={`font-mono text-[11px] ${
                    [...composerText.trim()].length > 4000 ? 'font-bold text-red-600' : 'text-muted'
                  }`}
                >
                  {[...composerText.trim()].length}/4000
                </span>
              </div>

              {pendingAttachments.length > 0 && (
                <div className="mb-2.5 flex flex-wrap gap-2 rounded-xl border border-line bg-stone-50 p-2">
                  {pendingAttachments.map((att) => (
                    <div
                      key={att.attachmentId}
                      className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-2.5 py-1 text-xs"
                    >
                      <ImageIcon className="size-3.5 text-brand-dark" />
                      <span className="max-w-[160px] truncate font-medium text-stone-800">
                        {att.fileName}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setPendingAttachments((prev) =>
                            prev.filter((x) => x.attachmentId !== att.attachmentId),
                          )
                        }
                        className="text-stone-400 hover:text-red-600"
                        aria-label={`Xóa tệp ${att.fileName}`}
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {conversation?.state === 'CLOSED' ? (
                <div className="rounded-xl border border-stone-200 bg-stone-100 p-3 text-xs text-stone-700 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Lock className="size-4 text-stone-500 shrink-0" />
                    <span>
                      Hội thoại này đã hoàn tất. Nếu cần hỗ trợ thêm, bạn có thể mở yêu cầu mới.
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-xl bg-white text-xs font-semibold"
                    onClick={() => handleOpenCaseModal('OTHER')}
                  >
                    Tạo yêu cầu mới
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <input
                    ref={composerFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => void handleComposerFileUpload(e)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploadingAttachment || sendingMessage}
                    onClick={() => composerFileInputRef.current?.click()}
                    className="h-10 shrink-0 rounded-xl border-line px-3 text-xs font-semibold text-stone-700"
                    title="Đính kèm ảnh hoặc PDF (tối đa 5MB/tệp)"
                  >
                    {uploadingAttachment ? (
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    ) : (
                      <Paperclip className="mr-1.5 size-3.5" />
                    )}
                    Đính kèm
                  </Button>

                  <textarea
                    rows={2}
                    maxLength={4100}
                    value={composerText}
                    onChange={(e) => {
                      setComposerText(e.target.value);
                      if (composerError) setComposerError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleSendMessage();
                      }
                    }}
                    placeholder={
                      activeChannel === 'SELLER'
                        ? `Nhắn cho ${selectedSeller.sellerName}...`
                        : 'Mô tả vấn đề để Bộ phận Hỗ trợ tiếp nhận...'
                    }
                    className="flex-1 rounded-xl border border-line bg-stone-50/50 px-3.5 py-2 text-xs sm:text-sm text-stone-900 focus:border-brand focus:bg-white focus:outline-none"
                  />

                  <Button
                    type="button"
                    disabled={sendingMessage || uploadingAttachment}
                    onClick={() => void handleSendMessage()}
                    className="h-10 shrink-0 rounded-xl bg-brand-dark px-4 text-xs sm:text-sm font-semibold text-white hover:bg-brand-dark/90"
                  >
                    {sendingMessage ? (
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                    ) : (
                      <Send className="mr-1.5 size-3.5" />
                    )}
                    {activeChannel === 'SELLER' ? 'Gửi Người bán' : 'Gửi Hỗ trợ'}
                  </Button>
                </div>
              )}

              {composerError && (
                <p
                  role="alert"
                  className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 flex items-center gap-1.5"
                >
                  <AlertCircle className="size-4 shrink-0 text-red-600" />
                  <span>{composerError}</span>
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* HỘP THOẠI CHUYỂN TỪ KÊNH SELLER SANG SUPPORT */}
      <Dialog open={escalateModalOpen} onOpenChange={setEscalateModalOpen}>
        <DialogContent className="max-w-lg p-6 max-h-[90vh] overflow-y-auto">
          <DialogTitle className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
            <Headphones className="size-5 text-emerald-700" />
            <span>Chuyển sang Bộ phận Hỗ trợ · Đơn #{order.id}</span>
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-xs leading-relaxed text-muted">
            Hệ thống sẽ giữ nguyên mã đơn <strong>#{order.id}</strong> và chỉ đính kèm những tin
            nhắn với Người bán mà bạn chọn chia sẻ bên dưới.
          </DialogDescription>

          <div className="mt-4 space-y-3 text-xs">
            <div>
              <label
                htmlFor="escalate-reason-input"
                className="block font-semibold text-stone-800 mb-1"
              >
                Lý do cần Hỗ trợ can thiệp
              </label>
              <input
                id="escalate-reason-input"
                type="text"
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                placeholder="Ví dụ: Người bán chưa phản hồi phương án đổi trả..."
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs focus:border-brand focus:outline-none"
              />
            </div>

            <div>
              <span className="block font-semibold text-stone-800 mb-1.5">
                Tin nhắn đồng ý chia sẻ cho nhân viên Hỗ trợ:
              </span>
              <div className="max-h-48 overflow-y-auto divide-y divide-line rounded-xl border border-line bg-stone-50/70 px-3">
                {messages.filter((m) => m.authorRole !== 'AI').length === 0 ? (
                  <p className="py-4 text-center text-muted">
                    Chưa có tin nhắn trao đổi với Người bán.
                  </p>
                ) : (
                  messages
                    .filter((m) => m.authorRole !== 'AI')
                    .map((m) => {
                      const checked = Boolean(selectedShareSeqs[m.seq]);
                      return (
                        <label
                          key={m.seq}
                          className="flex items-start gap-2.5 py-2.5 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 accent-brand-dark size-4"
                            checked={checked}
                            onChange={(e) =>
                              setSelectedShareSeqs((prev) => ({
                                ...prev,
                                [m.seq]: e.target.checked,
                              }))
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-stone-800">
                              [
                              {m.authorRole === 'BUYER'
                                ? 'Bạn'
                                : m.authorName || selectedSeller.sellerName}
                              ]:
                            </span>{' '}
                            <span className="text-stone-700 line-clamp-2">{m.body}</span>
                          </div>
                        </label>
                      );
                    })
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl text-xs"
              onClick={() => setEscalateModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-brand-dark text-white hover:bg-brand-dark/90 text-xs font-semibold"
              onClick={() => void handleConfirmEscalateToSupport()}
            >
              Chuyển sang Hỗ trợ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* HỘP THOẠI 2 BƯỚC: BÁO HÀNG VỠ / KHIẾU NẠI ĐƠN HÀNG */}
      <Dialog
        open={caseModalOpen}
        onOpenChange={(open) => {
          if (!open && !submittingCase) {
            setCaseModalOpen(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl p-6 max-h-[92vh] overflow-y-auto">
          <DialogTitle className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
            <ShieldAlert className="size-5 text-red-600" />
            <span>
              {caseStep === 'FORM' && `Bước 1/2: Soạn yêu cầu khiếu nại · Đơn #${order.id}`}
              {caseStep === 'REVIEW' && `Bước 2/2: Xem lại trước khi gửi · Đơn #${order.id}`}
              {caseStep === 'SUCCESS' && `Đã tiếp nhận khiếu nại · Đơn #${order.id}`}
            </span>
          </DialogTitle>

          <DialogDescription className="mt-1 text-xs leading-relaxed text-muted">
            {caseStep === 'FORM' &&
              'Chọn sản phẩm gặp sự cố, mô tả tình trạng thực tế và đính kèm hình ảnh hoặc tài liệu đối soát.'}
            {caseStep === 'REVIEW' &&
              'Vui lòng kiểm tra kỹ thông tin bên dưới trước khi bấm gửi hồ sơ chính thức.'}
            {caseStep === 'SUCCESS' &&
              'Hồ sơ của bạn đã được ghi nhận và chuyển tới Bộ phận Hỗ trợ kiểm tra đối soát.'}
          </DialogDescription>

          {caseStep === 'FORM' && (
            <form
              onSubmit={handleProceedToCaseReview}
              className="mt-4 space-y-4 text-xs sm:text-sm"
            >
              <div>
                <span className="block text-xs font-bold text-stone-800 mb-1.5">
                  1. Loại yêu cầu <span className="text-red-600">*</span>
                </span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CASE_TYPE_OPTIONS.map((opt) => {
                    const active = caseType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setCaseType(opt.value);
                          setCaseCategory(CASE_CATEGORY_BY_TYPE[opt.value][0] || '');
                        }}
                        className={`rounded-xl border p-3 text-left transition ${
                          active
                            ? 'border-brand bg-brand/5 ring-1 ring-brand/30'
                            : 'border-line bg-white hover:bg-stone-50'
                        }`}
                      >
                        <strong className="block text-xs font-bold text-stone-900">
                          {opt.label}
                        </strong>
                        <span className="mt-0.5 block text-[11px] text-muted leading-snug">
                          {opt.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="case-category-select"
                  className="block text-xs font-bold text-stone-800 mb-1"
                >
                  2. Lý do cụ thể <span className="text-red-600">*</span>
                </label>
                <select
                  id="case-category-select"
                  value={caseCategory}
                  onChange={(e) => {
                    setCaseCategory(e.target.value);
                    setCaseFieldErrors((prev) => ({ ...prev, category: undefined }));
                  }}
                  className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-xs sm:text-sm focus:border-brand focus:outline-none"
                >
                  {CASE_CATEGORY_BY_TYPE[caseType].map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {caseFieldErrors.category && (
                  <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                    {caseFieldErrors.category}
                  </p>
                )}
              </div>

              <div>
                <span className="block text-xs font-bold text-stone-800 mb-1.5">
                  3. Sản phẩm gặp sự cố <span className="text-red-600">*</span>
                </span>
                <div className="divide-y divide-line rounded-xl border border-line bg-stone-50/70 px-3">
                  {(order.items || []).map((item) => {
                    const qty = caseItemQuantities[item.productId] || 0;
                    const checked = qty > 0;
                    return (
                      <div
                        key={item.productId}
                        className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-xs"
                      >
                        <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            className="accent-brand-dark size-4"
                            checked={checked}
                            onChange={(e) => {
                              setCaseItemQuantities((prev) => ({
                                ...prev,
                                [item.productId]: e.target.checked ? item.quantity : 0,
                              }));
                              setCaseFieldErrors((prev) => ({ ...prev, items: undefined }));
                            }}
                          />
                          <div className="min-w-0">
                            <span className="font-semibold text-stone-900 block truncate">
                              {item.productName || `Sản phẩm #${item.productId}`}
                            </span>
                            <span className="text-[11px] text-muted">
                              {formatVnd(item.unitPrice)} · Đã mua: x{item.quantity}
                            </span>
                          </div>
                        </label>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-muted">SL:</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={item.quantity}
                            disabled={!checked}
                            value={checked ? qty : 0}
                            onKeyDown={(e) => {
                              if (['-', '+', 'e', 'E', '.'].includes(e.key)) {
                                e.preventDefault();
                              }
                            }}
                            onChange={(e) => {
                              const cleaned = e.target.value.replace(/\D/g, '');
                              const parsed = cleaned ? parseInt(cleaned, 10) : 0;
                              const clamped = Math.min(item.quantity, Math.max(0, parsed));
                              setCaseItemQuantities((prev) => ({
                                ...prev,
                                [item.productId]: clamped,
                              }));
                              setCaseFieldErrors((prev) => ({ ...prev, items: undefined }));
                            }}
                            className="w-16 rounded-lg border border-line bg-white px-2 py-1 text-center font-mono text-xs disabled:bg-stone-100"
                          />
                          <span className="text-muted">/ {item.quantity}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {caseFieldErrors.items && (
                  <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                    {caseFieldErrors.items}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="case-phone-input"
                  className="block text-xs font-bold text-stone-800 mb-1"
                >
                  4. Số điện thoại liên hệ <span className="text-red-600">*</span>
                </label>
                <input
                  id="case-phone-input"
                  type="tel"
                  inputMode="tel"
                  value={casePhone}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    setCasePhone(sanitizePhoneInput(e.target.value));
                    setCaseFieldErrors((prev) => ({ ...prev, phone: undefined }));
                  }}
                  placeholder="Ví dụ: 0912345678"
                  className={`w-full rounded-xl border px-3 py-2 text-xs sm:text-sm font-mono focus:outline-none ${
                    caseFieldErrors.phone
                      ? 'border-red-400 bg-red-50/30'
                      : 'border-line bg-white focus:border-brand'
                  }`}
                />
                {caseFieldErrors.phone && (
                  <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                    {caseFieldErrors.phone}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="case-description-input"
                    className="block text-xs font-bold text-stone-800"
                  >
                    5. Mô tả chi tiết tình trạng <span className="text-red-600">*</span>
                  </label>
                  <span className="text-[11px] text-muted">
                    {caseDescription.trim().length}/1000
                  </span>
                </div>
                <textarea
                  id="case-description-input"
                  rows={4}
                  maxLength={1000}
                  value={caseDescription}
                  onChange={(e) => {
                    setCaseDescription(e.target.value);
                    setCaseFieldErrors((prev) => ({ ...prev, description: undefined }));
                  }}
                  placeholder="Mô tả rõ tình trạng kiện hàng khi nhận, vị trí hư hỏng hoặc nội dung cần hỗ trợ..."
                  className={`w-full rounded-xl border p-3 text-xs sm:text-sm focus:outline-none ${
                    caseFieldErrors.description
                      ? 'border-red-400 bg-red-50/30'
                      : 'border-line bg-white focus:border-brand'
                  }`}
                />
                {caseFieldErrors.description && (
                  <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                    {caseFieldErrors.description}
                  </p>
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold text-stone-800">
                    6. Ảnh / PDF bằng chứng (tối đa 5MB/tệp)
                  </span>
                  <input
                    ref={caseFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => void handleCaseFileUpload(e)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={caseUploadingFile}
                    onClick={() => caseFileInputRef.current?.click()}
                    className="h-8 rounded-xl text-xs font-semibold"
                  >
                    {caseUploadingFile ? (
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    ) : (
                      <Paperclip className="mr-1.5 size-3.5" />
                    )}
                    Tải ảnh / PDF
                  </Button>
                </div>

                {caseAttachments.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-line bg-stone-50 p-3 text-xs text-muted">
                    Khuyến khích đính kèm ảnh chụp kiện hàng hoặc sản phẩm để nhân viên đối soát
                    nhanh hơn (có thể bổ sung sau qua tin nhắn).
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {caseAttachments.map((att) => (
                      <div
                        key={att.attachmentId}
                        className="flex items-center justify-between gap-2 rounded-xl border border-line bg-stone-50 p-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {att.mimeType.startsWith('image/') && att.previewUrl ? (
                            <img
                              src={att.previewUrl}
                              alt={att.fileName}
                              className="size-10 rounded-lg object-cover shrink-0 border border-line"
                            />
                          ) : (
                            <FileText className="size-8 text-brand-dark shrink-0" />
                          )}
                          <div className="min-w-0">
                            <span className="block truncate font-semibold text-stone-800">
                              {att.fileName}
                            </span>
                            <span className="text-[10px] text-muted">
                              {Math.max(1, Math.round(att.size / 1024))} KB
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setCaseAttachments((prev) =>
                              prev.filter((x) => x.attachmentId !== att.attachmentId),
                            )
                          }
                          className="p-1 text-stone-400 hover:text-red-600"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {caseAiVerdict && !caseAiVerdict.summary?.startsWith('[MOCK]') && (
                  <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-[11px] text-amber-950">
                    <strong className="font-semibold">Nhận diện nhanh từ ảnh bằng chứng:</strong>{' '}
                    {caseAiVerdict.damage_type} ({caseAiVerdict.severity}) — {caseAiVerdict.summary}
                  </div>
                )}

                {caseFieldErrors.attachments && (
                  <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                    {caseFieldErrors.attachments}
                  </p>
                )}
              </div>

              <div className="mt-5 flex justify-end gap-2.5 border-t border-line pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl text-xs sm:text-sm"
                  onClick={() => setCaseModalOpen(false)}
                >
                  Đóng
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl bg-brand-dark text-white hover:bg-brand-dark/90 text-xs sm:text-sm font-semibold"
                >
                  Xem lại yêu cầu
                </Button>
              </div>
            </form>
          )}

          {caseStep === 'REVIEW' && (
            <div className="mt-4 space-y-4 text-xs sm:text-sm">
              <div className="rounded-2xl border border-line bg-stone-50/80 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
                  <span className="font-bold text-stone-900">Tóm tắt hồ sơ · Đơn #{order.id}</span>
                  <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[11px] font-bold text-amber-950">
                    Chờ xác nhận gửi
                  </span>
                </div>

                <dl className="grid gap-2.5 sm:grid-cols-2 text-xs">
                  <div>
                    <dt className="text-muted">Loại hồ sơ:</dt>
                    <dd className="font-bold text-stone-900">
                      {CASE_TYPE_OPTIONS.find((o) => o.value === caseType)?.label}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Lý do cụ thể:</dt>
                    <dd className="font-semibold text-stone-900">{caseCategory}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Số điện thoại liên hệ:</dt>
                    <dd className="font-mono font-bold text-stone-900">{casePhone}</dd>
                  </div>
                </dl>

                <div className="border-t border-line pt-2.5">
                  <span className="block text-xs font-bold text-stone-800 mb-1">
                    Sản phẩm yêu cầu xử lý:
                  </span>
                  <ul className="space-y-1 text-xs">
                    {(order.items || [])
                      .filter((it) => (caseItemQuantities[it.productId] || 0) > 0)
                      .map((it) => (
                        <li
                          key={it.productId}
                          className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 border border-line/70"
                        >
                          <span className="font-semibold text-stone-800">
                            {it.productName || `Sản phẩm #${it.productId}`}
                          </span>
                          <span className="font-mono font-bold text-brand-dark">
                            x{caseItemQuantities[it.productId]} (
                            {formatVnd(it.unitPrice * (caseItemQuantities[it.productId] || 1))})
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>

                <div className="border-t border-line pt-2.5">
                  <span className="block text-xs font-bold text-stone-800 mb-1">
                    Nội dung mô tả:
                  </span>
                  <p className="rounded-xl bg-white p-3 text-xs text-stone-800 whitespace-pre-line border border-line/70">
                    {caseDescription.trim()}
                  </p>
                </div>

                <div className="border-t border-line pt-2.5">
                  <span className="block text-xs font-bold text-stone-800 mb-1">
                    Bằng chứng đính kèm ({caseAttachments.length}):
                  </span>
                  {caseAttachments.length === 0 ? (
                    <span className="text-xs text-muted">
                      Chưa đính kèm tệp (có thể gửi bổ sung trong hội thoại).
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {caseAttachments.map((att) => (
                        <span
                          key={att.attachmentId}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-medium text-stone-800"
                        >
                          <Paperclip className="size-3 text-brand-dark" />
                          {att.fileName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 leading-relaxed">
                Gửi hồ sơ sẽ chuyển vụ việc tới Bộ phận Hỗ trợ để kiểm tra đối soát. Việc mở hồ sơ
                không đồng nghĩa tiền sẽ được hoàn tự động ngay lập tức.
              </div>

              {caseFieldErrors.submit && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700"
                >
                  {caseFieldErrors.submit}
                </p>
              )}

              <div className="mt-5 flex flex-wrap justify-between gap-2.5 border-t border-line pt-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={submittingCase}
                  className="rounded-xl text-xs sm:text-sm"
                  onClick={() => setCaseStep('FORM')}
                >
                  Chỉnh sửa lại
                </Button>
                <Button
                  type="button"
                  disabled={submittingCase}
                  className="rounded-xl bg-red-600 text-white hover:bg-red-700 text-xs sm:text-sm font-semibold"
                  onClick={() => void handleConfirmSubmitCase()}
                >
                  {submittingCase ? (
                    <>
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                      Đang gửi hồ sơ...
                    </>
                  ) : (
                    'Gửi khiếu nại chính thức'
                  )}
                </Button>
              </div>
            </div>
          )}

          {caseStep === 'SUCCESS' && createdCaseResult && (
            <div className="mt-4 space-y-4 text-xs sm:text-sm">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 text-emerald-950 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                    <strong className="text-sm sm:text-base font-bold">
                      Hồ sơ khiếu nại đã được ghi nhận
                    </strong>
                  </div>
                  <span className="rounded-full bg-white border border-emerald-300 px-3 py-1 font-mono text-xs font-bold text-emerald-900">
                    {createdCaseResult.caseId}
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-emerald-900">
                  Mã vụ việc <strong className="font-mono">{createdCaseResult.caseId}</strong> đã
                  được gắn với đơn hàng <strong>#{order.id}</strong>. Bạn có thể theo dõi và nhắn
                  thêm cho nhân viên Hỗ trợ ngay trong khung trao đổi.
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-xl bg-white text-xs font-semibold text-stone-800"
                    onClick={async () => {
                      await navigator.clipboard.writeText(createdCaseResult.caseId);
                      setCopiedCaseId(true);
                      setTimeout(() => setCopiedCaseId(false), 2000);
                    }}
                  >
                    {copiedCaseId ? (
                      <>
                        <Check className="mr-1.5 size-3.5 text-emerald-600" />
                        Đã chép mã {createdCaseResult.caseId}
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1.5 size-3.5" />
                        Sao chép mã hồ sơ
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 border-t border-line pt-4">
                <Button
                  type="button"
                  className="rounded-xl bg-brand-dark text-white hover:bg-brand-dark/90 text-xs sm:text-sm font-semibold"
                  onClick={() => {
                    setCaseModalOpen(false);
                    setIsWorkspaceOpen(true);
                    setActiveChannel('SUPPORT');
                  }}
                >
                  Mở khung Hỗ trợ để theo dõi
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
