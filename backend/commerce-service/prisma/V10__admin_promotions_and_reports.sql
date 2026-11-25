-- =============================================================================
-- Project Nexus - Commerce Service Migration V10
-- Admin Promotions and Operational Reports Optimization (SRS A15 / B14)
-- =============================================================================

-- 1. BỔ SUNG CỘT CẤU HÌNH PHÂN QUYỀN VÀ PHẠM VI KHUYẾN MÃI (A15)
ALTER TABLE commerce_promotions
  ADD COLUMN IF NOT EXISTS scope VARCHAR(24) NOT NULL DEFAULT 'ALL_USERS',
  ADD COLUMN IF NOT EXISTS category_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(64),
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(64);

-- 2. TỐI ƯU HÓA INDEX CHO TRUY VẤN BÁO CÁO VÀ DASHBOARD THEO KỲ
CREATE INDEX IF NOT EXISTS idx_order_created_status ON commerce_orders (created_at, status);
CREATE INDEX IF NOT EXISTS idx_promo_scope ON commerce_promotions (scope);
