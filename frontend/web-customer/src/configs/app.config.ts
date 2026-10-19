const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_API_URL?.trim() ||
  'http://localhost:4000/api/v1';

const timeoutValue = process.env.NEXT_PUBLIC_API_TIMEOUT_MS?.trim();
const apiTimeoutMs = timeoutValue ? Number(timeoutValue) : 10_000;

const source = process.env.NEXT_PUBLIC_CATALOG_SOURCE || 'mock';
if (!['api', 'mock'].includes(source))
  throw new Error('NEXT_PUBLIC_CATALOG_SOURCE must be api or mock.');

export const appConfig = {
  api: {
    baseUrl: apiBaseUrl,
    timeoutMs: Number.isFinite(apiTimeoutMs) && apiTimeoutMs > 0 ? apiTimeoutMs : 10_000,
  },
  catalogSource: source as 'api' | 'mock',
} as const;
