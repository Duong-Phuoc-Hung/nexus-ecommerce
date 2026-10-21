-- =============================================================================
-- Migration V4: Bo sung so luong ton kho (stock_quantity) va nguoi ban (seller_name)
-- Bounded Context: Catalog Service (nexus_catalog_db - Port 5433)
-- =============================================================================

-- 1. Bổ sung cột stock_quantity và seller_name vào bảng catalog_products
ALTER TABLE catalog_products
ADD COLUMN IF NOT EXISTS stock_quantity INT NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS seller_name VARCHAR(100) DEFAULT 'Nexus Official Store';

-- 2. Cập nhật dữ liệu người bán cho các sản phẩm đã seed theo seller_id
UPDATE catalog_products
SET 
    stock_quantity = 10,
    seller_name = 'Trần Thị Seller'
WHERE seller_id = '01a15822-3fd0-7b39-ad01-f11da72d5b80';

-- 3. Cập nhật cụ thể cho sản phẩm ID 3 (Máy ảnh Leica Q3)
UPDATE catalog_products
SET 
    stock_quantity = 5,
    seller_name = 'Trần Thị Seller'
WHERE id = 3 OR slug = 'may-anh-leica-q3-full-frame-compact';
