export interface CreateOrderItemDto {
  productId: string;
  quantity: number;
}

export interface CreateOrderRequestDto {
  items: CreateOrderItemDto[];
  shippingAddress: string;
}
