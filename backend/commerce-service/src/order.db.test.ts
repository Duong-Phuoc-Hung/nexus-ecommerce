import test from 'node:test';
import assert from 'node:assert/strict';
import { getCommerceDbPool } from './infrastructure/database/pgPool';
import { PostgresOrderRepository } from './infrastructure/repositories/PostgresOrderRepository';
import { Order, OrderStatus } from './domain/entities/Order';

test('PostgresOrderRepository Integration Test Suite', async (t) => {
  const pool = getCommerceDbPool();
  const repo = new PostgresOrderRepository(pool);

  t.after(async () => {
    await pool.end();
  });

  await t.test('1. ensureSchemaAndSeed nạp thành công dữ liệu mẫu', async () => {
    await repo.ensureSchemaAndSeed();
    const searchRes = await repo.search({ page: 1, limit: 10 });
    assert.ok(searchRes.total >= 5, `Expected at least 5 orders, got ${searchRes.total}`);
    assert.ok(searchRes.orders.length >= 5);
  });

  await t.test('2. findById tìm thấy đơn hàng theo order_code và id', async () => {
    const order = await repo.findById('NX-ORD-8021');
    assert.ok(order !== null, 'Order NX-ORD-8021 should exist');
    assert.equal(order.buyerName, 'Minh Anh');
    assert.equal(order.status, OrderStatus.PROCESSING);
    assert.ok(order.items.length > 0);
    assert.equal(order.items[0].productName, 'Tai nghe không dây Nexus Air');
  });

  await t.test('3. search lọc theo từ khóa q và status chính xác', async () => {
    const qRes = await repo.search({ q: 'Minh Anh' });
    assert.ok(qRes.orders.length > 0);
    assert.ok(qRes.orders.some((o) => o.buyerName.includes('Minh Anh')));

    const statusRes = await repo.search({ status: 'DELIVERED' });
    assert.ok(statusRes.orders.length > 0);
    for (const ord of statusRes.orders) {
      assert.equal(ord.status, OrderStatus.DELIVERED);
    }
  });

  await t.test('4. update cập nhật trạng thái và timeline thành công', async () => {
    const order = await repo.findById('NX-ORD-8021');
    assert.ok(order !== null);

    const initialTimelineLength = order.timeline.length;
    order.updateStatus(OrderStatus.PROCESSING, 'Nhân viên hỗ trợ cập nhật tiến độ kiểm tra');
    await repo.update(order);

    const reloaded = await repo.findById('NX-ORD-8021');
    assert.ok(reloaded !== null);
    assert.equal(reloaded.status, OrderStatus.PROCESSING);
    assert.ok(reloaded.timeline.length >= initialTimelineLength);
  });
});
