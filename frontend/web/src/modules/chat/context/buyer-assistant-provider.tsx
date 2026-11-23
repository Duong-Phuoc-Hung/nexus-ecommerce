'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@/modules/auth/hooks/use-session';
import type { OrderDetail } from '@/modules/commerce/types/order.types';
import { chatApi } from '../api/chat.api';
import type { ChatThreadItem } from '../types/chat.types';
import type {
  ActiveAuctionContext,
  ActiveCheckoutContext,
  ActiveProductContext,
  AssistantChatMessage,
  AssistantPageKind,
  OrderDetailTabTrigger,
} from '../types/buyer-assistant.types';

export type BuyerWidgetView = 'INBOX' | 'THREAD' | 'ASSISTANT';

interface BuyerInboxCachePayload {
  userId: string;
  threads: ChatThreadItem[];
  updatedAt: string;
}

const INBOX_CACHE_PREFIX = 'nexus-buyer-inbox-cache-v1:';

function readInboxCache(userId: string): ChatThreadItem[] {
  if (typeof window === 'undefined' || !userId) return [];
  try {
    const raw = window.localStorage.getItem(`${INBOX_CACHE_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BuyerInboxCachePayload;
    if (!parsed || parsed.userId !== userId || !Array.isArray(parsed.threads)) {
      return [];
    }
    return parsed.threads;
  } catch {
    return [];
  }
}

function writeInboxCache(userId: string, threads: ChatThreadItem[]): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    const payload: BuyerInboxCachePayload = {
      userId,
      threads,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(`${INBOX_CACHE_PREFIX}${userId}`, JSON.stringify(payload));
  } catch {
    // Bỏ qua lỗi quota trình duyệt
  }
}

interface BuyerAssistantContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleOpen: () => void;
  collapseAssistant: () => void;
  activeWidgetView: BuyerWidgetView;
  setActiveWidgetView: (view: BuyerWidgetView) => void;
  activeThreadId: string | null;
  openMessagesInbox: () => void;
  openConversationThread: (conversationId: string) => void;
  openAssistantChat: () => void;
  returnToInbox: () => void;
  inboxThreads: ChatThreadItem[];
  inboxLoading: boolean;
  inboxError: string;
  refreshInbox: () => Promise<void>;
  markConversationRead: (conversationId: string, lastReadSeq: number) => Promise<void>;
  pageKind: AssistantPageKind;
  pathname: string;
  isHiddenRoute: boolean;
  // Page contexts
  productContext: ActiveProductContext | null;
  setProductContext: (ctx: ActiveProductContext | null) => void;
  auctionContext: ActiveAuctionContext | null;
  setAuctionContext: (ctx: ActiveAuctionContext | null) => void;
  checkoutContext: ActiveCheckoutContext | null;
  setCheckoutContext: (ctx: ActiveCheckoutContext | null) => void;
  pageOrderContext: OrderDetail | null;
  setPageOrderContext: (order: OrderDetail | null) => void;
  // Active assistant conversation state (wiped on account change)
  activeOrder: OrderDetail | null;
  selectOrder: (order: OrderDetail | null, announceSwitch?: boolean) => void;
  messages: AssistantChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<AssistantChatMessage[]>>;
  draftText: string;
  setDraftText: (text: string) => void;
  unreadCount: number;
  aiConversationIds: Record<string, string>;
  setAiConversationId: (orderId: string, convId: string) => void;
  // Cross-navigation & two-way sync with BuyerOrderConversationPanel
  openAssistantWithOrder: (order: OrderDetail, autoPrompt?: string) => void;
  pendingAutoPrompt: string | null;
  clearPendingAutoPrompt: () => void;
  orderDetailTrigger: OrderDetailTabTrigger | null;
  handoffToOrderChannel: (
    orderId: string,
    channel: 'SELLER' | 'SUPPORT',
    options?: { openComplaintModal?: boolean; prefillSummary?: string },
  ) => void;
}

const BuyerAssistantContext = createContext<BuyerAssistantContextValue | null>(null);

const HIDDEN_PREFIXES = [
  '/admin',
  '/seller',
  '/support',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
];

function inferPageKind(pathname: string): AssistantPageKind {
  if (/^\/products\/[^/]+/.test(pathname)) return 'PRODUCT_DETAIL';
  if (/^\/auctions\/[^/]+/.test(pathname)) return 'AUCTION_DETAIL';
  if (pathname.startsWith('/cart') || pathname.startsWith('/checkout')) return 'CART_CHECKOUT';
  if (/^\/account\/orders\/[^/]+/.test(pathname)) return 'ORDER_DETAIL';
  return 'HOME_CATALOG';
}

export function BuyerAssistantProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const { user } = useSession();

  const [isOpen, setIsOpenState] = useState(false);
  const [activeWidgetView, setActiveWidgetView] = useState<BuyerWidgetView>('ASSISTANT');
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [inboxThreads, setInboxThreads] = useState<ChatThreadItem[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState('');

  const [productContext, setProductContext] = useState<ActiveProductContext | null>(null);
  const [auctionContext, setAuctionContext] = useState<ActiveAuctionContext | null>(null);
  const [checkoutContext, setCheckoutContext] = useState<ActiveCheckoutContext | null>(null);
  const [pageOrderContext, setPageOrderContext] = useState<OrderDetail | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [draftText, setDraftText] = useState('');
  const [aiConversationIds, setAiConversationIds] = useState<Record<string, string>>({});
  const [pendingAutoPrompt, setPendingAutoPrompt] = useState<string | null>(null);
  const [orderDetailTrigger, setOrderDetailTrigger] = useState<OrderDetailTabTrigger | null>(null);

  const userKey = user?.id ?? 'guest';
  const prevUserKeyRef = useRef<string>(userKey);
  const inboxEpochRef = useRef<number>(0);
  const inboxFetchingRef = useRef<boolean>(false);

  const pageKind = useMemo(() => inferPageKind(pathname), [pathname]);

  // Ẩn hoàn toàn ở các cổng Admin / Seller / Support / Auth hoặc khi đã đăng nhập vai trò không phải Buyer
  const isHiddenRoute = useMemo(() => {
    if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return true;
    }
    if (user && user.role !== 'BUYER') {
      return true;
    }
    return false;
  }, [pathname, user]);

  // Bảo vệ riêng tư: đổi tài khoản / đăng xuất phải xóa toàn bộ ngữ cảnh & tin nhắn đang hiển thị
  useEffect(() => {
    if (prevUserKeyRef.current !== userKey) {
      prevUserKeyRef.current = userKey;
      inboxEpochRef.current += 1;
      inboxFetchingRef.current = false;
      setIsOpenState(false);
      setActiveWidgetView('ASSISTANT');
      setActiveThreadId(null);
      setInboxThreads([]);
      setInboxError('');
      setInboxLoading(false);
      setSelectedOrder(null);
      setPageOrderContext(null);
      setMessages([]);
      setDraftText('');
      setAiConversationIds({});
      setPendingAutoPrompt(null);
    }

    if (user?.role === 'BUYER' && user.id) {
      const cached = readInboxCache(user.id);
      if (cached.length > 0) {
        setInboxThreads(cached);
      }
    }
  }, [user?.id, user?.role, userKey]);

  const refreshInbox = useCallback(async () => {
    if (!user || user.role !== 'BUYER' || !user.id) {
      setInboxThreads([]);
      setInboxError('');
      setInboxLoading(false);
      return;
    }
    if (inboxFetchingRef.current) return;
    inboxFetchingRef.current = true;
    const epochAtStart = inboxEpochRef.current;
    const targetUserId = user.id;

    setInboxLoading((prev) => prev || inboxThreads.length === 0);
    try {
      const threads = await chatApi.getBuyerThreads(targetUserId);
      if (epochAtStart !== inboxEpochRef.current) return;
      setInboxThreads(threads);
      setInboxError('');
      writeInboxCache(targetUserId, threads);
    } catch {
      if (epochAtStart !== inboxEpochRef.current) return;
      // Giữ số chưa đọc đã xác nhận gần nhất cho tài khoản hiện tại khi mất kết nối
      setInboxError(
        'Tạm mất kết nối máy chủ chat. Đang giữ số liệu gần nhất và sẽ tự đồng bộ lại.',
      );
    } finally {
      if (epochAtStart === inboxEpochRef.current) {
        setInboxLoading(false);
      }
      inboxFetchingRef.current = false;
    }
  }, [inboxThreads.length, user]);

  // Polling hộp thư Buyer liên tục ngay cả khi widget đóng, đồng bộ khi online/focus/tab visible
  useEffect(() => {
    if (!user || user.role !== 'BUYER' || isHiddenRoute) return;

    void refreshInbox();
    const timer = window.setInterval(() => {
      void refreshInbox();
    }, 5000);

    const handleSync = () => {
      if (document.visibilityState === 'visible') {
        void refreshInbox();
      }
    };
    const handleCustomSync = () => {
      void refreshInbox();
    };

    window.addEventListener('focus', handleCustomSync);
    window.addEventListener('online', handleCustomSync);
    window.addEventListener('nexus:chat-sync', handleCustomSync);
    document.addEventListener('visibilitychange', handleSync);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', handleCustomSync);
      window.removeEventListener('online', handleCustomSync);
      window.removeEventListener('nexus:chat-sync', handleCustomSync);
      document.removeEventListener('visibilitychange', handleSync);
    };
  }, [isHiddenRoute, refreshInbox, user]);

  const markConversationRead = useCallback(
    async (conversationId: string, lastReadSeq: number) => {
      if (!user || user.role !== 'BUYER' || !user.id || lastReadSeq <= 0) return;
      const epochAtStart = inboxEpochRef.current;
      const targetUserId = user.id;
      try {
        const res = await chatApi.markAsRead(conversationId, lastReadSeq);
        if (epochAtStart !== inboxEpochRef.current) return;
        setInboxThreads((prev) => {
          const next = prev.map((thread) =>
            thread.id === conversationId
              ? {
                  ...thread,
                  lastSeq: Math.max(thread.lastSeq ?? 0, res.lastSeq ?? 0),
                  myLastReadSeq: Math.max(
                    thread.myLastReadSeq ?? 0,
                    res.myLastReadSeq ?? lastReadSeq,
                  ),
                  unreadCount: Math.max(0, Number(res.unreadCount ?? 0)),
                }
              : thread,
          );
          writeInboxCache(targetUserId, next);
          return next;
        });
      } catch {
        // Sẽ tự đồng bộ lại khi kết nối trở về
      }
    },
    [user],
  );

  // Nếu đang mở trang chi tiết đơn, mặc định gắn activeOrder theo đơn đang xem
  useEffect(() => {
    if (pageKind === 'ORDER_DETAIL' && pageOrderContext) {
      setSelectedOrder((prev) => {
        if (prev?.id === pageOrderContext.id) return pageOrderContext;
        return pageOrderContext;
      });
    }
  }, [pageKind, pageOrderContext]);

  const unreadCount = useMemo(
    () => inboxThreads.reduce((sum, t) => sum + Math.max(0, Number(t.unreadCount || 0)), 0),
    [inboxThreads],
  );

  // Giữ nguyên số tin chưa đọc khi mở widget / danh sách; chỉ xóa từng phòng khi thực sự đọc phòng đó
  const setIsOpen = useCallback((open: boolean) => {
    setIsOpenState(open);
  }, []);

  const toggleOpen = useCallback(() => {
    setIsOpenState((prev) => {
      const next = !prev;
      if (next && user?.role === 'BUYER' && unreadCount > 0) {
        setActiveWidgetView('INBOX');
        setActiveThreadId(null);
      }
      return next;
    });
  }, [unreadCount, user?.role]);

  const openMessagesInbox = useCallback(() => {
    setActiveWidgetView('INBOX');
    setActiveThreadId(null);
    setIsOpenState(true);
    void refreshInbox();
  }, [refreshInbox]);

  const openConversationThread = useCallback((conversationId: string) => {
    setActiveThreadId(conversationId);
    setActiveWidgetView('THREAD');
    setIsOpenState(true);
  }, []);

  const openAssistantChat = useCallback(() => {
    setActiveThreadId(null);
    setActiveWidgetView('ASSISTANT');
    setIsOpenState(true);
  }, []);

  const returnToInbox = useCallback(() => {
    setActiveThreadId(null);
    setActiveWidgetView('INBOX');
    void refreshInbox();
  }, [refreshInbox]);

  const collapseAssistant = useCallback(() => {
    setIsOpenState(false);
  }, []);

  // Lắng nghe sự kiện thu gọn khi Buyer mở hộp thoại thanh toán / địa chỉ / khiếu nại
  useEffect(() => {
    const handleCollapse = () => setIsOpenState(false);
    window.addEventListener('nexus:assistant-collapse', handleCollapse);
    return () => window.removeEventListener('nexus:assistant-collapse', handleCollapse);
  }, []);

  useEffect(() => {
    if (checkoutContext?.dialogOpen) {
      setIsOpenState(false);
    }
  }, [checkoutContext?.dialogOpen]);

  const selectOrder = useCallback((order: OrderDetail | null, announceSwitch = true) => {
    setSelectedOrder((prev) => {
      if (announceSwitch && order && prev?.id !== order.id) {
        setMessages((curr) => [
          ...curr,
          {
            id: `sys-switch-${order.id}-${Date.now()}`,
            sender: 'SYSTEM',
            text: `Đang theo dõi đơn hàng #${order.id}`,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
      return order;
    });
  }, []);

  const setAiConversationId = useCallback((orderId: string, convId: string) => {
    setAiConversationIds((prev) => ({ ...prev, [orderId]: convId }));
  }, []);

  const openAssistantWithOrder = useCallback(
    (order: OrderDetail, autoPrompt?: string) => {
      selectOrder(order, true);
      setActiveThreadId(null);
      setActiveWidgetView('ASSISTANT');
      setIsOpenState(true);
      if (autoPrompt) {
        setPendingAutoPrompt(autoPrompt);
      }
    },
    [selectOrder],
  );

  const clearPendingAutoPrompt = useCallback(() => {
    setPendingAutoPrompt(null);
  }, []);

  const handoffToOrderChannel = useCallback(
    (
      orderId: string,
      channel: 'SELLER' | 'SUPPORT',
      options?: { openComplaintModal?: boolean; prefillSummary?: string },
    ) => {
      const targetPath = `/account/orders/${encodeURIComponent(orderId)}`;
      const isAlreadyOnOrderPage = pathname === targetPath;

      if (options?.prefillSummary && typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem(
            `nexus-assistant-draft:${userKey}:${orderId}`,
            options.prefillSummary,
          );
        } catch {
          // ignore
        }
      }

      if (isAlreadyOnOrderPage) {
        setIsOpenState(false);
        setOrderDetailTrigger({
          channel,
          openComplaintModal: options?.openComplaintModal,
          prefillSummary: options?.prefillSummary,
          nonce: Date.now(),
        });
        window.setTimeout(() => {
          document
            .getElementById('buyer-order-chat-section')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      } else {
        setIsOpenState(false);
        const tabParam = options?.openComplaintModal
          ? 'complaint'
          : channel === 'SELLER'
            ? 'seller'
            : 'support';
        router.push(`${targetPath}?chat=${tabParam}#buyer-order-chat-section`);
      }
    },
    [pathname, router, userKey],
  );

  const activeOrder = useMemo(() => {
    if (selectedOrder) return selectedOrder;
    if (pageKind === 'ORDER_DETAIL') return pageOrderContext;
    return null;
  }, [pageKind, pageOrderContext, selectedOrder]);

  const value: BuyerAssistantContextValue = {
    isOpen,
    setIsOpen,
    toggleOpen,
    collapseAssistant,
    activeWidgetView,
    setActiveWidgetView,
    activeThreadId,
    openMessagesInbox,
    openConversationThread,
    openAssistantChat,
    returnToInbox,
    inboxThreads,
    inboxLoading,
    inboxError,
    refreshInbox,
    markConversationRead,
    pageKind,
    pathname,
    isHiddenRoute,
    productContext,
    setProductContext,
    auctionContext,
    setAuctionContext,
    checkoutContext,
    setCheckoutContext,
    pageOrderContext,
    setPageOrderContext,
    activeOrder,
    selectOrder,
    messages,
    setMessages,
    draftText,
    setDraftText,
    unreadCount,
    aiConversationIds,
    setAiConversationId,
    openAssistantWithOrder,
    pendingAutoPrompt,
    clearPendingAutoPrompt,
    orderDetailTrigger,
    handoffToOrderChannel,
  };

  return <BuyerAssistantContext.Provider value={value}>{children}</BuyerAssistantContext.Provider>;
}

export function useBuyerAssistant() {
  const ctx = useContext(BuyerAssistantContext);
  if (!ctx) {
    throw new Error('useBuyerAssistant must be used within BuyerAssistantProvider');
  }
  return ctx;
}
