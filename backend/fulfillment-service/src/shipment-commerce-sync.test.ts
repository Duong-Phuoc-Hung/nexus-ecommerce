import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryShipmentRepository } from './infrastructure/repositories/InMemoryShipmentRepository';
import { CarrierCode, Shipment, ShipmentStatus } from './domain/entities/Shipment';
import { UpdateShipmentStatusUseCase } from './application/use-cases/UpdateShipmentStatusUseCase';
import { ProcessCarrierWebhookUseCase } from './application/use-cases/ProcessCarrierWebhookUseCase';
import { ICommerceOrderClient } from './infrastructure/clients/CommerceOrderClient';

test('Shipment -> Commerce Sync: UpdateShipmentStatusUseCase synchronizes DELIVERED to Commerce Service', async () => {
  const shipmentRepo = new InMemoryShipmentRepository();

  const syncCalls: { orderId: string; shipmentStatus: string; note?: string }[] = [];
  const mockCommerceClient: ICommerceOrderClient = {
    syncStatus: async (orderId: string, shipmentStatus: string, note?: string) => {
      syncCalls.push({ orderId, shipmentStatus, note });
      return true;
    },
  };

  const useCase = new UpdateShipmentStatusUseCase(shipmentRepo, mockCommerceClient);

  // Khởi tạo vận đơn ở trạng thái SHIPPED (IN_TRANSIT)
  const shipment = new Shipment({
    id: 'shp_sync_test_01',
    orderId: 'NX-ORD-9999',
    carrier: CarrierCode.GHN,
    trackingCode: 'GHN999999VN',
    status: ShipmentStatus.IN_TRANSIT,
    shippingAddress: '123 Phố Huế, Hà Nội',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await shipmentRepo.save(shipment);

  // Nhân viên Hỗ trợ đổi trạng thái sang DELIVERED
  const updatedDto = await useCase.execute({
    shipmentId: 'shp_sync_test_01',
    status: 'DELIVERED',
    location: 'Đã phát thành công tại nhà',
    note: 'Khách nhận và thanh toán tiền mặt',
  });

  assert.ok(updatedDto.status === 'Đã giao' || updatedDto.status === 'DELIVERED');
  assert.equal(syncCalls.length, 1, 'Commerce syncStatus must be called');
  assert.equal(syncCalls[0].orderId, 'NX-ORD-9999');
  assert.equal(syncCalls[0].shipmentStatus, 'DELIVERED');
});

test('Shipment -> Commerce Sync: ProcessCarrierWebhookUseCase synchronizes carrier DELIVERED event', async () => {
  const shipmentRepo = new InMemoryShipmentRepository();

  const syncCalls: { orderId: string; shipmentStatus: string; note?: string }[] = [];
  const mockCommerceClient: ICommerceOrderClient = {
    syncStatus: async (orderId: string, shipmentStatus: string, note?: string) => {
      syncCalls.push({ orderId, shipmentStatus, note });
      return true;
    },
  };

  const webhookUseCase = new ProcessCarrierWebhookUseCase(shipmentRepo, mockCommerceClient);

  const shipment = new Shipment({
    id: 'shp_sync_test_02',
    orderId: 'NX-ORD-8888',
    carrier: CarrierCode.GHN,
    trackingCode: 'GHN888888VN',
    status: ShipmentStatus.OUT_FOR_DELIVERY,
    shippingAddress: '456 Lê Lợi, Đà Nẵng',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await shipmentRepo.save(shipment);

  // Webhook từ đối tác GHN báo Đã giao hàng
  const result = await webhookUseCase.execute({
    carrier: 'GHN',
    trackingCode: 'GHN888888VN',
    status: 'DELIVERED',
    currentLocation: 'Bưu cục Hải Châu · Phát thành công',
    shipperName: 'Trần Văn B',
  });

  assert.equal(result.status, ShipmentStatus.DELIVERED);
  assert.equal(syncCalls.length, 1, 'Commerce syncStatus must be triggered by carrier webhook');
  assert.equal(syncCalls[0].orderId, 'NX-ORD-8888');
  assert.equal(syncCalls[0].shipmentStatus, 'DELIVERED');
});
