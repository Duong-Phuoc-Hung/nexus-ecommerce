import type { OrderDetail, OrderSummary } from '@/modules/commerce/types/order.types';

export type AssistantPageKind =
  'HOME_CATALOG' | 'PRODUCT_DETAIL' | 'AUCTION_DETAIL' | 'CART_CHECKOUT' | 'ORDER_DETAIL';

export interface ActiveProductContext {
  id: string;
  title: string;
  price?: number;
  stock?: number | null;
  condition?: string;
}

export interface ActiveAuctionContext {
  id: string;
  title: string;
  status: string;
  currentPrice: number;
  endAt: number;
  startAt?: number;
}

export interface ActiveCheckoutContext {
  stage: 'CART' | 'CHECKOUT' | 'RESULT';
  itemsCount: number;
  subtotal: number;
  shippingFee?: number | null;
  discountAmount?: number | null;
  totalAmount?: number | null;
  paymentMethod?: 'PAYOS' | 'COD' | string;
  orderId?: string;
  paymentStatus?: string;
  orderStatus?: string;
  dialogOpen?: boolean;
}

export interface BuyerPageContextState {
  kind: AssistantPageKind;
  pathname: string;
  product?: ActiveProductContext | null;
  auction?: ActiveAuctionContext | null;
  checkout?: ActiveCheckoutContext | null;
  order?: OrderDetail | null;
}

export interface PaymentStatusSnapshot {
  status: 'PAID' | 'PENDING' | 'COD' | 'EXPIRED' | 'CANCELLED' | 'UNKNOWN' | 'ERROR';
  label: string;
  method?: 'PAYOS' | 'COD' | string;
  methodLabel?: string;
  paidAt?: string | null;
  expiresAt?: string | null;
  amount?: number | null;
  canRetryPaymentCheck?: boolean;
}

export interface ShipmentStatusSnapshot {
  state: 'HAS_SHIPMENT' | 'PREPARING' | 'NO_SHIPMENT_INFO' | 'UNPAID' | 'INTERRUPTED';
  label: string;
  carrier?: string;
  trackingCode?: string;
  currentLocation?: string;
  updatedAt?: string | null;
  estimatedDeliveryAt?: string | null;
}

export interface OrderDualStatusCardData {
  orderId: string;
  orderNumberLabel: string;
  totalAmount: number;
  payment: PaymentStatusSnapshot;
  shipment: ShipmentStatusSnapshot;
  canCancel?: boolean;
  canComplain?: boolean;
  focusSection?: 'PAYMENT' | 'SHIPMENT' | 'ALL';
}

export interface OrderChoiceItem {
  id: string;
  title: string;
  imageUrl?: string | null;
  createdAt: string;
  status: string;
  totalAmount: number;
  sellerId?: string;
}

export interface OrderBreakdownCardData {
  title: string;
  orderId?: string;
  subtotal?: number | null;
  shippingFee?: number | null;
  discountAmount?: number | null;
  totalAmount?: number | null;
}

export interface PolicyCitationItem {
  source: string;
  version?: string;
  policyCode?: string;
  title?: string;
}

export interface DamageAssessmentCardData {
  isDamaged: boolean;
  damageType: string;
  severity: string;
  summary: string;
  expectedItem?: string;
  isOfflineFallback?: boolean;
}

export interface AssistantActionLink {
  label: string;
  action:
    | 'OPEN_ORDER_DETAIL'
    | 'CHAT_SELLER'
    | 'CHAT_SUPPORT'
    | 'OPEN_COMPLAINT'
    | 'RETRY_PAYMENT'
    | 'RETRY_SHIPMENT'
    | 'OPEN_LOGIN'
    | 'OPEN_ORDERS_LIST'
    | 'SWITCH_ORDER';
  orderId?: string;
  variant?: 'primary' | 'secondary';
}

export interface AssistantChatMessage {
  id: string;
  sender: 'USER' | 'ASSISTANT' | 'SYSTEM';
  text: string;
  createdAt: string;
  failed?: boolean;
  retryPayload?: string;
  imagePreviewUrl?: string;
  damageCard?: DamageAssessmentCardData;
  aiModel?: string;
  orderCard?: OrderDualStatusCardData;
  orderChoices?: OrderChoiceItem[];
  breakdownCard?: OrderBreakdownCardData;
  citations?: PolicyCitationItem[];
  isGrounded?: boolean;
  actions?: AssistantActionLink[];
}

export type OrderDetailTabTrigger = {
  channel: 'SELLER' | 'SUPPORT';
  openComplaintModal?: boolean;
  prefillSummary?: string;
  nonce: number;
};

export interface BuyerAssistantOrderCacheEntry {
  order: OrderSummary | OrderDetail;
  imageUrl?: string | null;
}
