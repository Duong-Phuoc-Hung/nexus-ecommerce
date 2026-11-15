export interface ShippingAddressInput {
  fullName: string;
  phone: string;
  province: string;
  district?: string;
  ward?: string;
  addressLine: string;
  country: string;
}

export interface CreateAuctionOrderInput {
  buyerToken?: string;
  buyerId: string;
  productId: string;
  amount: number;
  shippingAddress: ShippingAddressInput;
}

export interface AuctionOrderCheckoutResult {
  orderId: string;
  orderCode?: string | number;
  totalAmount: number;
  payment: {
    paymentLinkId?: string;
    checkoutUrl: string;
    status: string;
  };
}

export interface ICommerceOrderClient {
  createOrder(input: CreateAuctionOrderInput): Promise<AuctionOrderCheckoutResult>;
}
