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

test('SCRUM-C01 Subtask 1.2: Stock Quantity Validation in CartService', async () => {
  const mockRepository = {
    getOrCreateCart: async (userId: string) => ({ id: 'cart-1', userId, status: 'ACTIVE' }),
    getCartItems: async () => [],
    addItem: async () => {},
  } as any;

  const mockCatalog = {
    findProduct: async (productId: string) => {
      if (productId === 'out-of-stock') {
        return {
          id: 'out-of-stock',
          title: 'Hết hàng',
          price: 100000,
          sellerId: 'seller-2',
          status: 'ACTIVE',
          stockQuantity: 0,
        };
      }
      if (productId === 'low-stock') {
        return {
          id: 'low-stock',
          title: 'Hàng ít',
          price: 200000,
          sellerId: 'seller-2',
          status: 'ACTIVE',
          stockQuantity: 2,
        };
      }
      return null;
    },
  };

  const { CartService } = await import('./application/cart/CartService');
  const service = new CartService(mockRepository, mockCatalog);

  // 1. Thêm sản phẩm hết hàng (stockQuantity = 0)
  await assert.rejects(
    async () => service.addItem('buyer-1', { productId: 'out-of-stock', quantity: 1 }),
    (err: any) => {
      assert.ok(err instanceof CartValidationError);
      assert.equal(err.status, 409);
      assert.equal(err.code, 'OUT_OF_STOCK');
      return true;
    },
  );

  // 2. Thêm số lượng vượt quá tồn kho (muốn 5 cái nhưng chỉ còn 2 cái)
  await assert.rejects(
    async () => service.addItem('buyer-1', { productId: 'low-stock', quantity: 5 }),
    (err: any) => {
      assert.ok(err instanceof CartValidationError);
      assert.equal(err.status, 409);
      assert.equal(err.code, 'INSUFFICIENT_STOCK');
      return true;
    },
  );

  console.log('✅ [TEST PASS] CartService: Kiểm tra tồn kho (stockQuantity) thành công mỹ mãn!');
});

test('SCRUM-C01 Subtask 1.3: ImageUrl & Catalog Fallback without Stock 99', async () => {
  const mockRepository = {
    getOrCreateCart: async (userId: string) => ({ id: 'cart-1', userId, expiresAt: new Date() }),
    getCartItems: async () => [
      { id: 'item-1', productId: 'p-with-image', quantity: 2, unitPrice: 150000 },
      { id: 'item-2', productId: 'p-catalog-err', quantity: 1, unitPrice: 200000 },
    ],
  } as any;

  const mockCatalog = {
    findProduct: async (productId: string) => {
      if (productId === 'p-with-image') {
        return {
          id: 'p-with-image',
          title: 'Áo Polo Nam',
          price: 150000,
          sellerId: 'seller-1',
          status: 'ACTIVE',
          stockQuantity: 10,
          imageUrl: 'https://example.com/polo.jpg',
        };
      }
      throw new Error('Catalog service timeout');
    },
  };

  const { CartService } = await import('./application/cart/CartService');
  const service = new CartService(mockRepository, mockCatalog);
  const cart = await service.getCart('buyer-1');

  assert.equal(cart.items.length, 2);

  // Item 1: Catalog OK
  assert.equal(cart.items[0].imageUrl, 'https://example.com/polo.jpg');
  assert.equal(cart.items[0].stockQuantity, 10);
  assert.equal(cart.items[0].status, 'ACTIVE');
  assert.equal(cart.items[0].availability, 'AVAILABLE');

  // Item 2: Catalog Error -> tuyệt đối không fake stock = 99
  assert.equal(cart.items[1].imageUrl, null);
  assert.equal(cart.items[1].stockQuantity, 0);
  assert.equal(cart.items[1].status, 'UNKNOWN');
  assert.equal(cart.items[1].availability, 'UNKNOWN');

  console.log(
    '✅ [TEST PASS] CartService: ImageUrl & Fallback UNAVAILABLE/UNKNOWN verified successfully!',
  );
});
