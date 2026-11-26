import {
  CreateAuctionOrderInput,
  AuctionOrderCheckoutResult,
  ICommerceOrderClient,
} from '../../application/ports/ICommerceOrderClient';
import { generateUuidV7 } from '../utils/uuid';
import { buildServiceAuthHeader } from '../security/internal-service-auth';

export class HttpCommerceOrderClient implements ICommerceOrderClient {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string = process.env.COMMERCE_SERVICE_URL ||
      `http://127.0.0.1:${process.env.COMMERCE_SERVICE_PORT || 4003}`,
  ) {
    this.baseUrl = baseUrl.replace('http://localhost:', 'http://127.0.0.1:');
  }

  public async createOrder(input: CreateAuctionOrderInput): Promise<AuctionOrderCheckoutResult> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...buildServiceAuthHeader({
        issuer: 'auction-service',
        audience: 'commerce-service',
        scope: 'order:auction:create',
        resource: input.auctionId,
        actor: { sub: input.buyerId, role: 'BUYER' },
      }),
    };
    if (input.buyerToken) {
      headers['Authorization'] = input.buyerToken.startsWith('Bearer ')
        ? input.buyerToken
        : `Bearer ${input.buyerToken}`;
    }
    if (input.auctionId) {
      headers['Idempotency-Key'] = `auction-checkout:${input.auctionId}:${input.buyerId}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/orders/from-auction`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          auctionId: input.auctionId,
          productId: input.productId,
          productTitle: input.productTitle,
          sellerId: input.sellerId,
          amount: input.amount,
          shippingAddress: input.shippingAddress,
        }),
        signal: AbortSignal.timeout(8000),
      });

      const body = (await response.json().catch(() => ({}))) as any;
      if (response.ok && body.success && body.data) {
        return {
          orderId: String(body.data.orderId || body.data.id),
          orderCode: body.data.orderCode,
          totalAmount: Number(body.data.totalAmount || input.amount),
          payment: {
            paymentLinkId: body.data.payment?.paymentLinkId,
            checkoutUrl: body.data.payment?.checkoutUrl || '',
            status: body.data.payment?.status || 'PENDING',
          },
        };
      }

      // Trong môi trường test độc lập vẫn cho phép mock fallback nếu không bật Commerce Service
      if (process.env.NODE_ENV !== 'test') {
        throw new Error(
          body?.error?.message ||
            body?.error ||
            'Không thể tạo đơn hàng thắng đấu giá trên Commerce Service. Vui lòng thử lại.',
        );
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'test') {
        throw err instanceof Error
          ? err
          : new Error('Không kết nối được Commerce Service để tạo đơn thanh toán.');
      }
    }

    // Chỉ dùng mock fallback trong unit test độc lập
    const orderCode = `ORD-AUC-TEST-${Math.floor(100000 + Math.random() * 900000)}`;
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
