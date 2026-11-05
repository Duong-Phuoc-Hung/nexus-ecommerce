/**
 * Port: IShippingOrderClient
 * Giao tiếp với đơn vị vận chuyển (3PL - GHN, GHTK...) để tạo đơn hàng xuất kho (Outbound Shipping Order)
 * và nhận mã vận đơn (Tracking Code) cùng liên kết in phiếu gửi hàng / tem mã vạch (AWB Barcode).
 */

export interface CreateShippingOrderItem {
  name: string;
  quantity: number;
  price?: number;
}

export interface CreateShippingOrderInput {
  orderId: string;
  orderCode?: string;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  province?: string;
  district?: string;
  ward?: string;
  items: CreateShippingOrderItem[];
  weightGrams?: number;
  note?: string;
}

export interface CreateShippingOrderResult {
  trackingCode: string;
  carrierCode: string;
  awbBarcodeUrl?: string;
  totalFee?: number;
  expectedDeliveryDate?: string;
  rawResponse?: Record<string, unknown>;
}

export interface IShippingOrderClient {
  createShippingOrder(input: CreateShippingOrderInput): Promise<CreateShippingOrderResult>;
}
