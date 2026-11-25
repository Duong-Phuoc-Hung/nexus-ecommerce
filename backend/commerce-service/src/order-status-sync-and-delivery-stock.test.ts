import test from 'node:test';
import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import { Server } from 'node:http';
import { createApplication } from './app';
import { UpdateOrderStatusUseCase } from './application/use-cases/UpdateOrderStatusUseCase';
import { GetOrderDetailUseCase } from './application/use-cases/GetOrderDetailUseCase';
import { InMemoryOrderRepository } from './infrastructure/repositories/InMemoryOrderRepository';
import { Order, OrderStatus } from './domain/entities/Order';
import { ICatalogClient } from './application/checkout/ports';

function makeToken(user: { sub: string; role: string; email?: string }): string {
  const encode = (val: unknown) => Buffer.from(JSON.stringify(val)).toString('base64url');
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    sub: user.sub,
    role: user.role,
    email: user.email || `${user.sub}@example.com`,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  const crypto = require('node:crypto');
  const signature = crypto
    .createHmac('sha256', 'nexus_super_secret_jwt_access_key_min_32_chars_local_dev')
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

test('UpdateOrderStatusUseCase: Deducts stock when order transitions to DELIVERED and ensures idempotency', async () => {
  const orderRepo = new InMemoryOrderRepository();
  const getOrderDetailUseCase = new GetOrderDetailUseCase(orderRepo);

  const deductedCalls: { productId: string; quantity: number; orderId: string }[] = [];
  const mockCatalog: ICatalogClient = {
    findProduct: async (id: string) => ({
      id,
      sellerId: 'usr_seller_01',
      title: 'Test Product',
      price: 100000,
      stockQuantity: 10,
      status: 'ACTIVE',
      imageUrl: null,
    }),
    deductStock: async (productId: string, quantity: number, orderId: string) => {
      deductedCalls.push({ productId, quantity, orderId });
      return true;
    },
  };

  const useCase = new UpdateOrderStatusUseCase(orderRepo, getOrderDetailUseCase, mockCatalog);

  // Tạo đơn hàng ban đầu ở trạng thái SHIPPED
  const testOrder = new Order({
    id: 'ord_test_delivery_01',
    buyerId: 'usr_buyer_01',
    buyerName: 'Nguyễn Văn A',
    buyerEmail: 'buyer@example.com',
    sellerId: 'usr_seller_01',
    sellerName: 'Shop A',
    items: [
      {
        productId: 'prod_macbook_m3',
        productName: 'MacBook Pro M3',
        quantity: 1,
        unitPrice: 30000000,
        totalPrice: 30000000,
      },
    ],
    totalAmount: 30000000,
    status: OrderStatus.SHIPPED,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await orderRepo.save(testOrder);

  // 1. Chuyển trạng thái sang DELIVERED bởi Support Staff
  const result1 = await useCase.execute({
    orderId: 'ord_test_delivery_01',
    status: 'DELIVERED',
    note: 'Đã giao thành công đến tay người mua',
    operatorId: 'usr_support_01',
    operatorRole: 'SUPPORT_STAFF',
  });

  assert.equal(result1.status, 'DELIVERED');
  assert.equal(deductedCalls.length, 1, 'deductStock must be called once');
  assert.equal(deductedCalls[0].productId, 'prod_macbook_m3');
  assert.equal(deductedCalls[0].quantity, 1);
  assert.equal(deductedCalls[0].orderId, 'ord_test_delivery_01');

  // 2. Kiểm tra Idempotency: Gọi lại DELIVERED lần 2 không được trừ kho lần nữa
  const result2 = await useCase.execute({
    orderId: 'ord_test_delivery_01',
    status: 'DELIVERED',
    note: 'Đồng bộ lại từ webhook carrier',
    operatorId: 'usr_support_01',
    operatorRole: 'SUPPORT_STAFF',
  });

  assert.equal(result2.status, 'DELIVERED');
  assert.equal(deductedCalls.length, 1, 'deductStock must NOT be called again (idempotency)');

  // 3. Kiểm tra Anti-IDOR: Seller khác cố ý update đơn hàng bị chặn
  await assert.rejects(async () => {
    await useCase.execute({
      orderId: 'ord_test_delivery_01',
      status: 'DELIVERED',
      operatorId: 'usr_seller_02_hacker',
      operatorRole: 'SELLER',
    });
  }, /Bạn không có quyền cập nhật trạng thái đơn hàng của gian hàng khác/i);
});

test('HTTP API: PATCH /api/v1/orders/:id/status updates status and syncs order successfully', async () => {
  process.env.USE_IN_MEMORY_DB = 'true';
  const app = createApplication();

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const supportToken = makeToken({ sub: 'usr_support_test', role: 'SUPPORT_STAFF' });

    // 1. Tra cứu một đơn mẫu trong in-memory repo (seed)
    const listRes = await fetch(`${baseUrl}/api/v1/orders`, {
      headers: { Authorization: `Bearer ${supportToken}` },
    });
    const listData = (await listRes.json()) as any;
    assert.equal(listRes.status, 200);
    const ordersList = Array.isArray(listData.data) ? listData.data : listData.data?.orders || [];
    assert.ok(ordersList.length > 0);

    const targetOrder = ordersList[0];

    // 2. Cập nhật trạng thái đơn hàng sang DELIVERED
    const patchRes = await fetch(`${baseUrl}/api/v1/orders/${targetOrder.id}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${supportToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'DELIVERED',
        note: 'Giao hàng thành công bởi bưu tá',
      }),
    });

    const patchData = (await patchRes.json()) as any;
    assert.equal(
      patchRes.status,
      200,
      `Expected 200 but got ${patchRes.status}: ${JSON.stringify(patchData)}`,
    );
    assert.equal(patchData.success, true);
    assert.equal(patchData.data.status, 'DELIVERED');

    // 3. Verify order status has changed on GET /orders/:id
    const getRes = await fetch(`${baseUrl}/api/v1/orders/${targetOrder.id}`, {
      headers: { Authorization: `Bearer ${supportToken}` },
    });
    const getData = (await getRes.json()) as any;
    assert.equal(getRes.status, 200);
    assert.equal(getData.data.status, 'DELIVERED');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('UpdateOrderStatusUseCase: Dispatches in-app notification and email update when order progress is updated', async () => {
  const orderRepo = new InMemoryOrderRepository();
  const getOrderDetailUseCase = new GetOrderDetailUseCase(orderRepo);

  const notificationsSent: any[] = [];
  const emailsSent: any[] = [];
  const mockNotificationClient = {
    sendInAppNotification: async (params: any) => {
      notificationsSent.push(params);
      return true;
    },
    sendOrderConfirmationEmail: async (params: any) => {
      emailsSent.push(params);
      return true;
    },
  };

  const useCase = new UpdateOrderStatusUseCase(
    orderRepo,
    getOrderDetailUseCase,
    undefined,
    mockNotificationClient,
  );

  const order = new Order({
    id: 'ord_notif_001',
    buyerId: 'usr_buyer_99',
    buyerName: 'Trần Thị Khách',
    buyerEmail: 'khach@nexus.vn',
    sellerId: 'usr_seller_01',
    sellerName: 'Nexus Shop',
    items: [],
    totalAmount: 500000,
    status: OrderStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await orderRepo.save(order);

  // Cập nhật trạng thái đơn sang SHIPPED (Đang giao hàng)
  await useCase.execute({
    orderId: 'ord_notif_001',
    status: 'SHIPPED',
    note: 'Đã bàn giao cho bưu cục GHN',
  });

  // Kiểm tra in-app notification đã được gửi
  assert.equal(notificationsSent.length, 1);
  assert.equal(notificationsSent[0].recipientId, 'usr_buyer_99');
  assert.equal(notificationsSent[0].channel, 'IN_APP');
  assert.ok(notificationsSent[0].title.includes('ord_notif_001'));
  assert.ok(notificationsSent[0].body.includes('Đang giao hàng'));
  assert.ok(notificationsSent[0].body.includes('Đã bàn giao cho bưu cục GHN'));

  // Kiểm tra email thông báo tiến trình đã được gửi
  assert.equal(emailsSent.length, 1);
  assert.equal(emailsSent[0].email, 'khach@nexus.vn');
  assert.ok(emailsSent[0].title.includes('ord_notif_001'));
  assert.ok(emailsSent[0].body.includes('Trần Thị Khách'));
  assert.ok(emailsSent[0].body.includes('Đang giao hàng'));
});
