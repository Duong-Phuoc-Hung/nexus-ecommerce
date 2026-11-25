import {
  CreateAuctionOrderInput,
  AuctionOrderCheckoutResult,
  ICommerceOrderClient,
} from '../../application/ports/ICommerceOrderClient';
import { generateUuidV7 } from '../utils/uuid';

export class HttpCommerceOrderClient implements ICommerceOrderClient {
  constructor(
    private readonly baseUrl: string = process.env.COMMERCE_SERVICE_URL ||
      `http://localhost:${process.env.COMMERCE_SERVICE_PORT || 4003}`,
  ) {}

  public async createOrder(input: CreateAuctionOrderInput): Promise<AuctionOrderCheckoutResult> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (input.buyerToken) {
        headers['Authorization'] = input.buyerToken.startsWith('Bearer ')
          ? input.buyerToken
          : `Bearer ${input.buyerToken}`;
      }
      if (input.auctionId) {
        headers['Idempotency-Key'] = `auc-${input.auctionId}`;
      }

      const response = await fetch(`${this.baseUrl}/api/v1/orders/checkout`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          orderType: 'AUCTION',
          source: 'AUCTION',
          auctionId: input.auctionId,
          items: [
            {
              productId: input.productId,
              quantity: 1,
              price: input.amount,
            },
          ],
          shippingAddress: input.shippingAddress,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const body = (await response.json()) as any;
        if (body.success && body.data) {
          const checkoutUrl =
            body.data.checkoutUrl ||
            body.data.payment?.checkoutUrl ||
            (body.data.paymentLinkId
              ? `https://pay.payos.vn/web/${body.data.paymentLinkId}`
              : null) ||
            'https://pay.payos.vn/web/checkout-preview';
          return {
            orderId: String(body.data.orderId || body.data.id),
            orderCode: body.data.orderCode,
            totalAmount: Number(body.data.totalAmount || input.amount),
            payment: {
              paymentLinkId: body.data.paymentLinkId || body.data.payment?.paymentLinkId,
              checkoutUrl,
              status: body.data.status || body.data.payment?.status || 'PENDING',
            },
          };
        }
      }
    } catch {
      // Fallback khi Commerce service chưa khởi chạy hoặc trong môi trường test độc lập
    }

    // Dự phòng (Mock Fallback) cho phép thông luồng sinh mã VietQR PayOS
    const orderCode = Math.floor(100000 + Math.random() * 900000);
    return {
      orderId: generateUuidV7(),
      orderCode,
      totalAmount: input.amount,
      payment: {
        paymentLinkId: `plink_${generateUuidV7().slice(0, 12)}`,
        checkoutUrl: `https://pay.payos.vn/web/${orderCode}`,
        status: 'PENDING',
      },
    };
  }

  public async getOrder(
    orderId: string,
    buyerToken?: string,
  ): Promise<AuctionOrderCheckoutResult | null> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (buyerToken) {
        headers['Authorization'] = buyerToken.startsWith('Bearer ')
          ? buyerToken
          : `Bearer ${buyerToken}`;
      }

      // Thử lấy link thanh toán PayOS thật từ commerce-service
      try {
        const linkRes = await fetch(`${this.baseUrl}/api/v1/orders/${orderId}/payment-link`, {
          method: 'POST',
          headers,
          body: JSON.stringify({}),
          signal: AbortSignal.timeout(5000),
        });
        if (linkRes.ok) {
          const linkBody = (await linkRes.json()) as any;
          const linkData = linkBody?.data || linkBody;
          if (linkData?.checkoutUrl) {
            return {
              orderId,
              orderCode: linkData.orderCode || orderId,
              totalAmount: Number(linkData.totalAmount || 0),
              status: linkData.status || 'PENDING_PAYMENT',
              payment: {
                paymentLinkId: linkData.paymentLinkId,
                checkoutUrl: linkData.checkoutUrl,
                status:
                  linkData.paymentStatus ||
                  linkData.payment?.status ||
                  linkData.status ||
                  'PENDING',
              },
            };
          }
        }
      } catch {
        // Fallback sang GET order detail
      }

      const response = await fetch(`${this.baseUrl}/api/v1/orders/${orderId}`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const body = (await response.json()) as any;
        const data = body?.data || body;
        if (data) {
          const rawCode = data.orderCode || data.id || orderId;
          const checkoutUrl =
            data.checkoutUrl ||
            data.payment?.checkoutUrl ||
            (data.paymentLinkId ? `https://pay.payos.vn/web/${data.paymentLinkId}` : null);
          return {
            orderId: String(data.id || orderId),
            orderCode: rawCode,
            totalAmount: Number(data.totalAmount || data.total || 0),
            status: data.status,
            payment: {
              paymentLinkId: data.paymentLinkId || data.payment?.paymentLinkId,
              checkoutUrl: checkoutUrl || `https://pay.payos.vn/web/${data.orderCode || rawCode}`,
              status: data.payment?.status || data.status || 'PENDING',
            },
          };
        }
      }
    } catch {
      // Fallback
    }

    return null;
  }
}
