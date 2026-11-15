'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  FileText,
  Headphones,
  HelpCircle,
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
import {
  fetchReadOnlyOrderShipment,
  generateClientUuid,
  orderConversationsApi,
  type ReadOnlyOrderShipmentSnapshot,
} from '@/modules/commerce/api/order-conversations.api';
import type { OrderDetail } from '@/modules/commerce/types/order.types';
import type {
  AssistIntent,
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
    desc: 'Sản phẩm bị móp méo, nứt vỡ, rách niêm phong hoặc hư hại trong quá trình vận chuyển.',
  },
  {
    value: 'WRONG_ITEM',
    label: 'Giao sai mẫu / Thiếu phụ kiện',
    desc: 'Nhận không đúng sản phẩm đã đặt hoặc thiếu số lượng, phụ kiện đi kèm.',
  },
  {
    value: 'DELIVERY_ISSUE',
    label: 'Sự cố giao nhận / Chậm trễ vận đơn',
    desc: 'Vận đơn báo đã giao nhưng chưa nhận được hàng hoặc quá hạn bàn giao vận chuyển.',
  },
  {
    value: 'OTHER',
    label: 'Yêu cầu trả hàng / Khiếu nại khác',
    desc: 'Mở hồ sơ đề nghị trả lại hàng đã giao hoặc đối soát thanh toán theo quy định.',
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

const POLICY_QUICK_QUESTIONS = [
  'Hạn thanh toán đơn đấu giá và mức phạt quá hạn theo SRS là gì?',
  'Khi nào tôi được hủy đơn và quy trình hoàn tiền diễn ra thế nào?',
  'Nhận hàng bị vỡ hoặc lỗi thì quy trình gửi khiếu nại ra sao?',
];

function formatVnd(amount: number): string {
  return `${Math.round(amount || 0).toLocaleString('vi-VN')} ₫`;
}

function isValidVietnamPhone(value: string): boolean {
  const cleaned = value.trim().replace(/[\s.-]/g, '');
  return /^(0|\+84)(3|5|7|8|9)\d{8}$/.test(cleaned);
}

function sanitizePhoneInput(raw: string): string {
  // Chặn tuyệt đối dấu âm (-) và ký tự lạ, chỉ cho phép chữ số và dấu + ở đầu
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
  const buyerId = order.buyerId || 'buyer-current';
  const buyerName = recipientName && recipientName !== '—' ? recipientName : order.buyer || 'Buyer';

  const sellerOptions = useMemo(() => {
    const defaultSellerId = order.sellerId || 'seller-nexus-default';
    const defaultSellerName = order.seller || `Gian hàng #${defaultSellerId.slice(0, 8)}`;
    return [
      {
        sellerId: defaultSellerId,
        sellerName: defaultSellerName,
      },
    ];
  }, [order.seller, order.sellerId]);

  const [selectedSellerId, setSelectedSellerId] = useState<string>(
    () => sellerOptions[0]?.sellerId || 'seller-nexus-default',
  );

  // Trạng thái đóng/mở khung hội thoại
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState<boolean>(false);
  const [activeChannel, setActiveChannel] = useState<ConversationChannel>('SELLER');

  // Dữ liệu hội thoại & tin nhắn hiện tại
  const [conversation, setConversation] = useState<OrderConversation | null>(null);
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [hasOlderMessages, setHasOlderMessages] = useState<boolean>(false);
  const [loadingConversation, setLoadingConversation] = useState<boolean>(false);
  const [loadingOlder, setLoadingOlder] = useState<boolean>(false);

  // Snapshot vận đơn chỉ đọc (Read-only Shipment)
  const [shipmentSnapshot, setShipmentSnapshot] = useState<ReadOnlyOrderShipmentSnapshot | null>(
    null,
  );
  const [loadingShipment, setLoadingShipment] = useState<boolean>(false);

  // Composer state
  const [composerText, setComposerText] = useState<string>('');
  const [composerError, setComposerError] = useState<string>('');
  const [pendingAttachments, setPendingAttachments] = useState<ConversationAttachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState<boolean>(false);
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const [simulateNextSendFailure, setSimulateNextSendFailure] = useState<boolean>(false);

  // AI Assistant state
  const [aiLoadingIntent, setAiLoadingIntent] = useState<AssistIntent | null>(null);
  const [showPolicyPrompts, setShowPolicyPrompts] = useState<boolean>(false);
  const [customPolicyQuestion, setCustomPolicyQuestion] = useState<string>('');

  // Handoff & Cross-channel Escalation (SELLER -> SUPPORT)
  const [handoffLoading, setHandoffLoading] = useState<boolean>(false);
  const [escalateModalOpen, setEscalateModalOpen] = useState<boolean>(false);
  const [selectedShareSeqs, setSelectedShareSeqs] = useState<Record<number, boolean>>({});
  const [escalateReason, setEscalateReason] = useState<string>('');

  // Công cụ mô phỏng phản hồi để kiểm thử toàn diện trên FE
  const [showSimulatorBar, setShowSimulatorBar] = useState<boolean>(false);

  // 2-Step Broken Item / Complaint Case Modal (`POST /conversations/:id/cases`)
  const [caseModalOpen, setCaseModalOpen] = useState<boolean>(false);
  const [caseStep, setCaseStep] = useState<'FORM' | 'REVIEW' | 'SUCCESS'>('FORM');
  const [caseType, setCaseType] = useState<ComplaintCaseType>('DAMAGED_ITEM');
  const [caseCategory, setCaseCategory] = useState<string>('');
  const [caseDescription, setCaseDescription] = useState<string>('');
  const [casePhone, setCasePhone] = useState<string>('');
  const [caseItemQuantities, setCaseItemQuantities] = useState<Record<string, number>>({});
  const [caseAttachments, setCaseAttachments] = useState<ConversationAttachment[]>([]);
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

  const selectedSeller = useMemo(
    () =>
      sellerOptions.find((s) => s.sellerId === selectedSellerId) || {
        sellerId: selectedSellerId,
        sellerName: order.seller || `Gian hàng #${selectedSellerId}`,
      },
    [order.seller, selectedSellerId, sellerOptions],
  );

  // Tải thông tin vận đơn chỉ đọc (`?readOnly=true`)
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

  // Hàm mở hoặc chuyển kênh hội thoại (`POST /orders/:orderId/conversations`)
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
          err instanceof Error ? err.message : 'Không thể tải hội thoại đơn hàng lúc này.',
        );
      } finally {
        setLoadingConversation(false);
      }
    },
    [buyerId, order, selectedSeller.sellerId, selectedSeller.sellerName],
  );

  // Polling có kiểm soát (`after=cursor`) CHỈ khi khung chat đang mở
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

  // Lắng nghe trigger từ nút bên ngoài trong `buyer-order-detail-page.tsx`
  useEffect(() => {
    if (!externalTrigger) return;
    if (externalTrigger.action === 'OPEN_SELLER') {
      void openChannelWorkspace('SELLER');
    } else if (externalTrigger.action === 'OPEN_SUPPORT') {
      void openChannelWorkspace('SUPPORT');
    } else if (externalTrigger.action === 'ASK_AI_SHIPMENT') {
      void (async () => {
        await openChannelWorkspace('SUPPORT');
      })();
    } else if (externalTrigger.action === 'OPEN_CASE_MODAL') {
      void (async () => {
        if (!conversation) {
          await openChannelWorkspace('SUPPORT');
        }
        handleOpenCaseModal(externalTrigger.caseType || 'DAMAGED_ITEM');
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalTrigger?.nonce]);

  // Tải tin nhắn cũ hơn (`before=cursor`)
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

  // Tải tệp đính kèm trong khung chat (`POST /conversations/:id/attachments`)
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
      setComposerError(err instanceof Error ? err.message : 'Không thể tải tệp đính kèm.');
    } finally {
      setUploadingAttachment(false);
      if (composerFileInputRef.current) {
        composerFileInputRef.current.value = '';
      }
    }
  };

  // Gửi tin nhắn (`POST /conversations/:id/messages`) kèm cơ chế giữ lại khi lỗi & gửi lại idempotent
  const handleSendMessage = async (retryMessage?: OrderMessage) => {
    if (!conversation) return;

    const rawBody = retryMessage ? retryMessage.body : composerText;
    const trimmedBody = rawBody.trim();
    const attachmentsToSend = retryMessage ? retryMessage.attachments || [] : pendingAttachments;

    if (!retryMessage) {
      if (trimmedBody.length === 0) {
        setComposerError(
          'Vui lòng nhập nội dung tin nhắn (không được để trống hoặc chỉ khoảng trắng).',
        );
        return;
      }
      if ([...trimmedBody].length > 4000) {
        setComposerError(
          `Nội dung tin nhắn vượt quá giới hạn 4000 ký tự (hiện tại: ${[...trimmedBody].length} ký tự).`,
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
        {
          simulateNetworkFailure: shouldFailNow,
        },
      );

      setMessages((prev) =>
        prev.map((m) => (m.clientMessageId === clientMessageId ? result.message : m)),
      );
      setConversation(result.conversation);
      setTimeout(() => {
        messageListBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } catch (err) {
      const errorText =
        err instanceof Error ? err.message : 'Gửi tin nhắn thất bại. Vui lòng thử gửi lại.';
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

  // Gọi Trợ lý Nexus (AI) (`POST /conversations/:id/assist`)
  const handleAskAiAssistant = async (intent: AssistIntent, question?: string) => {
    let activeConv = conversation;
    if (!activeConv) {
      setIsWorkspaceOpen(true);
      const opened = await orderConversationsApi.openOrGetConversation(order, buyerId, {
        orderId: String(order.id),
        channel: activeChannel,
        sellerId: activeChannel === 'SELLER' ? selectedSeller.sellerId : undefined,
        sellerName: selectedSeller.sellerName,
      });
      activeConv = opened.conversation;
      setConversation(opened.conversation);
      setMessages(opened.messages);
    }

    setAiLoadingIntent(intent);
    setComposerError('');
    try {
      const latestShipment = await fetchReadOnlyOrderShipment(order);
      setShipmentSnapshot(latestShipment);

      const defaultQuestion =
        intent === 'TRACK_SHIPMENT'
          ? `Tra cứu trạng thái vận đơn của đơn hàng #${order.id}`
          : intent === 'DRAFT_COMPLAINT'
            ? `Nhờ Trợ lý Nexus soạn nháp nội dung khiếu nại cho đơn hàng #${order.id}`
            : question || POLICY_QUICK_QUESTIONS[0];

      const response = await orderConversationsApi.askAiAssistant(order, buyerId, buyerName, {
        conversationId: activeConv.id,
        clientMessageId: generateClientUuid(),
        intent,
        question: question || defaultQuestion,
      });

      setConversation(response.conversation);
      setMessages((prev) => {
        const existingClientIds = new Set(prev.map((m) => m.clientMessageId));
        const next = [...prev];
        if (!existingClientIds.has(response.buyerMessage.clientMessageId)) {
          next.push(response.buyerMessage);
        }
        if (!existingClientIds.has(response.aiMessage.clientMessageId)) {
          next.push(response.aiMessage);
        }
        return next.sort((a, b) => a.seq - b.seq);
      });

      if (intent === 'DRAFT_COMPLAINT' && response.aiMessage.aiMetadata?.draftComplaint) {
        const draft = response.aiMessage.aiMetadata.draftComplaint;
        handleOpenCaseModal(draft.type, {
          description: draft.description,
        });
      }

      setTimeout(() => {
        messageListBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    } catch (err) {
      setComposerError(
        err instanceof Error
          ? err.message
          : 'Trợ lý Nexus tạm thời không phản hồi. Bạn có thể bấm "Gặp nhân viên" để nhắn trực tiếp.',
      );
    } finally {
      setAiLoadingIntent(null);
    }
  };

  // Chuyển sang người thật (`POST /conversations/:id/handoff`)
  const handleRequestHumanHandoff = async (topicOverride?: string) => {
    if (!conversation) return;
    setHandoffLoading(true);
    setComposerError('');
    try {
      const res = await orderConversationsApi.requestHumanHandoff(buyerId, buyerName, {
        conversationId: conversation.id,
        topic:
          topicOverride ||
          `Buyer yêu cầu gặp nhân viên hỗ trợ trực tiếp cho đơn hàng #${order.id}.`,
      });
      setConversation(res.conversation);
      setMessages((prev) => [...prev, res.systemMessage]);
      setTimeout(() => {
        messageListBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    } catch (err) {
      setComposerError(
        err instanceof Error ? err.message : 'Không thể chuyển sang hàng chờ nhân viên.',
      );
    } finally {
      setHandoffLoading(false);
    }
  };

  // Chuyển từ kênh SELLER sang kênh SUPPORT có chọn lọc tin nhắn đồng ý chia sẻ
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
    await openChannelWorkspace('SUPPORT');

    const supportOpened = await orderConversationsApi.openOrGetConversation(order, buyerId, {
      orderId: String(order.id),
      channel: 'SUPPORT',
      requestHuman: true,
    });
    const res = await orderConversationsApi.requestHumanHandoff(buyerId, buyerName, {
      conversationId: supportOpened.conversation.id,
      topic:
        escalateReason.trim() ||
        `Chuyển từ hội thoại với ${selectedSeller.sellerName} sang Bộ phận Hỗ trợ Nexus (Đơn #${order.id}).`,
      sharedFromSellerConversationId: sellerConvId,
      sharedMessages,
    });
    setConversation(res.conversation);
    const updatedList = await orderConversationsApi.listMessages(res.conversation.id, {
      limit: 30,
    });
    setMessages(updatedList.items);
  };

  // Mở biểu mẫu Báo hàng vỡ / Khiếu nại 2 bước (`POST /conversations/:id/cases`)
  const handleOpenCaseModal = (
    initialType: ComplaintCaseType = 'DAMAGED_ITEM',
    prefill?: {
      category?: string;
      description?: string;
    },
  ) => {
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
    // Tạo sẵn Idempotency-Key cố định cho phiên mở form này để chống tạo trùng khi bấm đúp / mạng chập chờn
    setCaseIdempotencyKey(generateClientUuid());
    setCaseModalOpen(true);
  };

  // Tải ảnh/PDF bằng chứng trong biểu mẫu Khiếu nại
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
      }
    } catch (err) {
      setCaseFieldErrors((prev) => ({
        ...prev,
        attachments: err instanceof Error ? err.message : 'Không thể tải lên tệp bằng chứng.',
      }));
    } finally {
      setCaseUploadingFile(false);
      if (caseFileInputRef.current) {
        caseFileInputRef.current.value = '';
      }
    }
  };

  // Kiểm tra hợp lệ Bước 1 -> Chuyển sang Bước 2 (Xem lại yêu cầu trước khi gửi chính thức)
  const handleProceedToCaseReview = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof caseFieldErrors = {};

    if (!caseCategory.trim()) {
      errors.category = 'Vui lòng chọn phân loại sự cố / lý do khiếu nại.';
    }

    const selectedItems = (order.items || []).filter(
      (item) => (caseItemQuantities[item.productId] || 0) > 0,
    );
    if (selectedItems.length === 0) {
      errors.items = 'Vui lòng chọn ít nhất 1 sản phẩm trong đơn hàng bị ảnh hưởng.';
    } else {
      const invalidRange = selectedItems.some((item) => {
        const q = caseItemQuantities[item.productId] || 0;
        return !Number.isInteger(q) || q < 1 || q > item.quantity;
      });
      if (invalidRange) {
        errors.items =
          'Số lượng sản phẩm khiếu nại phải là số nguyên dương và không vượt quá số lượng đã mua.';
      }
    }

    if (!isValidVietnamPhone(casePhone)) {
      errors.phone =
        'Vui lòng nhập số điện thoại Việt Nam hợp lệ (10 chữ số bắt đầu bằng 0 hoặc +84, không chứa số âm).';
    }

    const trimmedDesc = caseDescription.trim();
    if (trimmedDesc.length < 15) {
      errors.description = `Mô tả tình trạng thực tế cần tối thiểu 15 ký tự (hiện tại: ${trimmedDesc.length} ký tự).`;
    } else if (trimmedDesc.length > 1000) {
      errors.description = 'Mô tả không được vượt quá 1000 ký tự.';
    }

    setCaseFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setCaseStep('REVIEW');
  };

  // Bước 2: Gửi chính thức `POST /conversations/:id/cases` kèm `Idempotency-Key`
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

      const result = await orderConversationsApi.createCaseFromConversation(buyerId, buyerName, {
        conversationId: targetConv.id,
        idempotencyKey: caseIdempotencyKey || generateClientUuid(),
        type: caseType,
        items: selectedItemsPayload,
        description: fullDescription,
        contactPhone: casePhone.trim(),
        attachmentIds: caseAttachments.map((a) => a.attachmentId),
      });

      setCreatedCaseResult(result.caseSummary);
      setConversation(result.conversation);
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
            : 'Không thể khởi tạo hồ sơ khiếu nại. Vui lòng thử lại.',
      }));
    } finally {
      setSubmittingCase(false);
    }
  };

  // Công cụ mô phỏng phản hồi của Seller / Support / Đóng hội thoại để kiểm thử trực quan
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
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
            <span className="size-1.5 rounded-full bg-emerald-600" />
            Đang mở (OPEN)
          </span>
        );
      case 'WAITING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
            <Clock className="size-3 text-amber-700" />
            Đang chờ nhân viên tiếp nhận (WAITING)
          </span>
        );
      case 'ASSIGNED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold text-sky-900">
            <UserCheck className="size-3 text-sky-700" />
            Nhân viên: {conv.assigneeName || conv.assigneeId || 'Support Staff'} (ASSIGNED)
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-stone-300 bg-stone-100 px-2.5 py-0.5 text-[11px] font-bold text-stone-700">
            <Lock className="size-3 text-stone-500" />
            Đã đóng (CLOSED)
          </span>
        );
    }
  };

  return (
    <>
      {/* THANH LỐI VÀO HỘI THOẠI ĐƠN HÀNG & TRỢ LÝ AI (Đặt ngay dưới Diễn biến đơn hàng theo đúng đặc tả) */}
      <section
        aria-label="Nhắn tin theo đơn hàng và Trợ lý Nexus"
        className="mt-5 rounded-2xl border border-line bg-white p-4 sm:p-5 shadow-xs"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-dark border border-brand/20">
              <MessageSquare className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-stone-900 text-sm sm:text-base">
                  Trao đổi theo đơn hàng #{order.id} & Trợ lý Nexus
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                  <Sparkles className="size-2.5 text-amber-600" />
                  Có AI hỗ trợ & Chuyển nhân viên
                </span>
                {latestLinkedCase && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    <CheckCircle2 className="size-3 text-emerald-600" />
                    Mã hồ sơ: {latestLinkedCase.caseId}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted leading-relaxed">
                Nhắn trực tiếp cho{' '}
                <strong className="text-stone-800">{selectedSeller.sellerName}</strong> hoặc{' '}
                <strong className="text-stone-800">Bộ phận Hỗ trợ (Support)</strong> ngay trên đơn
                hàng này. Bạn có thể hỏi nhanh Trợ lý Nexus về vận đơn, chính sách SRS hoặc gửi báo
                hàng vỡ có đính kèm bằng chứng.
              </p>
            </div>
          </div>

          {/* Cụm nút hành động chính: Nhắn người bán | Liên hệ hỗ trợ | Hỏi AI | Báo hàng vỡ */}
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
              onClick={() => {
                void (async () => {
                  if (!isWorkspaceOpen) {
                    await openChannelWorkspace('SUPPORT');
                  }
                  await handleAskAiAssistant('TRACK_SHIPMENT');
                })();
              }}
            >
              <Bot className="mr-1.5 size-3.5 text-amber-700" />
              Hỏi AI về vận đơn
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

        {/* KHUNG HỘI THOẠI TRỰC TIẾP (MỞ RỘNG NGAY TRONG TRANG CHI TIẾT ĐƠN) */}
        {isWorkspaceOpen && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-stone-50/50">
            {/* 1. HEADER HỘI THOẠI: Mã đơn, người nhận, trạng thái vận đơn chỉ đọc & thời điểm cập nhật */}
            <div className="border-b border-line bg-white px-4 py-3.5 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Bộ chuyển kênh nhanh trong Header */}
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
                      <span>Kênh Người bán ({selectedSeller.sellerName})</span>
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
                      <span>Kênh Hỗ trợ Nexus (Support)</span>
                    </button>
                  </div>

                  {renderStateBadge(conversation)}

                  <span
                    title={
                      conversation?.sourceMode === 'LIVE_API'
                        ? 'Đang kết nối trực tiếp API Backend'
                        : 'Backend chưa bật route chat — đang lưu & đồng bộ an toàn trên trình duyệt theo đúng hợp đồng API'
                    }
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                      conversation?.sourceMode === 'LIVE_API'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-stone-200 bg-stone-100 text-stone-600'
                    }`}
                  >
                    {conversation?.sourceMode === 'LIVE_API'
                      ? 'API Trực tuyến'
                      : 'Chế độ tương thích FE'}
                  </span>
                </div>

                {/* Hành động chuyển kênh hoặc gặp nhân viên thật */}
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
                      Chuyển sang Liên hệ Hỗ trợ
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
                          ? `Đã kết nối ${conversation.assigneeName || 'Support'}`
                          : 'Gặp nhân viên'}
                    </Button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowSimulatorBar((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-xl border border-line bg-stone-50 px-2.5 py-1.5 text-[11px] font-semibold text-stone-600 hover:bg-stone-100"
                    title="Mở thanh mô phỏng phản hồi từ Seller / Support / Lỗi mạng để kiểm thử"
                  >
                    <Wrench className="size-3" />
                    <span>Kiểm thử trạng thái</span>
                  </button>
                </div>
              </div>

              {/* Dòng tóm tắt ngữ cảnh đơn hàng cố định ở đầu hội thoại (Theo mục 5.2 báo cáo thiết kế) */}
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
                    <span>Vận đơn (chỉ đọc):</span>
                    {loadingShipment ? (
                      <span className="text-muted">Đang tra cứu...</span>
                    ) : shipmentSnapshot?.hasShipment ? (
                      <strong className="text-stone-900">
                        {shipmentSnapshot.statusLabel}{' '}
                        {shipmentSnapshot.trackingCode
                          ? `(${shipmentSnapshot.carrier || 'GHN'}: ${shipmentSnapshot.trackingCode})`
                          : ''}
                      </strong>
                    ) : (
                      <strong className="text-amber-800">Đơn chưa có vận đơn</strong>
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

                <div className="flex items-center gap-2 text-[11px] text-muted">
                  <span>
                    Cập nhật:{' '}
                    {shipmentSnapshot?.updatedAt
                      ? new Date(shipmentSnapshot.updatedAt).toLocaleString('vi-VN')
                      : new Date(order.createdAt).toLocaleString('vi-VN')}
                  </span>
                  <button
                    type="button"
                    onClick={() => void refreshReadOnlyShipment()}
                    className="inline-flex items-center gap-1 text-brand-dark hover:underline font-medium"
                    title="Làm mới trạng thái vận đơn (chỉ đọc, không tạo vận đơn thử nghiệm)"
                  >
                    <RefreshCw className="size-3" />
                    Làm mới
                  </button>
                </div>
              </div>

              {/* Thanh mô phỏng kiểm thử dành cho lập trình viên / QA */}
              {showSimulatorBar && conversation && (
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-3 py-2 text-[11px]">
                  <span className="font-bold text-amber-950">
                    Công cụ mô phỏng đối tác ({activeChannel === 'SELLER' ? 'Seller' : 'Support'}):
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void handleSimulateAction('MARK_READ')}
                      className="rounded-lg border border-amber-300 bg-white px-2 py-1 font-semibold text-stone-800 hover:bg-amber-100"
                    >
                      1. Đối tác Đã đọc (cập nhật seq)
                    </button>
                    {activeChannel === 'SELLER' ? (
                      <button
                        type="button"
                        onClick={() => void handleSimulateAction('SELLER_REPLY')}
                        className="rounded-lg border border-amber-300 bg-white px-2 py-1 font-semibold text-stone-800 hover:bg-amber-100"
                      >
                        2. Người bán gửi tin trả lời
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleSimulateAction('SUPPORT_CLAIM_AND_REPLY')}
                        className="rounded-lg border border-sky-300 bg-white px-2 py-1 font-semibold text-sky-900 hover:bg-sky-50"
                      >
                        2. Nhân viên Support nhận việc & trả lời (ASSIGNED)
                      </button>
                    )}
                    {conversation.state !== 'CLOSED' ? (
                      <button
                        type="button"
                        onClick={() => void handleSimulateAction('RESOLVE_AND_CLOSE')}
                        className="rounded-lg border border-stone-300 bg-white px-2 py-1 font-semibold text-stone-700 hover:bg-stone-100"
                      >
                        3. Đóng hội thoại (CLOSED)
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleSimulateAction('REOPEN_THREAD')}
                        className="rounded-lg border border-emerald-300 bg-white px-2 py-1 font-semibold text-emerald-800 hover:bg-emerald-50"
                      >
                        3. Mở lại hội thoại (OPEN)
                      </button>
                    )}
                    <label className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-1 font-semibold text-red-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={simulateNextSendFailure}
                        onChange={(e) => setSimulateNextSendFailure(e.target.checked)}
                      />
                      <span>Giả lập lỗi mạng lần gửi tới</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* 2. THANH CÔNG CỤ TRỢ LÝ NEXUS (AI) */}
            <div className="border-b border-line bg-amber-50/40 px-4 py-2.5 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 font-bold text-amber-950 border border-amber-200">
                    <Bot className="size-3.5 text-amber-800" />
                    Trợ lý Nexus (AI)
                  </span>
                  <span className="text-stone-600 hidden sm:inline">
                    Hỗ trợ tra cứu vận đơn chỉ đọc, trích dẫn chính sách SRS v1.0 & soạn nháp khiếu
                    nại:
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={Boolean(aiLoadingIntent)}
                    onClick={() => void handleAskAiAssistant('TRACK_SHIPMENT')}
                    className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-800 hover:bg-amber-50 disabled:opacity-50"
                  >
                    {aiLoadingIntent === 'TRACK_SHIPMENT' ? (
                      <Loader2 className="size-3.5 animate-spin text-amber-700" />
                    ) : (
                      <Truck className="size-3.5 text-amber-700" />
                    )}
                    <span>Hỏi AI về vận đơn</span>
                  </button>

                  <button
                    type="button"
                    disabled={Boolean(aiLoadingIntent)}
                    onClick={() => setShowPolicyPrompts((prev) => !prev)}
                    className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-800 hover:bg-amber-50 disabled:opacity-50"
                  >
                    <HelpCircle className="size-3.5 text-amber-700" />
                    <span>Hỏi chính sách SRS</span>
                    <ChevronDown className="size-3 text-stone-500" />
                  </button>

                  <button
                    type="button"
                    disabled={Boolean(aiLoadingIntent)}
                    onClick={() => void handleAskAiAssistant('DRAFT_COMPLAINT')}
                    className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-800 hover:bg-amber-50 disabled:opacity-50"
                  >
                    {aiLoadingIntent === 'DRAFT_COMPLAINT' ? (
                      <Loader2 className="size-3.5 animate-spin text-amber-700" />
                    ) : (
                      <Sparkles className="size-3.5 text-amber-700" />
                    )}
                    <span>Nhờ AI soạn nháp khiếu nại</span>
                  </button>
                </div>
              </div>

              {/* Hộp gợi ý câu hỏi chính sách SRS v1.0 */}
              {showPolicyPrompts && (
                <div className="mt-2.5 rounded-xl border border-amber-200 bg-white p-3 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {POLICY_QUICK_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        disabled={Boolean(aiLoadingIntent)}
                        onClick={() => {
                          setShowPolicyPrompts(false);
                          void handleAskAiAssistant('POLICY_FAQ', q);
                        }}
                        className="rounded-lg border border-line bg-stone-50 px-2.5 py-1 text-left text-[11px] font-medium text-stone-700 hover:border-amber-300 hover:bg-amber-50/50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customPolicyQuestion}
                      onChange={(e) => setCustomPolicyQuestion(e.target.value)}
                      placeholder="Hoặc nhập câu hỏi chính sách bạn muốn hỏi Trợ lý Nexus..."
                      className="flex-1 rounded-xl border border-line bg-stone-50/60 px-3 py-1.5 text-xs focus:border-brand focus:bg-white focus:outline-none"
                    />
                    <Button
                      type="button"
                      disabled={!customPolicyQuestion.trim() || Boolean(aiLoadingIntent)}
                      className="h-8 rounded-xl bg-amber-700 text-white hover:bg-amber-800 text-xs px-3"
                      onClick={() => {
                        const q = customPolicyQuestion.trim();
                        setCustomPolicyQuestion('');
                        setShowPolicyPrompts(false);
                        void handleAskAiAssistant('POLICY_FAQ', q);
                      }}
                    >
                      Hỏi AI
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. BANNER TRẠNG THÁI HÀNG CHỜ NHÂN VIÊN HOẶC HỒ SƠ ĐÃ TẠO */}
            {conversation?.state === 'WAITING' && (
              <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-amber-700 shrink-0" />
                  <span>
                    <strong>Đang chờ nhân viên hỗ trợ tiếp nhận:</strong> Bạn vẫn có thể gửi thêm
                    tin nhắn, hình ảnh hoặc đóng trang lại; lịch sử sẽ được giữ nguyên khi nhân viên
                    nhận xử lý.
                  </span>
                </div>
              </div>
            )}

            {latestLinkedCase && (
              <div className="border-b border-emerald-200 bg-emerald-50/80 px-4 py-2.5 text-xs text-emerald-950 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-700 shrink-0" />
                  <span>
                    Hội thoại này đã liên kết với hồ sơ khiếu nại chính thức{' '}
                    <strong className="font-mono">{latestLinkedCase.caseId}</strong> (Trạng thái:{' '}
                    <strong>{latestLinkedCase.status}</strong>).
                  </span>
                </div>
                <span className="text-[11px] text-emerald-800">
                  Mở hồ sơ không đồng nghĩa tiền được hoàn tự động ngay lập tức.
                </span>
              </div>
            )}

            {/* 4. DANH SÁCH TIN NHẮN (`GET /conversations/:id/messages`) */}
            <div className="max-h-[430px] min-h-[260px] overflow-y-auto p-4 sm:p-5 space-y-3.5">
              {loadingConversation ? (
                <div className="flex flex-col items-center justify-center py-12 text-xs text-muted gap-2">
                  <Loader2 className="size-5 animate-spin text-brand-dark" />
                  <span>Đang đồng bộ lịch sử hội thoại đơn hàng #{order.id}...</span>
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
                        <span>Tải tin nhắn cũ hơn</span>
                      </button>
                    </div>
                  )}

                  {messages.map((msg) => {
                    const isBuyer = msg.authorRole === 'BUYER';
                    const isAi = msg.authorRole === 'AI';
                    const isSupport = msg.authorRole === 'SUPPORT_STAFF';
                    const isReadByCounterpart =
                      isBuyer &&
                      msg.deliveryStatus !== 'failed' &&
                      msg.deliveryStatus !== 'sending' &&
                      conversation !== null &&
                      msg.seq <= conversation.counterpartLastReadSeq;

                    const policySources = msg.aiMetadata?.policySources || [];

                    return (
                      <div
                        key={`${msg.seq}-${msg.clientMessageId}`}
                        className={`flex flex-col ${isBuyer ? 'items-end' : 'items-start'}`}
                      >
                        {/* Nhãn phân biệt rõ người gửi: Buyer / Người bán / Nhân viên hỗ trợ / Trợ lý Nexus */}
                        <div className="mb-1 flex items-center gap-1.5 px-1 text-[11px]">
                          {isAi ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 font-bold text-amber-950 border border-amber-300">
                              <Bot className="size-3 text-amber-800" />
                              Trợ lý Nexus (AI tự động)
                            </span>
                          ) : isSupport ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-900 border border-emerald-200">
                              <Headphones className="size-3 text-emerald-700" />
                              {msg.authorName || 'Support Staff'} · Nhân viên Hỗ trợ
                            </span>
                          ) : isBuyer ? (
                            <span className="font-semibold text-stone-600">Bạn ({buyerName})</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-stone-200/80 px-1.5 py-0.5 font-bold text-stone-800">
                              <Store className="size-3 text-brand-dark" />
                              {msg.authorName || selectedSeller.sellerName} · Người bán
                            </span>
                          )}
                          <span className="text-stone-400">
                            {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Bong bóng nội dung tin nhắn */}
                        <div
                          className={`max-w-[88%] sm:max-w-[76%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                            isBuyer
                              ? msg.deliveryStatus === 'failed'
                                ? 'border border-red-300 bg-red-50 text-red-950'
                                : 'bg-stone-900 text-white'
                              : isAi
                                ? 'border border-amber-200 bg-amber-50/90 text-stone-900'
                                : isSupport
                                  ? 'border border-emerald-200 bg-white text-stone-900'
                                  : 'border border-line bg-white text-stone-900'
                          }`}
                        >
                          <div className="whitespace-pre-line break-words">{msg.body}</div>

                          {/* Trích dẫn chính sách SRS nếu là tin nhắn từ AI */}
                          {isAi && policySources.length > 0 && (
                            <div className="mt-2.5 border-t border-amber-200/80 pt-2">
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-900">
                                Nguồn đối chiếu quy định:
                              </span>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {policySources.map((cite) => (
                                  <span
                                    key={cite}
                                    className="rounded-md bg-white/90 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-950"
                                  >
                                    {cite}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Nút hành động dự phòng ngay dưới câu trả lời AI (Gặp nhân viên / Mở form khiếu nại) */}
                          {isAi && (
                            <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-amber-200/80 pt-2.5">
                              {activeChannel === 'SUPPORT' ? (
                                <button
                                  type="button"
                                  onClick={() => void handleRequestHumanHandoff()}
                                  className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-bold text-stone-800 hover:bg-amber-100"
                                >
                                  <UserCheck className="size-3 text-emerald-700" />
                                  Gặp nhân viên hỗ trợ
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => void openChannelWorkspace('SUPPORT')}
                                  className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-bold text-stone-800 hover:bg-amber-100"
                                >
                                  <Headphones className="size-3 text-emerald-700" />
                                  Chuyển sang Kênh Hỗ trợ
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenCaseModal('DAMAGED_ITEM')}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-800 hover:bg-red-100"
                              >
                                <ShieldAlert className="size-3 text-red-600" />
                                Mở biểu mẫu Báo hàng vỡ / Khiếu nại
                              </button>
                            </div>
                          )}

                          {/* Danh sách tệp đính kèm trong tin nhắn */}
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

                        {/* Trạng thái gửi / Đã đọc (`seq <= counterpartLastReadSeq`) / Nút Gửi lại khi lỗi */}
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
                                  Chưa gửi được ({msg.deliveryError || 'Lỗi kết nối'})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => void handleSendMessage(msg)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-red-700"
                                >
                                  <RotateCcw className="size-3" />
                                  Gửi lại (giữ nguyên ID)
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
                                    <span>Đã đọc (seq #{msg.seq})</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="size-3.5 text-stone-400" />
                                    <span>Đã gửi (seq #{msg.seq})</span>
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

            {/* 5. Ô SOẠN TIN NHẮN (COMPOSER) GẮN NHÃN RÕ KÊNH ĐANG NHẮN */}
            <div className="border-t border-line bg-white p-3.5 sm:p-4">
              {/* Nhãn kênh nhận tin rõ ràng theo mục 5.2 báo cáo thiết kế */}
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-stone-800">
                    {activeChannel === 'SELLER'
                      ? `Đang soạn tin gửi cho Người bán: ${selectedSeller.sellerName}`
                      : 'Đang soạn tin gửi cho Bộ phận Hỗ trợ Nexus (Support)'}
                  </span>
                  {activeChannel === 'SUPPORT' && (
                    <span className="text-[11px] text-muted">
                      (Bạn vẫn có thể nhắn cho nhân viên ngay cả khi chưa có ảnh đính kèm)
                    </span>
                  )}
                </div>
                <span
                  className={`font-mono text-[11px] ${
                    [...composerText.trim()].length > 4000 ? 'font-bold text-red-600' : 'text-muted'
                  }`}
                >
                  {[...composerText.trim()].length}/4000 ký tự
                </span>
              </div>

              {/* Danh sách tệp đính kèm đang chờ gửi trong Composer */}
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
                      Hội thoại này đã đóng (`CLOSED`). Máy chủ từ chối gửi tin nhắn mới (409
                      Conflict). Nếu vấn đề chưa được giải quyết, bạn có thể mở lại luồng hỗ trợ.
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-xl bg-white text-xs font-semibold"
                    onClick={() => void handleSimulateAction('REOPEN_THREAD')}
                  >
                    Mở yêu cầu tiếp nối
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
                        ? `Gửi cho người bán (${selectedSeller.sellerName})... (Nhấn Enter để gửi, Shift+Enter xuống dòng)`
                        : 'Gửi cho bộ phận hỗ trợ Nexus... (Nhấn Enter để gửi, Shift+Enter xuống dòng)'
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

      {/* HỘP THOẠI CHUYỂN TỪ KÊNH SELLER SANG SUPPORT (CHỌN TIN NHẮN ĐỒNG Ý CHIA SẺ) */}
      <Dialog open={escalateModalOpen} onOpenChange={setEscalateModalOpen}>
        <DialogContent className="max-w-lg p-6 max-h-[90vh] overflow-y-auto">
          <DialogTitle className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
            <Headphones className="size-5 text-emerald-700" />
            <span>Chuyển sang Liên hệ Bộ phận Hỗ trợ · Đơn #{order.id}</span>
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-xs leading-relaxed text-muted">
            Theo quy định bảo mật hội thoại, khi chuyển từ kênh Người bán sang kênh Hỗ trợ Nexus, hệ
            thống chỉ mang theo <strong>mã đơn #{order.id}</strong> và các đoạn tin nhắn mà bạn chủ
            động chọn chia sẻ bên dưới.
          </DialogDescription>

          <div className="mt-4 space-y-3 text-xs">
            <div>
              <label
                htmlFor="escalate-reason-input"
                className="block font-semibold text-stone-800 mb-1"
              >
                Lý do cần Bộ phận Hỗ trợ can thiệp
              </label>
              <input
                id="escalate-reason-input"
                type="text"
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                placeholder="Ví dụ: Người bán chưa phản hồi phương án đổi trả hàng bị vỡ..."
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs focus:border-brand focus:outline-none"
              />
            </div>

            <div>
              <span className="block font-semibold text-stone-800 mb-1.5">
                Chọn các tin nhắn với Người bán mà bạn đồng ý đính kèm cho Support:
              </span>
              <div className="max-h-48 overflow-y-auto divide-y divide-line rounded-xl border border-line bg-stone-50/70 px-3">
                {messages.filter((m) => m.authorRole !== 'AI').length === 0 ? (
                  <p className="py-4 text-center text-muted">
                    Chưa có tin nhắn trao đổi nào với Người bán.
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
              Chuyển sang Hỗ trợ & Gặp nhân viên
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* HỘP THOẠI 2 BƯỚC: BÁO HÀNG VỠ / GỬI KHIẾU NẠI CHÍNH THỨC (`POST /conversations/:id/cases`) */}
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
              {caseStep === 'FORM' &&
                `Bước 1/2: Soạn yêu cầu Báo hàng vỡ / Khiếu nại · Đơn #${order.id}`}
              {caseStep === 'REVIEW' &&
                `Bước 2/2: Xem lại yêu cầu trước khi Gửi khiếu nại · Đơn #${order.id}`}
              {caseStep === 'SUCCESS' && `Đã tạo hồ sơ khiếu nại chính thức · Đơn #${order.id}`}
            </span>
          </DialogTitle>

          <DialogDescription className="mt-1 text-xs leading-relaxed text-muted">
            {caseStep === 'FORM' &&
              'Chọn sản phẩm gặp sự cố, mô tả tình trạng thực tế và đính kèm hình ảnh/tài liệu bằng chứng (<= 5MB). Bước tiếp theo sẽ giúp bạn kiểm tra lại toàn bộ thông tin trước khi gửi chính thức.'}
            {caseStep === 'REVIEW' &&
              'Vui lòng kiểm tra kỹ thông tin bên dưới. Khi bạn bấm "Gửi khiếu nại chính thức", hệ thống sẽ gọi POST /conversations/:id/cases kèm khóa chống gửi trùng (Idempotency-Key).'}
            {caseStep === 'SUCCESS' &&
              'Hồ sơ của bạn đã được ghi nhận và gắn mã vụ việc để Bộ phận Hỗ trợ (Support) và Người bán đối soát.'}
          </DialogDescription>

          {/* BƯỚC 1: FORM NHẬP THÔNG TIN VÀ TẢI BẰNG CHỨNG */}
          {caseStep === 'FORM' && (
            <form
              onSubmit={handleProceedToCaseReview}
              className="mt-4 space-y-4 text-xs sm:text-sm"
            >
              {/* 1. Loại yêu cầu */}
              <div>
                <span className="block text-xs font-bold text-stone-800 mb-1.5">
                  1. Chọn loại hồ sơ cần mở <span className="text-red-600">*</span>
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

              {/* 2. Lý do chi tiết */}
              <div>
                <label
                  htmlFor="case-category-select"
                  className="block text-xs font-bold text-stone-800 mb-1"
                >
                  2. Phân loại nguyên nhân cụ thể <span className="text-red-600">*</span>
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

              {/* 3. Chọn sản phẩm và số lượng bị ảnh hưởng (Chặn tuyệt đối số âm) */}
              <div>
                <span className="block text-xs font-bold text-stone-800 mb-1.5">
                  3. Chọn sản phẩm và số lượng bị ảnh hưởng trong đơn #{order.id}{' '}
                  <span className="text-red-600">*</span>
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
                              Đơn giá: {formatVnd(item.unitPrice)} · Đã mua: x{item.quantity}
                            </span>
                          </div>
                        </label>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-muted">SL khiếu nại:</span>
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

              {/* 4. Số điện thoại liên hệ xác minh (Chặn dấu âm `-`) */}
              <div>
                <label
                  htmlFor="case-phone-input"
                  className="block text-xs font-bold text-stone-800 mb-1"
                >
                  4. Số điện thoại liên hệ xác minh <span className="text-red-600">*</span>
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
                  placeholder="Ví dụ: 0912345678 (10 chữ số, không nhập số âm)"
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

              {/* 5. Mô tả chi tiết tình trạng thực tế */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="case-description-input"
                    className="block text-xs font-bold text-stone-800"
                  >
                    5. Mô tả chi tiết tình trạng thực tế <span className="text-red-600">*</span>
                  </label>
                  <span className="text-[11px] text-muted">
                    {caseDescription.trim().length}/1000 ký tự (tối thiểu 15)
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
                  placeholder="Mô tả rõ tình trạng kiện hàng khi nhận, vị trí nứt vỡ, mã vận đơn hoặc thỏa thuận với người bán..."
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

              {/* 6. Tải lên bằng chứng (`POST /conversations/:id/attachments`) */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold text-stone-800">
                    6. Hình ảnh / Tài liệu bằng chứng (JPG, PNG, WEBP, PDF · Tối đa 5MB/tệp)
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
                    Tải ảnh / PDF bằng chứng
                  </Button>
                </div>

                {caseAttachments.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-line bg-stone-50 p-3 text-xs text-muted">
                    Chưa có tệp đính kèm. Khuyến khích tải ảnh chụp kiện hàng và sản phẩm bị vỡ để
                    Support đối soát nhanh hơn (nếu chưa có ảnh ngay, bạn vẫn có thể tiếp tục hoặc
                    nhắn trực tiếp với nhân viên).
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
                              {Math.max(1, Math.round(att.size / 1024))} KB · Đã gắn vào hội thoại
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
                  Tiếp tục: Xem lại yêu cầu (Bước 2/2)
                </Button>
              </div>
            </form>
          )}

          {/* BƯỚC 2: XEM LẠI YÊU CẦU TRƯỚC KHI GỬI KHIẾU NẠI CHÍNH THỨC */}
          {caseStep === 'REVIEW' && (
            <div className="mt-4 space-y-4 text-xs sm:text-sm">
              <div className="rounded-2xl border border-line bg-stone-50/80 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
                  <span className="font-bold text-stone-900">
                    Bản tóm tắt hồ sơ khiếu nại · Đơn hàng #{order.id}
                  </span>
                  <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[11px] font-bold text-amber-950">
                    Chờ bạn xác nhận gửi
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
                    <dt className="text-muted">Phân loại nguyên nhân:</dt>
                    <dd className="font-semibold text-stone-900">{caseCategory}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Số điện thoại xác minh:</dt>
                    <dd className="font-mono font-bold text-stone-900">{casePhone}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Khóa chống gửi trùng (Idempotency-Key):</dt>
                    <dd className="font-mono text-[11px] text-stone-600 truncate">
                      {caseIdempotencyKey}
                    </dd>
                  </div>
                </dl>

                <div className="border-t border-line pt-2.5">
                  <span className="block text-xs font-bold text-stone-800 mb-1">
                    Sản phẩm & số lượng yêu cầu xử lý:
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
                            SL khiếu nại: x{caseItemQuantities[it.productId]} / {it.quantity} (
                            {formatVnd(it.unitPrice * (caseItemQuantities[it.productId] || 1))})
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>

                <div className="border-t border-line pt-2.5">
                  <span className="block text-xs font-bold text-stone-800 mb-1">
                    Nội dung mô tả chi tiết:
                  </span>
                  <p className="rounded-xl bg-white p-3 text-xs text-stone-800 whitespace-pre-line border border-line/70">
                    {caseDescription.trim()}
                  </p>
                </div>

                <div className="border-t border-line pt-2.5">
                  <span className="block text-xs font-bold text-stone-800 mb-1">
                    Tệp bằng chứng đính kèm ({caseAttachments.length}):
                  </span>
                  {caseAttachments.length === 0 ? (
                    <span className="text-xs text-muted">
                      Không có tệp đính kèm (bạn có thể bổ sung qua tin nhắn sau).
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
                <strong>Lưu ý nghiệp vụ SRS:</strong> Gửi yêu cầu này sẽ khởi tạo hồ sơ khiếu nại
                chính thức (`caseId`) và chuyển hội thoại sang hàng chờ nhân viên Support. Việc mở
                hồ sơ <strong>không đồng nghĩa tiền được hoàn tự động ngay lập tức</strong> mà cần
                qua bước đối soát bằng chứng.
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
                  Quay lại chỉnh sửa (Bước 1)
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

          {/* BƯỚC 3: HIỂN THỊ MÃ HỒ SƠ CHÍNH THỨC (`caseId`) SAU KHI TẠO THÀNH CÔNG */}
          {caseStep === 'SUCCESS' && createdCaseResult && (
            <div className="mt-4 space-y-4 text-xs sm:text-sm">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 text-emerald-950 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                    <strong className="text-sm sm:text-base font-bold">
                      Hồ sơ khiếu nại đã được ghi nhận!
                    </strong>
                  </div>
                  <span className="rounded-full bg-white border border-emerald-300 px-3 py-1 font-mono text-xs font-bold text-emerald-900">
                    {createdCaseResult.caseId}
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-emerald-900">
                  Mã vụ việc <strong className="font-mono">{createdCaseResult.caseId}</strong> đã
                  được gắn trực tiếp vào đơn hàng <strong>#{order.id}</strong> và luồng chat với Bộ
                  phận Hỗ trợ. Bạn có thể theo dõi phản hồi của nhân viên ngay trong khung hội
                  thoại.
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
                        Sao chép mã vụ việc
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
                  Mở khung hội thoại Hỗ trợ để theo dõi
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
