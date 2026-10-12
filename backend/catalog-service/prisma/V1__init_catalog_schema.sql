-- =============================================================================
-- Project Nexus - Catalog Service Schema DDL (SRS 3.3)
-- Database: PostgreSQL (nexus_catalog_db - Port 5433)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. BẢNG DANH MỤC SẢN PHẨM (Phân cấp đa tầng, tối đa 3 cấp theo SRS 3.3)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS catalog_categories (
    -- Khóa chính: Số tự tăng (1, 2, 3...)
    id BIGSERIAL PRIMARY KEY,

    -- Tên danh mục (VD: "Thiết bị điện tử", "Điện thoại", "iPhone")
    name VARCHAR(100) NOT NULL,

    -- Đường dẫn thân thiện cho SEO (VD: "thiet-bi-dien-tu", "dien-thoai-iphone")
    slug VARCHAR(150) NOT NULL UNIQUE,

    -- Mô tả ngắn về danh mục sản phẩm
    description TEXT,

    -- Link ảnh banner/icon đại diện danh mục (Lưu trên Cloud Storage / S3)
    image_url VARCHAR(500),

    -- Khóa ngoại tự trỏ về danh mục cha (NULL nếu là danh mục gốc cấp 1)
    parent_id BIGINT,

    -- Cấp bậc danh mục: 1 (Gốc), 2 (Nhóm con), 3 (Loại chi tiết) - Tối đa 3 tầng
    level INT NOT NULL DEFAULT 1,

    -- Trạng thái hiển thị: TRUE (Đang bật trên web), FALSE (Tạm ẩn)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Thứ tự sắp xếp hiển thị trên thanh menu (0, 1, 2...)
    display_order INT NOT NULL DEFAULT 0,

    -- Thời gian tạo và cập nhật danh mục
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_category_parent FOREIGN KEY (parent_id) REFERENCES catalog_categories(id) ON DELETE CASCADE,
    CONSTRAINT chk_category_level CHECK (level >= 1 AND level <= 3)
);

CREATE INDEX IF NOT EXISTS idx_category_parent ON catalog_categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_category_slug ON catalog_categories (slug);

-- -----------------------------------------------------------------------------
-- 2. BẢNG SẢN PHẨM (Lưu thông tin sản phẩm do Người bán đăng tải)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS catalog_products (
    -- Khóa chính: Số tự tăng (1, 2, 3...)
    id BIGSERIAL PRIMARY KEY,

    -- Tham chiếu người bán / chủ sở hữu sản phẩm (Lấy 'id' từ user_users bên user-service)
    seller_id BIGINT NOT NULL,

    -- Thuộc danh mục nào (Khóa ngoại nối với catalog_categories)
    category_id BIGINT NOT NULL,

    -- Tiêu đề / Tên sản phẩm hiển thị (VD: "iPhone 15 Pro Max 256GB Titan Tự Nhiên")
    title VARCHAR(255) NOT NULL,

    -- Đường dẫn SEO duy nhất của sản phẩm
    slug VARCHAR(300) NOT NULL UNIQUE,

    -- Bài viết mô tả chi tiết sản phẩm, chính sách bảo hành
    description TEXT NOT NULL,

    -- Trạng thái sản phẩm: DRAFT, ACTIVE, INACTIVE, ARCHIVED
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',

    -- Tình trạng hàng hóa: NEW (100%), LIKE_NEW (99%), USED, REFURBISHED
    condition VARCHAR(20) NOT NULL DEFAULT 'NEW',

    -- Giá bán niêm yết ban đầu (VND)
    base_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,

    -- Sản phẩm này có được phép mang đi đấu giá hay không
    allow_auction BOOLEAN NOT NULL DEFAULT FALSE,

    -- Thời gian tạo và cập nhật sản phẩm
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Thời điểm xóa mềm (Nếu khác NULL tức là sản phẩm đã bị xóa)
    deleted_at TIMESTAMPTZ,

    CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES catalog_categories(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_product_seller ON catalog_products (seller_id);
CREATE INDEX IF NOT EXISTS idx_product_category ON catalog_products (category_id);
CREATE INDEX IF NOT EXISTS idx_product_status ON catalog_products (status);

-- -----------------------------------------------------------------------------
-- 3. BẢNG ẢNH SẢN PHẨM (Tối đa 5 ảnh cho mỗi sản phẩm theo quy định SRS 3.3)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS catalog_product_images (
    -- Khóa chính: Số tự tăng (1, 2, 3...)
    id BIGSERIAL PRIMARY KEY,

    -- Thuộc sản phẩm nào (Khóa ngoại nối với catalog_products)
    product_id BIGINT NOT NULL,

    -- Link ảnh lưu trên Cloud Storage / CDN
    image_url VARCHAR(500) NOT NULL,

    -- Thứ tự hiển thị trong bộ sưu tập (SRS: Bắt buộc từ 1 đến 5)
    display_order INT NOT NULL DEFAULT 1,

    -- Đánh dấu ảnh đại diện chính (Hiển thị ngoài trang danh sách sản phẩm)
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    -- Thời gian tải ảnh lên
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_image_product FOREIGN KEY (product_id) REFERENCES catalog_products(id) ON DELETE CASCADE,
    CONSTRAINT chk_image_order CHECK (display_order >= 1 AND display_order <= 5)
);

CREATE INDEX IF NOT EXISTS idx_image_product ON catalog_product_images (product_id);

-- -----------------------------------------------------------------------------
-- 4. BẢNG THUỘC TÍNH SẢN PHẨM (Màu sắc, Dung lượng, Kích cỡ động)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS catalog_product_attributes (
    -- Khóa chính: Số tự tăng (1, 2, 3...)
    id BIGSERIAL PRIMARY KEY,

    -- Thuộc sản phẩm nào (Khóa ngoại nối với catalog_products)
    product_id BIGINT NOT NULL,

    -- Tên thông số / Thuộc tính (VD: "Màu sắc", "Dung lượng RAM", "Bộ nhớ trong")
    attribute_key VARCHAR(100) NOT NULL,

    -- Giá trị cụ thể của thuộc tính (VD: "Titan Tự Nhiên", "8GB", "256GB")
    attribute_value VARCHAR(255) NOT NULL,

    -- Thời gian tạo bản ghi
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_attribute_product FOREIGN KEY (product_id) REFERENCES catalog_products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attribute_product ON catalog_product_attributes (product_id);
