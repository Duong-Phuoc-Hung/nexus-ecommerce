import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryAuctionRepository } from './InMemoryAuctionRepository';

test('demo auction references the seeded Catalog product ID', async () => {
  const repository = new InMemoryAuctionRepository();
  const [auction] = await repository.findActiveAuctions();

  assert.ok(auction);
  assert.equal(auction.productId, '1');
});
