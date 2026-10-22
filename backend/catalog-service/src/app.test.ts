import assert from 'node:assert/strict';
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
  process.env.NODE_ENV = 'test';
  process.env.USE_IN_MEMORY = 'true';
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
