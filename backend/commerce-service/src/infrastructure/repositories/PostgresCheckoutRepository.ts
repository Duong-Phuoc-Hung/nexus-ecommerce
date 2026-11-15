import crypto from 'node:crypto';
import { Pool } from 'pg';
import { PrismaClient } from '../database/generated/client';
import { PrismaClientWrapper } from '../database/PrismaClient';
import {
  ApplyPaymentOutcome,
  CheckoutError,
  CreateOrderParams,
  ICheckoutRepository,
  OrderRecord,
  PaymentLink,
  PaymentRecord,
  PaymentWebhook,
  PricedLine,
  QuoteRecord,
  ShippingAddress,
} from '../../application/checkout/ports';

function toPayment(row: any): PaymentRecord {
  return {
    id: String(row.id),
    orderId: String(row.orderId || row.order_id),
    paymentMethod: row.paymentMethod || row.payment_method || 'PAYOS',
    payosOrderCode: Number(row.payosOrderCode || row.payos_order_code),
    status: row.status,
    amount: Number(row.amount),
    currency: row.currency || 'VND',
    checkoutUrl: row.checkoutUrl || row.checkout_url || undefined,
    paymentLinkId: row.paymentLinkId || row.payment_link_id || undefined,
    qrCode: row.qrCode || undefined,
    bin: row.bankBin || undefined,
    accountNumber: row.accountNumber || undefined,
    accountName: row.accountName || undefined,
    description: row.transferDescription || undefined,
    expiresAt:
      row.expiresAt || row.expires_at ? new Date(row.expiresAt || row.expires_at) : undefined,
    paidAt: row.paidAt || row.paid_at ? new Date(row.paidAt || row.paid_at) : undefined,
  };
}

function toOrder(row: any, items: any[]): OrderRecord {
  const shippingAddress =
    typeof row.shippingAddress === 'string'
      ? JSON.parse(row.shippingAddress)
      : row.shippingAddress || row.shipping_address;

  return {
    id: String(row.id),
    orderCode: row.orderCode || row.order_code,
    buyerId: row.buyerId || row.buyer_id,
    sellerId: row.sellerId || row.seller_id,
    status: row.status,
    totalAmount: Number(row.totalAmount || row.total_amount),
    shippingFee: Number(row.shippingFee || row.shipping_fee),
    shippingAddress: shippingAddress as ShippingAddress,
    expiresAt: new Date(
      row.checkoutSessionExpiresAt || row.checkout_session_expires_at || Date.now(),
    ),
    items: items.map((item): PricedLine => ({
      productId: String(item.productId || item.product_id),
      title: item.productTitle || item.product_title,
      unitPrice: Number(item.unitPrice || item.unit_price),
      quantity: Number(item.quantity),
      subtotal: Number(item.subtotal),
    })),
  };
}

export class PostgresCheckoutRepository implements ICheckoutRepository {
  private _prisma?: PrismaClient;

  constructor(
    private readonly pool?: Pool,
    prisma?: PrismaClient,
  ) {
    if (prisma) {
      this._prisma = prisma;
    }
  }

  private get prisma(): PrismaClient {
    if (!this._prisma) {
      this._prisma = PrismaClientWrapper.getInstance();
    }
    return this._prisma;
  }

  public async saveQuote(quote: QuoteRecord): Promise<void> {
    await this.prisma.checkoutQuote.create({
      data: {
        id: quote.id,
        buyerId: quote.buyerId,
        sellerId: quote.sellerId,
        items: quote.items as any,
        shippingAddress: quote.shippingAddress as any,
        subtotal: quote.subtotal,
        shippingFee: quote.shippingFee,
        totalAmount: quote.totalAmount,
        currency: quote.currency,
        expiresAt: quote.expiresAt,
      },
    });
  }

  public async findQuote(id: string): Promise<QuoteRecord | null> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

    const row = await this.prisma.checkoutQuote.findUnique({
      where: { id },
    });
    if (!row) return null;

    const items = typeof row.items === 'string' ? JSON.parse(row.items) : row.items;
    const shippingAddress =
      typeof row.shippingAddress === 'string'
        ? JSON.parse(row.shippingAddress)
        : row.shippingAddress;

    return {
      id: row.id,
      buyerId: row.buyerId,
      sellerId: row.sellerId,
      items,
      shippingAddress,
      subtotal: Number(row.subtotal),
      shippingFee: Number(row.shippingFee),
      totalAmount: Number(row.totalAmount),
      currency: row.currency,
      expiresAt: new Date(row.expiresAt),
    };
  }

  public async createOrder(params: CreateOrderParams) {
    return this.prisma.$transaction(async (tx) => {
      if (params.idempotencyKey) {
        try {
          await tx.checkoutIdempotency.create({
            data: {
              buyerId: params.buyerId,
              idempotencyKey: params.idempotencyKey,
              requestHash: params.requestHash,
            },
          });
        } catch {
          // Khóa Idempotency đã tồn tại, kiểm tra xem có cùng request_hash không
          const existing = await tx.checkoutIdempotency.findUnique({
            where: {
              buyerId_idempotencyKey: {
                buyerId: params.buyerId,
                idempotencyKey: params.idempotencyKey,
              },
            },
          });

          if (existing) {
            if (existing.requestHash !== params.requestHash) {
              return {
                order: null as unknown as OrderRecord,
                payment: null as unknown as PaymentRecord,
                replay: true,
                requestHash: existing.requestHash,
              };
            }
            if (existing.orderId) {
              const order = await this.loadOrderPrisma(tx, String(existing.orderId));
              const payment = await this.loadLatestPaymentPrisma(tx, String(existing.orderId));
              return {
                order: order!,
                payment: payment!,
                replay: true,
                requestHash: params.requestHash,
              };
            }
          }
        }
      }

      // Tuần tự hóa việc giữ hàng theo từng sản phẩm qua Advisory Lock
      const sortedProductIds = [...params.items.map((item) => item.productId)].sort();
      for (const productId of sortedProductIds) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${productId}))`;
      }

      for (const item of params.items) {
        const heldRes = await tx.stockReservation.aggregate({
          where: {
            productId: item.productId,
            status: 'ACTIVE',
            expiresAt: { gt: new Date() },
          },
          _sum: {
            quantity: true,
          },
        });
        const heldQty = heldRes._sum.quantity || 0;
        const stock = params.stockByProduct[item.productId];
        if (stock !== undefined && heldQty + item.quantity > stock) {
          throw new CheckoutError(
            409,
            'INSUFFICIENT_STOCK',
            `Sản phẩm ${item.productId} không đủ hàng.`,
          );
        }
      }

      // Sinh mã đơn hàng tuần tự
      const seqRes = await tx.$queryRaw<
        Array<{ nextval: bigint }>
      >`SELECT nextval('commerce_order_code_seq')`;
      const seqNum = String(seqRes[0]?.nextval || Math.floor(1000 + Math.random() * 9000)).padStart(
        6,
        '0',
      );
      const nowFormatted = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const orderCode = `ORD-${nowFormatted}-${seqNum}`;

      const initialStatus = params.paymentMethod === 'COD' ? 'PROCESSING' : 'PENDING_PAYMENT';
      const order = await tx.order.create({
        data: {
          orderCode,
          buyerId: params.buyerId,
          sellerId: params.sellerId,
          totalAmount: params.totalAmount,
          shippingFee: params.shippingFee,
          status: initialStatus,
          shippingAddress: params.shippingAddress as any,
          checkoutSessionExpiresAt: params.orderExpiresAt,
        },
      });

      const orderId = String(order.id);
      const reservationStatus = params.paymentMethod === 'COD' ? 'COMMITTED' : 'ACTIVE';

      for (const item of params.items) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            productTitle: item.title,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            subtotal: item.subtotal,
          },
        });

        await tx.stockReservation.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            status: reservationStatus,
            expiresAt: params.reservationExpiresAt,
          },
        });
      }

      // Sinh PayOS order code
      const payosSeqRes = await tx.$queryRaw<
        Array<{ nextval: bigint }>
      >`SELECT nextval('commerce_payos_order_code_seq')`;
      const payosOrderCode = Number(
        payosSeqRes[0]?.nextval || Math.floor(1000000 + Math.random() * 9000000),
      );

      await tx.payment.create({
        data: {
          orderId: order.id,
          paymentMethod: params.paymentMethod || 'PAYOS',
          idempotencyKey: crypto.randomUUID(),
          amount: params.totalAmount,
          currency: 'VND',
          status: 'PENDING',
          payosOrderCode: BigInt(payosOrderCode),
          expiresAt: params.orderExpiresAt,
        },
      });

      if (params.idempotencyKey) {
        await tx.checkoutIdempotency.update({
          where: {
            buyerId_idempotencyKey: {
              buyerId: params.buyerId,
              idempotencyKey: params.idempotencyKey,
            },
          },
          data: {
            orderId: order.id,
          },
        });
      }

      // Xóa các món đã checkout khỏi giỏ hàng nếu là đơn COD
      if (params.paymentMethod === 'COD') {
        const itemPids = params.items.map((it) => it.productId);
        if (itemPids.length > 0) {
          const cart = await tx.cart.findFirst({
            where: {
              userId: params.buyerId,
              expiresAt: { gt: new Date() },
            },
            orderBy: { id: 'desc' },
          });

          if (cart) {
            await tx.cartItem.deleteMany({
              where: {
                cartId: cart.id,
                productId: { in: itemPids },
              },
            });
            await tx.cart.update({
              where: { id: cart.id },
              data: { updatedAt: new Date() },
            });
          }
        }
      }

      const loadedOrder = await this.loadOrderPrisma(tx, orderId);
      const loadedPayment = await this.loadLatestPaymentPrisma(tx, orderId);

      return {
        order: loadedOrder!,
        payment: loadedPayment!,
        replay: false,
        requestHash: params.requestHash,
      };
    });
  }

  public async findOrder(orderId: string): Promise<OrderRecord | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!order) return null;
    return toOrder(order, (order as any).items || []);
  }

  public async findOrderByPayosCode(payosOrderCode: number): Promise<OrderRecord | null> {
    const payment = await this.prisma.payment.findFirst({
      where: {
        payosOrderCode: BigInt(payosOrderCode),
      },
      orderBy: { id: 'desc' },
    });

    if (!payment) return null;
    return this.findOrder(String(payment.orderId));
  }

  public async latestPayment(orderId: string): Promise<PaymentRecord | null> {
    const row = await this.prisma.payment.findFirst({
      where: {
        orderId: orderId,
      },
      orderBy: { id: 'desc' },
    });

    return row ? toPayment(row) : null;
  }

  public async countPayments(orderId: string): Promise<number> {
    return this.prisma.payment.count({
      where: {
        orderId: orderId,
      },
    });
  }

  public async createPaymentAttempt(orderId: string, amount: number, expiresAt: Date) {
    return this.prisma.$transaction(async (tx) => {
      const payosSeqRes = await tx.$queryRaw<
        Array<{ nextval: bigint }>
      >`SELECT nextval('commerce_payos_order_code_seq')`;
      const payosOrderCode = Number(
        payosSeqRes[0]?.nextval || Math.floor(1000000 + Math.random() * 9000000),
      );

      const row = await tx.payment.create({
        data: {
          orderId: orderId,
          paymentMethod: 'PAYOS',
          idempotencyKey: crypto.randomUUID(),
          amount,
          currency: 'VND',
          status: 'PENDING',
          payosOrderCode: BigInt(payosOrderCode),
          expiresAt,
        },
      });

      return toPayment(row);
    });
  }

  public async markPaymentCancelled(paymentId: string): Promise<void> {
    await this.prisma.payment.updateMany({
      where: {
        id: BigInt(paymentId),
        status: 'PENDING',
      },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date(),
      },
    });
  }

  public async setPaymentLink(paymentId: string, link: PaymentLink): Promise<void> {
    await this.prisma.payment.update({
      where: {
        id: BigInt(paymentId),
      },
      data: {
        checkoutUrl: link.checkoutUrl,
        paymentLinkId: link.paymentLinkId,
        qrCode: link.qrCode || null,
        bankBin: link.bin || null,
        accountNumber: link.accountNumber || null,
        accountName: link.accountName || null,
        transferDescription: link.description || null,
        updatedAt: new Date(),
      },
    });
  }

  public async applyPaymentResult(webhook: PaymentWebhook): Promise<ApplyPaymentOutcome> {
    return this.prisma.$transaction(async (tx) => {
      const found = await tx.payment.findFirst({
        where: {
          payosOrderCode: BigInt(webhook.orderCode),
        },
      });

      if (!found) return 'UNKNOWN_ORDER_CODE';

      const payment = toPayment(found);
      if (payment.status === 'SUCCEEDED') return 'DUPLICATE';

      const raw = JSON.stringify(webhook.raw);
      if (webhook.amount !== payment.amount) {
        await tx.payment.update({
          where: { id: found.id },
          data: {
            status: 'FAILED',
            rawResponse: raw as any,
            updatedAt: new Date(),
          },
        });
        return 'AMOUNT_MISMATCH';
      }

      if (!webhook.success) {
        await tx.payment.update({
          where: { id: found.id },
          data: {
            status: 'FAILED',
            rawResponse: raw as any,
            updatedAt: new Date(),
          },
        });
        return 'PAYMENT_FAILED';
      }

      await tx.payment.update({
        where: { id: found.id },
        data: {
          status: 'SUCCEEDED',
          paidAt: new Date(),
          transactionId: webhook.reference || null,
          rawResponse: raw as any,
          updatedAt: new Date(),
        },
      });

      await tx.order.updateMany({
        where: {
          id: found.orderId,
          status: 'PENDING_PAYMENT',
        },
        data: {
          status: 'PAID',
          updatedAt: new Date(),
        },
      });

      await tx.stockReservation.updateMany({
        where: {
          orderId: found.orderId,
          status: 'ACTIVE',
        },
        data: {
          status: 'COMMITTED',
        },
      });

      // Xóa các món đã thanh toán khỏi giỏ hàng của Buyer
      const order = await tx.order.findUnique({
        where: { id: found.orderId },
        include: { items: true },
      });

      if (order && order.items.length > 0) {
        const productIds = order.items.map((r) => r.productId);
        const cart = await tx.cart.findFirst({
          where: {
            userId: order.buyerId,
            expiresAt: { gt: new Date() },
          },
          orderBy: { id: 'desc' },
        });

        if (cart) {
          await tx.cartItem.deleteMany({
            where: {
              cartId: cart.id,
              productId: { in: productIds },
            },
          });
          await tx.cart.update({
            where: { id: cart.id },
            data: { updatedAt: new Date() },
          });
        }
      }

      return 'PAID';
    });
  }

  private async loadOrderPrisma(tx: any, orderId: string): Promise<OrderRecord | null> {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!order) return null;
    return toOrder(order, (order as any).items || []);
  }

  private async loadLatestPaymentPrisma(tx: any, orderId: string): Promise<PaymentRecord | null> {
    const row = await tx.payment.findFirst({
      where: {
        orderId: orderId,
      },
      orderBy: { id: 'desc' },
    });

    return row ? toPayment(row) : null;
  }
}
