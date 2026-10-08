-- =============================================================================
-- Project Nexus - Notification Service Migration (SCRUM-10 & SRS 3.2.1)
-- Database: PostgreSQL (nexus_notification_db - Port 5437)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. BẢNG NHẬT KÝ SỰ KIỆN HỆ THỐNG (BẤT BIẾN - AUDIT EVENT LOG)
-- Bảng này tự động ghi nhận MỌI Domain Event phát sinh từ 6 services
-- Tuyệt đối chỉ INSERT, cấm UPDATE và DELETE để phục vụ kiểm toán
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_event_log (
    -- Khóa chính: Số tự tăng (1, 2, 3...)
    id BIGSERIAL PRIMARY KEY,

    -- Mã định danh duy nhất của sự kiện từ DomainEvent (VD: "evt_123e4567-e89b-12d3...")
    event_id VARCHAR(64) NOT NULL UNIQUE,

    -- Tên loại sự kiện (VD: "UserRegistered", "OrderCreated", "OrderPaid", "BidPlaced", "AuctionWon")
    type VARCHAR(100) NOT NULL,

    -- Tên service phát ra sự kiện này (VD: "user-service", "commerce-service", "auction-service")
    source_service VARCHAR(50) NOT NULL,

    -- Toàn bộ dữ liệu chi tiết của sự kiện dưới định dạng JSON
    payload JSONB NOT NULL,

    -- Trạng thái xử lý sự kiện: SUCCESS, FAILED, RETRYING
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',

    -- Thời điểm sự kiện được ghi nhận vào hệ thống (Bất biến)
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_created_at ON notification_event_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_type ON notification_event_log (type);
CREATE INDEX IF NOT EXISTS idx_event_source ON notification_event_log (source_service);