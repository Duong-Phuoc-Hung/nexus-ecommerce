/**
 * =============================================================================
 * Project Nexus - Auction Service (Bounded Context SRS 3.5)
 * Infrastructure Layer: Redis Configuration Provider
 * =============================================================================
 * Quản lý đọc và thẩm định (validation) cấu hình Redis từ biến môi trường.
 * Cung cấp thông báo lỗi chi tiết, dễ chẩn đoán khi thiếu hoặc sai cấu hình.
 */

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  timeoutMs: number;
  pingTimeoutMs?: number;
  url?: string;
}

export class RedisConfigError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly receivedValue?: unknown,
  ) {
    super(`[RedisConfigError] ${message}`);
    this.name = 'RedisConfigError';
  }
}

/**
 * Đọc và thẩm định cấu hình Redis từ Environment Variables
 * @throws {RedisConfigError} nếu cấu hình không hợp lệ hoặc thiếu thông số cần thiết
 */
export function loadRedisConfigFromEnv(env: NodeJS.ProcessEnv = process.env): RedisConfig {
  const url = env.REDIS_URL?.trim();

  let parsedHostFromUrl: string | undefined;
  let parsedPortFromUrl: string | undefined;
  let parsedPasswordFromUrl: string | undefined;

  // Nếu có truyền REDIS_URL, kiểm tra định dạng nghiêm ngặt
  if (url) {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'redis:' && parsedUrl.protocol !== 'rediss:') {
        throw new Error('Protocol phải là "redis:" hoặc "rediss:"');
      }
      if (!parsedUrl.hostname) {
        throw new Error('URL thiếu hostname');
      }
      parsedHostFromUrl = parsedUrl.hostname;
      if (parsedUrl.port) {
        parsedPortFromUrl = parsedUrl.port;
      }
      if (parsedUrl.password) {
        parsedPasswordFromUrl = decodeURIComponent(parsedUrl.password);
      }
    } catch {
      throw new RedisConfigError(
        `Biến môi trường REDIS_URL không đúng định dạng URL chuẩn: "${url}". Ví dụ hợp lệ: redis://localhost:6379`,
        'REDIS_URL',
        url,
      );
    }
  }

  // 1. Phân tích Host
  const host = env.REDIS_HOST?.trim() || parsedHostFromUrl || 'localhost';

  if (!host || host.length === 0) {
    throw new RedisConfigError('REDIS_HOST không được để trống.', 'REDIS_HOST', host);
  }

  // 2. Phân tích Port
  const portRaw = env.REDIS_PORT?.trim() || parsedPortFromUrl;
  const port = portRaw ? parseInt(portRaw, 10) : 6379;
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new RedisConfigError(
      `REDIS_PORT không hợp lệ: "${portRaw}". Cổng phải là số nguyên nằm trong khoảng từ 1 đến 65535.`,
      'REDIS_PORT',
      portRaw,
    );
  }

  // 3. Phân tích Password
  let password = env.REDIS_PASSWORD?.trim() || parsedPasswordFromUrl;
  if (!password) {
    password = undefined; // local dev không mật khẩu
  }

  // 4. Phân tích Timeout
  const timeoutRaw = env.REDIS_TIMEOUT?.trim() || env.REDIS_CONNECT_TIMEOUT_MS?.trim();
  const timeoutMs = timeoutRaw ? parseInt(timeoutRaw, 10) : 5000;
  if (isNaN(timeoutMs) || timeoutMs <= 0) {
    throw new RedisConfigError(
      `REDIS_TIMEOUT không hợp lệ: "${timeoutRaw}". Thời gian chờ phải là số nguyên dương (đơn vị mili-giây, ví dụ: 5000).`,
      'REDIS_TIMEOUT',
      timeoutRaw,
    );
  }

  // 5. Phân tích Ping Timeout (SCRUM-41: Giới hạn thời gian ping để endpoint không bị treo)
  const pingTimeoutRaw = env.REDIS_PING_TIMEOUT_MS?.trim();
  const pingTimeoutMs = pingTimeoutRaw ? parseInt(pingTimeoutRaw, 10) : 1500;
  if (pingTimeoutRaw && (isNaN(pingTimeoutMs) || pingTimeoutMs <= 0)) {
    throw new RedisConfigError(
      `REDIS_PING_TIMEOUT_MS không hợp lệ: "${pingTimeoutRaw}". Thời gian chờ ping phải là số nguyên dương (đơn vị mili-giây, ví dụ: 1500).`,
      'REDIS_PING_TIMEOUT_MS',
      pingTimeoutRaw,
    );
  }

  return {
    host,
    port,
    password,
    timeoutMs,
    pingTimeoutMs,
    url: url || `redis://${host}:${port}`,
  };
}
