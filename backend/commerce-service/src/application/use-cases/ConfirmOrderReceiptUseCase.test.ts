import assert from 'node:assert/strict';
import net from 'node:net';
import test from 'node:test';
import { Order, OrderStatus } from '../../domain/entities/Order';
import { InMemoryOrderRepository } from '../../infrastructure/repositories/InMemoryOrderRepository';
import { PostgresOrderRepository } from '../../infrastructure/repositories/PostgresOrderRepository';
import { PrismaClient } from '../../infrastructure/database/generated/client';
import { loadSeedOrders } from '../../infrastructure/seeds/orderSeedLoader';
import { GetOrderDetailUseCase } from './GetOrderDetailUseCase';
import { ConfirmOrderReceiptUseCase } from './ConfirmOrderReceiptUseCase';

// Dữ liệu hạt giống (Seed Data) chuẩn từ cơ sở dữ liệu nexus_commerce_db (V4__seed_orders.sql / seed-orders.json)
const REAL_BUYER_ID = '01a15822-43b8-78c3-a246-16bff78bc6e8'; // Minh Anh / Thu Hà
const REAL_SELLER_ID = '01a15822-3fd0-7b39-ad01-f11da72d5b80'; // Nexus Audio / Nexus Sport
const OTHER_BUYER_ID = '01a15822-43b8-78c3-a246-16bff78bc6ff'; // Buyer khác không sở hữu đơn
const REAL_DELIVERED_ORDER_CODE = 'NX-ORD-8009'; // Đơn DELIVERED có sẵn trong DB
const REAL_SHIPPED_ORDER_CODE = 'NX-ORD-8017'; // Đơn SHIPPED có sẵn trong DB

/**
 * Kiểm tra cổng PostgreSQL có đang lắng nghe hay không (tránh crash khi chạy trên CI hoặc chưa bật Docker)
 */
async function isPortOpen(port: number, host = '127.0.0.1', timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      isResolved = true;
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(false);
      }
    });
    socket.once('error', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(false);
      }
    });
    socket.connect(port, host);
  });
}

test('ConfirmOrderReceiptUseCase: Sử dụng bộ dữ liệu thật có sẵn từ DB (NX-ORD-8009, NX-ORD-8017)', async () => {
  const repository = new InMemoryOrderRepository();
  const seedOrders = loadSeedOrders();

  // Nạp trực tiếp toàn bộ dữ liệu đơn hàng thật từ seed-orders.json vào Repository
  for (const seedOrder of seedOrders) {
    await repository.save(seedOrder);
  }

  const deliveredOrder = seedOrders.find((o) => o.id === REAL_DELIVERED_ORDER_CODE)!;
  const realBuyerId = deliveredOrder.buyerId;

  const shippedOrder = seedOrders.find((o) => o.id === REAL_SHIPPED_ORDER_CODE)!;

  const getDetailUseCase = new GetOrderDetailUseCase(repository);
  const useCase = new ConfirmOrderReceiptUseCase(repository, getDetailUseCase);

  // 1. Buyer xác nhận nhận hàng thành công trên đơn thật DELIVERED (NX-ORD-8009)
  const res1 = await useCase.execute({
    orderId: REAL_DELIVERED_ORDER_CODE,
    buyerId: realBuyerId,
  });

  assert.ok(res1.buyerReceivedAt, 'buyerReceivedAt phải có giá trị ngày giờ');
  assert.equal(
    res1.timeline.some((t) => t.note === 'BUYER_CONFIRMED_RECEIPT'),
    true,
    'Timeline phải ghi nhận sự kiện BUYER_CONFIRMED_RECEIPT',
  );

  // 2. Gọi lại lần 2 (Idempotent) -> Không nhân đôi sự kiện timeline
  const res2 = await useCase.execute({
    orderId: REAL_DELIVERED_ORDER_CODE,
    buyerId: realBuyerId,
  });
  assert.equal(res2.buyerReceivedAt, res1.buyerReceivedAt);
  const confirmedEvents = res2.timeline.filter((t) => t.note === 'BUYER_CONFIRMED_RECEIPT');
  assert.equal(confirmedEvents.length, 1, 'Chỉ có duy nhất 1 sự kiện xác nhận nhận hàng');

  // 3. Người mua khác cố tình xác nhận đơn NX-ORD-8009 -> Chặn lỗi 403 (Chống IDOR)
  await assert.rejects(async () => {
    await useCase.execute({
      orderId: REAL_DELIVERED_ORDER_CODE,
      buyerId: OTHER_BUYER_ID,
    });
  }, /không có quyền/);

  // 4. Đơn hàng chưa DELIVERED (NX-ORD-8017 đang SHIPPED) -> Chặn lỗi 400
  await assert.rejects(async () => {
    await useCase.execute({
      orderId: REAL_SHIPPED_ORDER_CODE,
      buyerId: shippedOrder.buyerId,
    });
  }, /DELIVERED/);
});

test('ConfirmOrderReceiptUseCase: Kiểm thử Live trực tiếp với cơ sở dữ liệu PostgreSQL thật (nexus_commerce_db)', async (t) => {
  const isPostgresRunning = await isPortOpen(5434);

  if (!isPostgresRunning) {
    t.skip(
      'Bỏ qua Live DB test vì PostgreSQL container cổng 5434 chưa được bật (an toàn cho CI runner).',
    );
    return;
  }

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url:
          process.env.COMMERCE_DATABASE_URL ||
          process.env.DATABASE_URL ||
          'postgresql://nexus_commerce:nexus_password@127.0.0.1:5434/nexus_commerce_db?schema=public',
      },
    },
  });

  const repo = new PostgresOrderRepository(undefined, prisma);
  const getDetailUseCase = new GetOrderDetailUseCase(repo);
  const useCase = new ConfirmOrderReceiptUseCase(repo, getDetailUseCase);

  // Đảm bảo dữ liệu mẫu đã có trong PostgreSQL thật
  await repo.seedIfEmpty();

  // Kiểm tra đơn hàng NX-ORD-8009 có tồn tại trong PostgreSQL thật không
  const originalOrder = await repo.findById(REAL_DELIVERED_ORDER_CODE);
  if (!originalOrder) {
    t.skip('Đơn hàng NX-ORD-8009 chưa có trong PostgreSQL thật. Vui lòng chạy pnpm db:migrate.');
    await prisma.$disconnect();
    return;
  }

  const liveBuyerId = originalOrder.buyerId;
  const backupTimeline = JSON.parse(JSON.stringify(originalOrder.timeline));

  try {
    // 1. Thực hiện xác nhận nhận hàng trên PostgreSQL thật
    const updated = await useCase.execute({
      orderId: REAL_DELIVERED_ORDER_CODE,
      buyerId: liveBuyerId,
    });

    assert.ok(updated.buyerReceivedAt, 'buyerReceivedAt trên PostgreSQL thật phải có giá trị');
    assert.equal(
      updated.timeline.some((t) => t.note === 'BUYER_CONFIRMED_RECEIPT'),
      true,
    );

    // 2. Truy vấn lại từ DB để kiểm chứng bản ghi trong bảng commerce_orders thật
    const reloaded = await repo.findById(REAL_DELIVERED_ORDER_CODE);
    assert.ok(
      reloaded?.buyerReceivedAt,
      'Dữ liệu lưu trong PostgreSQL thật phải có buyerReceivedAt',
    );
  } finally {
    // 3. Khôi phục (Cleanup) timeline của NX-ORD-8009 về nguyên bản trong DB để không làm bẩn dữ liệu seed
    await prisma.order
      .updateMany({
        where: { orderCode: REAL_DELIVERED_ORDER_CODE },
        data: {
          timeline: backupTimeline,
        },
      })
      .catch(() => null);

    await prisma.$disconnect();
  }
});
