import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClientWrapper } from './infrastructure/database/PrismaClient';
import { PostgresSupportCaseRepository } from './infrastructure/repositories/PostgresSupportCaseRepository';
import { PostgresShipmentRepository } from './infrastructure/repositories/PostgresShipmentRepository';
import { CarrierCode, ShipmentStatus } from './domain/entities/Shipment';

test('Fulfillment Persistence Integration Test Suite', async (t) => {
  const prisma = PrismaClientWrapper.getInstance();

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    t.skip('Bỏ qua integration test do Fulfillment PostgreSQL chưa khởi chạy');
    return;
  }

  const supportRepo = new PostgresSupportCaseRepository(prisma);
  const shipmentRepo = new PostgresShipmentRepository(prisma);

  t.after(async () => {
    await prisma.$disconnect();
  });

  await t.test('1. PostgresSupportCaseRepository: nạp dữ liệu mẫu và tìm kiếm', async () => {
    await supportRepo.seedIfEmpty();

    const pageRes = await supportRepo.search({ page: 1, limit: 10 });
    assert.ok(pageRes.total >= 3, `Expected at least 3 support cases, got ${pageRes.total}`);

    const caseItem = await supportRepo.findById('CS-4021');
    assert.ok(caseItem !== null, 'Case CS-4021 should exist');
    assert.equal(caseItem.customer, 'Minh Anh');
    assert.equal(caseItem.priority, 'Cao');
    assert.equal(caseItem.orderCode, 'NX-ORD-8021');
  });

  await t.test('2. PostgresSupportCaseRepository: xử lý giải quyết ticket (resolve)', async () => {
    const caseItem = await supportRepo.findById('CS-4021');
    assert.ok(caseItem !== null);

    caseItem.resolve(
      'APPROVED',
      'Đã duyệt yêu cầu hoàn tiền cho khách qua PayOS',
      'usr_support_001',
    );
    await supportRepo.save(caseItem);

    const reloaded = await supportRepo.findById('CS-4021');
    assert.ok(reloaded !== null);
    assert.equal(reloaded.status, 'RESOLVED');
    assert.equal(reloaded.resolutionNote, 'Đã duyệt yêu cầu hoàn tiền cho khách qua PayOS');
    assert.equal(reloaded.resolvedBy, 'usr_support_001');
  });

  await t.test('3. PostgresShipmentRepository: nạp dữ liệu mẫu và tra cứu vận đơn', async () => {
    await shipmentRepo.seedIfEmpty();

    const s = await shipmentRepo.findById('shp_01hqz222trk');
    assert.ok(s !== null, 'Shipment shp_01hqz222trk should exist');
    assert.equal(s.trackingCode, 'GHN8829103VN');
    assert.equal(s.orderId, 'NX-ORD-8021');
    assert.equal(s.carrier, CarrierCode.GHN);
    assert.equal(s.recipientName, 'Minh Anh');
  });

  await t.test(
    '4. PostgresShipmentRepository: cập nhật trạng thái vận chuyển và vị trí',
    async () => {
      const s = await shipmentRepo.findById('shp_01hqz222trk');
      assert.ok(s !== null);

      s.updateStatus(ShipmentStatus.IN_TRANSIT, 'Bưu cục Quận 1 · Đang giao đến người nhận');
      await shipmentRepo.update(s);

      const reloaded = await shipmentRepo.findById('shp_01hqz222trk');
      assert.ok(reloaded !== null);
      assert.equal(reloaded.status, ShipmentStatus.IN_TRANSIT);
      assert.equal(reloaded.currentLocation, 'Bưu cục Quận 1 · Đang giao đến người nhận');
    },
  );

  await t.test(
    '5. PostgresShipmentRepository: tính toán thống kê getDashboardSummary',
    async () => {
      const summary = await shipmentRepo.getDashboardSummary();
      assert.ok(summary.flaggedShipments >= 4);
      assert.ok(summary.recentCases.length > 0);
      assert.ok(summary.metrics.highPriorityCount >= 1);
    },
  );
});
