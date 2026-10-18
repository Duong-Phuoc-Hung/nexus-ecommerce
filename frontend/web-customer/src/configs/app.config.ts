const source = process.env.NEXT_PUBLIC_CATALOG_SOURCE || 'mock';
if (!['api', 'mock'].includes(source))
  throw new Error('NEXT_PUBLIC_CATALOG_SOURCE must be api or mock.');
const timeout = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS || 10000);
if (!Number.isFinite(timeout) || timeout <= 0)
  throw new Error('NEXT_PUBLIC_API_TIMEOUT_MS must be positive.');
export const appConfig = {
  api: {
    baseUrl:
      process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
      process.env.NEXT_PUBLIC_API_URL?.trim() ||
      'http://localhost:4000/api/v1',
    timeoutMs: timeout,
  },
  catalogSource: source as 'api' | 'mock',
} as const;
