import assert from 'node:assert/strict';
import test from 'node:test';
import { Order, OrderStatus } from '../../domain/entities/Order';
import { InMemoryOrderRepository } from '../../infrastructure/repositories/InMemoryOrderRepository';
import { GetOrderDetailUseCase } from './GetOrderDetailUseCase';
import { ConfirmOrderReceiptUseCase } from './ConfirmOrderReceiptUseCase';

test('ConfirmOrderReceiptUseCase: Buyer confirms order receipt successfully and idempotently', async () => {
  const repository = new InMemoryOrderRepository();
  const getDetailUseCase = new GetOrderDetailUseCase(repository);
  const useCase = new ConfirmOrderReceiptUseCase(repository, getDetailUseCase);

  const testOrder = new Order({
    id: 'ord_test_001',
    buyerId: 'usr_buyer_123',
    buyerName: 'Buyer Test',
    buyerEmail: 'buyer@test.com',
    sellerId: 'usr_seller_456',
    items: [
      {
        productId: 'prod_1',
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
    orderId: 'ord_test_001',
    buyerId: 'usr_buyer_123',
  });

  assert.ok(res1.buyerReceivedAt, 'buyerReceivedAt phải có giá trị ngày giờ');
  assert.equal(
    res1.timeline.some((t) => t.note === 'BUYER_CONFIRMED_RECEIPT'),
    true,
    'Timeline phải có sự kiện BUYER_CONFIRMED_RECEIPT',
  );

  // 2. Gọi lại lần 2 (Idempotent) -> Không bị nhân đôi timeline event
  const res2 = await useCase.execute({
    orderId: 'ord_test_001',
    buyerId: 'usr_buyer_123',
  });
  assert.equal(res2.buyerReceivedAt, res1.buyerReceivedAt);
  const confirmedEvents = res2.timeline.filter((t) => t.note === 'BUYER_CONFIRMED_RECEIPT');
  assert.equal(confirmedEvents.length, 1, 'Chỉ được có đúng 1 sự kiện xác nhận nhận hàng');

  // 3. Người mua khác cố tình xác nhận -> Chặn lỗi 403
  await assert.rejects(async () => {
    await useCase.execute({
      orderId: 'ord_test_001',
      buyerId: 'usr_other_buyer',
    });
  }, /không có quyền/);

  // 4. Đơn hàng chưa DELIVERED (ví dụ SHIPPED) -> Chặn lỗi 400
  const pendingOrder = new Order({
    id: 'ord_test_002',
    buyerId: 'usr_buyer_123',
    sellerId: 'usr_seller_456',
    items: [],
    totalAmount: 50000,
    status: OrderStatus.SHIPPED,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await repository.save(pendingOrder);

  await assert.rejects(async () => {
    await useCase.execute({
      orderId: 'ord_test_002',
      buyerId: 'usr_buyer_123',
    });
  }, /DELIVERED/);
});
