import crypto from 'node:crypto';
import {
  IPaymentGateway,
  PaymentLink,
  PaymentLinkRequest,
  PaymentWebhook,
} from '../../application/checkout/ports';

export interface PayOsConfig {
  clientId: string;
  apiKey: string;
  checksumKey: string;
  returnUrl: string;
  cancelUrl: string;
  baseUrl: string;
}

function configFromEnv(): PayOsConfig {
  const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';
  return {
    clientId: process.env.PAYOS_CLIENT_ID || '',
    apiKey: process.env.PAYOS_API_KEY || '',
    checksumKey: process.env.PAYOS_CHECKSUM_KEY || '',
    returnUrl: process.env.PAYOS_RETURN_URL || `${frontend}/checkout/result`,
    cancelUrl: process.env.PAYOS_CANCEL_URL || `${frontend}/checkout/result?cancelled=true`,
    baseUrl: process.env.PAYOS_API_URL || 'https://api-merchant.payos.vn',
  };
}

function normalize(value: unknown): string {
  if (value === null || value === undefined || value === 'null' || value === 'undefined') return '';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/** Chuỗi ký của PayOS: các cặp key=value sắp xếp theo tên key, nối bằng '&'. */
export function payosSignature(data: Record<string, unknown>, checksumKey: string): string {
  const payload = Object.keys(data)
    .sort()
    .map((key) => `${key}=${normalize(data[key])}`)
    .join('&');
  return crypto.createHmac('sha256', checksumKey).update(payload).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export class PayOsGateway implements IPaymentGateway {
  constructor(private readonly config: PayOsConfig = configFromEnv()) {}

  public isConfigured(): boolean {
    return Boolean(this.config.clientId && this.config.apiKey && this.config.checksumKey);
  }

  public async createPaymentLink(request: PaymentLinkRequest): Promise<PaymentLink> {
    const signed = {
      amount: request.amount,
      cancelUrl: this.config.cancelUrl,
      description: request.description,
      orderCode: request.orderCode,
      returnUrl: this.config.returnUrl,
    };

    const response = await fetch(`${this.config.baseUrl}/v2/payment-requests`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-client-id': this.config.clientId,
        'x-api-key': this.config.apiKey,
      },
      body: JSON.stringify({
        ...signed,
        items: request.items,
        expiredAt: Math.floor(request.expiresAt.getTime() / 1000),
        signature: payosSignature(signed, this.config.checksumKey),
      }),
      signal: AbortSignal.timeout(10000),
    });

    const body = (await response.json()) as {
      code?: string;
      desc?: string;
      data?: { checkoutUrl?: string; paymentLinkId?: string };
    };
    if (!response.ok || body.code !== '00' || !body.data?.checkoutUrl) {
      throw new Error(`PayOS error ${body.code ?? response.status}: ${body.desc ?? ''}`);
    }

    return {
      checkoutUrl: body.data.checkoutUrl,
      paymentLinkId: body.data.paymentLinkId ?? '',
    };
  }

  public verifyWebhook(body: unknown): PaymentWebhook | null {
    if (typeof body !== 'object' || body === null) return null;
    const { data, signature } = body as { data?: unknown; signature?: unknown };
    if (typeof data !== 'object' || data === null || typeof signature !== 'string') return null;

    const expected = payosSignature(data as Record<string, unknown>, this.config.checksumKey);
    if (!safeEqual(expected, signature)) return null;

    const fields = data as Record<string, unknown>;
    const orderCode = Number(fields.orderCode);
    const amount = Number(fields.amount);
    if (!Number.isSafeInteger(orderCode) || !Number.isFinite(amount)) return null;

    return {
      orderCode,
      amount,
      success: (body as { success?: unknown }).success !== false && fields.code === '00',
      reference: typeof fields.reference === 'string' ? fields.reference : undefined,
      raw: body,
    };
  }
}
