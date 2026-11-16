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
import type {
  ActiveAuctionContext,
  ActiveCheckoutContext,
  ActiveProductContext,
  AssistantChatMessage,
  AssistantPageKind,
  OrderDetailTabTrigger,
} from '../types/buyer-assistant.types';

interface BuyerAssistantContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleOpen: () => void;
  collapseAssistant: () => void;
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
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
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
  const [productContext, setProductContext] = useState<ActiveProductContext | null>(null);
  const [auctionContext, setAuctionContext] = useState<ActiveAuctionContext | null>(null);
  const [checkoutContext, setCheckoutContext] = useState<ActiveCheckoutContext | null>(null);
  const [pageOrderContext, setPageOrderContext] = useState<OrderDetail | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [draftText, setDraftText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [aiConversationIds, setAiConversationIds] = useState<Record<string, string>>({});
  const [pendingAutoPrompt, setPendingAutoPrompt] = useState<string | null>(null);
  const [orderDetailTrigger, setOrderDetailTrigger] = useState<OrderDetailTabTrigger | null>(null);

  const userKey = user?.id ?? 'guest';
  const prevUserKeyRef = useRef<string>(userKey);

  // Bảo vệ riêng tư: đổi tài khoản / đăng xuất phải xóa toàn bộ ngữ cảnh & tin nhắn đang hiển thị
  useEffect(() => {
    if (prevUserKeyRef.current !== userKey) {
      prevUserKeyRef.current = userKey;
      setIsOpenState(false);
      setSelectedOrder(null);
      setPageOrderContext(null);
      setMessages([]);
      setDraftText('');
      setUnreadCount(0);
      setAiConversationIds({});
      setPendingAutoPrompt(null);
    }
  }, [userKey]);

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

  // Nếu đang mở trang chi tiết đơn, mặc định gắn activeOrder theo đơn đang xem (chỉ sau khi API xác nhận quyền)
  useEffect(() => {
    if (pageKind === 'ORDER_DETAIL' && pageOrderContext) {
      setSelectedOrder((prev) => {
        if (prev?.id === pageOrderContext.id) return pageOrderContext;
        return pageOrderContext;
      });
    }
  }, [pageKind, pageOrderContext]);

  const setIsOpen = useCallback((open: boolean) => {
    setIsOpenState(open);
    if (open) {
      setUnreadCount(0);
    }
  }, []);

  const toggleOpen = useCallback(() => {
    setIsOpenState((prev) => {
      const next = !prev;
      if (next) setUnreadCount(0);
      return next;
    });
  }, []);

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
      setIsOpen(true);
      if (autoPrompt) {
        setPendingAutoPrompt(autoPrompt);
      }
    },
    [selectOrder, setIsOpen],
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
    setUnreadCount,
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
