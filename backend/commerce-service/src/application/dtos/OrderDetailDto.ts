export interface OrderItemDetailDto {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderTimelineDto {
  status: string;
  title: string;
  timestamp: string;
  note?: string;
}

export interface OrderDetailDto {
  id: string;
  buyerId: string;
  buyer: string; // Tương thích FE: order.buyer
  email: string; // Tương thích FE: order.email
  sellerId: string;
  seller: string; // Tương thích FE: order.seller
  product: string; // Tương thích FE: order.product
  date: string; // Tương thích FE: order.date
  total: number; // Tương thích FE: order.total
  totalAmount: number;
  subtotal?: number;
  shippingFee?: number;
  discountAmount?: number;
  paymentMethod?: string;
  shippingAddress?: {
    fullName?: string;
    phone?: string;
    province?: string;
    district?: string;
    ward?: string;
    addressLine?: string;
    country?: string;
  };
  status: string;
  tracking: string; // Tương thích FE: order.tracking
  trackingCode?: string; // Tương thích API contract
  itemsCount: number;
  items: OrderItemDetailDto[];
  timeline: OrderTimelineDto[];
  paymentTransactionId?: string;
  createdAt: string;
  updatedAt: string;
}
