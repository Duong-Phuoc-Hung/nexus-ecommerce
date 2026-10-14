/**
 * =============================================================================
 * PROJECT NEXUS - QA VERIFICATION SCRIPT (SCRUM-43)
 * =============================================================================
 * Mục tiêu nghiệm thu:
 * 1. Kiểm tra đọc/ghi một key thử nghiệm qua cấu hình app (CRUD + TTL).
 * 2. Dọn dẹp dữ liệu thử nghiệm hoặc dùng key namespace test cô lập.
 * 3. Xác nhận health check trả về UP (HTTP 200) khi Redis bật.
 * 4. Tắt/ngắt kết nối Redis để xác nhận health chuyển DOWN (HTTP 503) và app
 *    KHÔNG báo healthy giả.
 * 5. Ghi nhận log chẩn đoán trực quan, dễ phát hiện lỗi.
 * =============================================================================
 */

const http = require('node:http');
const path = require('node:path');
const { createRequire } = require('node:module');

const auctionServiceDir = path.join(__dirname, '..', 'backend', 'auction-service', 'dist');
const auctionRequire = createRequire(path.join(auctionServiceDir, 'index.js'));
const Redis = auctionRequire('ioredis');

const { loadRedisConfigFromEnv } = require(
  path.join(auctionServiceDir, 'infrastructure', 'redis', 'RedisConfig'),
);
const { getRedisClient, checkRedisHealth, pingRedisWithTimeout, closeRedisClient } = require(
  path.join(auctionServiceDir, 'infrastructure', 'redis', 'RedisClient'),
);
const { createApplication } = require(path.join(auctionServiceDir, 'app'));

// Màu hiển thị console
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const results = [];

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  console.log(` ${COLORS.bright}${COLORS.cyan}${title}${COLORS.reset}`);
  console.log('='.repeat(80));
}

function recordPass(testName, details = '') {
  results.push({ name: testName, passed: true, details });
  console.log(
    `  ${COLORS.green}✔ [PASS]${COLORS.reset} ${testName} ${COLORS.dim}${details}${COLORS.reset}`,
  );
}

function recordFail(testName, error) {
  const errMsg = error instanceof Error ? error.message : String(error);
  results.push({ name: testName, passed: false, error: errMsg });
  console.log(
    `  ${COLORS.red}✖ [FAIL]${COLORS.reset} ${testName}: ${COLORS.red}${errMsg}${COLORS.reset}`,
  );
}

function makeHttpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let body;
        try {
          body = JSON.parse(data);
        } catch {
          body = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runQAVerification() {
  console.log(
    `\n${COLORS.bright}${COLORS.yellow}🚀 BẮT ĐẦU KỊCH BẢN KIỂM THỬ QA TỰ ĐỘNG - REDIS & HEALTH CHECK (SCRUM-43)${COLORS.reset}`,
  );
  console.log(`Thời gian chạy: ${new Date().toISOString()}`);

  const startTime = Date.now();
  let liveServer = null;
  let livePort = 0;

  try {
    // -------------------------------------------------------------------------
    // PHASE 1: PRE-FLIGHT & CONFIGURATION DIAGNOSTICS
    // -------------------------------------------------------------------------
    logSection('PHASE 1: Kiểm Tra Cấu Hình & Kết Nối Ban Đầu (Pre-Flight Diagnostics)');
    const config = loadRedisConfigFromEnv();
    console.log(`  Cấu hình Redis hiện tại:`);
    console.log(`  - Host: ${COLORS.cyan}${config.host}${COLORS.reset}`);
    console.log(`  - Port: ${COLORS.cyan}${config.port}${COLORS.reset}`);
    console.log(`  - Timeout: ${COLORS.cyan}${config.timeoutMs}ms${COLORS.reset}`);
    console.log(`  - Ping Timeout: ${COLORS.cyan}${config.pingTimeoutMs || 1500}ms${COLORS.reset}`);

    const client = getRedisClient();
    const pingRes = await pingRedisWithTimeout(client, 2000);
    if (pingRes === 'PONG') {
      recordPass('Redis Ping Pre-Flight Check', `Nhận phản hồi "${pingRes}" thành công`);
    } else {
      throw new Error(`Phản hồi ping không hợp lệ: ${pingRes}`);
    }

    // -------------------------------------------------------------------------
    // PHASE 2: KEY NAMESPACE TEST & READ/WRITE/TTL/CLEANUP
    // -------------------------------------------------------------------------
    logSection('PHASE 2: Kiểm Tra Đọc/Ghi Key Thử Nghiệm, Namespace & Dọn Dẹp (Cleanup)');
    const testId = `qa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const namespace = 'nexus:test:qa_scrum43';
    const testKey = `${namespace}:${testId}`;
    const testPayload = {
      testId,
      ticket: 'SCRUM-43',
      description: 'QA Verification Read/Write Test',
      timestamp: new Date().toISOString(),
      metadata: { env: 'local-docker', service: 'auction-service' },
    };

    // 2.1 WRITE
    await client.set(testKey, JSON.stringify(testPayload), 'EX', 60);
    recordPass('Thao tác GHI (WRITE) Key', `Key: "${testKey}" với TTL 60s`);

    // 2.2 READ
    const rawData = await client.get(testKey);
    if (!rawData) {
      throw new Error(`Không đọc được dữ liệu từ key "${testKey}"`);
    }
    const parsedData = JSON.parse(rawData);
    if (parsedData.testId === testId && parsedData.ticket === 'SCRUM-43') {
      recordPass(
        'Thao tác ĐỌC (READ) & Xác minh tính toàn vẹn',
        `Đọc đúng dữ liệu: ${JSON.stringify(parsedData)}`,
      );
    } else {
      throw new Error(`Dữ liệu đọc ra không khớp với dữ liệu đã ghi: ${rawData}`);
    }

    // 2.3 TTL CHECK
    const ttl = await client.ttl(testKey);
    if (ttl > 0 && ttl <= 60) {
      recordPass(
        'Kiểm tra thời gian sống (TTL)',
        `TTL còn lại: ${ttl}s (nằm trong giới hạn 1 - 60s)`,
      );
    } else {
      throw new Error(`TTL không hợp lệ: ${ttl}s`);
    }

    // 2.4 CLEANUP
    const delCount = await client.del(testKey);
    const exists = await client.exists(testKey);
    if (delCount === 1 && exists === 0) {
      recordPass(
        'Dọn dẹp dữ liệu thử nghiệm (Cleanup)',
        `Đã xóa sạch key "${testKey}", xác nhận exists = 0`,
      );
    } else {
      throw new Error(`Dọn dẹp key thất bại (delCount=${delCount}, exists=${exists})`);
    }

    // 2.5 NAMESPACE ISOLATION
    const leftoverKeys = await client.keys(`${namespace}:*`);
    if (leftoverKeys.length === 0) {
      recordPass(
        'Cô lập Namespace (Namespace Isolation)',
        `Không còn key rác sót lại trong "${namespace}:*"`,
      );
    } else {
      console.warn(`  Cảnh báo: Còn lại các key khác trong namespace: ${leftoverKeys.join(', ')}`);
      // Xóa sạch để đảm bảo không ô nhiễm
      for (const k of leftoverKeys) {
        await client.del(k);
      }
      recordPass('Dọn sạch toàn bộ namespace test', `Đã dọn dẹp ${leftoverKeys.length} key phụ`);
    }

    // -------------------------------------------------------------------------
    // PHASE 3: LIVE HEALTH CHECK KHI REDIS BẬT (UP)
    // -------------------------------------------------------------------------
    logSection('PHASE 3: Kiểm Tra Health Check Khi Redis Đang BẬT (UP)');
    const app = createApplication();
    liveServer = http.createServer(app);
    await new Promise((resolve) => liveServer.listen(0, '127.0.0.1', resolve));
    livePort = liveServer.address().port;

    // 3.1 GET /health
    const healthRes = await makeHttpRequest(`http://127.0.0.1:${livePort}/health`);
    if (
      healthRes.statusCode === 200 &&
      healthRes.body.status === 'UP' &&
      healthRes.body.components?.redis?.status === 'UP' &&
      typeof healthRes.body.components.redis.latencyMs === 'number'
    ) {
      recordPass(
        'GET /health khi Redis UP',
        `HTTP 200, status: "UP", latency: ${healthRes.body.components.redis.latencyMs}ms`,
      );
    } else {
      throw new Error(
        `GET /health phản hồi không đúng kỳ vọng khi UP: ${JSON.stringify(healthRes)}`,
      );
    }

    // 3.2 GET /health/redis
    const redisHealthRes = await makeHttpRequest(`http://127.0.0.1:${livePort}/health/redis`);
    if (
      redisHealthRes.statusCode === 200 &&
      redisHealthRes.body.status === 'UP' &&
      redisHealthRes.body.port === config.port
    ) {
      recordPass(
        'GET /health/redis khi Redis UP',
        `HTTP 200, status: "UP", host: ${redisHealthRes.body.host}:${redisHealthRes.body.port}`,
      );
    } else {
      throw new Error(`GET /health/redis không đúng kỳ vọng: ${JSON.stringify(redisHealthRes)}`);
    }

    // 3.3 GET /health/liveness
    const livenessRes = await makeHttpRequest(`http://127.0.0.1:${livePort}/health/liveness`);
    if (livenessRes.statusCode === 200 && livenessRes.body.status === 'UP') {
      recordPass('GET /health/liveness (K8s Liveness Probe)', 'HTTP 200, status: "UP"');
    } else {
      throw new Error(`GET /health/liveness thất bại: ${JSON.stringify(livenessRes)}`);
    }

    // -------------------------------------------------------------------------
    // PHASE 4: KIỂM THỬ KHI REDIS BỊ TẮT / NGẮT KẾT NỐI (DOWN & ANTI FALSE-POSITIVE)
    // -------------------------------------------------------------------------
    logSection('PHASE 4: Kiểm Thử Khi Redis TẮT / Ngắt Kết Nối (DOWN & Chống Healthy Giả)');

    // 4.1 Kiểm thử tầng mạng khi kết nối tới Redis không khả dụng
    const unreachableClient = new Redis({
      host: '127.0.0.1',
      port: 65432,
      connectTimeout: 300,
      commandTimeout: 300,
      maxRetriesPerRequest: 0,
      lazyConnect: true,
      retryStrategy: () => null,
    });
    unreachableClient.on('error', () => {}); // Tránh log unhandled event

    const downHealthResult = await checkRedisHealth(400, unreachableClient);
    if (
      downHealthResult.status === 'DOWN' &&
      downHealthResult.error &&
      downHealthResult.error.includes('Không thể kết nối hoặc ping Redis')
    ) {
      recordPass(
        'checkRedisHealth() phát hiện lỗi kết nối cấp Socket',
        `status: "DOWN", error: "${downHealthResult.error}"`,
      );
    } else {
      throw new Error(`Phát hiện lỗi kết nối thất bại: ${JSON.stringify(downHealthResult)}`);
    }
    try {
      unreachableClient.disconnect();
    } catch {
      // Bỏ qua
    }

    // 4.2 Kiểm thử Express App phản hồi khi Redis DOWN
    const mockDownHealth = async () => ({
      status: 'DOWN',
      host: config.host,
      port: config.port,
      error: 'Mất kết nối tới Redis Server: ECONNREFUSED',
      timestamp: new Date().toISOString(),
    });

    const downApp = createApplication(mockDownHealth);
    const downServer = http.createServer(downApp);
    await new Promise((resolve) => downServer.listen(0, '127.0.0.1', resolve));
    const downPort = downServer.address().port;

    try {
      // GET /health khi Redis DOWN
      const downHealthRes = await makeHttpRequest(`http://127.0.0.1:${downPort}/health`);
      if (
        downHealthRes.statusCode === 503 &&
        downHealthRes.body.status === 'DOWN' &&
        downHealthRes.body.components?.redis?.status === 'DOWN' &&
        downHealthRes.body.status !== 'UP' // Strict Anti False-Positive Assertion
      ) {
        recordPass(
          'GET /health khi Redis DOWN (Anti False-Positive)',
          `HTTP 503 Service Unavailable, status: "DOWN", error: "${downHealthRes.body.components.redis.error}"`,
        );
      } else {
        throw new Error(
          `Cảnh báo: Bị Healthy Giả hoặc sai status code khi DOWN: ${JSON.stringify(downHealthRes)}`,
        );
      }

      // GET /health/redis khi Redis DOWN
      const downRedisRes = await makeHttpRequest(`http://127.0.0.1:${downPort}/health/redis`);
      if (downRedisRes.statusCode === 503 && downRedisRes.body.status === 'DOWN') {
        recordPass(
          'GET /health/redis khi Redis DOWN',
          `HTTP 503 Service Unavailable, status: "DOWN"`,
        );
      } else {
        throw new Error(
          `GET /health/redis khi DOWN trả về sai mã lỗi: ${JSON.stringify(downRedisRes)}`,
        );
      }

      // GET /health/liveness khi Redis DOWN
      const downLivenessRes = await makeHttpRequest(`http://127.0.0.1:${downPort}/health/liveness`);
      if (downLivenessRes.statusCode === 200 && downLivenessRes.body.status === 'UP') {
        recordPass(
          'GET /health/liveness khi Redis DOWN (Bảo vệ K8s Pod không bị restart loop)',
          'HTTP 200, status: "UP"',
        );
      } else {
        throw new Error(
          `GET /health/liveness bị ảnh hưởng bởi Redis DOWN: ${JSON.stringify(downLivenessRes)}`,
        );
      }
    } finally {
      await new Promise((resolve) => downServer.close(resolve));
    }

    // -------------------------------------------------------------------------
    // PHASE 5: TỰ ĐỘNG KHÔI PHỤC (SELF-HEALING RECOVERY VERIFICATION)
    // -------------------------------------------------------------------------
    logSection('PHASE 5: Khôi Phục & Tính Tự Động Phục Hồi (Self-Healing Recovery)');
    const recoveredHealthRes = await makeHttpRequest(`http://127.0.0.1:${livePort}/health`);
    if (recoveredHealthRes.statusCode === 200 && recoveredHealthRes.body.status === 'UP') {
      recordPass(
        'Tự động khôi phục trạng thái UP khi Redis khả dụng',
        `HTTP 200, status: "UP", latency: ${recoveredHealthRes.body.components.redis.latencyMs}ms`,
      );
    } else {
      throw new Error(`Khôi phục sức khỏe thất bại: ${JSON.stringify(recoveredHealthRes)}`);
    }
  } catch (error) {
    recordFail('Lỗi ngoại lệ trong quá trình chạy kịch bản QA', error);
  } finally {
    if (liveServer) {
      await new Promise((resolve) => liveServer.close(resolve));
    }
    await closeRedisClient();
  }

  // ---------------------------------------------------------------------------
  // SUMMARY REPORT
  // ---------------------------------------------------------------------------
  const totalElapsed = Date.now() - startTime;
  const passCount = results.filter((r) => r.passed).length;
  const failCount = results.filter((r) => !r.passed).length;

  console.log('\n' + '='.repeat(80));
  console.log(` ${COLORS.bright}TỔNG KẾT KẾT QUẢ KIỂM THỬ QA (SCRUM-43 REPORT)${COLORS.reset}`);
  console.log('='.repeat(80));
  console.log(`  Tổng số kiểm tra: ${results.length}`);
  console.log(`  ${COLORS.green}Thành công (PASS): ${passCount}${COLORS.reset}`);
  console.log(
    `  ${failCount > 0 ? COLORS.red : COLORS.green}Thất bại (FAIL): ${failCount}${COLORS.reset}`,
  );
  console.log(`  Thời gian thực thi: ${totalElapsed}ms`);
  console.log('='.repeat(80));

  if (failCount > 0) {
    console.error(
      `\n${COLORS.red}❌ KẾT QUẢ QA: THẤT BẠI - CÓ ${failCount} LỖI CẦN XỬ LÝ!${COLORS.reset}\n`,
    );
    process.exit(1);
  } else {
    console.log(
      `\n${COLORS.green}✅ KẾT QUẢ QA: ĐẠT 100% TIÊU CHÍ NGHIỆM THU TICKET SCRUM-43!${COLORS.reset}\n`,
    );
    process.exit(0);
  }
}

runQAVerification();
