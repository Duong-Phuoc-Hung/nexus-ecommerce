-- =============================================================================
-- Project Nexus - Auction Service Schema DDL (SRS 3.5)
-- Database: PostgreSQL (nexus_auction_db - Port 5435)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. BẢNG PHÒNG ĐẤU GIÁ (Quản lý vòng đời phiên đấu giá)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auction_rooms (
    -- Khóa chính: Số tự tăng (1, 2, 3...)
    id BIGSERIAL PRIMARY KEY,

    -- Tham chiếu sản phẩm đấu giá (Lấy 'id' từ catalog_products bên catalog-service)
    product_id BIGINT NOT NULL,

    -- Tham chiếu người tạo phiên / chủ món hàng (Lấy 'id' từ user_users bên user-service)
    seller_id BIGINT NOT NULL,

    -- Tiêu đề phiên đấu giá hiển thị cho người xem
    title VARCHAR(255) NOT NULL,

    -- Giá khởi điểm ban đầu do người bán quy định
    start_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,

    -- Giá dẫn đầu hiện tại (Nhảy liên tục mỗi khi có người trả giá cao hơn)
    current_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,

    -- Bước giá tối thiểu mỗi lần trả (SRS: Mặc định tối thiểu 10.000 đ)
    bid_step DECIMAL(12, 2) NOT NULL DEFAULT 10000.00,

    -- Giá mua đứt ngay lập tức (Nếu ai chấp nhận trả mức này thì trúng luôn, kết thúc phiên)
    buy_now_price DECIMAL(12, 2),

    -- Thời điểm mở phiên đấu giá cho người dùng vào trả giá
    start_time TIMESTAMPTZ NOT NULL,

    -- Thời điểm kết thúc phiên dự kiến ban đầu
    end_time TIMESTAMPTZ NOT NULL,

    -- Thời điểm kết thúc thực tế (Tự động dời nếu kích hoạt Anti-sniping ở phút chót)
    actual_end_time TIMESTAMPTZ,

    -- Trạng thái: SCHEDULED, ACTIVE, ENDED, SETTLED, CANCELLED
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',

    -- Tham chiếu người thắng cuộc khi kết thúc phiên (Lấy 'id' từ user_users bên user-service)
    winner_id BIGINT,

    -- Thời gian tạo và cập nhật phòng đấu giá
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Ràng buộc kiểm tra: Giá hiện tại không được thấp hơn giá khởi điểm, bước giá phải > 0
    CONSTRAINT chk_auction_prices CHECK (current_price >= start_price AND bid_step > 0)
);

CREATE INDEX IF NOT EXISTS idx_auction_product ON auction_rooms (product_id);
CREATE INDEX IF NOT EXISTS idx_auction_seller ON auction_rooms (seller_id);
CREATE INDEX IF NOT EXISTS idx_auction_status ON auction_rooms (status);
CREATE INDEX IF NOT EXISTS idx_auction_winner ON auction_rooms (winner_id);

-- -----------------------------------------------------------------------------
-- 2. BẢNG LỊCH SỬ ĐẶT GIÁ (Lưu từng lượt trả giá, yêu cầu độ trễ <= 300ms)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auction_bids (
    -- Khóa chính: Số tự tăng (1, 2, 3...)
    id BIGSERIAL PRIMARY KEY,

    -- Thuộc phòng đấu giá nào (Khóa ngoại nối với auction_rooms)
    auction_id BIGINT NOT NULL,

    -- Tham chiếu người vừa bấm nút trả giá (Lấy 'id' từ user_users bên user-service)
    bidder_id BIGINT NOT NULL,

    -- Số tiền mà người này đưa ra trả giá
    bid_amount DECIMAL(12, 2) NOT NULL,

    -- Thời điểm bấm nút chính xác đến mili-giây (Dùng phân xử ai trả giá trước)
    bid_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Cờ đánh dấu: TRUE nếu mức giá này đang dẫn đầu, FALSE nếu đã bị người khác vượt qua
    is_winning BOOLEAN NOT NULL DEFAULT FALSE,

    -- Thời gian tạo bản ghi
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_bid_auction FOREIGN KEY (auction_id) REFERENCES auction_rooms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bid_auction ON auction_bids (auction_id);
CREATE INDEX IF NOT EXISTS idx_bid_bidder ON auction_bids (bidder_id);
CREATE INDEX IF NOT EXISTS idx_bid_time ON auction_bids (bid_time DESC);

-- -----------------------------------------------------------------------------
-- 3. BẢNG CHỐT NGƯỜI THẮNG VÀ HẠN NỘP TIỀN 24 GIỜ (Quản lý thanh toán sau đấu giá)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auction_settlements (
    -- Khóa chính: Số tự tăng (1, 2, 3...)
    id BIGSERIAL PRIMARY KEY,

    -- Thuộc phòng đấu giá nào (Nối 1-1 với auction_rooms)
    auction_id BIGINT NOT NULL UNIQUE,

    -- Tham chiếu người thắng cuộc (Lấy 'id' từ user_users bên user-service)
    winner_id BIGINT NOT NULL,

    -- Số tiền trúng đấu giá cuối cùng
    winning_bid_amount DECIMAL(12, 2) NOT NULL,

    -- Hạn chót nộp tiền: Đúng 24 giờ sau khi kết thúc phiên (Quá hạn phạt trừ 10 điểm uy tín)
    payment_deadline TIMESTAMPTZ NOT NULL,

    -- Tham chiếu đơn hàng sinh ra bên commerce_orders của commerce-service khi thanh toán
    order_id BIGINT,

    -- Trạng thái: PENDING_PAYMENT (Chờ trả), PAID (Đã trả), TIMEOUT_PENALIZED (Bùng kèo quá 24h)
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING_PAYMENT',

    -- Thời điểm hệ thống chốt phiên
    settled_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Thời gian tạo bản ghi
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_settlement_auction FOREIGN KEY (auction_id) REFERENCES auction_rooms(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_settlement_winner ON auction_settlements (winner_id);
CREATE INDEX IF NOT EXISTS idx_settlement_status ON auction_settlements (status);

-- -----------------------------------------------------------------------------
-- 4. BẢNG NHẬT KÝ GIA HẠN ANTI-SNIPING (Chống vét giá giây cuối cùng)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auction_extensions (
    -- Khóa chính: Số tự tăng (1, 2, 3...)
    id BIGSERIAL PRIMARY KEY,

    -- Thuộc phòng đấu giá nào (Nối với auction_rooms)
    auction_id BIGINT NOT NULL,

    -- Số phút cộng thêm (SRS: Mặc định cộng 5 phút nếu có bid ở 5 phút cuối)
    extended_minutes INT NOT NULL DEFAULT 5,

    -- Giờ kết thúc cũ trước khi bị gia hạn
    previous_end_time TIMESTAMPTZ NOT NULL,

    -- Giờ kết thúc mới sau khi được cộng thêm 5 phút
    new_end_time TIMESTAMPTZ NOT NULL,

    -- Lý do kích hoạt gia hạn
    reason VARCHAR(100) NOT NULL DEFAULT 'Anti-sniping triggered by last-minute bid',

    -- Thời điểm kích hoạt gia hạn
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_extension_auction FOREIGN KEY (auction_id) REFERENCES auction_rooms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_extension_auction ON auction_extensions (auction_id);
