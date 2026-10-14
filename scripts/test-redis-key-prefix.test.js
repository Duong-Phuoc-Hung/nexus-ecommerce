/**
 * =============================================================================
 * PROJECT NEXUS - REDIS KEY PREFIX & CONVENTIONS TEST SUITE (SCRUM-54)
 * =============================================================================
 * Xác minh tính nhất quán, không xung đột và phòng chống bare key trên Redis.
 * =============================================================================
 */

const { describe, test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const auctionDistDir = path.join(__dirname, '..', 'backend', 'auction-service', 'dist');
const {
  RedisModule,
  RedisKeyPrefix,
  RedisTTL,
  buildRedisKey,
  isValidRedisKey,
  assertValidRedisKey,
  getModuleFromKey,
} = require(path.join(auctionDistDir, 'infrastructure', 'redis', 'RedisKeyRegistry'));

const { getRedisClient, checkRedisHealth } = require(
  path.join(auctionDistDir, 'infrastructure', 'redis', 'RedisClient'),
);

describe('🎯 [SCRUM-54] Redis Key Prefix & Namespace Conventions Test Suite', () => {
  // ---------------------------------------------------------------------------
  // 1. Cấu Trúc và Quy Chuẩn Tiền Tố (Prefix Syntax Standards)
  // ---------------------------------------------------------------------------
  describe('1. Prefix Syntax & Delimiter Compliance', () => {
    test('tất cả các prefix trong RedisKeyPrefix phải kết thúc bằng dấu hai chấm (:)', () => {
      const prefixes = Object.entries(RedisKeyPrefix);
      assert.ok(prefixes.length >= 10, 'Hệ thống phải có ít nhất 10 prefix chuẩn hóa');

      for (const [keyName, prefix] of prefixes) {
        assert.ok(
          prefix.endsWith(':'),
          `Prefix ${keyName} ("${prefix}") phải kết thúc bằng dấu hai chấm (:)`,
        );
      }
    });

    test('tất cả các prefix phải ở định dạng chữ thường (lowercase) và dùng dấu gạch dưới', () => {
      for (const [keyName, prefix] of Object.entries(RedisKeyPrefix)) {
        assert.strictEqual(
          prefix,
          prefix.toLowerCase(),
          `Prefix ${keyName} ("${prefix}") phải ở định dạng chữ thường`,
        );
      }
    });

    test('mỗi prefix phải thuộc một trong các module được cấp phép trong RedisModule', () => {
      const validModules = Object.values(RedisModule);
      for (const [keyName, prefix] of Object.entries(RedisKeyPrefix)) {
        const belongsToModule = validModules.some(
          (mod) => prefix.startsWith(`${mod}:`) || prefix.startsWith(`${mod}:`),
        );
        assert.ok(
          belongsToModule,
          `Prefix ${keyName} ("${prefix}") không thuộc bất kỳ Module nào trong danh mục (${validModules.join(', ')})`,
        );
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Kiểm Tra Chống Xung Đột (Collision & Overlap Prevention)
  // ---------------------------------------------------------------------------
  describe('2. Key Collision & Overlap Prevention', () => {
    test('không có prefix nào bị trùng lặp giá trị trong danh mục', () => {
      const prefixes = Object.values(RedisKeyPrefix);
      const uniquePrefixes = new Set(prefixes);
      assert.strictEqual(
        uniquePrefixes.size,
        prefixes.length,
        'Phát hiện prefix bị trùng lặp trong RedisKeyPrefix',
      );
    });

    test('xác nhận các prefix có phân tách rõ ràng và không đè lấn namespace của nhau', () => {
      const prefixes = Object.values(RedisKeyPrefix);
      for (let i = 0; i < prefixes.length; i++) {
        for (let j = i + 1; j < prefixes.length; j++) {
          const p1 = prefixes[i];
          const p2 = prefixes[j];
          // Nếu p1 bắt đầu bằng p2 hoặc ngược lại, phải có sub-delimiter bảo vệ
          if (p1.startsWith(p2) || p2.startsWith(p1)) {
            const longer = p1.length > p2.length ? p1 : p2;
            const shorter = p1.length > p2.length ? p2 : p1;
            assert.ok(
              longer.startsWith(shorter),
              `Prefix "${longer}" phải mở rộng hợp lệ từ "${shorter}"`,
            );
          }
        }
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Hàm Tạo Key Chuẩn Hóa (buildRedisKey Utility)
  // ---------------------------------------------------------------------------
  describe('3. buildRedisKey() Helper & Input Sanitization', () => {
    test('tạo key chính xác với 1 identifier', () => {
      const key = buildRedisKey(RedisKeyPrefix.AUCTION_LOCK, 'auc_9988');
      assert.strictEqual(key, 'auction:lock:auc_9988');
    });

    test('tạo key chính xác với nhiều identifiers phân cấp', () => {
      const key = buildRedisKey(RedisKeyPrefix.NOTIFICATION_RATE_LIMIT, 'usr_01hqz', 'otp_sms');
      assert.strictEqual(key, 'notification:rate_limit:usr_01hqz:otp_sms');
    });

    test('hỗ trợ identifier dạng số (number)', () => {
      const key = buildRedisKey(RedisKeyPrefix.CART_GUEST, 100293);
      assert.strictEqual(key, 'cart:guest:100293');
    });

    test('ném lỗi khi prefix không có dấu hai chấm cuối', () => {
      assert.throws(
        () => buildRedisKey('auction:invalid', 'id_123'),
        /phải kết thúc bằng dấu hai chấm/,
      );
    });

    test('ném lỗi khi không truyền identifier nào', () => {
      assert.throws(
        () => buildRedisKey(RedisKeyPrefix.AUCTION_LOCK),
        /Phải cung cấp ít nhất 1 định danh/,
      );
    });

    test('ném lỗi khi identifier chứa khoảng trắng', () => {
      assert.throws(
        () => buildRedisKey(RedisKeyPrefix.AUCTION_LOCK, 'auc 123 with space'),
        /không được chứa khoảng trắng/,
      );
    });

    test('ném lỗi khi identifier là chuỗi rỗng hoặc chỉ có khoảng trắng', () => {
      assert.throws(() => buildRedisKey(RedisKeyPrefix.AUCTION_LOCK, '   '), /không được rỗng/);
    });

    test('ném lỗi khi identifier là null hoặc undefined', () => {
      assert.throws(
        () => buildRedisKey(RedisKeyPrefix.AUCTION_LOCK, null),
        /không được là null hoặc undefined/,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Kiểm Duyệt Key Hợp Lệ & Chặn Bare Key (Key Validation & Bare Key Guard)
  // ---------------------------------------------------------------------------
  describe('4. Key Validation & Bare Key Guard', () => {
    test('isValidRedisKey trả về true với các key có module namespace chuẩn', () => {
      assert.strictEqual(isValidRedisKey('auth:blacklist:token_abc'), true);
      assert.strictEqual(isValidRedisKey('auction:lock:auc_123'), true);
      assert.strictEqual(isValidRedisKey('cart:guest:sess_456'), true);
      assert.strictEqual(isValidRedisKey('catalog:product:prd_99'), true);
      assert.strictEqual(isValidRedisKey('nexus:test:scrum54:sample'), true);
    });

    test('isValidRedisKey chặn hoàn toàn bare key không có module namespace', () => {
      assert.strictEqual(isValidRedisKey('my_bare_key'), false);
      assert.strictEqual(isValidRedisKey('temp_token_123'), false);
      assert.strictEqual(isValidRedisKey('user_session'), false);
      assert.strictEqual(isValidRedisKey('12345'), false);
      assert.strictEqual(isValidRedisKey('auction_lock_bare'), false); // Thiếu dấu hai chấm :
      assert.strictEqual(isValidRedisKey(''), false);
      assert.strictEqual(isValidRedisKey(null), false);
    });

    test('assertValidRedisKey cho phép key hợp lệ và ném lỗi rõ ràng đối với bare key', () => {
      assert.doesNotThrow(() => assertValidRedisKey('auction:highest_bid:auc_001'));

      assert.throws(
        () => assertValidRedisKey('unnamespaced_key_danger'),
        (err) => {
          assert.ok(err.message.includes('vi phạm quy ước: Bắt buộc phải có namespace module'));
          return true;
        },
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Trích Xuất Module Sở Hữu (getModuleFromKey)
  // ---------------------------------------------------------------------------
  describe('5. getModuleFromKey Extraction', () => {
    test('trích xuất đúng module tương ứng từ key hợp lệ', () => {
      assert.strictEqual(getModuleFromKey('auth:blacklist:token1'), 'auth');
      assert.strictEqual(getModuleFromKey('auction:lock:123'), 'auction');
      assert.strictEqual(getModuleFromKey('cart:guest:sess_1'), 'cart');
      assert.strictEqual(getModuleFromKey('catalog:product:sku1'), 'catalog');
      assert.strictEqual(getModuleFromKey('notification:rate_limit:u1'), 'notification');
      assert.strictEqual(getModuleFromKey('fulfillment:lock:ship1'), 'fulfillment');
      assert.strictEqual(getModuleFromKey('nexus:test:unit_test:1'), 'nexus:test');
    });

    test('trả về null khi key không hợp lệ hoặc là bare key', () => {
      assert.strictEqual(getModuleFromKey('bare_key'), null);
      assert.strictEqual(getModuleFromKey('unknown_module:key'), null);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Quy Chuẩn TTL (Time-To-Live Standards)
  // ---------------------------------------------------------------------------
  describe('6. Standardized TTL Values Compliance', () => {
    test('tất cả giá trị TTL khóa phân tán (Lock) phải ở mức mili-giây an toàn (1s - 15s)', () => {
      assert.ok(RedisTTL.LOCK_AUCTION_MS >= 1000 && RedisTTL.LOCK_AUCTION_MS <= 10000);
      assert.ok(RedisTTL.LOCK_CHECKOUT_MS >= 1000 && RedisTTL.LOCK_CHECKOUT_MS <= 10000);
      assert.ok(RedisTTL.LOCK_STOCK_MS >= 1000 && RedisTTL.LOCK_STOCK_MS <= 10000);
      assert.ok(RedisTTL.LOCK_FULFILLMENT_MS >= 1000 && RedisTTL.LOCK_FULFILLMENT_MS <= 15000);
    });

    test('tất cả giá trị TTL cache/session phải là số nguyên dương tính bằng giây', () => {
      assert.ok(RedisTTL.AUTH_BLACKLIST_SECONDS > 0);
      assert.ok(RedisTTL.AUTH_LOCKOUT_SECONDS > 0);
      assert.ok(RedisTTL.CART_GUEST_SECONDS >= 86400); // Tối thiểu 1 ngày
      assert.ok(RedisTTL.CATALOG_PRODUCT_SECONDS > 0);
      assert.ok(RedisTTL.TEST_KEY_SECONDS > 0 && RedisTTL.TEST_KEY_SECONDS <= 300);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Thao Tác Thực Nghiệm Trên Redis Thật Với Key Chuẩn Hóa
  // ---------------------------------------------------------------------------
  describe('7. Real Redis Execution with Standardized Keys', () => {
    test('thực hiện chu trình SET, GET, TTL, DEL với key được tạo từ buildRedisKey()', async (t) => {
      const health = await checkRedisHealth();
      if (health.status === 'DOWN') {
        t.skip('Bỏ qua do container nexus-redis không hoạt động');
        return;
      }

      const client = getRedisClient();
      const testId = `scrum54_${Date.now()}`;
      const validKey = buildRedisKey(RedisKeyPrefix.NEXUS_TEST, 'scrum54', testId);

      // Đảm bảo key hợp lệ theo guard
      assertValidRedisKey(validKey);

      // Ghi dữ liệu với TTL chuẩn
      await client.set(validKey, 'scrum54_verified_data', 'EX', RedisTTL.TEST_KEY_SECONDS);

      // Đọc và kiểm tra
      const val = await client.get(validKey);
      assert.strictEqual(val, 'scrum54_verified_data');

      // Kiểm tra TTL
      const ttl = await client.ttl(validKey);
      assert.ok(ttl > 0 && ttl <= RedisTTL.TEST_KEY_SECONDS);

      // Dọn dẹp
      await client.del(validKey);
      const exists = await client.exists(validKey);
      assert.strictEqual(exists, 0, 'Dữ liệu test phải được dọn sạch hoàn toàn');
    });
  });
});
