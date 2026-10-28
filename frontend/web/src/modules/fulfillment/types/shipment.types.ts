export type Shipment = {
  id: string;
  code: string;
  trackingCode: string;
  orderId: string;
  order: string;
  carrier: string;
  recipient: string;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  city: string;
  currentLocation: string;
  status: string;
  statusCode: string;
  updated: string;
  updatedAt: string;
  createdAt: string;
  timeline: {
    title: string;
    status: 'done' | 'current' | 'pending';
    timestamp?: string;
    description?: string;
    location?: string;
  }[];
};
