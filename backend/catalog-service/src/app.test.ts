process.env.NODE_ENV = 'test';
process.env.USE_IN_MEMORY = 'true';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createServer } from 'node:http';
import test from 'node:test';
import { createApplication } from './app';

interface SearchApiResponse {
  success: boolean;
  data: Array<{ title: string; price: number }>;
  meta: { page: number; limit: number; total: number; totalPages: number };
}

interface SearchErrorResponse {
  success: boolean;
  error: string;
}

async function withCatalogServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
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

test('GET /api/v1/products/search finds available products by keyword and paginates', async () => {
  await withCatalogServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/products/search?q=sony&page=1&limit=1`);
    const result = (await response.json()) as SearchApiResponse;

    assert.equal(response.status, 200);
    assert.equal(result.success, true);
    assert.equal(result.data.length, 1);
    assert.match(result.data[0].title, /Sony/i);
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
    assert.equal(matchingResult.data.length, 1);
    assert.equal(matchingResult.data[0].price, 399.99);

    const emptyResponse = await fetch(
      `${baseUrl}/api/v1/products/search?q=headphones&categoryId=cat_electronics&minPrice=400`,
    );
    const emptyResult = (await emptyResponse.json()) as SearchApiResponse;

    assert.equal(emptyResponse.status, 200);
    assert.deepEqual(emptyResult.data, []);
    assert.equal(emptyResult.meta.total, 0);
    assert.equal(emptyResult.meta.totalPages, 0);
  });
});

test('GET /api/v1/products/search rejects a missing keyword', async () => {
  await withCatalogServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/products/search?page=1&limit=20`);
    const result = (await response.json()) as SearchErrorResponse;

    assert.equal(response.status, 400);
    assert.equal(result.success, false);
    assert.match(result.error, /q/);
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

test('POST /api/v1/products/:id/deduct-stock reduces stock quantity successfully', async () => {
  await withCatalogServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/products/prod_01hqz999xyz/deduct-stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: 5, orderId: 'ord-123' }),
    });
    const result = (await response.json()) as {
      success: boolean;
      data: { remainingStock: number };
    };

    assert.equal(response.status, 200);
    assert.equal(result.success, true);
    assert.equal(result.data.remainingStock, 45);
  });
});

test('POST /api/v1/products/:id/deduct-stock returns 409 when stock is insufficient', async () => {
  await withCatalogServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/products/prod_01hqz999xyz/deduct-stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: 9999 }),
    });
    const result = (await response.json()) as { success: boolean; error: string };

    assert.equal(response.status, 409);
    assert.equal(result.success, false);
    assert.match(result.error, /Insufficient stock/i);
  });
});

function makeBuyerToken(sub: string = 'usr_buyer_123'): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    sub,
    role: 'BUYER',
    email: `${sub}@example.com`,
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  const signature = createHmac('sha256', 'nexus-dev-secret')
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

test('Favorites API requires authentication', async () => {
  await withCatalogServer(async (baseUrl) => {
    const getRes = await fetch(`${baseUrl}/api/v1/favorites`);
    assert.equal(getRes.status, 401);

    const postRes = await fetch(`${baseUrl}/api/v1/favorites/prod_01hqz999xyz`, {
      method: 'POST',
    });
    assert.equal(postRes.status, 401);
  });
});

test('POST /api/v1/favorites/:productId toggles add and remove favorite', async () => {
  await withCatalogServer(async (baseUrl) => {
    const token = makeBuyerToken('usr_buyer_test1');

    // 1. First toggle -> Adds to favorites
    const addRes = await fetch(`${baseUrl}/api/v1/favorites/prod_01hqz999xyz`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(addRes.status, 200);
    const addData = (await addRes.json()) as { success: boolean; data: { isFavorited: boolean } };
    assert.equal(addData.success, true);
    assert.equal(addData.data.isFavorited, true);

    // 2. GET favorites -> Contains the favorited product
    const getRes = await fetch(`${baseUrl}/api/v1/favorites`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(getRes.status, 200);
    const listData = (await getRes.json()) as {
      success: boolean;
      data: Array<{ id: string }>;
      total: number;
    };
    assert.equal(listData.success, true);
    assert.equal(listData.total, 1);
    assert.equal(listData.data[0].id, 'prod_01hqz999xyz');

    // 3. Second toggle -> Removes from favorites
    const removeRes = await fetch(`${baseUrl}/api/v1/favorites/prod_01hqz999xyz`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(removeRes.status, 200);
    const removeData = (await removeRes.json()) as {
      success: boolean;
      data: { isFavorited: boolean };
    };
    assert.equal(removeData.success, true);
    assert.equal(removeData.data.isFavorited, false);

    // 4. GET favorites again -> Empty list
    const getEmptyRes = await fetch(`${baseUrl}/api/v1/favorites`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const emptyListData = (await getEmptyRes.json()) as { success: boolean; total: number };
    assert.equal(emptyListData.total, 0);
  });
});

test('POST & GET /api/v1/products/:id/reviews manages product reviews and average rating', async () => {
  await withCatalogServer(async (baseUrl) => {
    const token1 = makeBuyerToken('buyer_user_1');
    const token2 = makeBuyerToken('buyer_user_2');

    // 1. POST review without auth -> 401
    const unauthRes = await fetch(`${baseUrl}/api/v1/products/prod_01hqz999xyz/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 5, comment: 'Great product!' }),
    });
    assert.equal(unauthRes.status, 401);

    // 2. POST review with invalid rating -> 400
    const invalidRes = await fetch(`${baseUrl}/api/v1/products/prod_01hqz999xyz/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({ rating: 10, comment: 'Too high!' }),
    });
    assert.equal(invalidRes.status, 400);

    // 3. User 1 submits 5-star review
    const post1 = await fetch(`${baseUrl}/api/v1/products/prod_01hqz999xyz/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({ rating: 5, comment: 'Tai nghe xịn sò, chống ồn rất tốt!' }),
    });
    assert.equal(post1.status, 201);
    const postData1 = (await post1.json()) as { success: boolean; data: { rating: number } };
    assert.equal(postData1.success, true);
    assert.equal(postData1.data.rating, 5);

    // 4. User 2 submits 4-star review
    const post2 = await fetch(`${baseUrl}/api/v1/products/prod_01hqz999xyz/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token2}`,
      },
      body: JSON.stringify({ rating: 4, comment: 'Khá hài lòng, đeo lâu hơi nóng tai một chút.' }),
    });
    assert.equal(post2.status, 201);

    // 5. GET reviews -> Average should be (5 + 4) / 2 = 4.5
    const getRes = await fetch(`${baseUrl}/api/v1/products/prod_01hqz999xyz/reviews`);
    assert.equal(getRes.status, 200);
    const getResult = (await getRes.json()) as {
      success: boolean;
      data: { totalReviews: number; averageRating: number; reviews: Array<{ rating: number }> };
    };
    assert.equal(getResult.success, true);
    assert.equal(getResult.data.totalReviews, 2);
    assert.equal(getResult.data.averageRating, 4.5);
    assert.equal(getResult.data.reviews.length, 2);
  });
});
