import assert from 'node:assert/strict';
import test from 'node:test';
import { addCartProduct, readCart, writeCart } from './cart';

function browserStorage() {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    },
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { dispatchEvent: () => true },
  });
  return store;
}

test('cart persists product selection and caps quantity at known stock', () => {
  browserStorage();
  const product = {
    id: 'prod-1',
    title: 'Camera',
    description: '',
    images: [],
    price: 1200,
    currency: 'VND',
    categoryId: '',
    categoryName: '',
    sellerId: 'seller-1',
    sellerName: '',
    condition: 'NEW',
    status: 'ACTIVE',
    saleType: 'FIXED_PRICE' as const,
    stockQuantity: 2,
  };
  addCartProduct(product);
  addCartProduct(product);
  addCartProduct(product);
  assert.deepEqual(
    readCart().map((line) => [line.productId, line.quantity]),
    [['prod-1', 2]],
  );
});

test('cart reader safely ignores invalid stored data', () => {
  const store = browserStorage();
  store.set('nexus-cart-v1', '{broken');
  assert.deepEqual(readCart(), []);
});

test('cart update writes the supplied lines to storage', () => {
  const store = browserStorage();
  writeCart([
    {
      productId: 'p1',
      title: 'Item',
      image: '',
      price: 50,
      currency: 'VND',
      quantity: 3,
      stock: 5,
    },
  ]);
  assert.equal(JSON.parse(store.get('nexus-cart-v1') || '[]')[0].quantity, 3);
});
