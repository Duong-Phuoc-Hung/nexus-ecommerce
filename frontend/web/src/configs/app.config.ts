const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_API_URL?.trim() ||
  'http://localhost:4000/api/v1';

const timeoutValue = process.env.NEXT_PUBLIC_API_TIMEOUT_MS?.trim();
const apiTimeoutMs = timeoutValue ? Number(timeoutValue) : 10_000;

// Catalog and auction listing/detail already have live endpoints. Keep the old
// mock adapters for tests and unfinished admin actions, but disable runtime switches.
// const source = process.env.NEXT_PUBLIC_CATALOG_SOURCE || 'api';
// const auctionSource = process.env.NEXT_PUBLIC_AUCTION_SOURCE || 'api';
const source = 'api';
const auctionSource = 'api';

export const appConfig = {
  api: {
    baseUrl: apiBaseUrl,
    timeoutMs: Number.isFinite(apiTimeoutMs) && apiTimeoutMs > 0 ? apiTimeoutMs : 10_000,
  },
  catalogSource: source as 'api' | 'mock',
  auctionSource: auctionSource as 'api' | 'mock',
} as const;
