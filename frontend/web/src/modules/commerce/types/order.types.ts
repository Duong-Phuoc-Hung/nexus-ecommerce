export type OrderSummary = {
  id: string;
  buyer: string;
  email: string;
  seller: string;
  product: string;
  date: string;
  total: number;
  totalAmount: number;
  status: string;
  tracking: string;
  itemsCount: number;
  createdAt: string;
  updatedAt: string;
};

export type OrderShippingAddress = {
  fullName?: string;
  phone?: string;
  province?: string;
  district?: string;
  ward?: string;
  addressLine?: string;
  country?: string;
};

export type OrderDetail = OrderSummary & {
  buyerId: string;
  sellerId: string;
  subtotal?: number;
  shippingFee?: number;
  discountAmount?: number;
  paymentMethod?: string;
  shippingAddress?: OrderShippingAddress;
  timeline: { status: string; title: string; timestamp: string; note?: string }[];
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    imageUrl?: string;
  }[];
  paymentTransactionId?: string;
};

export type PageResult<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export { formatOrderStatus, getOrderStatusBadgeClass } from '../utils/order-status';
