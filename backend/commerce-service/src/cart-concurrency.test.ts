import assert from 'node:assert/strict';
import test from 'node:test';
import { Pool } from 'pg';
import {
  CartValidationError,
  validateAddToCartInput,
  validateUpdateCartItemInput,
} from './application/cart/dtos/AddToCartDto';
import { PostgresCartRepository } from './infrastructure/repositories/PostgresCartRepository';

test('SCRUM-C01 Subtask 1: DTO Validation & Mapping', () => {
  // 1. Thêm sản phẩm hợp lệ
  const valid = validateAddToCartInput({ productId: '101', quantity: 2 });
  assert.equal(valid.productId, '101');
  assert.equal(valid.quantity, 2);

  // 2. Quantity mặc định là 1 nếu không truyền
  const defaultQuantity = validateAddToCartInput({ productId: '101' });
  assert.equal(defaultQuantity.quantity, 1);

  // 3. Reject khi productId không hợp lệ (không phải số)
  assert.throws(
    () => validateAddToCartInput({ productId: 'abc', quantity: 1 }),
    (err: unknown) => {
      assert.ok(err instanceof CartValidationError);
      assert.equal(err.status, 400);
      assert.ok(err.fieldErrors?.productId);
      return true;
    },
  );

  // 4. Reject khi quantity < 1 hoặc vượt quá giới hạn 999
  assert.throws(
    () => validateAddToCartInput({ productId: '101', quantity: 0 }),
    (err: unknown) => {
      assert.ok(err instanceof CartValidationError);
      assert.ok(err.fieldErrors?.quantity);
      return true;
    },
  );
  assert.throws(
    () => validateAddToCartInput({ productId: '101', quantity: 1000 }),
    (err: unknown) => {
      assert.ok(err instanceof CartValidationError);
      assert.ok(err.fieldErrors?.quantity);
      return true;
    },
  );

  // 5. Cập nhật số lượng giỏ hàng
  const validUpdate = validateUpdateCartItemInput({ quantity: 5 });
  assert.equal(validUpdate.quantity, 5);

  assert.throws(
    () => validateUpdateCartItemInput({ quantity: 'invalid' }),
    (err: unknown) => {
      assert.ok(err instanceof CartValidationError);
      assert.equal(err.status, 400);
      return true;
    },
  );

  console.log('✅ [TEST PASS] SCRUM-C01 Subtask 1: DTO validation test passed successfully!');
});

test('SCRUM-C01 Subtask 2: Concurrency Handling - MAX_ACTIVE_CART_PER_USER = 1', async () => {
  const pool = new Pool({
    host: process.env.COMMERCE_DB_HOST || '127.0.0.1',
    port: Number(process.env.COMMERCE_DB_PORT) || 5434,
    user: process.env.COMMERCE_DB_USER || 'nexus_commerce',
    password: process.env.COMMERCE_DB_PASSWORD || 'nexus_password',
    database: process.env.COMMERCE_DB_NAME || 'nexus_commerce_db',
  });

  const repository = new PostgresCartRepository(pool);
  const testUserId = `test_concurrent_user_${Date.now()}`;

  try {
    // Kích hoạt đồng thời 10 request getOrCreateCart cho cùng 1 user
    const concurrentRequests = 10;
    const promises = Array.from({ length: concurrentRequests }, () =>
      repository.getOrCreateCart(testUserId),
    );

    const results = await Promise.all(promises);

    // 1. Kiểm tra tất cả 10 request đều nhận được cùng 1 Cart ID duy nhất
    const firstCartId = results[0].id;
    assert.ok(firstCartId, 'Cart ID phải tồn tại');
    for (let i = 1; i < results.length; i++) {
      assert.equal(
        results[i].id,
        firstCartId,
        `Request thứ ${i} phải nhận được cùng Cart ID (${firstCartId}), nhưng lại nhận ${results[i].id}`,
      );
    }

    // 2. Kiểm tra trực tiếp trong PostgreSQL: chỉ có duy nhất 1 bản ghi cart active
    const activeCartsCount = await repository.countActiveCarts(testUserId);
    assert.equal(
      activeCartsCount,
      1,
      `Số lượng active cart trong DB phải chính xác là 1 (MAX_ACTIVE_CART_PER_USER = 1), nhưng tìm thấy ${activeCartsCount}`,
    );

    console.log(
      `✅ [TEST PASS] SCRUM-C01 Subtask 2: 10 request đồng thời tạo cart cho user "${testUserId}" thành công mỹ mãn: duy nhất 1 cart active (ID: ${firstCartId}) được tạo!`,
    );
  } finally {
    // Dọn dẹp dữ liệu test
    await pool.query('DELETE FROM commerce_carts WHERE user_id = $1', [testUserId]);
    await pool.end();
  }
});
