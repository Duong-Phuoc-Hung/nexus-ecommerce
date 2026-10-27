process.env.NODE_ENV = 'test';
process.env.USE_IN_MEMORY = 'true';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createServer } from 'node:http';
import test from 'node:test';
import { CatalogApplicationOptions, createApplication } from './app';
import { Product, ProductStatus } from './domain/entities/Product';
import { InMemoryProductRepository } from './infrastructure/repositories/InMemoryProductRepository';

interface SearchApiResponse {
  success: boolean;
  data: {
    items: Array<{ title: string; price: number }>;
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  meta: { page: number; limit: number; total: number; totalPages: number };
}

interface SearchErrorResponse {
  success: boolean;
  error: string;
}

async function withCatalogServer<T>(
  run: (baseUrl: string) => Promise<T>,
  options?: CatalogApplicationOptions,
): Promise<T> {
  const server = createApplication(options).listen(0, '127.0.0.1');
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

function token(role: string, permissions: string[] = []): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: role === 'ADMIN' ? 'admin-1' : `${role.toLowerCase()}-1`,
      email: `${role.toLowerCase()}@example.test`,
      role,
      permissions,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString('base64url');
  const signature = createHmac('sha256', 'nexus-dev-secret')
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

test('GET /api/v1/products/search finds available products by keyword and paginates', async () => {
  await withCatalogServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/products/search?q=sony&page=1&limit=1`);
    const result = (await response.json()) as SearchApiResponse;

    assert.equal(response.status, 200);
    assert.equal(result.success, true);
    assert.equal(result.data.items.length, 1);
    assert.match(result.data.items[0].title, /Sony/i);
    assert.deepEqual(result.meta, {
      page: 1,
      limit: 1,
      total: 1,
      totalPages: 1,
    });
  });
});

test('GET /api/v1/products/search applies category and inclusive price filters', async () => {
  await withCatalogServer(async (baseUrl) => {
    const matchingResponse = await fetch(
      `${baseUrl}/api/v1/products/search?q=headphones&categoryId=cat_electronics&minPrice=399.99&maxPrice=399.99`,
    );
    const matchingResult = (await matchingResponse.json()) as SearchApiResponse;

    assert.equal(matchingResponse.status, 200);
    assert.equal(matchingResult.data.items.length, 1);
    assert.equal(matchingResult.data.items[0].price, 399.99);

    const emptyResponse = await fetch(
      `${baseUrl}/api/v1/products/search?q=headphones&categoryId=cat_electronics&minPrice=400`,
    );
    const emptyResult = (await emptyResponse.json()) as SearchApiResponse;

    assert.equal(emptyResponse.status, 200);
    assert.deepEqual(emptyResult.data.items, []);
    assert.equal(emptyResult.meta.total, 0);
    assert.equal(emptyResult.meta.totalPages, 0);
  });
});

test('GET /api/v1/products/search allows browsing without a keyword', async () => {
  await withCatalogServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/products/search?page=1&limit=20`);
    const result = (await response.json()) as SearchApiResponse;

    assert.equal(response.status, 200);
    assert.equal(result.success, true);
    assert.equal(result.data.items.length, 1);
  });
});

test('GET /api/v1/products/search rejects invalid pagination', async () => {
  await withCatalogServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/products/search?q=sony&page=0&limit=10`);
    const result = (await response.json()) as SearchErrorResponse;

    assert.equal(response.status, 400);
    assert.equal(result.success, false);
    assert.equal(typeof result.error, 'string');
  });
});

test('GET /api/v1/categories?tree=true returns active categories as a nested tree', async () => {
  await withCatalogServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/categories?tree=true`);
    const result = (await response.json()) as {
      success: boolean;
      data: Array<{
        id: string;
        children?: Array<{ id: string; children?: Array<{ id: string }> }>;
      }>;
    };

    assert.equal(response.status, 200);
    assert.equal(result.success, true);
    assert.equal(result.data[0].id, '1');
    assert.ok(result.data[0].children && result.data[0].children.length > 0);
    assert.equal(result.data[0].children[0].id, '10');
    assert.ok(
      result.data[0].children[0].children && result.data[0].children[0].children.length > 0,
    );
    assert.equal(result.data[0].children[0].children[0].id, '100');
  });
});

test('public product list hides non-active products and supports pagination and filters', async () => {
  const products = new InMemoryProductRepository();
  await products.save(
    new Product({
      id: 'public-product',
      sellerId: 'seller-1',
      categoryId: '1',
      title: 'Public headset',
      description: 'Available',
      price: 250,
      stockQuantity: 3,
      status: ProductStatus.ACTIVE,
      condition: 'NEW',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  );
  await products.save(
    new Product({
      id: 'draft-product',
      sellerId: 'seller-1',
      categoryId: '1',
      title: 'Draft headset',
      description: 'Not public',
      price: 250,
      stockQuantity: 3,
      status: ProductStatus.DRAFT,
      condition: 'NEW',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  );

  await withCatalogServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/products?page=1&pageSize=1&condition=NEW`);
    const result = (await response.json()) as {
      success: boolean;
      data: { items: Array<{ id: string }>; total: number; page: number; pageSize: number };
    };

    assert.equal(response.status, 200);
    assert.equal(result.success, true);
    assert.equal(result.data.total, 1);
    assert.equal(result.data.page, 1);
    assert.equal(result.data.pageSize, 1);
    assert.equal(result.data.items.length, 1);
    assert.notEqual(result.data.items[0].id, 'draft-product');
  }, { productRepository: products });
});

test('admin product scope requires an Admin token and returns selected statuses', async () => {
  const products = new InMemoryProductRepository();
  await products.save(
    new Product({
      id: 'draft-product',
      sellerId: 'seller-1',
      categoryId: '1',
      title: 'Draft headset',
      description: 'Not public',
      price: 250,
      stockQuantity: 3,
      status: ProductStatus.DRAFT,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  );

  await withCatalogServer(async (baseUrl) => {
    const anonymous = await fetch(`${baseUrl}/api/v1/products?scope=admin`);
    assert.equal(anonymous.status, 401);

    const buyer = await fetch(`${baseUrl}/api/v1/products?scope=admin`, {
      headers: { authorization: `Bearer ${token('BUYER')}` },
    });
    assert.equal(buyer.status, 403);

    const admin = await fetch(`${baseUrl}/api/v1/products?scope=admin&status=DRAFT`, {
      headers: { authorization: `Bearer ${token('ADMIN')}` },
    });
    const result = (await admin.json()) as {
      success: boolean;
      data: { items: Array<{ id: string; status: string }>; total: number };
    };
    assert.equal(admin.status, 200);
    assert.equal(result.success, true);
    assert.equal(result.data.total, 1);
    assert.equal(result.data.items[0].id, 'draft-product');
    assert.equal(result.data.items[0].status, 'DRAFT');
  }, { productRepository: products });
});

test('public product detail hides drafts while Admin can inspect them', async () => {
  const products = new InMemoryProductRepository();
  await products.save(
    new Product({
      id: 'draft-product',
      sellerId: 'seller-1',
      categoryId: '1',
      title: 'Draft headset',
      description: 'Not public',
      price: 250,
      stockQuantity: 3,
      status: ProductStatus.DRAFT,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  );

  await withCatalogServer(async (baseUrl) => {
    const publicResponse = await fetch(`${baseUrl}/api/v1/products/draft-product`);
    assert.equal(publicResponse.status, 404);

    const adminResponse = await fetch(`${baseUrl}/api/v1/products/draft-product`, {
      headers: { authorization: `Bearer ${token('ADMIN')}` },
    });
    assert.equal(adminResponse.status, 200);
  }, { productRepository: products });
});

test('Buyer cannot write products and Admin requires the matching catalog permission', async () => {
  await withCatalogServer(async (baseUrl) => {
    const body = JSON.stringify({
      title: 'Valid product',
      description: 'Description',
      categoryId: '1',
      price: 100,
    });
    const buyerResponse = await fetch(`${baseUrl}/api/v1/products`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token('BUYER')}`,
        'content-type': 'application/json',
      },
      body,
    });
    assert.equal(buyerResponse.status, 403);

    const adminWithoutPermission = await fetch(`${baseUrl}/api/v1/products`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token('ADMIN')}`,
        'content-type': 'application/json',
      },
      body,
    });
    assert.equal(adminWithoutPermission.status, 403);
  });
});

test('Admin creates a product for an active Seller validated through User Service', async () => {
  const products = new InMemoryProductRepository();
  let directoryCalls = 0;
  await withCatalogServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/products`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token('ADMIN', ['PRODUCT.CREATE'])}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Admin-created product',
        description: 'Created for Seller',
        categoryId: '1',
        sellerId: 'seller-123',
        price: '12.50',
        stockQuantity: 4,
        condition: 'NEW',
        images: ['https://example.test/image.png'],
      }),
    });
    const body = (await response.json()) as {
      success: boolean;
      data: { id: string; title: string };
    };

    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.title, 'Admin-created product');
    const sellerProducts = await products.findBySellerId('seller-123');
    assert.equal(sellerProducts.length, 1);
    assert.equal(sellerProducts[0].sellerName, 'Selected Seller');
    assert.equal(directoryCalls, 1);
  }, {
    productRepository: products,
    userDirectory: {
      findById: async (id) => {
        directoryCalls += 1;
        assert.equal(id, 'seller-123');
        return {
          id,
          fullName: 'Selected Seller',
          role: 'SELLER',
          status: 'ACTIVE',
        };
      },
    },
  });
});
