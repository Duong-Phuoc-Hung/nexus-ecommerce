/**
 * =============================================================================
 * Project Nexus - Standardized Redis Key Prefixes (SCRUM-54)
 * =============================================================================
 * Quy ước tiền tố (Key Prefix) dùng chung cho toàn bộ các module và frontend
 * nhằm tránh xung đột key trên cụm Redis tập trung (Port 6379).
 * =============================================================================
 */

export enum RedisKeyPrefixEnum {
  // Auth & IAM
  AUTH_BLACKLIST = 'auth:blacklist:',
  AUTH_LOCKOUT = 'auth:lockout:',
  AUTH_PASSWORD_RESET = 'auth:password_reset:',
  AUTH_SESSION = 'auth:session:',

  // Auction
  AUCTION_LOCK = 'auction:lock:',
  AUCTION_HIGHEST_BID = 'auction:highest_bid:',
  AUCTION_BIDS_ZSET = 'auction:bids_zset:',
  AUCTION_STREAM = 'auction:stream:',
  AUCTION_VIEWERS = 'auction:viewers:',

  // Commerce & Cart
  CART_GUEST = 'cart:guest:',
  CART_USER = 'cart:user:',
  CART_CHECKOUT_LOCK = 'cart:checkout_lock:',

  // Catalog
  CATALOG_PRODUCT = 'catalog:product:',
  CATALOG_CATEGORIES = 'catalog:categories:',
  CATALOG_STOCK_LOCK = 'catalog:stock_lock:',

  // Notification
  NOTIFICATION_RATE_LIMIT = 'notification:rate_limit:',
  NOTIFICATION_IDEMPOTENCY = 'notification:idempotency:',

  // Fulfillment
  FULFILLMENT_LOCK = 'fulfillment:lock:',

  // System & Testing
  SYSTEM_HEALTH = 'system:health:',
  TEST_NAMESPACE = 'nexus:test:',
}
