import assert from 'node:assert/strict';
import test from 'node:test';
import { Order, OrderStatus } from '../../domain/entities/Order';
import { InMemoryOrderRepository } from '../../infrastructure/repositories/InMemoryOrderRepository';
import { PostgresOrderRepository } from '../../infrastructure/repositories/PostgresOrderRepository';
import { PrismaClient } from '../../infrastructure/database/generated/client';
import { GetOrderDetailUseCase } from './GetOrderDetailUseCase';
import { ConfirmOrderReceiptUseCase } from './ConfirmOrderReceiptUseCase';

const TEST_BUYER_ID = '01a15822-43b8-78c3-a246-16bff78bc6e8';
const TEST_SELLER_ID = '01a15822-3fd0-7b39-ad01-f11da72d5b80';
const OTHER_BUYER_ID = '01a15822-43b8-78c3-a246-16bff78bc6ff';
const TEST_PRODUCT_ID = '01a15822-43b8-78c3-a246-16bff78bc699';
const TEST_ORDER_UUID_1 = '019335ef-9689-73e4-8f4b-22240954b9d0';
const TEST_ORDER_UUID_2 = '019335ef-9689-73e4-8f4b-22240954b9d1';

test('ConfirmOrderReceiptUseCase: Buyer confirms order receipt successfully and idempotently (UUIDv7)', async () => {
  const repository = new InMemoryOrderRepository();
  const getDetailUseCase = new GetOrderDetailUseCase(repository);
  const useCase = new ConfirmOrderReceiptUseCase(repository, getDetailUseCase);

  const testOrder = new Order({
    id: TEST_ORDER_UUID_1,
    buyerId: TEST_BUYER_ID,
    buyerName: 'Buyer Test',
    buyerEmail: 'buyer@test.com',
    sellerId: TEST_SELLER_ID,
    items: [
      {
        productId: TEST_PRODUCT_ID,
        productName: 'Sản phẩm mẫu',
        quantity: 1,
        unitPrice: 100000,
        totalPrice: 100000,
      },
    ],
    totalAmount: 100000,
    status: OrderStatus.DELIVERED,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await repository.save(testOrder);

  // 1. Xác nhận nhận hàng lần đầu -> Thành công
  const res1 = await useCase.execute({
    orderId: TEST_ORDER_UUID_1,
    buyerId: TEST_BUYER_ID,
  });

  assert.ok(res1.buyerReceivedAt, 'buyerReceivedAt phải có giá trị ngày giờ');
  assert.equal(
    res1.timeline.some((t) => t.note === 'BUYER_CONFIRMED_RECEIPT'),
    true,
    'Timeline phải có sự kiện BUYER_CONFIRMED_RECEIPT',
  );

  // 2. Gọi lại lần 2 (Idempotent) -> Không bị nhân đôi timeline event
  const res2 = await useCase.execute({
    orderId: TEST_ORDER_UUID_1,
    buyerId: TEST_BUYER_ID,
  });
  assert.equal(res2.buyerReceivedAt, res1.buyerReceivedAt);
  const confirmedEvents = res2.timeline.filter((t) => t.note === 'BUYER_CONFIRMED_RECEIPT');
  assert.equal(confirmedEvents.length, 1, 'Chỉ được có đúng 1 sự kiện xác nhận nhận hàng');

  // 3. Người mua khác cố tình xác nhận -> Chặn lỗi 403
  await assert.rejects(async () => {
    await useCase.execute({
      orderId: TEST_ORDER_UUID_1,
      buyerId: OTHER_BUYER_ID,
    });
  }, /không có quyền/);

  // 4. Đơn hàng chưa DELIVERED (ví dụ SHIPPED) -> Chặn lỗi 400
  const pendingOrder = new Order({
    id: TEST_ORDER_UUID_2,
    buyerId: TEST_BUYER_ID,
    sellerId: TEST_SELLER_ID,
    items: [],
    totalAmount: 50000,
    status: OrderStatus.SHIPPED,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await repository.save(pendingOrder);

  await assert.rejects(async () => {
    await useCase.execute({
      orderId: TEST_ORDER_UUID_2,
      buyerId: TEST_BUYER_ID,
    });
  }, /DELIVERED/);
});

test(
  'ConfirmOrderReceiptUseCase: Live PostgreSQL integration verification via Prisma ORM',
  { skip: process.env.COMMERCE_DB_TEST !== 'true' },
  async () => {
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.COMMERCE_DB_URL ||
            'postgresql://nexus_commerce:nexus_password@127.0.0.1:5434/nexus_commerce_db?schema=public',
        },
      },
    });

    const repo = new PostgresOrderRepository(undefined, prisma);
    const getDetailUseCase = new GetOrderDetailUseCase(repo);
    const useCase = new ConfirmOrderReceiptUseCase(repo, getDetailUseCase);

    const liveOrderId = '019335ef-9689-73e4-8f4b-22240954b9e0';
    const liveOrder = new Order({
      id: liveOrderId,
      buyerId: TEST_BUYER_ID,
      buyerName: 'Live DB Buyer',
      buyerEmail: 'live_buyer@test.com',
      sellerId: TEST_SELLER_ID,
      items: [],
      totalAmount: 150000,
      status: OrderStatus.DELIVERED,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    try {
      await repo.save(liveOrder);
      const res = await useCase.execute({
        orderId: liveOrderId,
        buyerId: TEST_BUYER_ID,
      });

      assert.ok(res.buyerReceivedAt);
      assert.equal(
        res.timeline.some((t) => t.note === 'BUYER_CONFIRMED_RECEIPT'),
        true,
      );
    } finally {
      await prisma.orderItem.deleteMany({ where: { orderId: liveOrderId } }).catch(() => null);
      await prisma.order.deleteMany({ where: { id: liveOrderId } }).catch(() => null);
    }
  },
);
