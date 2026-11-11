import test from 'node:test';
import assert from 'node:assert/strict';
import { requireOrderPermission } from './infrastructure/security/auth';
import { CheckoutService } from './application/checkout/CheckoutService';
import {
  ICatalogClient,
  ICheckoutRepository,
  IPaymentGateway,
  IShippingQuote,
  OrderRecord,
  PaymentRecord,
} from './application/checkout/ports';

test('1. Auth Middleware: requireOrderPermission(LIST) allows BUYER role', async () => {
  const middleware = requireOrderPermission('LIST');

  // Case 1: BUYER calling LIST should call next() without error
  let nextCalled = false;
  const reqBuyer: any = {
    user: {
      sub: 'usr_buyer_01',
      email: 'buyer@test.com',
      role: 'BUYER',
    },
  };
  const resBuyer: any = {
    status: (code: number) => ({
      json: (data: any) => {
        assert.fail(`Should not return error status ${code}: ${JSON.stringify(data)}`);
      },
    }),
  };

  middleware(reqBuyer, resBuyer, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true, 'BUYER must be allowed to LIST their orders');

  // Case 2: Unauthenticated user should get 401
  let statusReceived = 0;
  let jsonReceived: any = null;
  const reqUnauth: any = {};
  const resUnauth: any = {
    status: (code: number) => {
      statusReceived = code;
      return {
        json: (data: any) => {
          jsonReceived = data;
        },
      };
    },
  };

  middleware(reqUnauth, resUnauth, () => {
    assert.fail('Should not call next for unauthenticated request');
  });

  assert.equal(statusReceived, 401, 'Unauthenticated user gets 401');
  assert.equal(jsonReceived.success, false);
});

test('2. CheckoutService: triggers deductStock when COD checkout succeeds', async () => {
  const deductedItems: Array<{ productId: string; quantity: number; orderId: string }> = [];

  const mockCatalog: ICatalogClient = {
    findProduct: async (productId: string) => ({
      id: productId,
      sellerId: 'seller_10',
      title: `Product ${productId}`,
      price: 100000,
      stockQuantity: 20,
      status: 'ACTIVE',
    }),
    deductStock: async (productId: string, quantity: number, orderId: string) => {
      deductedItems.push({ productId, quantity, orderId });
      return true;
    },
  };

  const mockShipping: IShippingQuote = {
    quote: async () => ({ supported: true, fee: 30000 }),
  };

  const mockGateway: IPaymentGateway = {
    isConfigured: () => true,
    createPaymentLink: async () => ({ checkoutUrl: 'https://pay.os', paymentLinkId: 'link_1' }),
    verifyWebhook: () => null,
  };

  const mockOrder: OrderRecord = {
    id: 'ord_test_cod_001',
    orderCode: 'ORD-123456',
    buyerId: 'usr_buyer_01',
    sellerId: 'seller_10',
    status: 'PLACED',
    totalAmount: 130000,
    shippingFee: 30000,
    shippingAddress: {
      fullName: 'Nguyen Van Buyer',
      phone: '0901234567',
      province: 'Ho Chi Minh',
      addressLine: '123 Nguyen Hue',
      country: 'VN',
    },
    expiresAt: new Date(Date.now() + 900000),
    items: [
      {
        productId: '101',
        title: 'Product 101',
        unitPrice: 100000,
        quantity: 1,
        subtotal: 100000,
      },
    ],
  };

  const mockPayment: PaymentRecord = {
    id: 'pmt_1',
    orderId: 'ord_test_cod_001',
    payosOrderCode: 123456,
    amount: 130000,
    currency: 'VND',
    status: 'NOT_STARTED',
    paymentMethod: 'COD',
    expiresAt: new Date(Date.now() + 900000),
  };

  const mockRepo: ICheckoutRepository = {
    saveQuote: async () => {},
    findQuote: async () => null,
    createOrder: async () => ({
      order: mockOrder,
      payment: mockPayment,
      replay: false,
      requestHash: 'hash',
    }),
    findOrder: async () => mockOrder,
    latestPayment: async () => mockPayment,
    countPayments: async () => 1,
    createPaymentAttempt: async () => mockPayment,
    markPaymentCancelled: async () => {},
    setPaymentLink: async () => {},
    applyPaymentResult: async () => 'PAID',
  };

  const checkoutService = new CheckoutService(mockRepo, mockCatalog, mockShipping, mockGateway);

  const result = await checkoutService.checkout(
    'usr_buyer_01',
    {
      paymentMethod: 'COD',
      items: [{ productId: '101', quantity: 1 }],
      shippingAddress: {
        fullName: 'Nguyen Van Buyer',
        phone: '0901234567',
        province: 'Ho Chi Minh',
        addressLine: '123 Nguyen Hue',
      },
    },
    'idem_key_001',
  );

  assert.equal(result.data.orderId, 'ord_test_cod_001');
  assert.equal(result.data.paymentMethod, 'COD');

  // Verify that deductStock was indeed triggered for item 101
  assert.equal(deductedItems.length, 1);
  assert.equal(deductedItems[0].productId, '101');
  assert.equal(deductedItems[0].quantity, 1);
  assert.equal(deductedItems[0].orderId, 'ord_test_cod_001');
  console.log('✅ [TEST PASS] deductStock correctly triggered for COD checkout!');
});

test('3. CheckoutService: supports AUCTION_SETTLEMENT checkout with winning bid price', async () => {
  const mockCatalog: ICatalogClient = {
    findProduct: async (productId: string) => ({
      id: productId,
      sellerId: 'seller_10',
      title: 'Đồng hồ đấu giá',
      price: 1000000, // Giá gốc catalog là 1tr
      stockQuantity: 1,
      status: 'ACTIVE',
    }),
  };

  const mockShipping: IShippingQuote = {
    quote: async () => ({ supported: true, fee: 40000 }),
  };

  const mockGateway: IPaymentGateway = {
    isConfigured: () => true,
    createPaymentLink: async () => ({ checkoutUrl: 'https://pay.os', paymentLinkId: 'link_auc' }),
    verifyWebhook: () => null,
  };

  let capturedParams: any = null;
  const mockRepo: ICheckoutRepository = {
    saveQuote: async () => {},
    findQuote: async () => null,
    createOrder: async (params: any) => {
      capturedParams = params;
      return {
        order: {
          id: 'ord_auc_001',
          orderCode: 'ORD-AUC-001',
          buyerId: params.buyerId,
          sellerId: params.sellerId,
          status: 'PENDING_PAYMENT',
          totalAmount: params.totalAmount,
          shippingFee: params.shippingFee,
          shippingAddress: params.shippingAddress,
          expiresAt: params.orderExpiresAt,
          items: params.items,
        },
        payment: {
          id: 'pmt_auc_1',
          orderId: 'ord_auc_001',
          payosOrderCode: 999999,
          amount: params.totalAmount,
          currency: 'VND',
          status: 'NOT_STARTED',
          paymentMethod: 'PAYOS',
          expiresAt: params.orderExpiresAt,
          checkoutUrl: 'https://pay.os/pay/auc',
        },
        replay: false,
        requestHash: 'hash',
      };
    },
    findOrder: async () => null,
    latestPayment: async () => null,
    countPayments: async () => 1,
    createPaymentAttempt: async () => ({}) as any,
    markPaymentCancelled: async () => {},
    setPaymentLink: async () => {},
    applyPaymentResult: async () => 'PAID',
  };

  const checkoutService = new CheckoutService(mockRepo, mockCatalog, mockShipping, mockGateway);

  // Buyer thắng đấu giá với mức giá 5,500,000 VND (khác giá niêm yết 1,000,000)
  const result = await checkoutService.checkout(
    'usr_winner_01',
    {
      paymentMethod: 'PAYOS',
      isAuction: true,
      auctionId: 'auc_12345',
      items: [{ productId: '202', quantity: 1, price: 5500000 }],
      shippingAddress: {
        fullName: 'Nguyen Van Winner',
        phone: '0909999999',
        province: 'Ha Noi',
        addressLine: '456 Hoan Kiem',
      },
    },
    'idem_auc_001',
  );

  assert.equal(
    capturedParams.items[0].unitPrice,
    5500000,
    'Unit price must be the winning bid price',
  );
  assert.equal(capturedParams.subtotal, 5500000);
  assert.equal(capturedParams.totalAmount, 5540000, 'Total must equal 5,500,000 + 40,000 shipping');
  assert.equal(result.data.orderId, 'ord_auc_001');
  console.log('✅ [TEST PASS] AUCTION_SETTLEMENT checkout with winning bid price verified!');
});

test('5. CheckoutService: handles UUIDv7 product IDs in parseCartLines and sort', async () => {
  const uuidProduct1 = '01932f01-0003-7000-8000-000000000003';
  const uuidProduct2 = '01932f01-0001-7000-8000-000000000001';

  const mockCatalog: ICatalogClient = {
    findProduct: async (id: string) => ({
      id,
      sellerId: 'seller_uuid',
      title: `Product ${id}`,
      price: 150000,
      stockQuantity: 10,
      status: 'ACTIVE',
    }),
    deductStock: async () => true,
  };

  const mockShipping: IShippingQuote = {
    quote: async () => ({
      supported: true,
      fee: 30000,
    }),
  };

  const mockGateway: IPaymentGateway = {
    isConfigured: () => true,
    createPaymentLink: async () => ({
      checkoutUrl: 'https://pay.os/link',
      paymentLinkId: 'plink_1',
    }),
    verifyWebhook: () => null,
  };

  let savedOrder: any = null;
  const mockRepo: ICheckoutRepository = {
    saveQuote: async () => {},
    findQuote: async () => null,
    createOrder: async (params: any) => {
      savedOrder = params;
      return {
        order: {
          id: '01932f01-ffff-7000-8000-000000000099',
          orderCode: 'ORD-UUID-001',
          buyerId: params.buyerId,
          sellerId: params.sellerId,
          status: 'PENDING_PAYMENT',
          totalAmount: params.totalAmount,
          shippingFee: params.shippingFee,
          shippingAddress: params.shippingAddress,
          expiresAt: params.orderExpiresAt,
          items: params.items,
        },
        payment: {
          id: 'pmt_uuid_1',
          orderId: '01932f01-ffff-7000-8000-000000000099',
          payosOrderCode: 1234567,
          amount: params.totalAmount,
          currency: 'VND',
          status: 'PENDING',
          paymentMethod: 'COD',
          expiresAt: params.orderExpiresAt,
        },
        replay: false,
        requestHash: 'hash',
      };
    },
    findOrder: async () => null,
    latestPayment: async () => null,
    countPayments: async () => 1,
    createPaymentAttempt: async () => ({}) as any,
    markPaymentCancelled: async () => {},
    setPaymentLink: async () => {},
    applyPaymentResult: async () => 'PAID',
  };

  const checkoutService = new CheckoutService(mockRepo, mockCatalog, mockShipping, mockGateway);

  // 1. Test Quote with UUIDv7
  const quote = await checkoutService.quote('usr_buyer_uuid', {
    items: [
      { productId: uuidProduct1, quantity: 2 },
      { productId: uuidProduct2, quantity: 1 },
    ],
    shippingAddress: {
      fullName: 'Buyer UUID',
      phone: '0901234567',
      province: 'TP. Ho Chi Minh',
      addressLine: '123 Nguyen Hue',
    },
  });

  assert.equal(quote.items.length, 2);
  // Kiểm tra sắp xếp theo localeCompare: uuidProduct2 nhỏ hơn uuidProduct1
  assert.equal(quote.items[0].productId, uuidProduct2);
  assert.equal(quote.items[1].productId, uuidProduct1);
  assert.equal(quote.subtotal, 450000);
  assert.equal(quote.totalAmount, 480000);

  // 2. Test Checkout with UUIDv7
  const checkoutResult = await checkoutService.checkout(
    'usr_buyer_uuid',
    {
      paymentMethod: 'COD',
      items: [
        { productId: uuidProduct1, quantity: 2 },
        { productId: uuidProduct2, quantity: 1 },
      ],
      shippingAddress: {
        fullName: 'Buyer UUID',
        phone: '0901234567',
        province: 'TP. Ho Chi Minh',
        addressLine: '123 Nguyen Hue',
      },
    },
    undefined,
  );

  assert.equal(checkoutResult.data.orderId, '01932f01-ffff-7000-8000-000000000099');
  assert.equal(savedOrder.items.length, 2);
  console.log('✅ [TEST PASS] UUIDv7 in parseCartLines and sort verified successfully!');
});

test('6. CheckoutService: handles UUIDv7 orderId in requireOwnedOrder (paymentStatus)', async () => {
  const uuidOrderId = '01932f01-9999-7000-8000-000000000099';
  const buyerId = 'usr_buyer_uuid';

  const mockRepo: ICheckoutRepository = {
    saveQuote: async () => {},
    findQuote: async () => null,
    createOrder: async () => ({}) as any,
    findOrder: async (id: string) => {
      if (id === uuidOrderId) {
        return {
          id: uuidOrderId,
          orderCode: 'ORD-UUID-999',
          buyerId,
          sellerId: 'seller_1',
          status: 'PENDING_PAYMENT',
          totalAmount: 500000,
          shippingFee: 30000,
          shippingAddress: {
            fullName: 'Test',
            phone: '0901234567',
            province: 'HCM',
            addressLine: '123',
            country: 'VN',
          },
          expiresAt: new Date(Date.now() + 60000),
          items: [],
        };
      }
      return null;
    },
    latestPayment: async () => ({
      id: 'pmt_1',
      orderId: uuidOrderId,
      payosOrderCode: 888888,
      amount: 500000,
      currency: 'VND',
      status: 'PENDING',
      paymentMethod: 'PAYOS',
      expiresAt: new Date(Date.now() + 60000),
    }),
    countPayments: async () => 1,
    createPaymentAttempt: async () => ({}) as any,
    markPaymentCancelled: async () => {},
    setPaymentLink: async () => {},
    applyPaymentResult: async () => 'PAID',
  };

  const checkoutService = new CheckoutService(
    mockRepo,
    {} as any,
    {} as any,
    { isConfigured: () => true } as any,
  );

  const status = await checkoutService.paymentStatus(buyerId, uuidOrderId);
  assert.equal(status.orderId, uuidOrderId);
  assert.equal(status.orderCode, 'ORD-UUID-999');
  assert.equal(status.orderStatus, 'PENDING_PAYMENT');
  assert.equal(status.amount, 500000);
  console.log(
    '✅ [TEST PASS] UUIDv7 orderId in requireOwnedOrder (paymentStatus) verified successfully!',
  );
});
