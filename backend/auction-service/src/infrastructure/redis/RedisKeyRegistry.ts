/**
 * =============================================================================
 * PROJECT NEXUS - REDIS KEY PREFIX & NAMING CONVENTIONS (SCRUM-54)
 * =============================================================================
 * Chuẩn hóa quy tắc đặt tên Redis Key và cấu trúc TTL cho toàn bộ nền tảng Nexus.
 * Tránh đụng độ (collision) key giữa các Bounded Contexts dùng chung 1 Redis cluster.
 *
 * Cấu trúc quy ước:
 *   <module>:<purpose>:<identifier>[:<sub_identifier>]
 *
 * Ví dụ:
 *   - auth:blacklist:usr_01hqz789abc_jti_xyz
 *   - auction:lock:auc_998877
 *   - cart:guest:sess_anonymous_4411
 * =============================================================================
 */

/**
 * Danh sách các Module / Bounded Context có quyền truy cập và sở hữu Key trên Redis.
 */
export const RedisModule = {
  AUTH: 'auth',
  AUCTION: 'auction',
  CART: 'cart',
  CATALOG: 'catalog',
  NOTIFICATION: 'notification',
  FULFILLMENT: 'fulfillment',
  SYSTEM: 'system',
  TEST: 'nexus:test',
} as const;

export type RedisModuleType = (typeof RedisModule)[keyof typeof RedisModule];

/**
 * Danh mục Prefix chuẩn hóa của toàn bộ hệ thống Nexus.
 * Bắt buộc 100% prefix phải kết thúc bằng dấu hai chấm (:).
 */
export const RedisKeyPrefix = {
  // ---------------------------------------------------------------------------
  // 1. Auth & IAM Module (SRS 3.1)
  // ---------------------------------------------------------------------------
  /** Token Blacklist: Lưu trữ token JWT bị thu hồi / đăng xuất (auth:blacklist:<token_hash_or_jti>) */
  AUTH_BLACKLIST: 'auth:blacklist:',
  /** Account Lockout: Đếm số lần đăng nhập sai của tài khoản (auth:lockout:<email_or_user_id>) */
  AUTH_LOCKOUT: 'auth:lockout:',
  /** Password Reset: Token đặt lại mật khẩu một lần (auth:password_reset:<reset_token>) */
  AUTH_PASSWORD_RESET: 'auth:password_reset:',
  /** User Active Session: Theo dõi phiên đăng nhập đang hoạt động (auth:session:<user_id>) */
  AUTH_SESSION: 'auth:session:',

  // ---------------------------------------------------------------------------
  // 2. Auction & Real-Time Bidding Engine (SRS 3.5)
  // ---------------------------------------------------------------------------
  /** Distributed Lock: Khóa phân tán chống race condition khi đặt giá (auction:lock:<auction_id>) */
  AUCTION_LOCK: 'auction:lock:',
  /** Highest Bid Cache: Lưu cache giá thầu cao nhất để đọc tức thời (auction:highest_bid:<auction_id>) */
  AUCTION_HIGHEST_BID: 'auction:highest_bid:',
  /** Bids Sorted Set: Danh sách giá thầu theo thứ tự điểm số Score (auction:bids_zset:<auction_id>) */
  AUCTION_BIDS_ZSET: 'auction:bids_zset:',
  /** Realtime Event Stream: Kênh luồng Redis Stream sự kiện đấu giá (auction:stream:<auction_id>) */
  AUCTION_STREAM: 'auction:stream:',
  /** Auction Viewers Counter: Đếm số lượng người đang theo dõi phiên (auction:viewers:<auction_id>) */
  AUCTION_VIEWERS: 'auction:viewers:',

  // ---------------------------------------------------------------------------
  // 3. Commerce & Shopping Cart Module (SRS 3.3)
  // ---------------------------------------------------------------------------
  /** Guest Cart: Giỏ hàng tạm thời của khách vãng lai chưa đăng nhập (cart:guest:<guest_session_id>) */
  CART_GUEST: 'cart:guest:',
  /** User Cart Cache: Cache giỏ hàng của người dùng đã xác thực (cart:user:<user_id>) */
  CART_USER: 'cart:user:',
  /** Checkout Lock: Khóa chống thanh toán trùng lặp (cart:checkout_lock:<cart_id>) */
  CART_CHECKOUT_LOCK: 'cart:checkout_lock:',

  // ---------------------------------------------------------------------------
  // 4. Catalog & Product Discovery Module (SRS 3.2)
  // ---------------------------------------------------------------------------
  /** Product Detail Cache: Cache chi tiết sản phẩm giảm tải DB (catalog:product:<product_id>) */
  CATALOG_PRODUCT: 'catalog:product:',
  /** Category Tree Cache: Cache danh mục phân cấp sản phẩm (catalog:categories:all) */
  CATALOG_CATEGORIES: 'catalog:categories:',
  /** Inventory Lock: Khóa tạm giữ tồn kho SKU khi bắt đầu thanh toán (catalog:stock_lock:<sku_id>) */
  CATALOG_STOCK_LOCK: 'catalog:stock_lock:',

  // ---------------------------------------------------------------------------
  // 5. Notification Service (SRS 3.6)
  // ---------------------------------------------------------------------------
  /** Rate Limiter: Giới hạn tần suất gửi email / OTP / SMS (notification:rate_limit:<user_id>:<channel>) */
  NOTIFICATION_RATE_LIMIT: 'notification:rate_limit:',
  /** Idempotency Key: Khóa chống gửi lặp thông báo (notification:idempotency:<event_id>) */
  NOTIFICATION_IDEMPOTENCY: 'notification:idempotency:',

  // ---------------------------------------------------------------------------
  // 6. Fulfillment & Logistics (SRS 3.4)
  // ---------------------------------------------------------------------------
  /** Shipment Dispatch Lock: Khóa điều phối đơn giao hàng (fulfillment:lock:<shipment_id>) */
  FULFILLMENT_LOCK: 'fulfillment:lock:',

  // ---------------------------------------------------------------------------
  // 7. System Health & Platform Operations
  // ---------------------------------------------------------------------------
  /** System Health Status: Cache trạng thái nhịp tim dịch vụ (system:health:<service_name>) */
  SYSTEM_HEALTH: 'system:health:',

  // ---------------------------------------------------------------------------
  // 8. Automated Testing & QA Verification (Namespace cô lập)
  // ---------------------------------------------------------------------------
  /** QA Test Namespace: Dành riêng cho kịch bản test tự động (nexus:test:<scope>:<test_id>) */
  NEXUS_TEST: 'nexus:test:',
} as const;

export type RedisKeyPrefixType = (typeof RedisKeyPrefix)[keyof typeof RedisKeyPrefix];

/**
 * Cấu hình TTL (Time-To-Live) chuẩn hóa tính theo giây (seconds).
 * Riêng các Distributed Lock dùng trong mili-giây (ms).
 */
export const RedisTTL = {
  /** Distributed Locks: 3 giây - 5 giây */
  LOCK_AUCTION_MS: 3000,
  LOCK_CHECKOUT_MS: 5000,
  LOCK_STOCK_MS: 5000,
  LOCK_FULFILLMENT_MS: 10000,

  /** Auth Tokens & Sessions */
  AUTH_BLACKLIST_SECONDS: 86400, // 24 giờ (hoặc bằng exp của JWT)
  AUTH_LOCKOUT_SECONDS: 900, // 15 phút khóa đăng nhập
  AUTH_PASSWORD_RESET_SECONDS: 900, // 15 phút hiệu lực mã reset
  AUTH_SESSION_SECONDS: 604800, // 7 ngày phiên đăng nhập

  /** Carts */
  CART_GUEST_SECONDS: 604800, // 7 ngày giỏ hàng khách
  CART_USER_SECONDS: 2592000, // 30 ngày giỏ hàng user

  /** Catalog Caches */
  CATALOG_PRODUCT_SECONDS: 600, // 10 phút cache sản phẩm
  CATALOG_CATEGORIES_SECONDS: 3600, // 1 giờ cache danh mục

  /** Notification & Rate Limiting */
  NOTIFICATION_RATE_LIMIT_SECONDS: 60, // 1 phút giới hạn tần suất
  NOTIFICATION_IDEMPOTENCY_SECONDS: 86400, // 24 giờ chống gửi lặp

  /** QA & Testing */
  TEST_KEY_SECONDS: 60, // 60 giây dọn rác test
} as const;

/**
 * Xây dựng Redis Key hoàn chỉnh từ Prefix và các Identifiers.
 * Tự động chuẩn hóa, kiểm tra tính hợp lệ và chống tạo key cụt / bare key.
 *
 * @param prefix Tiền tố hợp lệ thuộc RedisKeyPrefix (ví dụ: RedisKeyPrefix.AUCTION_LOCK)
 * @param identifiers Các thành phần định danh (ví dụ: 'auc_12345', 'user_99')
 * @returns Chuỗi Redis Key chuẩn hóa (ví dụ: 'auction:lock:auc_12345')
 *
 * @throws {Error} Nếu prefix không hợp lệ hoặc identifier rỗng/chứa khoảng trắng
 */
export function buildRedisKey(prefix: string, ...identifiers: (string | number)[]): string {
  if (!prefix || typeof prefix !== 'string') {
    throw new Error('[RedisKeyError] Prefix không được để trống.');
  }

  if (!prefix.endsWith(':')) {
    throw new Error(`[RedisKeyError] Prefix "${prefix}" phải kết thúc bằng dấu hai chấm (:).`);
  }

  if (identifiers.length === 0) {
    throw new Error(
      `[RedisKeyError] Phải cung cấp ít nhất 1 định danh (identifier) cho prefix "${prefix}".`,
    );
  }

  const sanitizedParts: string[] = [];

  for (let i = 0; i < identifiers.length; i++) {
    const raw = identifiers[i];
    if (raw === undefined || raw === null) {
      throw new Error(
        `[RedisKeyError] Định danh tại vị trí ${i} không được là null hoặc undefined.`,
      );
    }

    const str = String(raw).trim();
    if (str.length === 0) {
      throw new Error(`[RedisKeyError] Định danh tại vị trí ${i} không được rỗng.`);
    }

    if (/\s/.test(str)) {
      throw new Error(
        `[RedisKeyError] Định danh "${str}" không được chứa khoảng trắng. Hãy dùng dấu gạch dưới (_) hoặc gạch nối (-).`,
      );
    }

    sanitizedParts.push(str);
  }

  const fullKey = `${prefix}${sanitizedParts.join(':')}`;
  return fullKey;
}

/**
 * Kiểm tra xem một Redis Key bất kỳ có tuân thủ quy ước Namespace Module hay không.
 * Ngăn chặn tuyệt đối các bare key không có module prefix (ví dụ: "my_key", "temp_token", "123").
 *
 * @param key Chuỗi key cần kiểm tra
 * @returns true nếu key thuộc một trong các namespace chuẩn, ngược lại false
 */
export function isValidRedisKey(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }

  const validPrefixes = Object.values(RedisKeyPrefix);
  return validPrefixes.some((prefix) => key.startsWith(prefix));
}

/**
 * Kiểm tra và ném lỗi nếu Redis Key vi phạm quy ước namespace module.
 *
 * @param key Chuỗi key cần kiểm duyệt
 * @throws {Error} Nếu key là bare key hoặc không thuộc namespace module hợp lệ
 */
export function assertValidRedisKey(key: string): void {
  if (!isValidRedisKey(key)) {
    throw new Error(
      `[RedisKeyViolationError] Key "${key}" vi phạm quy ước: Bắt buộc phải có namespace module hợp lệ (${Object.values(
        RedisModule,
      ).join(', ')}). Không được dùng bare key không có namespace.`,
    );
  }
}

/**
 * Trích xuất tên Module sở hữu từ chuỗi Redis Key.
 *
 * @param key Chuỗi Redis Key
 * @returns Tên module (ví dụ: 'auction', 'auth', 'cart') hoặc null nếu không hợp lệ
 */
export function getModuleFromKey(key: string): string | null {
  if (!isValidRedisKey(key)) {
    return null;
  }

  if (key.startsWith('nexus:test:')) {
    return RedisModule.TEST;
  }

  const firstColon = key.indexOf(':');
  if (firstColon === -1) {
    return null;
  }

  return key.substring(0, firstColon);
}
