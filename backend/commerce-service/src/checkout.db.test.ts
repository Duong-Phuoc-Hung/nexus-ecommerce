import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import express from 'express';
import type { AddressInfo } from 'node:net';
import { Pool } from 'pg';
import { CheckoutService } from './application/checkout/CheckoutService';
import { CatalogProduct, IPaymentGateway, PaymentLinkRequest } from './application/checkout/ports';
import { FlatRateShippingQuote } from './infrastructure/clients/FlatRateShippingQuote';
import { payosSignature, PayOsGateway } from './infrastructure/clients/PayOsGateway';
import { PostgresCheckoutRepository } from './infrastructure/repositories/PostgresCheckoutRepository';
import { CheckoutController } from './interfaces/http/controllers/CheckoutController';
import { createCheckoutRouter } from './interfaces/http/routes/CheckoutRoutes';

const CHECKSUM = 'test_checksum_key';
const SECRET = 'nexus_super_secret_jwt_access_key_min_32_chars_local_dev';

function token(sub: string, role: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(
    JSON.stringify({ sub, email: `${sub}@example.com`, role, iat: now, exp: now + 3600 }),
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

const products = new Map<string, CatalogProduct>();
const linkRequests: PaymentLinkRequest[] = [];

const payos = new PayOsGateway({
  clientId: 'id',
  apiKey: 'key',
  checksumKey: CHECKSUM,
  returnUrl: 'http://r',
  cancelUrl: 'http://c',
  baseUrl: 'http://unused',
});

const fakeGateway: IPaymentGateway = {
  isConfigured: () => true,
  createPaymentLink: async (request) => {
    linkRequests.push(request);
    return {
      paymentLinkId: `plink_${request.orderCode}`,
      checkoutUrl: `https://pay.test/${request.orderCode}`,
    };
  },
  verifyWebhook: (body) => payos.verifyWebhook(body),
};

function webhookBody(orderCode: number, amount: number, code = '00', key = CHECKSUM) {
  const data = {
    orderCode,
    amount,
    description: 'test',
    accountNumber: '123',
    reference: `REF${orderCode}`,
    code,
    desc: 'success',
  };
  return {
    code,
    desc: 'success',
    success: code === '00',
    data,
    signature: payosSignature(data, key),
  };
}

const address = {
  fullName: 'Nguyen Van A',
  phone: '0901234567',
  province: 'Ho Chi Minh',
  addressLine: '1 Le Loi',
};

test(
  'Commerce checkout + PayOS flow on Postgres',
  { skip: process.env.COMMERCE_DB_TEST !== 'true' },
  async () => {
    const pool = new Pool({
      host: 'localhost',
      port: Number(process.env.COMMERCE_DB_PORT) || 5434,
      user: 'nexus_commerce',
      password: 'nexus_password',
      database: 'nexus_commerce_db',
    });
    const run = Date.now().toString();
    const buyer = `buyer_${run}`;
    const otherBuyer = `other_${run}`;
    const seller = `seller_${run}`;
    const pid1 = String(9000000 + (Number(run) % 900000));
    const pid2 = String(Number(pid1) + 1);
    products.set(pid1, {
      id: pid1,
      sellerId: seller,
      title: 'Áo',
      price: 100000,
      stockQuantity: 5,
      status: 'ACTIVE',
    });
    products.set(pid2, {
      id: pid2,
      sellerId: 'seller_other',
      title: 'Quần',
      price: 50000,
      stockQuantity: 5,
      status: 'ACTIVE',
    });

    process.env.SHIPPING_UNSUPPORTED_PROVINCES = 'Truong Sa';
    const service = new CheckoutService(
      new PostgresCheckoutRepository(pool),
      { findProduct: async (id) => products.get(id) ?? null },
      new FlatRateShippingQuote(),
      fakeGateway,
    );
    const app = express();
    app.use(express.json());
    app.use('/api/v1', createCheckoutRouter(new CheckoutController(service)));
    const server = app.listen(0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;

    const call = async (
      method: string,
      path: string,
      tk: string | null,
      body?: unknown,
      headers: Record<string, string> = {},
    ) => {
      const res = await fetch(`${base}${path}`, {
        method,
        headers: {
          'content-type': 'application/json',
          ...(tk ? { authorization: `Bearer ${tk}` } : {}),
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: res.status, json: (await res.json()) as any };
    };

    try {
      const buyerTk = token(buyer, 'BUYER');
      const cart = { items: [{ productId: pid1, quantity: 2 }], shippingAddress: address };

      // #8 quote
      assert.equal((await call('POST', '/checkout/quote', null, cart)).status, 401);
      assert.equal((await call('POST', '/checkout/quote', token('s', 'SELLER'), cart)).status, 403);
      const quote = await call('POST', '/checkout/quote', buyerTk, cart);
      assert.equal(quote.status, 200);
      assert.equal(quote.json.data.subtotal, 200000);
      assert.equal(quote.json.data.totalAmount, 230000);
      assert.equal(quote.json.data.currency, 'VND');
      assert.ok(quote.json.data.quoteId && quote.json.data.expiresAt);

      const unsupported = await call('POST', '/checkout/quote', buyerTk, {
        ...cart,
        shippingAddress: { ...address, province: 'Truong Sa' },
      });
      assert.equal(unsupported.status, 422);
      assert.equal(unsupported.json.error.code, 'SHIPPING_NOT_SUPPORTED');

      const mixed = await call('POST', '/checkout/quote', buyerTk, {
        ...cart,
        items: [
          { productId: pid1, quantity: 1 },
          { productId: pid2, quantity: 1 },
        ],
      });
      assert.equal(mixed.status, 422);
      assert.equal(mixed.json.error.code, 'MIXED_SELLERS_NOT_SUPPORTED');
      assert.equal((await call('POST', '/checkout/quote', buyerTk, { items: [] })).status, 400);

      // #9 checkout + idempotency
      const key = `key-${run}`;
      const body = { ...cart, quoteId: quote.json.data.quoteId };
      assert.equal((await call('POST', '/orders/checkout', null, body)).status, 401);
      const order = await call('POST', '/orders/checkout', buyerTk, body, {
        'Idempotency-Key': key,
      });
      assert.equal(order.status, 201);
      assert.equal(order.json.data.totalAmount, 230000);
      assert.match(order.json.data.checkoutUrl, /^https:\/\/pay\.test\//);
      const orderId = order.json.data.orderId;

      const replay = await call('POST', '/orders/checkout', buyerTk, body, {
        'Idempotency-Key': key,
      });
      assert.equal(replay.status, 200);
      assert.equal(replay.json.data.orderId, orderId);

      const reused = await call(
        'POST',
        '/orders/checkout',
        buyerTk,
        { ...cart, items: [{ productId: pid1, quantity: 1 }] },
        { 'Idempotency-Key': key },
      );
      assert.equal(reused.status, 409);
      assert.equal(reused.json.error.code, 'IDEMPOTENCY_KEY_REUSED');

      // 2 giữ + 4 mới > tồn kho 5
      const overstock = await call('POST', '/orders/checkout', token(otherBuyer, 'BUYER'), {
        ...cart,
        items: [{ productId: pid1, quantity: 4 }],
      });
      assert.equal(overstock.status, 409);
      assert.equal(overstock.json.error.code, 'INSUFFICIENT_STOCK');

      // #12 payment-status
      const status = await call('GET', `/orders/${orderId}/payment-status`, buyerTk);
      assert.equal(status.status, 200);
      assert.equal(status.json.data.paymentStatus, 'PENDING');
      assert.equal(
        (await call('GET', `/orders/${orderId}/payment-status`, token(otherBuyer, 'BUYER'))).status,
        404,
      );

      // #10 payment-link: tái sử dụng, tối đa 3 lần
      const reuse = await call('POST', `/orders/${orderId}/payment-link`, buyerTk, {});
      assert.equal(reuse.status, 200);
      assert.equal(reuse.json.data.reused, true);
      assert.equal(reuse.json.data.checkoutUrl, order.json.data.checkoutUrl);
      const renew2 = await call('POST', `/orders/${orderId}/payment-link`, buyerTk, {
        renew: true,
      });
      assert.equal(renew2.json.data.reused, false);
      assert.notEqual(renew2.json.data.checkoutUrl, order.json.data.checkoutUrl);
      assert.equal(
        (await call('POST', `/orders/${orderId}/payment-link`, buyerTk, { renew: true })).status,
        200,
      );
      const tooMany = await call('POST', `/orders/${orderId}/payment-link`, buyerTk, {
        renew: true,
      });
      assert.equal(tooMany.status, 409);
      assert.equal(tooMany.json.error.code, 'PAYMENT_ATTEMPTS_EXCEEDED');

      // #11 webhook
      const latest = await pool.query(
        'SELECT payos_order_code, amount FROM commerce_payments WHERE order_id = $1 AND status = $2',
        [orderId, 'PENDING'],
      );
      const code = Number(latest.rows[0].payos_order_code);
      assert.equal(
        (
          await call(
            'POST',
            '/payments/payos/webhook',
            null,
            webhookBody(code, 230000, '00', 'bad'),
          )
        ).status,
        401,
      );
      const wrongAmount = await call('POST', '/payments/payos/webhook', null, webhookBody(code, 1));
      assert.equal(wrongAmount.json.data.outcome, 'AMOUNT_MISMATCH');
      assert.equal(
        (await pool.query('SELECT status FROM commerce_orders WHERE id = $1', [orderId])).rows[0]
          .status,
        'PENDING_PAYMENT',
      );

      // đơn thứ hai để thanh toán thành công
      const order2 = await call('POST', '/orders/checkout', buyerTk, {
        ...cart,
        items: [{ productId: pid1, quantity: 1 }],
      });
      assert.equal(order2.status, 201);
      const code2 = Number(
        (
          await pool.query('SELECT payos_order_code FROM commerce_payments WHERE order_id = $1', [
            order2.json.data.orderId,
          ])
        ).rows[0].payos_order_code,
      );
      const paid = await call('POST', '/payments/payos/webhook', null, webhookBody(code2, 130000));
      assert.equal(paid.json.data.outcome, 'PAID');
      const again = await call('POST', '/payments/payos/webhook', null, webhookBody(code2, 130000));
      assert.equal(again.json.data.outcome, 'DUPLICATE');
      assert.equal(
        (await call('POST', '/payments/payos/webhook', null, webhookBody(999999999, 1))).json.data
          .outcome,
        'UNKNOWN_ORDER_CODE',
      );

      const paidStatus = await call(
        'GET',
        `/orders/${order2.json.data.orderId}/payment-status`,
        buyerTk,
      );
      assert.equal(paidStatus.json.data.orderStatus, 'PAID');
      assert.equal(paidStatus.json.data.paymentStatus, 'SUCCEEDED');
      assert.ok(paidStatus.json.data.paidAt);

      const afterPaid = await call(
        'POST',
        `/orders/${order2.json.data.orderId}/payment-link`,
        buyerTk,
        {},
      );
      assert.equal(afterPaid.status, 409);
      assert.equal(afterPaid.json.error.code, 'ORDER_ALREADY_PAID');

      // hết hạn
      await pool.query(
        "UPDATE commerce_orders SET checkout_session_expires_at = NOW() - INTERVAL '1 minute' WHERE id = $1",
        [orderId],
      );
      const expired = await call('POST', `/orders/${orderId}/payment-link`, buyerTk, {});
      assert.equal(expired.status, 409);
      assert.equal(expired.json.error.code, 'ORDER_EXPIRED');
    } finally {
      await new Promise((resolve) => server.close(resolve));
      await pool.end();
    }
  },
);
