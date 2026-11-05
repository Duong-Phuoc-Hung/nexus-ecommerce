import assert from 'node:assert/strict';
import test from 'node:test';
import { GhnShippingQuoteClient } from './infrastructure/clients/GhnShippingQuoteClient';
import { GhnCarrierClient } from './infrastructure/clients/GhnCarrierClient';
import { InMemoryOrderRepository } from './infrastructure/repositories/InMemoryOrderRepository';
import { GetOrderDetailUseCase } from './application/use-cases/GetOrderDetailUseCase';
import { DispatchOrderUseCase } from './application/use-cases/DispatchOrderUseCase';
import { Order, OrderStatus } from './domain/entities/Order';
import { IShippingOrderClient } from './application/ports/IShippingOrderClient';

test('1. GhnShippingQuoteClient: Fallback gracefully to flat rate when credentials not provided', async () => {
  const client = new GhnShippingQuoteClient({
    apiToken: '',
    shopId: '',
  });

  const quote = await client.quote(
    {
      fullName: 'Nguyễn Văn A',
      phone: '0901234567',
      province: 'Hồ Chí Minh',
      district: 'Quận 1',
      addressLine: '123 Lê Lợi',
      country: 'VN',
    },
    [{ productId: 'prod_1', quantity: 2 }],
  );

  assert.equal(quote.supported, true);
  assert.equal(typeof quote.fee, 'number');
  assert.ok(quote.fee >= 30000);
});

test('2. GhnShippingQuoteClient: Rejects unsupported country and blacklisted provinces', async () => {
  const client = new GhnShippingQuoteClient();

  const foreignQuote = await client.quote(
    {
      fullName: 'John Doe',
      phone: '+123456789',
      province: 'California',
      addressLine: '123 Sunset Blvd',
      country: 'US',
    },
    [{ productId: 'prod_1', quantity: 1 }],
  );
  assert.equal(foreignQuote.supported, false);

  process.env.SHIPPING_UNSUPPORTED_PROVINCES = 'hoang sa,truong sa';
  const blockedQuote = await client.quote(
    {
      fullName: 'Nguyễn Văn B',
      phone: '0901234567',
      province: 'Hoang Sa',
      addressLine: 'Dao Song Tu Tay',
      country: 'VN',
    },
    [{ productId: 'prod_1', quantity: 1 }],
  );
  assert.equal(blockedQuote.supported, false);
});

test('3. GhnShippingQuoteClient: Successfully parses GHN fee API response when configured', async () => {
  const originalFetch = globalThis.fetch;
  try {
    // Mock GHN fee endpoint
    globalThis.fetch = async (url: any, init?: any) => {
      assert.ok(String(url).includes('/shipping-order/fee'));
      const body = JSON.parse(init.body);
      assert.equal(body.from_district_id, 1442);
      assert.equal(body.to_district_id, 1443); // Quận 3

      return new Response(
        JSON.stringify({
          code: 200,
          message: 'Success',
          data: {
            total: 38500,
            service_fee: 38500,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const client = new GhnShippingQuoteClient({
      apiUrl: 'https://dev-online-gateway.ghn.vn/shiip/public-api/v2',
      apiToken: 'fake_ghn_token_for_test',
      shopId: '123456',
      originDistrictId: 1442,
    });

    const quote = await client.quote(
      {
        fullName: 'Trần Thị C',
        phone: '0912345678',
        province: 'Hồ Chí Minh',
        district: 'Quận 3',
        addressLine: '456 Võ Văn Tần',
        country: 'VN',
      },
      [{ productId: 'prod_air', quantity: 1 }],
    );

    assert.equal(quote.supported, true);
    assert.equal(quote.fee, 38500);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('4. GhnCarrierClient: Generates simulated shipment and AWB preview when offline/sandbox unconfigured', async () => {
  const client = new GhnCarrierClient({
    apiToken: '',
    shopId: '',
  });

  const outbound = await client.createShippingOrder({
    orderId: 'NX-ORD-9001',
    orderCode: 'NX-ORD-9001',
    recipientName: 'Lê Văn D',
    recipientPhone: '0988888888',
    shippingAddress: '789 Nguyễn Huệ, Quận 1, TP.HCM',
    district: 'Quận 1',
    province: 'Hồ Chí Minh',
    items: [{ name: 'Bàn phím cơ Retro', quantity: 1, price: 1500000 }],
  });

  assert.equal(outbound.carrierCode, 'GHN');
  assert.ok(outbound.trackingCode.startsWith('GHN'));
  assert.ok(outbound.trackingCode.endsWith('VN'));
  assert.ok(outbound.awbBarcodeUrl?.includes('dev-online-gateway.ghn.vn'));
});

test('5. GhnCarrierClient: Creates real shipping order via GHN API and generates AWB barcode token', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url: any, init?: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/shipping-order/create')) {
        const body = JSON.parse(init.body);
        assert.equal(body.to_name, 'Phạm Văn E');
        assert.equal(body.payment_type_id, 1);
        return new Response(
          JSON.stringify({
            code: 200,
            message: 'Success',
            data: {
              order_code: 'GHN_SANDBOX_778899',
              total_fee: 35000,
              expected_delivery_time: '2026-11-08T10:00:00Z',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (urlStr.includes('/a5/gen-token')) {
        return new Response(
          JSON.stringify({
            code: 200,
            data: {
              token: 'ghn_print_token_xyz123',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      throw new Error(`Unexpected url: ${urlStr}`);
    };

    const client = new GhnCarrierClient({
      apiToken: 'live_test_token',
      shopId: '999888',
    });

    const outbound = await client.createShippingOrder({
      orderId: 'NX-ORD-9002',
      recipientName: 'Phạm Văn E',
      recipientPhone: '0977777777',
      shippingAddress: '100 Hai Bà Trưng, Quận 1, TP.HCM',
      district: 'Quận 1',
      province: 'Hồ Chí Minh',
      items: [{ name: 'Chuột Gaming Nexus', quantity: 1, price: 800000 }],
    });

    assert.equal(outbound.trackingCode, 'GHN_SANDBOX_778899');
    assert.equal(outbound.carrierCode, 'GHN');
    assert.equal(
      outbound.awbBarcodeUrl,
      'https://dev-online-gateway.ghn.vn/a5/index.html?token=ghn_print_token_xyz123',
    );
    assert.equal(outbound.totalFee, 35000);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('6. DispatchOrderUseCase: Automatically triggers GHN outbound creation and records AWB link on Order', async () => {
  const repo = new InMemoryOrderRepository();
  const getDetail = new GetOrderDetailUseCase(repo);

  const mockCarrierClient: IShippingOrderClient = {
    createShippingOrder: async (input) => ({
      trackingCode: 'GHN_AUTO_DISPATCH_123',
      carrierCode: 'GHN',
      awbBarcodeUrl: 'https://dev-online-gateway.ghn.vn/a5/index.html?token=awb_token_456',
      totalFee: 32000,
    }),
  };

  const dispatchUseCase = new DispatchOrderUseCase(repo, getDetail, mockCarrierClient);

  const order = new Order({
    id: 'ord_dispatch_test_01',
    buyerId: 'usr_buyer_1',
    buyerName: 'Khách Test',
    buyerEmail: 'buyer@nexus.vn',
    sellerId: 'usr_seller_1',
    sellerName: 'Shop Nexus Official',
    totalAmount: 1500000,
    status: OrderStatus.PROCESSING,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        productId: 'prod_keyboard',
        productName: 'Bàn phím cơ Gaming',
        quantity: 1,
        unitPrice: 1500000,
        totalPrice: 1500000,
      },
    ],
  });
  await repo.save(order);

  // Người bán bấm Dispatch không truyền trackingCode -> tự động sinh qua GHN
  const dispatched = await dispatchUseCase.execute({
    orderId: 'ord_dispatch_test_01',
    operatorId: 'usr_seller_1',
    operatorRole: 'SELLER',
    carrierCode: 'GHN',
  });

  assert.equal(dispatched.status, OrderStatus.SHIPPED);
  assert.equal(dispatched.tracking, 'GHN_AUTO_DISPATCH_123');
  assert.equal(dispatched.trackingCode, 'GHN_AUTO_DISPATCH_123');

  // Kiểm tra timeline có ghi nhận bưu gửi và tem in AWB
  const shippedTimeline = dispatched.timeline.find((t) => t.status === 'SHIPPED');
  assert.ok(shippedTimeline);
  assert.ok(shippedTimeline.note?.includes('GHN_AUTO_DISPATCH_123'));
  assert.ok(
    shippedTimeline.note?.includes(
      'Tem in bưu gửi (AWB): https://dev-online-gateway.ghn.vn/a5/index.html?token=awb_token_456',
    ),
  );
});
