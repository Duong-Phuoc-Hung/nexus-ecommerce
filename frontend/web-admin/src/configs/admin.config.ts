const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

if (!apiBaseUrl) {
  throw new Error(
    'NEXT_PUBLIC_API_BASE_URL is required. Copy .env.example to .env.local and configure it.',
  );
}

const timeoutValue = process.env.NEXT_PUBLIC_API_TIMEOUT_MS?.trim();
const apiTimeoutMs = timeoutValue ? Number(timeoutValue) : 10_000;

if (!Number.isFinite(apiTimeoutMs) || apiTimeoutMs <= 0) {
  throw new Error('NEXT_PUBLIC_API_TIMEOUT_MS must be a positive number.');
}

export const adminConfig = {
  api: {
    baseUrl: apiBaseUrl,
    timeoutMs: apiTimeoutMs,
  },
} as const;
