-- =============================================================================
-- Project Nexus - Fulfillment Service Migration V5
-- Add dispute evidence, verdict and SLA deadline columns to support cases (SRS 2.3, 2.6)
-- =============================================================================

-- 1. Bổ sung các trường lưu trữ bằng chứng và phán quyết trọng tài cho bảng fulfillment_support_cases
ALTER TABLE fulfillment_support_cases ADD COLUMN IF NOT EXISTS buyer_evidence JSONB;
ALTER TABLE fulfillment_support_cases ADD COLUMN IF NOT EXISTS seller_evidence JSONB;
ALTER TABLE fulfillment_support_cases ADD COLUMN IF NOT EXISTS verdict JSONB;
ALTER TABLE fulfillment_support_cases ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ;

-- 2. Hỗ trợ tương thích ngược nếu hệ thống tồn tại bảng alias support_cases
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'support_cases') THEN
        ALTER TABLE support_cases ADD COLUMN IF NOT EXISTS buyer_evidence JSONB;
        ALTER TABLE support_cases ADD COLUMN IF NOT EXISTS seller_evidence JSONB;
        ALTER TABLE support_cases ADD COLUMN IF NOT EXISTS verdict JSONB;
        ALTER TABLE support_cases ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ;
    END IF;
END $$;

-- 3. Tạo index bổ sung tối ưu tra cứu cho các vụ việc có hạn xử lý SLA
CREATE INDEX IF NOT EXISTS idx_support_case_sla_deadline ON fulfillment_support_cases (sla_deadline);
