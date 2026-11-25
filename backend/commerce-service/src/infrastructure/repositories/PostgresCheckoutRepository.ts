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
    qrCode: row.qrCode || row.qr_code || undefined,
    bin: row.bankBin || row.bank_bin || undefined,
    accountNumber: row.accountNumber || row.account_number || undefined,
    accountName: row.accountName || row.account_name || undefined,
    description: row.transferDescription || row.transfer_description || undefined,
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
    discountAmount: Number(row.discountAmount || row.discount_amount || 0),
    taxAmount: Number(row.taxAmount || row.tax_amount || 0),
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
    promoCode: row.promoCode || row.promo_code || null,
    shippingCarrier: row.shippingCarrier || row.shipping_carrier || null,
    shippingServiceName: row.shippingServiceName || row.shipping_service_name || null,
    estimatedDeliveryAt:
      row.estimatedDeliveryAt || row.estimated_delivery_at
        ? new Date(row.estimatedDeliveryAt || row.estimated_delivery_at)
        : null,
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
        discountAmount: quote.discountAmount || 0,
        taxAmount: quote.taxAmount || 0,
        totalAmount: quote.totalAmount,
        promoCode: quote.promoCode || null,
        shippingOptionId: quote.selectedShippingOptionId || null,
        metadata: {
          promo: quote.promo,
          shippingOptions: quote.shippingOptions,
          selectedShippingOptionId: quote.selectedShippingOptionId,
        } as any,
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
    const metadata =
      typeof (row as any).metadata === 'string'
        ? JSON.parse((row as any).metadata)
        : (row as any).metadata || {};

    return {
      id: row.id,
      buyerId: row.buyerId,
      sellerId: row.sellerId,
      items,
      shippingAddress,
      subtotal: Number(row.subtotal),
      shippingFee: Number(row.shippingFee),
      discountAmount: Number((row as any).discountAmount || (row as any).discount_amount || 0),
      taxAmount: Number((row as any).taxAmount || (row as any).tax_amount || 0),
      totalAmount: Number(row.totalAmount),
      promoCode: (row as any).promoCode || (row as any).promo_code || null,
      promo: metadata.promo || null,
      selectedShippingOptionId:
        (row as any).shippingOptionId ||
        (row as any).shipping_option_id ||
        metadata.selectedShippingOptionId ||
        null,
      shippingOptions: metadata.shippingOptions || undefined,
      currency: row.currency,
      expiresAt: new Date(row.expiresAt),
    };
  }

  public async findOrderByIdempotency(
    buyerId: string,
    idempotencyKey: string,
  ): Promise<{ order: OrderRecord; payment: PaymentRecord; requestHash: string } | null> {
    if (!this.prisma?.checkoutIdempotency) return null;
    const existing = await this.prisma.checkoutIdempotency.findUnique({
      where: {
        buyerId_idempotencyKey: {
          buyerId,
          idempotencyKey,
        },
      },
    });

    if (!existing || !existing.orderId) {
      return null;
    }

    const order = await this.loadOrderPrisma(this.prisma, String(existing.orderId));
    if (!order || order.status === 'CANCELLED') {
      return null;
    }
    const payment = await this.loadLatestPaymentPrisma(this.prisma, String(existing.orderId));
    if (!payment) {
      return null;
    }

    return {
      order,
      payment,
      requestHash: existing.requestHash,
    };
  }

  public async createOrder(params: CreateOrderParams) {
    if (params.idempotencyKey) {
      const existing = await this.prisma.checkoutIdempotency.findUnique({
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
          const order = await this.loadOrderPrisma(this.prisma, String(existing.orderId));
          if (order && order.status !== 'CANCELLED') {
            const payment = await this.loadLatestPaymentPrisma(
              this.prisma,
              String(existing.orderId),
            );
            return {
              order: order,
              payment: payment!,
              replay: true,
              requestHash: params.requestHash,
            };
          }
        }
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (params.idempotencyKey) {
        // Sử dụng ON CONFLICT DO NOTHING để tránh gây lỗi 25P02 abort transaction trong PostgreSQL
        await tx.$executeRaw`
          INSERT INTO commerce_checkout_idempotency (buyer_id, idempotency_key, request_hash, created_at)
          VALUES (${params.buyerId}, ${params.idempotencyKey}, ${params.requestHash}, NOW())
          ON CONFLICT (buyer_id, idempotency_key) DO NOTHING
        `;

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
            if (order && order.status !== 'CANCELLED') {
              const payment = await this.loadLatestPaymentPrisma(tx, String(existing.orderId));
              return {
                order: order,
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
      const prefix = params.orderType === 'AUCTION' ? 'ORD-AUC' : 'ORD';
      const orderCode = `${prefix}-${nowFormatted}-${seqNum}`;

      const initialStatus = params.paymentMethod === 'COD' ? 'PROCESSING' : 'PENDING_PAYMENT';
      const order = await tx.order.create({
        data: {
          orderCode,
          buyerId: params.buyerId,
          sellerId: params.sellerId,
          totalAmount: params.totalAmount,
          shippingFee: params.shippingFee,
          discountAmount: params.discountAmount || 0,
          taxAmount: params.taxAmount || 0,
          promoCode: params.promoCode || null,
          shippingCarrier: params.shippingCarrier || null,
          shippingServiceName: params.shippingServiceName || null,
          estimatedDeliveryAt: params.estimatedDeliveryAt || null,
          status: initialStatus,
          shippingAddress: params.shippingAddress as any,
          checkoutSessionExpiresAt: params.orderExpiresAt,
        },
      });

      const orderId = String(order.id);

      // Record promotion usage if voucher applied (với Advisory Lock chống Race Condition)
      if (params.promotionId && Number(params.discountAmount || 0) > 0) {
        // 1. Khóa theo promotionId để tuần tự hóa việc áp mã chống race condition
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${params.promotionId}))`;

        // 2. Kiểm tra lại hạn mức thực tế bên trong transaction
        const promo = await tx.promotion.findUnique({ where: { id: params.promotionId } });
        if (!promo || promo.usedCount >= promo.usageLimit) {
          throw new CheckoutError(409, 'PROMO_OUT_OF_QUOTA', 'Mã giảm giá vừa hết lượt sử dụng.');
        }

        // 3. Kiểm tra lại số lần user đã dùng
        const userCount = await tx.promotionUsage.count({
          where: { promotionId: params.promotionId, userId: params.buyerId },
        });
        if (userCount >= promo.perUserLimit) {
          throw new CheckoutError(
            409,
            'PROMO_USER_LIMIT_REACHED',
            'Bạn đã sử dụng hết lượt cho phép của mã này.',
          );
        }

        // 4. Lưu lượt dùng và tăng usedCount an toàn
        await tx.promotionUsage.create({
          data: {
            promotionId: params.promotionId,
            userId: params.buyerId,
            orderId: order.id,
            discountAmount: params.discountAmount || 0,
          },
        });
        await tx.promotion.update({
          where: { id: params.promotionId },
          data: {
            usedCount: { increment: 1 },
          },
        });
      }
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

      // Sinh PayOS order code đảm bảo không bao giờ trùng lặp (kể cả sau khi reset sequence DB)
      let nextSeq = 1;
      try {
        const payosSeqRes = await tx.$queryRaw<
          Array<{ nextval: bigint }>
        >`SELECT nextval('commerce_payos_order_code_seq')`;
        if (payosSeqRes[0]?.nextval) {
          nextSeq = Number(payosSeqRes[0].nextval);
        }
      } catch {
        nextSeq = Math.floor(1000 + Math.random() * 9000);
      }
      const payosOrderCode = Math.floor(Date.now() / 1000) * 1000 + (nextSeq % 1000);

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
    const clean = String(orderId || '').trim();
    if (!clean) return null;

    const orConditions: Array<Record<string, unknown>> = [{ id: clean }, { orderCode: clean }];

    // Hỗ trợ tra cứu đơn theo payosOrderCode số nguyên khi PayOS callback gửi orderCode dạng số
    if (/^\d{4,15}$/.test(clean)) {
      const payment = await this.prisma.payment.findFirst({
        where: { payosOrderCode: BigInt(clean) },
        orderBy: { id: 'desc' },
      });
      if (payment?.orderId) {
        orConditions.unshift({ id: String(payment.orderId) });
      }
    }

    const order = await this.prisma.order.findFirst({
      where: {
        OR: orConditions,
      },
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
      let nextSeq = 1;
      try {
        const payosSeqRes = await tx.$queryRaw<
          Array<{ nextval: bigint }>
        >`SELECT nextval('commerce_payos_order_code_seq')`;
        if (payosSeqRes[0]?.nextval) {
          nextSeq = Number(payosSeqRes[0].nextval);
        }
      } catch {
        nextSeq = Math.floor(1000 + Math.random() * 9000);
      }
      const payosOrderCode = Math.floor(Date.now() / 1000) * 1000 + (nextSeq % 1000);

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
