import assert from 'node:assert/strict';
import test from 'node:test';
import { CheckoutService } from './CheckoutService';
import {
  CheckoutError,
  ICatalogClient,
  ICheckoutRepository,
  IPaymentGateway,
  IShippingQuote,
} from './ports';

test('PayOS checkout rejects missing credentials before creating an order; COD remains available', async () => {
  let ordersCreated = 0;
  const repository = {
    createOrder: async () => {
      ordersCreated += 1;
      throw new Error('Unexpected order creation');
    },
  } as unknown as ICheckoutRepository;
  const catalog = {
    findProduct: async () => {
      throw new Error('Unexpected catalog lookup');
    },
  } as ICatalogClient;
  const shipping = {} as IShippingQuote;
  const gateway = { isConfigured: () => false } as IPaymentGateway;
  const checkout = new CheckoutService(repository, catalog, shipping, gateway);
  const body = {
    items: [{ productId: '123', quantity: 1 }],
    shippingAddress: {
      fullName: 'Buyer',
      phone: '0901234567',
      province: 'Ho Chi Minh',
      addressLine: '1 Le Loi',
    },
  };

  await assert.rejects(
    checkout.checkout('buyer-1', { ...body, paymentMethod: 'PAYOS' }, 'payos-1'),
    (error: unknown) =>
      error instanceof CheckoutError &&
      error.status === 503 &&
      error.code === 'PAYMENT_NOT_CONFIGURED',
  );
  assert.equal(ordersCreated, 0);

  await assert.rejects(
    checkout.checkout('buyer-1', { ...body, paymentMethod: 'COD' }, 'cod-1'),
    /Unexpected catalog lookup/,
  );
});
