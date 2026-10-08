-- =============================================================================
-- Project Nexus - Fulfillment Service Schema DDL (SRS 3.6)
-- Database: PostgreSQL (nexus_fulfillment_db - Port 5436)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. BẢNG DANH MỤC KHO HÀNG (Quản lý các kho bãi vật lý của hệ thống)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fulfillment_warehouses (
    -- Khóa chính: Số tự tăng (1, 2, 3...)
    id BIGSERIAL PRIMARY KEY,

    -- Mã định danh kho bãi (SRS: Mặc định kho chính là WH_001)
    code VARCHAR(50) NOT NULL UNIQUE,

    -- Tên kho hàng (VD: "Kho Tổng TP.HCM", "Kho Phân Phối Hà Nội")
    name VARCHAR(100) NOT NULL,

    -- Địa chỉ chi tiết nơi đặt kho
    address VARCHAR(255) NOT NULL,

    -- Tỉnh / Thành phố đặt kho
    city VARCHAR(100) NOT NULL,

    -- Trạng thái: TRUE (Đang mở cửa nhận/xuất hàng), FALSE (Tạm đóng cửa)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Thời gian tạo và cập nhật thông tin kho
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 2. BẢNG TỒN KHO THEO SKU (Quản lý 4 trạng thái tồn kho nghiêm ngặt)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fulfillment_sku_inventories (
    -- Khóa chính: Số tự tăng (1, 2, 3...)
    id BIGSERIAL PRIMARY KEY,

    -- Hàng hóa nằm ở kho nào (Khóa ngoại nối với fulfillment_warehouses)
    warehouse_id BIGINT NOT NULL,

    -- Tham chiếu sản phẩm gốc (Lấy 'id' từ catalog_products bên catalog-service)
    product_id BIGINT NOT NULL,

    -- Mã phân loại sản phẩm chi tiết (VD: "IPHONE-15-BLUE-256")
    sku_code VARCHAR(100) NOT NULL UNIQUE,

    -- Tổng số lượng hàng hóa thực tế đang nằm trên kệ trong kho
    total_quantity INT NOT NULL DEFAULT 0,

    -- Số lượng hàng sẵn sàng bán cho khách mua
    available_quantity INT NOT NULL DEFAULT 0,

    -- Số lượng đang bị giữ chỗ tạm thời trong 30 phút khi khách checkout (SRS: RESERVATION_TIMEOUT = 30m)
    reserved_quantity INT NOT NULL DEFAULT 0,

    -- Số lượng hàng bị lỗi, hỏng hóc, chờ thanh lý (không được bán)
    unavailable_quantity INT NOT NULL DEFAULT 0,

    -- Thời gian tạo và cập nhật số lượng tồn kho
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_inventory_warehouse FOREIGN KEY (warehouse_id) REFERENCES fulfillment_warehouses(id) ON DELETE CASCADE,
    CONSTRAINT chk_inventory_quantities CHECK (
        total_quantity >= 0 AND 
        available_quantity >= 0 AND 
        reserved_quantity >= 0 AND 
        unavailable_quantity >= 0
    )
);

CREATE INDEX IF NOT EXISTS idx_inventory_warehouse ON fulfillment_sku_inventories (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON fulfillment_sku_inventories (product_id);

-- -----------------------------------------------------------------------------
-- 3. BẢNG SỔ CÁI BIẾN ĐỘNG KHO (BẤT BIẾN - APPEND-ONLY theo SRS 3.6.1)
-- Tuyệt đối không cho phép UPDATE hay DELETE để đảm bảo minh bạch kiểm toán kho
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fulfillment_inventory_ledgers (
    -- Khóa chính: Số tự tăng (1, 2, 3...)
    id BIGSERIAL PRIMARY KEY,

    -- Thuộc dòng tồn kho nào (Khóa ngoại nối với fulfillment_sku_inventories)
    inventory_id BIGINT NOT NULL,

    -- Loại biến động: INTAKE (Nhập kho), RESERVE (Giữ chỗ 30p), RELEASE (Nhả hàng hủy), COMMIT (Trừ thật), ADJUST (Kiểm kê)
    transaction_type VARCHAR(30) NOT NULL,

    -- Số lượng biến động (+10 nhập kho, -2 xuất bán,...)
    quantity_change INT NOT NULL,

    -- Mã chứng từ liên quan (Lấy 'order_id' từ commerce_orders hoặc mã phiếu nhập kho)
    reference_id VARCHAR(100),

    -- Diễn giải lý do biến động số lượng
    reason VARCHAR(255),

    -- Thời điểm ghi nhận biến động (Bất biến, không bao giờ thay đổi)
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ledger_inventory FOREIGN KEY (inventory_id) REFERENCES fulfillment_sku_inventories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ledger_inventory ON fulfillment_inventory_ledgers (inventory_id);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON fulfillment_inventory_ledgers (transaction_type);
CREATE INDEX IF NOT EXISTS idx_ledger_reference ON fulfillment_inventory_ledgers (reference_id);

-- -----------------------------------------------------------------------------
-- 4. BẢNG ĐƠN VẬN CHUYỂN / GIAO HÀNG (Theo dõi lộ trình giao đơn tới tay khách)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fulfillment_shipments (
    -- Khóa chính: Số tự tăng (1, 2, 3...)
    id BIGSERIAL PRIMARY KEY,

    -- Tham chiếu đơn hàng cần giao (Lấy 'id' từ commerce_orders bên commerce-service)
    order_id BIGINT NOT NULL,

    -- Xuất hàng đi từ kho nào (Khóa ngoại nối với fulfillment_warehouses)
    warehouse_id BIGINT NOT NULL,

    -- Hãng giao hàng được chọn (GHN hoặc GHTK)
    carrier_code VARCHAR(50) NOT NULL,

    -- Mã vận đơn do GHN/GHTK cấp để khách tra cứu hành trình (VD: "GHN123456789VN")
    tracking_code VARCHAR(100),

    -- Cước phí vận chuyển thực tế
    shipping_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00,

    -- Trạng thái: PENDING (Chờ lấy), PICKED_UP (Đã lấy hàng), IN_TRANSIT (Đang giao), DELIVERED (Thành công), FAILED, RETURNED
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',

    -- Họ tên người nhận hàng
    receiver_name VARCHAR(100) NOT NULL,

    -- Số điện thoại người nhận hàng
    receiver_phone VARCHAR(20) NOT NULL,

    -- Địa chỉ giao hàng đầy đủ (Lưu JSON để hiển thị nguyên vẹn)
    shipping_address JSONB NOT NULL,

    -- Thời điểm tài xế lấy hàng đi giao
    shipped_at TIMESTAMPTZ,

    -- Thời điểm khách ký nhận hàng thành công
    delivered_at TIMESTAMPTZ,

    -- Thời gian tạo và cập nhật đơn vận chuyển
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_shipment_warehouse FOREIGN KEY (warehouse_id) REFERENCES fulfillment_warehouses(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_shipment_order ON fulfillment_shipments (order_id);
CREATE INDEX IF NOT EXISTS idx_shipment_warehouse ON fulfillment_shipments (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_shipment_tracking ON fulfillment_shipments (tracking_code);
CREATE INDEX IF NOT EXISTS idx_shipment_status ON fulfillment_shipments (status);

-- -----------------------------------------------------------------------------
-- 5. BẢNG ĐỐI TÁC VẬN CHUYỂN (Tích hợp hệ thống GHN, GHTK)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fulfillment_carriers (
    -- Khóa chính: Số tự tăng (1, 2, 3...)
    id BIGSERIAL PRIMARY KEY,

    -- Mã đối tác (VD: "GHN", "GHTK")
    carrier_code VARCHAR(50) NOT NULL UNIQUE,

    -- Tên đầy đủ hiển thị (VD: "Giao Hàng Nhanh", "Giao Hàng Tiết Kiệm")
    carrier_name VARCHAR(100) NOT NULL,

    -- Trạng thái: TRUE (Đang sử dụng đối tác này), FALSE (Tạm dừng tích hợp)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Đường link kỹ thuật của Server GHN/GHTK để Backend tự động gửi dữ liệu tạo đơn
    api_endpoint VARCHAR(255),

    -- Thời gian tạo bản ghi
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
