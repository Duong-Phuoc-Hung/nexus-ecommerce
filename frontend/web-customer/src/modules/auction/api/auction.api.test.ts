import assert from 'node:assert/strict';
import test from 'node:test';
import { acceptBid, lifecycle, nextPrice, validateAuction, type Auction } from './auction.api';
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
