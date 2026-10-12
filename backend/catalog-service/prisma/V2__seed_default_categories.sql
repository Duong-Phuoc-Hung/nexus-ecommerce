-- =============================================================================
-- Project Nexus - Catalog Service Seed Categories (SRS 3.3)
-- Database: PostgreSQL (nexus_catalog_db - Port 5433)
-- Phân cấp danh mục tối đa 3 tầng (Level 1: Gốc, Level 2: Nhóm con, Level 3: Loại chi tiết)
-- =============================================================================

-- Level 1: Danh mục gốc
INSERT INTO catalog_categories (id, name, slug, description, parent_id, level, is_active, display_order)
VALUES 
(1, 'Thiết bị điện tử', 'thiet-bi-dien-tu', 'Các sản phẩm công nghệ và điện tử', NULL, 1, TRUE, 1),
(2, 'Thời trang & Phụ kiện', 'thoi-trang-phu-kien', 'Quần áo, giày dép, phụ kiện thời trang', NULL, 1, TRUE, 2),
(3, 'Đồ gia dụng & Đời sống', 'do-gia-dung-doi-song', 'Thiết bị gia đình và đời sống tiện ích', NULL, 1, TRUE, 3)
ON CONFLICT (id) DO NOTHING;

-- Level 2: Nhóm danh mục con
INSERT INTO catalog_categories (id, name, slug, description, parent_id, level, is_active, display_order)
VALUES 
(10, 'Điện thoại & Tablet', 'dien-thoai-tablet', 'Smartphone và máy tính bảng', 1, 2, TRUE, 1),
(11, 'Laptop & Máy tính', 'laptop-may-tinh', 'Máy tính xách tay và máy tính để bàn', 1, 2, TRUE, 2),
(12, 'Thời trang Nam', 'thoi-trang-nam', 'Quần áo thời trang cho nam', 2, 2, TRUE, 1),
(13, 'Thời trang Nữ', 'thoi-trang-nu', 'Quần áo thời trang cho nữ', 2, 2, TRUE, 2)
ON CONFLICT (id) DO NOTHING;

-- Level 3: Loại sản phẩm chi tiết
INSERT INTO catalog_categories (id, name, slug, description, parent_id, level, is_active, display_order)
VALUES 
(100, 'iPhone', 'dien-thoai-iphone', 'Các dòng điện thoại Apple iPhone', 10, 3, TRUE, 1),
(101, 'Samsung Galaxy', 'dien-thoai-samsung', 'Các dòng điện thoại Samsung Galaxy', 10, 3, TRUE, 2),
(102, 'MacBook', 'laptop-macbook', 'Các dòng máy tính Apple MacBook', 11, 3, TRUE, 1),
(103, 'Laptop Gaming', 'laptop-gaming', 'Máy tính chơi game cấu hình cao', 11, 3, TRUE, 2)
ON CONFLICT (id) DO NOTHING;

-- Đặt lại giá trị Sequence tự tăng sau khi chèn dữ liệu chỉ định ID
SELECT setval('catalog_categories_id_seq', (SELECT MAX(id) FROM catalog_categories));
