-- =============================================================================
-- Project Nexus - Commerce Service Migration V8
-- Promotions, Promotion Usages, Shipping Options & Snapshot Columns
-- =============================================================================

-- 1. BẢNG MÃ KHUYẾN MÃI / VOUCHER (SRS B14)
CREATE TABLE IF NOT EXISTS commerce_promotions (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL DEFAULT 'FIXED', -- 'FIXED' | 'PERCENT'
  discount_value DECIMAL(12, 2) NOT NULL,
  max_discount_amount DECIMAL(12, 2),
  min_order_amount DECIMAL(12, 2) DEFAULT 0.00,
  usage_limit INT DEFAULT 1000,
  used_count INT DEFAULT 0,
  per_user_limit INT DEFAULT 1,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE' | 'PAUSED' | 'EXPIRED'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_code ON commerce_promotions (code);
CREATE INDEX IF NOT EXISTS idx_promo_status_dates ON commerce_promotions (status, starts_at, ends_at);

-- 2. BẢNG LỊCH SỬ DÙNG MÃ KHUYẾN MÃI
CREATE TABLE IF NOT EXISTS commerce_promotion_usages (
  id BIGSERIAL PRIMARY KEY,
  promotion_id VARCHAR(36) NOT NULL REFERENCES commerce_promotions(id) ON DELETE RESTRICT,
  user_id VARCHAR(36) NOT NULL,
  order_id VARCHAR(36) REFERENCES commerce_orders(id) ON DELETE SET NULL,
  discount_amount DECIMAL(12, 2) NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_usage_promo_user ON commerce_promotion_usages (promotion_id, user_id);
CREATE INDEX IF NOT EXISTS idx_promo_usage_order ON commerce_promotion_usages (order_id);

-- 3. BỔ SUNG CÁC CỘT SNAPSHOT VÀO BẢNG ĐƠN HÀNG (SRS B06 / B08 / B14)
ALTER TABLE commerce_orders
  ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS shipping_carrier VARCHAR(50),
  ADD COLUMN IF NOT EXISTS shipping_service_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS estimated_delivery_at TIMESTAMPTZ;

-- 4. BỔ SUNG CỘT VÀO BẢNG BÁO GIÁ CHECKOUT QUOTE
ALTER TABLE commerce_checkout_quotes
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS shipping_option_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 5. SEED DỮ LIỆU KHUYẾN MÃI THỰC TẾ
INSERT INTO commerce_promotions (
  id, code, name, description, discount_type, discount_value, max_discount_amount, min_order_amount, usage_limit, used_count, per_user_limit, starts_at, ends_at, status
) VALUES 
  (
    '01934000-0001-7000-8000-000000000001',
    'NEXUS50K',
    'Giảm 50.000 ₫ cho đơn từ 500.000 ₫',
    'Voucher ưu đãi mua sắm Nexus E-Commerce toàn sàn',
    'FIXED',
    50000.00,
    50000.00,
    500000.00,
    1000,
    0,
    2,
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '365 days',
    'ACTIVE'
  ),
  (
    '01934000-0002-7000-8000-000000000002',
    'FREESHIP',
    'Giảm 30.000 ₫ phí vận chuyển cho đơn từ 200.000 ₫',
    'Miễn phí / giảm phí vận chuyển đơn hàng',
    'FIXED',
    30000.00,
    30000.00,
    200000.00,
    500,
    0,
    3,
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '365 days',
    'ACTIVE'
  ),
  (
    '01934000-0003-7000-8000-000000000003',
    'WELCOME10',
    'Giảm 10% tối đa 100.000 ₫ cho đơn từ 100.000 ₫',
    'Ưu đãi chào mừng thành viên mới',
    'PERCENT',
    10.00,
    100000.00,
    100000.00,
    2000,
    0,
    1,
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '365 days',
    'ACTIVE'
  )
ON CONFLICT (code) DO NOTHING;
