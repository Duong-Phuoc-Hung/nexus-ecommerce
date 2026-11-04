process.env.CATALOG_DB_HOST = process.env.CATALOG_DB_HOST || 'localhost';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { createApplication } from './app';

// Chạy với Postgres Docker: CATALOG_DB_TEST=true (container nexus-postgres-catalog, cổng 5433).
const enabled = process.env.CATALOG_DB_TEST === 'true';
const dbTest = (name: string, run: () => Promise<void>) => test(name, { skip: !enabled }, run);

function token(role: string, sub: string): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    sub,
    role,
    email: `${sub}@test.local`,
    exp: Math.floor(Date.now() / 1000) + 600,
  });
  const signature = createHmac('sha256', 'nexus-dev-secret')
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

interface ListBody {
  success: boolean;
  data: Array<{ id: string; title: string; status: string; stockQuantity: number; price: number }>;
  meta: { page: number; limit: number; total: number; totalPages: number };
}

async function withServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
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

dbTest('Buyer/Admin catalog access on Docker DB keeps Seller behavior unchanged', async () => {
  await withServer(async (baseUrl) => {
    const seller = {
      authorization: `Bearer ${token('SELLER', '9001')}`,
      'content-type': 'application/json',
    };
    const admin = { authorization: `Bearer ${token('ADMIN', '1')}` };
    const buyer = { authorization: `Bearer ${token('BUYER', '9002')}` };
    const marker = `dbtest-${Date.now()}`;
    const createdIds: string[] = [];

    try {
      const categories = (await (await fetch(`${baseUrl}/api/v1/categories`)).json()) as {
        data: Array<{ id: string }>;
      };
      const categoryId = categories.data[0].id;

      const create = async (suffix: string, extra: Record<string, unknown>) => {
        const response = await fetch(`${baseUrl}/api/v1/products`, {
          method: 'POST',
          headers: seller,
          body: JSON.stringify({
            title: `${marker}-${suffix}`,
            description: marker,
            categoryId,
            price: 123456,
            stockQuantity: 5,
            ...extra,
          }),
        });
        assert.equal(response.status, 201);
        const body = (await response.json()) as { data: { id: string } };
        createdIds.push(body.data.id);
        return body.data.id;
      };

      const visibleId = await create('visible', {});
      const noStockId = await create('nostock', { stockQuantity: 0 });
      const draftId = await create('draft', {});
      const updated = await fetch(`${baseUrl}/api/v1/products/${draftId}`, {
        method: 'PUT',
        headers: seller,
        body: JSON.stringify({ status: 'DRAFT' }),
      });
      assert.equal(updated.status, 200);

      // Khách và Buyer chỉ thấy sản phẩm ACTIVE còn hàng, có phân trang.
      for (const headers of [{}, buyer]) {
        const list = (await (
          await fetch(`${baseUrl}/api/v1/products?q=${marker}&limit=10`, { headers })
        ).json()) as ListBody;
        assert.deepEqual(
          list.data.map((p) => p.id),
          [visibleId],
        );
        assert.equal(list.meta.total, 1);
        assert.equal(
          (await fetch(`${baseUrl}/api/v1/products/${visibleId}`, { headers })).status,
          200,
        );
        assert.equal(
          (await fetch(`${baseUrl}/api/v1/products/${draftId}`, { headers })).status,
          404,
        );
        assert.equal(
          (await fetch(`${baseUrl}/api/v1/products/${noStockId}`, { headers })).status,
          404,
        );
      }

      const paged = (await (
        await fetch(`${baseUrl}/api/v1/products?limit=2&sort=price_asc`)
      ).json()) as ListBody;
      assert.equal(paged.data.length, 2);
      assert.equal(paged.meta.limit, 2);
      assert.ok(paged.data.every((p) => p.status === 'ACTIVE' && p.stockQuantity > 0));

      // scope=admin: chỉ Admin, thấy đủ trạng thái và lọc được theo status.
      assert.equal((await fetch(`${baseUrl}/api/v1/products?scope=admin`)).status, 401);
      assert.equal(
        (await fetch(`${baseUrl}/api/v1/products?scope=admin`, { headers: buyer })).status,
        403,
      );
      assert.equal(
        (
          await fetch(`${baseUrl}/api/v1/products?scope=admin`, {
            headers: { authorization: seller.authorization },
          })
        ).status,
        403,
      );
      const adminList = (await (
        await fetch(`${baseUrl}/api/v1/products?scope=admin&q=${marker}&limit=10`, {
          headers: admin,
        })
      ).json()) as ListBody;
      assert.equal(adminList.meta.total, 3);
      const drafts = (await (
        await fetch(`${baseUrl}/api/v1/products?scope=admin&q=${marker}&status=DRAFT`, {
          headers: admin,
        })
      ).json()) as ListBody;
      assert.deepEqual(
        drafts.data.map((p) => p.id),
        [draftId],
      );
      assert.equal(
        (await fetch(`${baseUrl}/api/v1/products/${draftId}?scope=admin`, { headers: admin }))
          .status,
        200,
      );

      // Seller giữ nguyên hành vi cũ: thấy cả sản phẩm nháp/hết hàng và /mine.
      const sellerHeaders = { authorization: seller.authorization };
      assert.equal(
        (await fetch(`${baseUrl}/api/v1/products/${draftId}`, { headers: sellerHeaders })).status,
        200,
      );
      const mine = (await (
        await fetch(`${baseUrl}/api/v1/products/mine`, { headers: sellerHeaders })
      ).json()) as {
        data: Array<{ id: string }>;
      };
      assert.ok(createdIds.every((id) => mine.data.some((p) => p.id === id)));

      // Seller đi qua header Gateway vẫn được ghi.
      const viaGateway = await fetch(`${baseUrl}/api/v1/products/${visibleId}`, {
        method: 'PUT',
        headers: {
          'x-user-id': '9001',
          'x-user-role': 'SELLER',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ price: 123457 }),
      });
      assert.equal(viaGateway.status, 200);

      // Buyer vẫn không ghi được.
      assert.equal(
        (
          await fetch(`${baseUrl}/api/v1/products`, {
            method: 'POST',
            headers: { ...buyer, 'content-type': 'application/json' },
            body: '{}',
          })
        ).status,
        403,
      );
    } finally {
      for (const id of createdIds) {
        await fetch(`${baseUrl}/api/v1/products/${id}`, {
          method: 'DELETE',
          headers: { authorization: `Bearer ${token('SELLER', '9001')}` },
        });
      }
    }
  });
});
