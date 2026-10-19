-- =============================================================================
-- Project Nexus - Commerce Service Schema DDL (SRS 3.4)
-- Database: PostgreSQL (nexus_commerce_db - Port 5434)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. BẢNG GIỎ HÀNG (Hạn lưu 7 ngày theo SRS 3.4.1)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS commerce_carts (
    -- Khóa chính: Số tự tăng (1, 2, 3...)
    id BIGSERIAL PRIMARY KEY,

    -- Tham chiếu người dùng nếu đã đăng nhập (Lấy 'id' từ user_users bên user-service - UUID, NULL nếu là khách)
    user_id VARCHAR(36),

    -- Mã định danh phiên duyệt web của khách vãng lai (Dùng để gộp giỏ hàng khi họ đăng nhập)
    session_id VARCHAR(100),

    -- Thời điểm giỏ hàng tự động hết hạn (SRS: Mặc định sau 7 ngày không hoạt động)
    expires_at TIMESTAMPTZ NOT NULL,

    -- Thời gian tạo và cập nhật giỏ hàng
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cart_user ON commerce_carts (user_id);
CREATE INDEX IF NOT EXISTS idx_cart_session ON commerce_carts (session_id);

-- -----------------------------------------------------------------------------
-- 2. BẢNG MÓN HÀNG TRONG GIỎ (Lưu danh sách món hàng khách chọn mua)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS commerce_cart_items (
    -- Khóa chính: Số tự tăng (1, 2, 3...)
    id BIGSERIAL PRIMARY KEY,

    -- Thuộc giỏ hàng nào (Khóa ngoại nối với commerce_carts)
    cart_id BIGINT NOT NULL,

    -- Tham chiếu sản phẩm được chọn (Lấy 'id' từ catalog_products bên catalog-service)
    product_id BIGINT NOT NULL,

    -- Số lượng món hàng khách chọn mua (Tối thiểu 1)
    quantity INT NOT NULL DEFAULT 1,

    -- Giá của sản phẩm tại thời điểm bấm thêm vào giỏ
    unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,

    -- Thời gian thêm và cập nhật món hàng
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_cart_item_cart FOREIGN KEY (cart_id) REFERENCES commerce_carts(id) ON DELETE CASCADE,
    CONSTRAINT chk_cart_item_qty CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_cart_item_cart ON commerce_cart_items (cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_item_product ON commerce_cart_items (product_id);

-- -----------------------------------------------------------------------------
-- 3. BẢNG ĐƠN ĐẶT HÀNG (Phiên thanh toán 15 phút theo SRS 3.4.1)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS commerce_orders (
    -- Khóa chính: Số tự tăng (1, 2, 3...)
    id BIGSERIAL PRIMARY KEY,

    -- Mã đơn hàng hiển thị cho khách xem (VD: "ORD-20261008-001")
    order_code VARCHAR(50) NOT NULL UNIQUE,

    -- Tham chiếu người mua (Lấy 'id' từ user_users bên user-service - UUID)
    buyer_id VARCHAR(36) NOT NULL,

    -- Tham chiếu người bán (Lấy 'id' từ user_users bên user-service - UUID)
    seller_id VARCHAR(36) NOT NULL,

    -- Tổng số tiền khách phải thanh toán (Tiền hàng + ship - giảm giá)
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,

    -- Tiền phí vận chuyển đơn hàng
    shipping_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00,

    -- Tiền giảm giá / Voucher khuyến mãi
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,

    -- Trạng thái đơn: PENDING_PAYMENT, PAID, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_PAYMENT',

    -- Địa chỉ nhận hàng đầy đủ (Lưu JSON: Họ tên, SĐT, Tỉnh/Thành, Địa chỉ chi tiết)
    shipping_address JSONB NOT NULL,

    -- Hạn chót 15 phút để hoàn tất thanh toán (SRS: Quá 15 phút tự động hủy đơn)
    checkout_session_expires_at TIMESTAMPTZ,

    -- Thời gian tạo và cập nhật đơn hàng
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_code ON commerce_orders (order_code);
CREATE INDEX IF NOT EXISTS idx_order_buyer ON commerce_orders (buyer_id);
CREATE INDEX IF NOT EXISTS idx_order_seller ON commerce_orders (seller_id);
CREATE INDEX IF NOT EXISTS idx_order_status ON commerce_orders (status);

-- -----------------------------------------------------------------------------
-- 4. BẢNG CHI TIẾT MÓN HÀNG TRONG ĐƠN (Chụp lại Snapshot giá và tên tại lúc mua)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS commerce_order_items (
    -- Khóa chính: Số tự tăng (1, 2, 3...)
    id BIGSERIAL PRIMARY KEY,

    -- Thuộc đơn hàng nào (Khóa ngoại nối với commerce_orders)
    order_id BIGINT NOT NULL,

    -- Tham chiếu sản phẩm (Lấy 'id' từ catalog_products bên catalog-service)
    product_id BIGINT NOT NULL,

    -- Tên sản phẩm tại thời điểm mua (Snapshot chống seller đổi tên sau đó)
    product_title VARCHAR(255) NOT NULL,

    -- Đơn giá tại thời điểm chốt đơn (Snapshot chống seller tăng/giảm giá sau đó)
    unit_price DECIMAL(12, 2) NOT NULL,

    -- Số lượng mua
    quantity INT NOT NULL DEFAULT 1,

    -- Thành tiền của món hàng (= unit_price * quantity)
    subtotal DECIMAL(12, 2) NOT NULL,

    -- Thời gian tạo bản ghi
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_order_item_order FOREIGN KEY (order_id) REFERENCES commerce_orders(id) ON DELETE CASCADE,
    CONSTRAINT chk_order_item_qty CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_order_item_order ON commerce_order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_item_product ON commerce_order_items (product_id);

-- -----------------------------------------------------------------------------
-- 5. BẢNG GIAO DỊCH THANH TOÁN (Khóa chống trừ tiền lặp lại 60 phút - SRS 3.4.2)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS commerce_payments (
    -- Khóa chính: Số tự tăng (1, 2, 3...)
    id BIGSERIAL PRIMARY KEY,

    -- Thuộc đơn hàng nào (Khóa ngoại nối với commerce_orders)
    order_id BIGINT NOT NULL,

    -- Phương thức thanh toán: STRIPE, COD, VNPAY, MOMO
    payment_method VARCHAR(30) NOT NULL DEFAULT 'STRIPE',

    -- Mã giao dịch thanh toán từ Stripe (VD: "pi_3MtwBwLkdIwHu7ix28a3tqPa")
    transaction_id VARCHAR(100),

    -- Khóa Idempotency chống gọi Webhook trừ tiền 2 lần trong 60 phút
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,

    -- Số tiền thực thanh toán
    amount DECIMAL(12, 2) NOT NULL,

    -- Đơn vị tiền tệ (VND, USD)
    currency VARCHAR(10) NOT NULL DEFAULT 'VND',

    -- Trạng thái thanh toán: PENDING, SUCCEEDED, FAILED, REFUNDED
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    -- Dữ liệu gốc JSON trả về từ cổng thanh toán Stripe để lưu vết kiểm toán
    raw_response JSONB,

    -- Thời gian tạo và cập nhật giao dịch
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payment_order FOREIGN KEY (order_id) REFERENCES commerce_orders(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_payment_order ON commerce_payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payment_status ON commerce_payments (status);
CREATE INDEX IF NOT EXISTS idx_payment_idempotency ON commerce_payments (idempotency_key);

-- -----------------------------------------------------------------------------
-- 6. BẢNG HÓA ĐƠN / BIÊN LAI ĐIỆN TỬ (Xuất cho khách sau khi đơn hoàn tất)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS commerce_invoices (
    -- Khóa chính: Số tự tăng (1, 2, 3...)
    id BIGSERIAL PRIMARY KEY,

    -- Thuộc đơn hàng nào (Khóa ngoại nối với commerce_orders)
    order_id BIGINT NOT NULL,

    -- Mã số hóa đơn điện tử (VD: "INV-20261008-001")
    invoice_code VARCHAR(50) NOT NULL UNIQUE,

    -- Đường dẫn tải file PDF hóa đơn trên Cloud Storage
    pdf_url VARCHAR(500),

    -- Thời điểm xuất hóa đơn
    issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Thời gian tạo bản ghi
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_invoice_order FOREIGN KEY (order_id) REFERENCES commerce_orders(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_invoice_order ON commerce_invoices (order_id);
