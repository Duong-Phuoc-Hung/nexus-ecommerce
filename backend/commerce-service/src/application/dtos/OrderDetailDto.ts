export interface OrderDetailDto {
  id: string;
  buyerId: string;
  sellerId: string;
  totalAmount: number;
  status: string;
  itemsCount: number;
  createdAt: string;
}
