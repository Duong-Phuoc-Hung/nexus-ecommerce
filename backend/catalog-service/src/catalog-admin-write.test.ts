import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import express from 'express';
import type { AddressInfo } from 'node:net';
import { CreateProductUseCase } from './application/use-cases/CreateProductUseCase';
import { DeleteProductUseCase } from './application/use-cases/DeleteProductUseCase';
import { GetProductDetailUseCase } from './application/use-cases/GetProductDetailUseCase';
import { GetSellerProductsUseCase } from './application/use-cases/GetSellerProductsUseCase';
import { SearchProductsUseCase } from './application/use-cases/SearchProductsUseCase';
import { UpdateProductUseCase } from './application/use-cases/UpdateProductUseCase';
import { ISellerDirectory } from './infrastructure/clients/HttpSellerDirectory';
import { InMemoryCategoryRepository } from './infrastructure/repositories/InMemoryCategoryRepository';
import { InMemoryProductRepository } from './infrastructure/repositories/InMemoryProductRepository';
import { ProductController } from './interfaces/http/controllers/ProductController';
import { createCatalogAdminWriteRoutes } from './interfaces/http/routes/CatalogAdminWriteRoutes';
import { createProductRoutes } from './interfaces/http/routes/ProductRoutes';

function token(role: string, sub: string, permissions?: string[]): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    sub,
    role,
    permissions,
    email: `${sub}@test.local`,
    exp: Math.floor(Date.now() / 1000) + 600,
  });
  const signature = createHmac('sha256', 'nexus-dev-secret')
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

const directory: ISellerDirectory = {
  findUser: async (id) => {
    if (id === 'seller-1') {
      return { id, fullName: 'Shop Một', role: 'SELLER', status: 'ACTIVE' };
    }
    if (id === 'seller-banned') {
      return { id, fullName: 'Shop Cấm', role: 'SELLER', status: 'BANNED' };
    }
    if (id === 'buyer-1') return { id, fullName: 'Người mua', role: 'BUYER', status: 'ACTIVE' };
    return null;
  },
};

async function withServer(run: (call: Call) => Promise<void>): Promise<void> {
  const categories = new InMemoryCategoryRepository();
  const products = new InMemoryProductRepository();
  const create = new CreateProductUseCase(products, categories);
  const update = new UpdateProductUseCase(products, categories);
  const remove = new DeleteProductUseCase(products);
  const controller = new ProductController(
    new GetProductDetailUseCase(products),
    products,
    new SearchProductsUseCase(products),
    create,
    update,
    remove,
    new GetSellerProductsUseCase(products),
  );

  const app = express();
  app.use(express.json());
  app.use(
    '/api/v1/products',
    createCatalogAdminWriteRoutes({
      createProduct: create,
      updateProduct: update,
      deleteProduct: remove,
      sellerDirectory: directory,
    }),
  );
  app.use('/api/v1/products', createProductRoutes(controller));

  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/products`;
  const call: Call = async (method, path, tk, body) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(tk ? { authorization: `Bearer ${tk}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, json: (await res.json()) as any };
  };

  try {
    await run(call);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

type Call = (
  method: string,
  path: string,
  tk: string | null,
  body?: unknown,
) => Promise<{ status: number; json: any }>;

const ALL = ['PRODUCT.CREATE', 'PRODUCT.UPDATE', 'PRODUCT.DELETE'];
const payload = {
  title: 'Áo khoác Admin tạo',
  description: 'Hàng do Admin đăng thay Seller',
  categoryId: '1',
  price: 250000,
  stockQuantity: 3,
};

test('Admin write flow: create for a seller, update, delete, with permission and seller checks', async () => {
  await withServer(async (call) => {
    const admin = token('ADMIN', 'admin-1', ALL);

    // POST: sellerId bắt buộc, Seller phải tồn tại / đúng role / đang hoạt động
    assert.equal((await call('POST', '/', admin, payload)).status, 400);
    assert.equal((await call('POST', '/', admin, { ...payload, sellerId: 'nope' })).status, 404);
    assert.equal((await call('POST', '/', admin, { ...payload, sellerId: 'buyer-1' })).status, 422);
    assert.equal(
      (await call('POST', '/', admin, { ...payload, sellerId: 'seller-banned' })).status,
      422,
    );

    const created = await call('POST', '/', admin, { ...payload, sellerId: 'seller-1' });
    assert.equal(created.status, 201);
    assert.equal(created.json.data.sellerId, 'seller-1');
    const id = created.json.data.id;

    // Sản phẩm thuộc đúng Seller được chọn
    const detail = await call('GET', `/${id}`, null);
    assert.equal(detail.json.data.sellerId, 'seller-1');

    // Thiếu permission -> 403
    const noPerm = token('ADMIN', 'admin-2', ['PRODUCT.VIEW']);
    assert.equal(
      (await call('POST', '/', noPerm, { ...payload, sellerId: 'seller-1' })).status,
      403,
    );
    assert.equal((await call('PUT', `/${id}`, noPerm, { price: 1 })).status, 403);
    assert.equal((await call('DELETE', `/${id}`, noPerm)).status, 403);

    // PUT / DELETE của Admin trên sản phẩm của Seller
    const updated = await call('PUT', `/${id}`, admin, { price: 300000 });
    assert.equal(updated.status, 200);
    assert.equal((await call('GET', `/${id}`, null)).json.data.price, 300000);
    assert.equal((await call('PUT', '/999999', admin, { price: 1 })).status, 404);

    assert.equal((await call('DELETE', `/${id}`, admin)).status, 200);
    assert.equal((await call('GET', `/${id}`, null)).status, 404);
    assert.equal((await call('DELETE', `/${id}`, admin)).status, 404);
  });
});

test('Seller and anonymous write flow still goes through the original router', async () => {
  await withServer(async (call) => {
    const seller = token('SELLER', 'seller-1');

    // Seller tạo sản phẩm của chính mình (không cần sellerId, không gọi User Service)
    const created = await call('POST', '/', seller, payload);
    assert.equal(created.status, 201);
    const id = created.json.data.id;
    assert.equal((await call('GET', `/${id}`, null)).json.data.sellerId, 'seller-1');

    // Seller khác không sửa/xóa được; chính chủ thì được
    const other = token('SELLER', 'seller-2');
    assert.equal((await call('PUT', `/${id}`, other, { price: 1 })).status, 403);
    assert.equal((await call('DELETE', `/${id}`, other)).status, 403);
    assert.equal((await call('PUT', `/${id}`, seller, { price: 123000 })).status, 200);

    // Buyer và khách vẫn bị route cũ chặn
    assert.equal((await call('POST', '/', token('BUYER', 'b1'), payload)).status, 403);
    assert.equal((await call('POST', '/', null, payload)).status, 401);

    assert.equal((await call('DELETE', `/${id}`, seller)).status, 200);
  });
});
