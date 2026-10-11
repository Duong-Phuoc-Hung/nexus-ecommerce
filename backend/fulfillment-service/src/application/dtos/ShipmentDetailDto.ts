export interface ShipmentDetailDto {
  id: string;
  orderId: string;
  carrier: string;
  trackingCode: string;
  status: string;
  shippingAddress: string;
}
