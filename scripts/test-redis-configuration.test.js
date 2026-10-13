/**
 * =============================================================================
 * Project Nexus - Test Suite: Cấu hình Redis qua Biến Môi Trường (SCRUM-32)
 * =============================================================================
 * Xác minh:
 * 1. Khởi tạo cấu hình an toàn từ biến môi trường (.env)
 * 2. Bắt lỗi cấu hình sai/thiếu với thông báo chẩn đoán trực quan
 * 3. Kết nối thực tế tới container Redis trong Docker Compose (PING PONG)
 * 4. Tích hợp Health Check endpoint (/health, /health/redis)
 */

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const http = require('node:http');

const auctionServiceDir = path.join(__dirname, '..', 'backend', 'auction-service', 'dist');
const { loadRedisConfigFromEnv, RedisConfigError } = require(
  path.join(auctionServiceDir, 'infrastructure', 'redis', 'RedisConfig'),
);

const { getRedisClient, checkRedisHealth, closeRedisClient } = require(
  path.join(auctionServiceDir, 'infrastructure', 'redis', 'RedisClient'),
);

const { createApplication } = require(path.join(auctionServiceDir, 'app'));

describe('🎯 [SCRUM-32] Redis Configuration & Connection Test Suite', () => {
  after(async () => {
    await closeRedisClient();
  });

  // ---------------------------------------------------------------------------
  // SUITE 1: ĐỌC VÀ THẨM ĐỊNH CẤU HÌNH TỪ ENVIRONMENT VARIABLES
  // ---------------------------------------------------------------------------
  describe('1. Environment Variables Configuration Parsing', () => {
    test('đọc giá trị mặc định an toàn khi không truyền env vars', () => {
      const config = loadRedisConfigFromEnv({});
      assert.strictEqual(config.host, 'localhost', 'Mặc định host phải là localhost');
      assert.strictEqual(config.port, 6379, 'Mặc định port phải là 6379');
      assert.strictEqual(config.password, undefined, 'Mặc định password không được hardcode');
      assert.strictEqual(config.timeoutMs, 5000, 'Mặc định timeout là 5000ms');
    });

    test('đọc chính xác cấu hình tùy chỉnh từ các biến môi trường', () => {
      const mockEnv = {
        REDIS_HOST: '127.0.0.1',
        REDIS_PORT: '6380',
        REDIS_PASSWORD: 'super_secret_redis_pass',
        REDIS_TIMEOUT: '3000',
      };

      const config = loadRedisConfigFromEnv(mockEnv);
      assert.strictEqual(config.host, '127.0.0.1');
      assert.strictEqual(config.port, 6380);
      assert.strictEqual(config.password, 'super_secret_redis_pass');
      assert.strictEqual(config.timeoutMs, 3000);
    });

    test('hỗ trợ phân tích chuỗi REDIS_URL chuẩn', () => {
      const mockEnv = {
        REDIS_URL: 'redis://:mypassword@redis-cluster.internal:6388',
      };

      const config = loadRedisConfigFromEnv(mockEnv);
      assert.strictEqual(config.host, 'redis-cluster.internal');
      assert.strictEqual(config.port, 6388);
      assert.strictEqual(config.password, 'mypassword');
    });
  });

  // ---------------------------------------------------------------------------
  // SUITE 2: CHẨN ĐOÁN LỖI KHI CẤU HÌNH SAI HOẶC THIẾU
  // ---------------------------------------------------------------------------
  describe('2. Error Diagnostics on Invalid Configuration', () => {
    test('ném lỗi chẩn đoán rõ ràng khi REDIS_PORT không phải số hợp lệ', () => {
      assert.throws(
        () => loadRedisConfigFromEnv({ REDIS_PORT: 'invalid_port_abc' }),
        (err) => {
          assert.ok(err instanceof RedisConfigError);
          assert.match(err.message, /REDIS_PORT không hợp lệ/);
          assert.strictEqual(err.field, 'REDIS_PORT');
          return true;
        },
      );
    });

    test('ném lỗi chẩn đoán khi REDIS_PORT nằm ngoài dải 1 - 65535', () => {
      assert.throws(
        () => loadRedisConfigFromEnv({ REDIS_PORT: '99999' }),
        (err) => {
          assert.ok(err instanceof RedisConfigError);
          assert.match(err.message, /khoảng từ 1 đến 65535/);
          return true;
        },
      );
    });

    test('ném lỗi chẩn đoán khi REDIS_TIMEOUT là số âm hoặc bằng 0', () => {
      assert.throws(
        () => loadRedisConfigFromEnv({ REDIS_TIMEOUT: '-100' }),
        (err) => {
          assert.ok(err instanceof RedisConfigError);
          assert.match(err.message, /REDIS_TIMEOUT không hợp lệ/);
          return true;
        },
      );
    });

    test('ném lỗi chẩn đoán khi REDIS_URL sai định dạng', () => {
      assert.throws(
        () => loadRedisConfigFromEnv({ REDIS_URL: 'not-a-valid-url://' }),
        (err) => {
          assert.ok(err instanceof RedisConfigError);
          assert.match(err.message, /REDIS_URL không đúng định dạng/);
          return true;
        },
      );
    });
  });

  // ---------------------------------------------------------------------------
  // SUITE 3: KẾT NỐI THỰC TẾ VỚI DOCKER COMPOSE REDIS (PING - PONG)
  // ---------------------------------------------------------------------------
  describe('3. Real Redis Connectivity (Docker Compose Integration)', () => {
    test('checkRedisHealth() kết nối thành công và nhận phản hồi PONG từ container nexus-redis', async () => {
      const health = await checkRedisHealth();
      assert.strictEqual(health.status, 'UP', `Redis phải ở trạng thái UP: ${health.error}`);
      assert.strictEqual(health.port, 6379);
      assert.ok(typeof health.latencyMs === 'number', 'Phải có thời gian trễ latencyMs');
      assert.ok(health.latencyMs < 1000, 'Thời gian phản hồi PING phải nhỏ hơn 1000ms');
    });

    test('thực hiện thao tác SET và GET dữ liệu qua Redis Client thành công', async () => {
      const client = getRedisClient();
      const testKey = 'nexus:scrum32:test_key';
      const testValue = `ok_${Date.now()}`;

      await client.set(testKey, testValue, 'EX', 10);
      const readValue = await client.get(testKey);

      assert.strictEqual(
        readValue,
        testValue,
        'Giá trị đọc từ Redis phải trùng khớp với giá trị ghi',
      );
      await client.del(testKey);
    });
  });

  // ---------------------------------------------------------------------------
  // SUITE 4: TÍCH HỢP HEALTHCHECK ENDPOINTS TRONG ỨNG DỤNG
  // ---------------------------------------------------------------------------
  describe('4. Application /health and /health/redis Endpoints', () => {
    let server;
    let testPort;

    before(async () => {
      const app = createApplication();
      server = http.createServer(app);
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      testPort = server.address().port;
    });

    after(async () => {
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
    });

    test('GET /health trả về status UP và thông tin boundedContext chuẩn SRS', async () => {
      const res = await new Promise((resolve, reject) => {
        http
          .get(`http://127.0.0.1:${testPort}/health`, (response) => {
            let data = '';
            response.on('data', (c) => (data += c));
            response.on('end', () =>
              resolve({ status: response.statusCode, body: JSON.parse(data) }),
            );
          })
          .on('error', reject);
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'UP');
      assert.strictEqual(res.body.service, 'auction-service');
      assert.ok(res.body.boundedContext);
    });

    test('GET /health/redis trả về HTTP 200 kèm latencyMs chi tiết', async () => {
      const res = await new Promise((resolve, reject) => {
        http
          .get(`http://127.0.0.1:${testPort}/health/redis`, (response) => {
            let data = '';
            response.on('data', (c) => (data += c));
            response.on('end', () =>
              resolve({ status: response.statusCode, body: JSON.parse(data) }),
            );
          })
          .on('error', reject);
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'UP');
      assert.strictEqual(res.body.port, 6379);
      assert.ok(res.body.latencyMs >= 0);
    });
  });
});
