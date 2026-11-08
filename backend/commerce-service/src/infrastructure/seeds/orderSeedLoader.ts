import fs from 'node:fs';
import path from 'node:path';
import { Order, OrderStatus } from '../../domain/entities/Order';

interface RawSeedTimeline {
  status: string;
  title: string;
  daysAgo?: number;
  offsetMinutes?: number;
  note?: string;
}

interface RawSeedOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface RawSeedOrder {
  id: string;
  buyerId: string;
  buyerName?: string;
  buyerEmail?: string;
  sellerId: string;
  sellerName?: string;
  items: RawSeedOrderItem[];
  totalAmount: number;
  status: string;
  paymentTransactionId?: string;
  trackingCode?: string;
  daysAgo?: number;
  timeline?: RawSeedTimeline[];
}

export function loadSeedOrders(): Order[] {
  const candidatePaths = [
    path.resolve(__dirname, '../../../seeds/seed-orders.json'),
    path.resolve(__dirname, './seed-orders.json'),
    path.resolve(process.cwd(), 'backend/commerce-service/seeds/seed-orders.json'),
    path.resolve(process.cwd(), 'seeds/seed-orders.json'),
    path.resolve(__dirname, '../../../data/seed-orders.json'),
    path.resolve(process.cwd(), 'backend/commerce-service/data/seed-orders.json'),
    path.resolve(process.cwd(), 'data/seed-orders.json'),
  ];

  let rawData: RawSeedOrder[] | null = null;
  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      try {
        const content = fs.readFileSync(candidate, 'utf-8');
        rawData = JSON.parse(content) as RawSeedOrder[];
        break;
      } catch (err) {
        console.warn(
          `[orderSeedLoader] Warning reading seed file ${candidate}:`,
          (err as Error).message,
        );
      }
    }
  }

  const now = new Date();

  if (rawData && Array.isArray(rawData) && rawData.length > 0) {
    return rawData.map((raw) => {
      const days = typeof raw.daysAgo === 'number' ? raw.daysAgo : 0;
      const orderDate = new Date(now.getTime() - days * 86400000);

      const timeline = (raw.timeline || []).map((t) => {
        const tDays = typeof t.daysAgo === 'number' ? t.daysAgo : days;
        const offsetMs = (t.offsetMinutes || 0) * 60000;
        return {
          status: t.status,
          title: t.title,
          timestamp: new Date(now.getTime() - tDays * 86400000 + offsetMs),
          note: t.note,
        };
      });

      return new Order({
        id: raw.id,
        buyerId: raw.buyerId,
        buyerName: raw.buyerName,
        buyerEmail: raw.buyerEmail,
        sellerId: raw.sellerId,
        sellerName: raw.sellerName,
        items: raw.items || [],
        totalAmount: raw.totalAmount,
        status: (raw.status as OrderStatus) || OrderStatus.PENDING,
        paymentTransactionId: raw.paymentTransactionId,
        trackingCode: raw.trackingCode,
        createdAt: orderDate,
        updatedAt: orderDate,
        timeline,
      });
    });
  }

  // Fallback nếu không đọc được file JSON
  return [
    new Order({
      id: 'ord_01hqz555abc',
      buyerId: '01a15822-43b8-78c3-a246-16bff78bc6e8',
      buyerName: 'Nguyen Van Buyer',
      buyerEmail: 'buyer.test@nexus-ecommerce.com',
      sellerId: '01a15822-3fd0-7b39-ad01-f11da72d5b80',
      sellerName: 'Nexus Official Store',
      items: [
        {
          productId: 'prod_01hqz999xyz',
          productName: 'Nexus Pro Audio Wireless',
          quantity: 1,
          unitPrice: 399.99,
          totalPrice: 399.99,
        },
      ],
      totalAmount: 399.99,
      status: OrderStatus.PAID,
      paymentTransactionId: 'pi_3MtwxAEhyASWD2Re1fA5sample',
      trackingCode: 'GHN112233VN',
      createdAt: now,
      updatedAt: now,
      timeline: [
        { status: 'CREATED', title: 'Đơn hàng được tạo', timestamp: now },
        { status: 'PAID', title: 'Đã xác nhận thanh toán PayOS', timestamp: now },
      ],
    }),
  ];
}
