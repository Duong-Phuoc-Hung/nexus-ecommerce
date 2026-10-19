import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ApiError,
  normalizeApiError,
  type RequestApi,
  type RequestOptions,
} from '../../../lib/axios/http';
import { safeNextPath } from '../../../lib/utils/navigation';
import {
  createCatalogApi,
  defaultQuery,
  formatPrice,
  normalizeProduct,
  parseCatalogQuery,
  validateProduct,
  type ProductInput,
} from './catalog.factory';

const product = {
  id: 'db-42',
  title: 'Máy ảnh thử nghiệm',
  price: '12500000',
  currency: 'VND',
  categoryId: 'db-category',
  status: 'ACTIVE',
  saleType: 'FIXED_PRICE',
  images: ['https://example.test/camera.jpg'],
  stockQuantity: 0,
};
const input: ProductInput = {
  title: 'Máy ảnh',
  description: 'Mô tả sản phẩm',
  categoryId: 'db-category',
  sellerId: 'seller-1',
  price: '12500000',
  currency: 'VND',
  condition: 'USED',
  images: ['https://example.test/camera.jpg'],
  status: 'DRAFT',
  saleType: 'FIXED_PRICE',
};
const responder =
  (value: unknown): RequestApi =>
  async <T>() =>
    value as T;

test('legacy product does not invent currency, rating, image or transaction type', () => {
  const p = normalizeProduct({ id: 42, title: 'Legacy item', price: 399.99, stockQuantity: 0 });
  assert.equal(p.id, '42');
  assert.equal(p.currency, null);
  assert.equal(p.rating, undefined);
  assert.deepEqual(p.images, []);
  assert.equal(p.saleType, 'UNKNOWN');
  assert.equal(p.stockQuantity, 0);
  assert.match(formatPrice(p), /Chưa có đơn vị tiền/);
  assert.doesNotMatch(formatPrice(p), /₫/);
});
test('malformed product and envelope are surfaced as errors instead of fake data', async () => {
  assert.throws(() => normalizeProduct({ price: 5 }), ApiError);
  const api = createCatalogApi(responder({ success: false, error: 'Failure' }), 'api');
  await assert.rejects(api.list(defaultQuery), { code: 'INVALID_RESPONSE' });
});
test('unpaged array response supports in-memory filtering and category slug mapping', async () => {
  const watchProduct = {
    ...product,
    id: 'db-watch',
    categoryId: '16',
    title: 'Đồng hồ cơ Rolex Submariner',
  };
  const api = createCatalogApi(responder({ success: true, data: [product, watchProduct] }), 'api');
  const page = await api.list(defaultQuery);
  assert.equal(page.items.length, 2);
  assert.equal(page.total, 2);
  assert.equal(page.querySupported, true);

  const watchPage = await api.list({ ...defaultQuery, categoryId: 'watches' });
  assert.equal(watchPage.items.length, 1);
  assert.equal(watchPage.items[0].id, 'db-watch');
  assert.equal(watchPage.items[0].categoryName, 'Đồng hồ');

  const emptyPage = await api.list({ ...defaultQuery, q: 'does-not-match' });
  assert.equal(emptyPage.items.length, 0);
  assert.equal(emptyPage.total, 0);
});
test('HTTP list forwards query and abort signal and trusts server pagination', async () => {
  const controller = new AbortController();
  const request: RequestApi = async <T>(path: string, options?: RequestOptions) => {
    assert.match(path, /categoryId=db-category/);
    assert.match(path, /page=2/);
    assert.equal(options?.signal, controller.signal);
    return { success: true, data: { items: [product], total: 13, page: 2, pageSize: 12 } } as T;
  };
  const page = await createCatalogApi(request, 'api').list(
    { ...defaultQuery, categoryId: 'db-category', page: 2 },
    controller.signal,
  );
  assert.equal(page.total, 13);
  assert.equal(page.totalPages, 2);
  assert.equal(page.page, 2);
  assert.equal(page.querySupported, true);
});
test('invalid server paging is an error, not a guessed total', async () => {
  const api = createCatalogApi(responder({ success: true, data: { items: [product] } }), 'api');
  await assert.rejects(api.list(defaultQuery), { code: 'INVALID_PAGINATION' });
});
test('category tree preserves DB identifiers and stops beyond SRS default depth', async () => {
  const api = createCatalogApi(
    responder({
      success: true,
      data: [
        {
          id: 10,
          name: 'A',
          children: [
            {
              id: 11,
              name: 'B',
              children: [{ id: 12, name: 'C', children: [{ id: 13, name: 'D' }] }],
            },
          ],
        },
      ],
    }),
    'api',
  );
  assert.deepEqual(
    (await api.categories()).map((c) => [c.id, c.parentId, c.level]),
    [
      ['10', null, 1],
      ['11', '10', 2],
      ['12', '11', 3],
    ],
  );
});
test('preview supports search and paging but cannot perform successful writes', async () => {
  let requests = 0;
  const request: RequestApi = async () => {
    requests++;
    throw new Error('Unexpected HTTP call');
  };
  const api = createCatalogApi(request, 'mock');
  const first = await api.list(defaultQuery);
  assert.equal(first.items.length, 12);
  assert.ok((first.total ?? 0) > 12);
  const second = await api.list({ ...defaultQuery, page: 2 });
  assert.ok(second.items.every((p) => !first.items.some((q) => q.id === p.id)));
  assert.equal((await api.list({ ...defaultQuery, q: 'a-query-that-does-not-exist' })).total, 0);
  await assert.rejects(api.save(input), { code: 'PREVIEW_ONLY' });
  assert.equal(requests, 0);
});
test('detail failure stays a failure and is never replaced by a preview item', async () => {
  const request: RequestApi = async () => {
    throw new ApiError('Missing', 404);
  };
  await assert.rejects(createCatalogApi(request, 'api').detail('bad-id'), { status: 404 });
});
test('create/update use their own methods and encoded IDs', async () => {
  const calls: Array<{ path: string; method?: string; body?: unknown }> = [];
  const request: RequestApi = async <T>(path: string, options?: RequestOptions) => {
    calls.push({ path, ...options });
    return { success: true, data: product } as T;
  };
  const api = createCatalogApi(request, 'api');
  await api.save(input);
  await api.save(input, 'id/with/slash');
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].path, '/products');
  assert.equal(calls[1].method, 'PATCH');
  assert.equal(calls[1].path, '/products/id%2Fwith%2Fslash');
});
test('product validation rejects unsafe image URLs, too many images and nonfinite prices', () => {
  assert.deepEqual(validateProduct(input), {});
  assert.ok(validateProduct({ ...input, images: ['javascript:alert(1)'] }).images);
  assert.ok(
    validateProduct({ ...input, images: Array(6).fill('https://example.test/photo.jpg') }).images,
  );
  assert.ok(validateProduct({ ...input, price: '9'.repeat(400) }).price);
  assert.ok(validateProduct({ ...input, price: '-1' }).price);
});
test('URL query parser validates enums and pagination', () => {
  const q = parseCatalogQuery(
    new URLSearchParams('page=-9&condition=HACK&minPrice=-10&sort=drop-table'),
  );
  assert.equal(q.page, 1);
  assert.equal(q.condition, '');
  assert.equal(q.minPrice, '');
  assert.equal(q.sort, 'featured');
});
test('return URL cannot redirect login to another origin', () => {
  for (const path of ['https://evil.test', '//evil.test', '/\\evil.test', '/\n/evil.test'])
    assert.equal(safeNextPath(path), '/');
  assert.equal(safeNextPath('/products/db-42?tab=details'), '/products/db-42?tab=details');
});
test('error normalizer preserves validation fields and backend error strings', () => {
  assert.equal(
    normalizeApiError({
      response: { status: 409, data: { success: false, error: 'Email exists' } },
    }).message,
    'Email exists',
  );
  const e = normalizeApiError({
    response: {
      status: 422,
      data: {
        error: { code: 'INVALID', message: 'Check input', fieldErrors: { title: ['Required'] } },
      },
    },
  });
  assert.equal(e.code, 'INVALID');
  assert.equal(e.fieldErrors.title, 'Required');
  assert.equal(e.status, 422);
});
