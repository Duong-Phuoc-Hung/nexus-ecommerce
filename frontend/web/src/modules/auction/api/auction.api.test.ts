import assert from 'node:assert/strict';
import test from 'node:test';
import type { Auction } from './auction.api';
process.env.NEXT_PUBLIC_AUCTION_SOURCE = 'mock';
const { acceptBid, lifecycle, nextPrice, validateAuction } = await import('./auction.api');
const now = 1_000_000;
const buyer = { id: 'buyer-one', role: 'BUYER', status: 'ACTIVE' };
const fixture = (): Auction => ({
  id: 'a',
  productId: 'p',
  title: 'Camera',
  image: '',
  seller: 'Seller',
  condition: 'Used',
  description: '',
  startingPrice: 100,
  increment: 10,
  startAt: now - 1000,
  endAt: now + 1000,
  status: 'ACTIVE',
  version: 1,
  bids: [],
});
test('auction starts and ends at exact boundaries; cancelled remains cancelled', () => {
  const a = fixture();
  assert.equal(lifecycle(a, a.startAt - 1), 'SCHEDULED');
  assert.equal(lifecycle(a, a.startAt), 'ACTIVE');
  assert.equal(lifecycle(a, a.endAt), 'ENDED');
  assert.equal(lifecycle({ ...a, status: 'CANCELLED' }, now), 'CANCELLED');
});
test('first bid starts at opening price; subsequent bid includes increment', () => {
  const a = fixture();
  assert.equal(nextPrice(a), 100);
  const b = acceptBid(a, 100, buyer, 1, 'one', now);
  assert.equal(nextPrice(b), 110);
  assert.equal(b.version, 2);
  assert.equal(a.bids.length, 0);
});
test('stale version and low/fractional price are rejected', () => {
  const a = acceptBid(fixture(), 100, buyer, 1, 'one', now);
  assert.throws(() => acceptBid(a, 110, buyer, 1, 'two', now), /vừa thay đổi/);
  for (const price of [109, 110.5, NaN, Infinity])
    assert.throws(() => acceptBid(a, price, buyer, 2, 'two', now));
});
test('replaying request is idempotent; reusing key with changed payload is rejected', () => {
  const a = acceptBid(fixture(), 100, buyer, 1, 'one', now);
  assert.equal(acceptBid(a, 100, buyer, 1, 'one', now).bids.length, 1);
  assert.throws(() => acceptBid(a, 110, buyer, 2, 'one', now), /đã được sử dụng/);
});
test('Admin, inactive Buyer and closed auctions cannot bid', () => {
  for (const actor of [
    { ...buyer, role: 'ADMIN' },
    { ...buyer, status: 'INACTIVE' },
  ])
    assert.throws(() => acceptBid(fixture(), 100, actor, 1, 'one', now));
  assert.throws(() => acceptBid(fixture(), 100, buyer, 1, 'one', now + 1000), /không nhận giá/);
  assert.throws(() => acceptBid({ ...fixture(), status: 'CANCELLED' }, 100, buyer, 1, 'one', now));
});
test('creation enforces future start and SRS default duration bounds', () => {
  const input = {
    productId: 'p',
    startingPrice: 100,
    increment: 10,
    startAt: now + 1000,
    endAt: now + 1000 + 3600000,
  };
  assert.doesNotThrow(() => validateAuction(input, now));
  assert.throws(() => validateAuction({ ...input, startAt: now }, now));
  assert.throws(() => validateAuction({ ...input, endAt: input.startAt + 3599999 }, now));
  assert.throws(() => validateAuction({ ...input, endAt: input.startAt + 168 * 3600000 + 1 }, now));
});

// Management mutations must enforce the same role boundary as the UI.
test('admin management rejects missing actor and buyer role', async () => {
  const { assertAuctionAdmin } = await import('./auction.api');
  assert.throws(() => assertAuctionAdmin(undefined, 'AUCTION.CREATE'));
  assert.throws(() =>
    assertAuctionAdmin({ id: 'buyer', role: 'BUYER', status: 'ACTIVE' }, 'AUCTION.CREATE'),
  );
  assert.throws(() =>
    assertAuctionAdmin({ id: 'admin', role: 'ADMIN', status: 'SUSPENDED' }, 'AUCTION.CREATE'),
  );
  assert.throws(() =>
    assertAuctionAdmin(
      { id: 'admin', role: 'ADMIN', status: 'ACTIVE', permissions: [] },
      'AUCTION.CREATE',
    ),
  );
  assert.doesNotThrow(() =>
    assertAuctionAdmin(
      { id: 'admin', role: 'ADMIN', status: 'ACTIVE', permissions: ['AUCTION.CREATE'] },
      'AUCTION.CREATE',
    ),
  );
});

test('management persists create/edit/cancel, rejects duplicate product and stale edits', async () => {
  const { auctionApi } = await import('./auction.api');
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const previousEnv = process.env.NODE_ENV;
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
    },
  });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: new EventTarget() });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
  Reflect.set(process.env, 'NODE_ENV', 'development');
  try {
    const admin = { id: 'admin-test', role: 'ADMIN', status: 'ACTIVE' };
    const product = (await auctionApi.products()).find((p) => p.mode === 'fixed')!;
    const input = {
      productId: product.id,
      startingPrice: 1000000,
      increment: 100000,
      startAt: Date.now() + 86400000,
      endAt: Date.now() + 172800000,
    };
    const created = await auctionApi.save(input, undefined, undefined, admin);
    assert.equal((await auctionApi.detail(created.id)).auction.startingPrice, 1000000);
    await assert.rejects(() => auctionApi.save(input, undefined, undefined, admin), /một phiên/);
    const edited = await auctionApi.save(
      { ...input, startingPrice: 1200000 },
      created.id,
      created.version,
      admin,
    );
    assert.equal((await auctionApi.detail(created.id)).auction.startingPrice, 1200000);
    await assert.rejects(
      () => auctionApi.save(input, created.id, created.version, admin),
      /Chỉ sửa/,
    );
    await assert.rejects(() => auctionApi.cancel(created.id, ' ', edited.version, admin), /lý do/);
    await auctionApi.cancel(created.id, 'Sản phẩm cần kiểm tra lại', edited.version, admin);
    assert.equal((await auctionApi.detail(created.id)).auction.status, 'CANCELLED');
    await assert.rejects(
      () => auctionApi.save(input, created.id, edited.version + 1, admin),
      /Chỉ sửa/,
    );
  } finally {
    for (const [key, descriptor] of [
      ['localStorage', previousStorage],
      ['window', previousWindow],
      ['navigator', previousNavigator],
    ] as const) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    if (previousEnv === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV');
    else Reflect.set(process.env, 'NODE_ENV', previousEnv);
  }
});
