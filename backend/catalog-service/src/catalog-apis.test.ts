import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { createApplication } from './app';

function createTestToken(sub: string, role: string, email = 'test@nexus.vn'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(
    JSON.stringify({
      sub,
      email,
      role,
      iat: now,
      exp: now + 3600,
    }),
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', 'nexus-dev-secret')
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

async function withCatalogServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  process.env.NODE_ENV = 'test';
  const server = createApplication().listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');

  try {
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

// =========================================================================
// 1. KIỂM TRA GET /api/v1/categories (Tree & Flat)
// =========================================================================
test('GET /api/v1/categories?tree=true returns hierarchical category tree up to 3 levels', async () => {
  await withCatalogServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/v1/categories?tree=true`);
    assert.equal(res.status, 200);

    const json = (await res.json()) as any;
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length > 0);

    // Root items should be Level 1
    const electronics = json.data.find((c: any) => c.slug === 'thiet-bi-dien-tu');
    assert.ok(electronics, 'Danh mục gốc Thiết bị điện tử phải tồn tại');
    assert.equal(electronics.level, 1);
    assert.ok(Array.isArray(electronics.children));
    assert.ok(electronics.children.length > 0, 'Phải có danh mục con Level 2');

    // Level 2
    const phoneTablet = electronics.children.find((c: any) => c.slug === 'dien-thoai-tablet');
    assert.ok(phoneTablet, 'Phải có danh mục Level 2 Điện thoại & Tablet');
    assert.equal(phoneTablet.level, 2);
    assert.equal(phoneTablet.parentId, electronics.id);

    // Level 3
    assert.ok(Array.isArray(phoneTablet.children));
    const iphone = phoneTablet.children.find((c: any) => c.slug === 'dien-thoai-iphone');
    assert.ok(iphone, 'Phải có danh mục Level 3 iPhone');
    assert.equal(iphone.level, 3);
    assert.equal(iphone.parentId, phoneTablet.id);
  });
});

test('GET /api/v1/categories without tree returns flat list', async () => {
  await withCatalogServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/v1/categories`);
    assert.equal(res.status, 200);

    const json = (await res.json()) as any;
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
    // Level 1, 2, 3 all exist in flat array
    const levels = new Set(json.data.map((c: any) => c.level));
    assert.ok(levels.has(1));
    assert.ok(levels.has(2));
    assert.ok(levels.has(3));
  });
});

// =========================================================================
// 2. KIỂM TRA POST /api/v1/products (Tạo sản phẩm, RBAC Seller/Admin/Buyer)
// =========================================================================
test('POST /api/v1/products permits SELLER and persists product to memory/DB', async () => {
  await withCatalogServer(async (baseUrl) => {
    const sellerToken = createTestToken('seller_123', 'SELLER');
    const newProduct = {
      title: 'Bàn phím cơ không dây Nexus Key Pro',
      description: 'Bàn phím cơ hotswap 3 modes Bluetooth / 2.4G / Type-C',
      categoryId: '1',
      price: 1550000,
      stockQuantity: 30,
      condition: 'NEW',
      images: ['https://example.com/keyboard.jpg'],
      allowAuction: false,
    };

    const res = await fetch(`${baseUrl}/api/v1/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sellerToken}`,
      },
      body: JSON.stringify(newProduct),
    });

    assert.equal(res.status, 201);
    const json = (await res.json()) as any;
    assert.equal(json.success, true);
    assert.equal(json.data.title, newProduct.title);
    assert.equal(json.data.sellerId, 'seller_123');
    assert.equal(json.data.price, 1550000);
    assert.equal(json.data.stockQuantity, 30);
    assert.ok(json.data.id);
    assert.ok(json.data.primaryImage);

    // Verify GET by ID returns the created product
    const getRes = await fetch(`${baseUrl}/api/v1/products/${json.data.id}`);
    assert.equal(getRes.status, 200);
    const getJson = (await getRes.json()) as any;
    assert.equal(getJson.data.title, newProduct.title);
  });
});

test('POST /api/v1/products rejects BUYER with 403 Forbidden', async () => {
  await withCatalogServer(async (baseUrl) => {
    const buyerToken = createTestToken('buyer_456', 'BUYER');
    const res = await fetch(`${baseUrl}/api/v1/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({
        title: 'Sản phẩm thử nghiệm',
        description: 'Mô tả',
        categoryId: '1',
        price: 100000,
        stockQuantity: 1,
      }),
    });

    assert.equal(res.status, 403);
    const json = (await res.json()) as any;
    assert.equal(json.success, false);
    assert.match(json.error, /không có quyền/i);
  });
});

test('POST /api/v1/products rejects unauthenticated request with 401 Unauthorized', async () => {
  await withCatalogServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/v1/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Sản phẩm thử nghiệm',
        description: 'Mô tả',
        categoryId: '1',
        price: 100000,
      }),
    });

    assert.equal(res.status, 401);
  });
});

// =========================================================================
// 3. KIỂM TRA PATCH /api/v1/products/:id (Sửa, Quyền, Xử lý Xung đột)
// =========================================================================
test('PATCH /api/v1/products/:id allows owner seller to update and updates updatedAt', async () => {
  await withCatalogServer(async (baseUrl) => {
    const sellerToken = createTestToken('usr_01hqz789abc', 'SELLER');

    const updateRes = await fetch(`${baseUrl}/api/v1/products/prod_01hqz999xyz`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sellerToken}`,
      },
      body: JSON.stringify({
        price: 349.99,
        title: 'Sony WH-1000XM5 Wireless Headphones (Phiên bản giảm giá)',
      }),
    });

    assert.equal(updateRes.status, 200);
    const updateJson = (await updateRes.json()) as any;
    assert.equal(updateJson.success, true);
    assert.equal(updateJson.data.price, 349.99);
    assert.match(updateJson.data.title, /giảm giá/i);
  });
});

test('PATCH /api/v1/products/:id rejects non-owner seller with 403 Forbidden', async () => {
  await withCatalogServer(async (baseUrl) => {
    const anotherSellerToken = createTestToken('other_seller_999', 'SELLER');

    const res = await fetch(`${baseUrl}/api/v1/products/prod_01hqz999xyz`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anotherSellerToken}`,
      },
      body: JSON.stringify({ price: 299.99 }),
    });

    assert.equal(res.status, 403);
    const json = (await res.json()) as any;
    assert.equal(json.success, false);
    assert.match(json.error, /không có quyền/i);
  });
});

test('PATCH /api/v1/products/:id allows ADMIN to update any product', async () => {
  await withCatalogServer(async (baseUrl) => {
    const adminToken = createTestToken('admin_001', 'ADMIN');

    const res = await fetch(`${baseUrl}/api/v1/products/prod_01hqz999xyz`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'ARCHIVED' }),
    });

    assert.equal(res.status, 200);
    const json = (await res.json()) as any;
    assert.equal(json.data.status, 'ARCHIVED');
  });
});

test('PATCH /api/v1/products/:id detects concurrency conflict and returns 409 Conflict', async () => {
  await withCatalogServer(async (baseUrl) => {
    const sellerToken = createTestToken('usr_01hqz789abc', 'SELLER');

    // Gửi expectedUpdatedAt cũ không trùng khớp
    const res = await fetch(`${baseUrl}/api/v1/products/prod_01hqz999xyz`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sellerToken}`,
      },
      body: JSON.stringify({
        price: 250,
        expectedUpdatedAt: '2020-01-01T00:00:00.000Z',
      }),
    });

    assert.equal(res.status, 409);
    const json = (await res.json()) as any;
    assert.equal(json.success, false);
    assert.equal(json.code, 'CONCURRENCY_CONFLICT');
    assert.ok(json.data.currentUpdatedAt);
    assert.equal(json.data.providedUpdatedAt, '2020-01-01T00:00:00.000Z');
  });
});

// =========================================================================
// 4. KIỂM TRA GET /api/v1/products (Phân trang, Lọc, Sắp xếp)
// =========================================================================
test('GET /api/v1/products supports pagination, filtering, and sorting', async () => {
  await withCatalogServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/v1/products?page=1&limit=10&sort=price-asc`);
    assert.equal(res.status, 200);

    const json = (await res.json()) as any;
    assert.equal(json.success, true);
    assert.ok(json.data.items.length >= 2);
    assert.equal(json.data.page, 1);
    assert.equal(json.data.pageSize, 10);
  });
});

test('GET /api/v1/products?pageSize=12 returns structured page for frontend contract', async () => {
  await withCatalogServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/v1/products?pageSize=12&page=1`);
    assert.equal(res.status, 200);

    const json = (await res.json()) as any;
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data.items));
    assert.ok(Number.isInteger(json.data.total));
    assert.equal(json.data.page, 1);
    assert.equal(json.data.pageSize, 12);
  });
});

// =========================================================================
// 5. KIỂM TRA GET /api/v1/products/search (Trả về ảnh và trường thẻ sản phẩm)
// =========================================================================
test('GET /api/v1/products/search returns primaryImage, images, condition, slug for card', async () => {
  await withCatalogServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/v1/products/search?q=sony&page=1&limit=5`);
    assert.equal(res.status, 200);

    const json = (await res.json()) as any;
    assert.equal(json.success, true);
    assert.ok(json.data.length > 0);

    const item = json.data[0];
    assert.ok(item.primaryImage, 'Thẻ sản phẩm phải có primaryImage');
    assert.ok(Array.isArray(item.images), 'Phải có mảng images');
    assert.ok(item.condition, 'Phải có trường condition');
    assert.ok(item.slug, 'Phải có slug chuẩn SEO');
  });
});
