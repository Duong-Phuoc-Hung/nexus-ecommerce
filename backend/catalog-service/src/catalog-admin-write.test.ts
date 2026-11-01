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

type Call = (
  method: string,
  path: string,
  token?: string,
  body?: unknown,
) => Promise<{ status: number; body: any }>;

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
    undefined,
    directory,
  );

  const app = express();
  app.use(express.json());
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
      body: body ? JSON.stringify(body) : undefined,
    });
    const parsed = (await res.json().catch(() => ({}))) as any;
    return { status: res.status, body: parsed };
  };

  try {
    await run(call);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test('Admin POST /products validates seller existence via directory and binds sellerId', async () => {
  await withServer(async (call) => {
    const adminToken = token('ADMIN', 'admin-001', ['PRODUCT.CREATE']);

    // Thiếu sellerId -> 400
    const noSeller = await call('POST', '', adminToken, {
      title: 'T',
      description: 'D',
      categoryId: '1',
      price: 100,
    });
    assert.equal(noSeller.status, 400);
    assert.equal(noSeller.body.code, 'VALIDATION_ERROR');

    // sellerId không tồn tại -> 404
    const notFound = await call('POST', '', adminToken, {
      sellerId: 'ghost',
      title: 'T',
      description: 'D',
      categoryId: '1',
      price: 100,
    });
    assert.equal(notFound.status, 404);
    assert.equal(notFound.body.code, 'SELLER_NOT_FOUND');

    // sellerId là buyer -> 422
    const isBuyer = await call('POST', '', adminToken, {
      sellerId: 'buyer-1',
      title: 'T',
      description: 'D',
      categoryId: '1',
      price: 100,
    });
    assert.equal(isBuyer.status, 422);
    assert.equal(isBuyer.body.code, 'NOT_A_SELLER');

    // sellerId bị cấm -> 422
    const isBanned = await call('POST', '', adminToken, {
      sellerId: 'seller-banned',
      title: 'T',
      description: 'D',
      categoryId: '1',
      price: 100,
    });
    assert.equal(isBanned.status, 422);
    assert.equal(isBanned.body.code, 'SELLER_NOT_ACTIVE');

    // Hợp lệ -> 201 với sellerId đúng
    const ok = await call('POST', '', adminToken, {
      sellerId: 'seller-1',
      title: 'Sản phẩm mới',
      description: 'Mô tả',
      categoryId: '1',
      price: 500_000,
      stockQuantity: 3,
    });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.data.sellerId, 'seller-1');
  });
});

test('Seller POST /products still works without sellerId', async () => {
  await withServer(async (call) => {
    const sellerToken = token('SELLER', 'seller-real', ['PRODUCT.CREATE']);
    const res = await call('POST', '', sellerToken, {
      title: 'Hàng của tôi',
      description: 'Mô tả',
      categoryId: '1',
      price: 200_000,
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.sellerId, 'seller-real');
  });
});
