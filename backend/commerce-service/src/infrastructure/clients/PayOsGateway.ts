import crypto from 'node:crypto';
import {
  IPaymentGateway,
  PaymentLink,
  PaymentLinkRequest,
  PaymentWebhook,
  RefundRequest,
  RefundResponse,
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
    const returnUrl = request.orderId
      ? this.config.returnUrl.includes('?')
        ? `${this.config.returnUrl}&orderId=${encodeURIComponent(request.orderId)}`
        : `${this.config.returnUrl}?orderId=${encodeURIComponent(request.orderId)}`
      : this.config.returnUrl;
    const cancelUrl = request.orderId
      ? this.config.cancelUrl.includes('?')
        ? `${this.config.cancelUrl}&orderId=${encodeURIComponent(request.orderId)}`
        : `${this.config.cancelUrl}?orderId=${encodeURIComponent(request.orderId)}&cancelled=true`
      : this.config.cancelUrl;

    const signed = {
      amount: request.amount,
      cancelUrl,
      description: request.description,
      orderCode: request.orderCode,
      returnUrl,
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
      data?: {
        checkoutUrl?: string;
        paymentLinkId?: string;
        qrCode?: string;
        bin?: string;
        accountNumber?: string;
        accountName?: string;
        description?: string;
        amount?: number;
        orderCode?: number;
      };
    };
    if (!response.ok || body.code !== '00' || !body.data?.checkoutUrl) {
      throw new Error(`PayOS error ${body.code ?? response.status}: ${body.desc ?? ''}`);
    }

    return {
      checkoutUrl: body.data.checkoutUrl,
      paymentLinkId: body.data.paymentLinkId ?? '',
      qrCode: body.data.qrCode,
      bin: body.data.bin,
      accountNumber: body.data.accountNumber,
      accountName: body.data.accountName,
      description: body.data.description,
      amount: body.data.amount,
      orderCode: body.data.orderCode,
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

  public async getPaymentStatus(
    orderCode: number,
  ): Promise<{ status: string; amountPaid: number } | null> {
    try {
      const response = await fetch(`${this.config.baseUrl}/v2/payment-requests/${orderCode}`, {
        headers: {
          'x-client-id': this.config.clientId,
          'x-api-key': this.config.apiKey,
        },
        signal: AbortSignal.timeout(6000),
      });
      const body = (await response.json()) as {
        code?: string;
        data?: { status?: string; amountPaid?: number };
      };
      if (body.code === '00' && body.data?.status) {
        return {
          status: body.data.status,
          amountPaid: Number(body.data.amountPaid || 0),
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  private isRefundDemoMode(): boolean {
    return process.env.NODE_ENV !== 'production' && process.env.PAYOS_REFUND_DEMO_MODE === 'true';
  }

  /**
   * Kích hoạt hoàn tiền qua cổng thanh toán PayOS / Ngân hàng.
   * Không bao giờ trả SUCCESS giả khi provider chưa xác nhận giao dịch.
   * Chỉ cho phép giả lập khi bật tường minh PAYOS_REFUND_DEMO_MODE=true ngoài production.
   */
  public async executeRefund(request: RefundRequest): Promise<RefundResponse> {
    const sanitizedId = String(request.orderId)
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(-8);
    const requestRef =
      request.idempotencyKey?.trim() || `rf_req_${sanitizedId}_${Date.now().toString(36)}`;

    if (this.isRefundDemoMode()) {
      return {
        refundTransactionId: `rf_demo_${sanitizedId}_${Date.now().toString(36)}`,
        status: 'SUCCESS',
        amount: request.amount,
        completedAt: new Date(),
        providerConfirmed: true,
        demoMode: true,
      };
    }

    const disbursementKey = process.env.PAYOS_DISBURSEMENT_API_KEY?.trim();
    if (!this.isConfigured() || !disbursementKey) {
      return {
        refundTransactionId: '',
        status: 'FAILED',
        amount: request.amount,
        completedAt: new Date(),
        providerConfirmed: false,
        errorCode: 'REFUND_PROVIDER_NOT_CONFIGURED',
        errorMessage:
          'Cổng giải ngân hoàn tiền PayOS chưa được cấu hình (thiếu PAYOS_DISBURSEMENT_API_KEY hoặc thông tin kết nối PayOS).',
      };
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/v2/disbursement/refund`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-client-id': this.config.clientId,
          'x-api-key': disbursementKey,
          'idempotency-key': requestRef,
        },
        body: JSON.stringify({
          orderCode: request.orderCode,
          amount: request.amount,
          reason: request.reason || 'Hoàn tiền khiếu nại',
          referenceId: requestRef,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (response.status >= 500 || response.status === 429) {
        return {
          refundTransactionId: requestRef,
          status: 'PENDING',
          amount: request.amount,
          completedAt: new Date(),
          providerConfirmed: false,
          needsReconciliation: true,
          errorCode: 'REFUND_PROVIDER_UNAVAILABLE',
          errorMessage: `PayOS tạm thời phản hồi HTTP ${response.status}; cần đối soát trạng thái trước khi thử lại.`,
        };
      }

      let body: any = null;
      try {
        body = await response.json();
      } catch {
        return {
          refundTransactionId: requestRef,
          status: 'PENDING',
          amount: request.amount,
          completedAt: new Date(),
          providerConfirmed: false,
          needsReconciliation: true,
          errorCode: 'REFUND_PROVIDER_INVALID_RESPONSE',
          errorMessage: 'Phản hồi từ PayOS không hợp lệ; giữ trạng thái PENDING để đối soát.',
        };
      }

      if (response.ok && body?.code === '00' && body?.data?.refundTransactionId) {
        const providerStatus = String(body.data.status || 'SUCCESS').toUpperCase();
        if (providerStatus === 'PENDING' || providerStatus === 'PROCESSING') {
          return {
            refundTransactionId: String(body.data.refundTransactionId),
            status: 'PENDING',
            amount: request.amount,
            completedAt: new Date(),
            providerConfirmed: false,
            needsReconciliation: true,
          };
        }
        if (providerStatus === 'SUCCESS' || providerStatus === 'COMPLETED') {
          return {
            refundTransactionId: String(body.data.refundTransactionId),
            status: 'SUCCESS',
            amount: request.amount,
            completedAt: new Date(),
            providerConfirmed: true,
          };
        }
        return {
          refundTransactionId: String(body.data.refundTransactionId),
          status: 'FAILED',
          amount: request.amount,
          completedAt: new Date(),
          providerConfirmed: false,
          errorCode: 'REFUND_PROVIDER_REJECTED',
          errorMessage: body?.desc || `PayOS trả trạng thái hoàn tiền ${providerStatus}.`,
        };
      }

      return {
        refundTransactionId: String(body?.data?.refundTransactionId || ''),
        status: 'FAILED',
        amount: request.amount,
        completedAt: new Date(),
        providerConfirmed: false,
        errorCode: 'REFUND_PROVIDER_REJECTED',
        errorMessage:
          body?.desc || body?.message || `PayOS từ chối hoàn tiền (HTTP ${response.status}).`,
      };
    } catch (err: any) {
      // Timeout hoặc lỗi mạng: giao dịch có thể đã tới PayOS -> giữ PENDING để đối soát trước khi retry
      return {
        refundTransactionId: requestRef,
        status: 'PENDING',
        amount: request.amount,
        completedAt: new Date(),
        providerConfirmed: false,
        needsReconciliation: true,
        errorCode: 'REFUND_PROVIDER_TIMEOUT',
        errorMessage: `Không nhận được xác nhận từ PayOS (${err?.message || 'network/timeout'}); cần đối soát trước khi thử lại.`,
      };
    }
  }

  public async getRefundStatus(refundTransactionId: string): Promise<{
    status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'UNKNOWN';
    providerConfirmed: boolean;
    refundTransactionId?: string;
    completedAt?: Date;
    errorMessage?: string;
  }> {
    if (this.isRefundDemoMode()) {
      return {
        status: 'SUCCESS',
        providerConfirmed: true,
        refundTransactionId,
        completedAt: new Date(),
      };
    }

    const disbursementKey = process.env.PAYOS_DISBURSEMENT_API_KEY?.trim();
    if (!this.isConfigured() || !disbursementKey) {
      return {
        status: 'UNKNOWN',
        providerConfirmed: false,
        refundTransactionId,
        errorMessage: 'PayOS disbursement gateway chưa được cấu hình.',
      };
    }

    try {
      const response = await fetch(
        `${this.config.baseUrl}/v2/disbursement/refund/${encodeURIComponent(refundTransactionId)}`,
        {
          method: 'GET',
          headers: {
            'x-client-id': this.config.clientId,
            'x-api-key': disbursementKey,
          },
          signal: AbortSignal.timeout(6000),
        },
      );
      if (!response.ok) {
        return {
          status: 'UNKNOWN',
          providerConfirmed: false,
          refundTransactionId,
          errorMessage: `PayOS reconciliation HTTP ${response.status}`,
        };
      }
      const body = (await response.json()) as any;
      const rawStatus = String(body?.data?.status || '').toUpperCase();
      if (body?.code === '00' && (rawStatus === 'SUCCESS' || rawStatus === 'COMPLETED')) {
        return {
          status: 'SUCCESS',
          providerConfirmed: true,
          refundTransactionId: String(body.data.refundTransactionId || refundTransactionId),
          completedAt: body.data.completedAt ? new Date(body.data.completedAt) : new Date(),
        };
      }
      if (rawStatus === 'PENDING' || rawStatus === 'PROCESSING') {
        return {
          status: 'PENDING',
          providerConfirmed: false,
          refundTransactionId: String(body?.data?.refundTransactionId || refundTransactionId),
        };
      }
      if (rawStatus === 'FAILED' || rawStatus === 'CANCELLED' || rawStatus === 'REJECTED') {
        return {
          status: 'FAILED',
          providerConfirmed: false,
          refundTransactionId: String(body?.data?.refundTransactionId || refundTransactionId),
          errorMessage: body?.desc || 'Provider xác nhận giao dịch hoàn tiền thất bại.',
        };
      }
      return {
        status: 'UNKNOWN',
        providerConfirmed: false,
        refundTransactionId,
      };
    } catch (err: any) {
      return {
        status: 'UNKNOWN',
        providerConfirmed: false,
        refundTransactionId,
        errorMessage: err?.message || 'Reconciliation request failed',
      };
    }
  }
}
