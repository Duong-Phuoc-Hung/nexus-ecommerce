-- =============================================================================
-- Migration V5: Chuyển đổi khóa chính id của catalog_products sang UUIDv7 (VARCHAR(36))
-- Bounded Context: Catalog Service (nexus_catalog_db - Port 5433)
-- =============================================================================

-- 1. Xóa tạm thời các ràng buộc khóa ngoại tới catalog_products(id)
ALTER TABLE catalog_product_images DROP CONSTRAINT IF EXISTS fk_image_product;
ALTER TABLE catalog_product_attributes DROP CONSTRAINT IF EXISTS fk_attribute_product;

-- 2. Xóa default sequence auto-increment của id
ALTER TABLE catalog_products ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS catalog_products_id_seq CASCADE;

-- 3. Đổi kiểu dữ liệu các cột sang VARCHAR(36)
ALTER TABLE catalog_products ALTER COLUMN id TYPE VARCHAR(36) USING id::VARCHAR(36);
ALTER TABLE catalog_product_images ALTER COLUMN product_id TYPE VARCHAR(36) USING product_id::VARCHAR(36);
ALTER TABLE catalog_product_attributes ALTER COLUMN product_id TYPE VARCHAR(36) USING product_id::VARCHAR(36);

-- 4. Cập nhật các ID cũ (1..15) thành UUIDv7 chuẩn RFC 9562
UPDATE catalog_products SET id = '01932f01-0001-7000-8000-000000000001' WHERE id = '1';
UPDATE catalog_product_images SET product_id = '01932f01-0001-7000-8000-000000000001' WHERE product_id = '1';
UPDATE catalog_product_attributes SET product_id = '01932f01-0001-7000-8000-000000000001' WHERE product_id = '1';

UPDATE catalog_products SET id = '01932f01-0002-7000-8000-000000000002' WHERE id = '2';
UPDATE catalog_product_images SET product_id = '01932f01-0002-7000-8000-000000000002' WHERE product_id = '2';
UPDATE catalog_product_attributes SET product_id = '01932f01-0002-7000-8000-000000000002' WHERE product_id = '2';

UPDATE catalog_products SET id = '01932f01-0003-7000-8000-000000000003' WHERE id = '3';
UPDATE catalog_product_images SET product_id = '01932f01-0003-7000-8000-000000000003' WHERE product_id = '3';
UPDATE catalog_product_attributes SET product_id = '01932f01-0003-7000-8000-000000000003' WHERE product_id = '3';

UPDATE catalog_products SET id = '01932f01-0004-7000-8000-000000000004' WHERE id = '4';
UPDATE catalog_product_images SET product_id = '01932f01-0004-7000-8000-000000000004' WHERE product_id = '4';
UPDATE catalog_product_attributes SET product_id = '01932f01-0004-7000-8000-000000000004' WHERE product_id = '4';

UPDATE catalog_products SET id = '01932f01-0005-7000-8000-000000000005' WHERE id = '5';
UPDATE catalog_product_images SET product_id = '01932f01-0005-7000-8000-000000000005' WHERE product_id = '5';
UPDATE catalog_product_attributes SET product_id = '01932f01-0005-7000-8000-000000000005' WHERE product_id = '5';

UPDATE catalog_products SET id = '01932f01-0006-7000-8000-000000000006' WHERE id = '6';
UPDATE catalog_product_images SET product_id = '01932f01-0006-7000-8000-000000000006' WHERE product_id = '6';
UPDATE catalog_product_attributes SET product_id = '01932f01-0006-7000-8000-000000000006' WHERE product_id = '6';

UPDATE catalog_products SET id = '01932f01-0007-7000-8000-000000000007' WHERE id = '7';
UPDATE catalog_product_images SET product_id = '01932f01-0007-7000-8000-000000000007' WHERE product_id = '7';
UPDATE catalog_product_attributes SET product_id = '01932f01-0007-7000-8000-000000000007' WHERE product_id = '7';

UPDATE catalog_products SET id = '01932f01-0008-7000-8000-000000000008' WHERE id = '8';
UPDATE catalog_product_images SET product_id = '01932f01-0008-7000-8000-000000000008' WHERE product_id = '8';
UPDATE catalog_product_attributes SET product_id = '01932f01-0008-7000-8000-000000000008' WHERE product_id = '8';

UPDATE catalog_products SET id = '01932f01-0009-7000-8000-000000000009' WHERE id = '9';
UPDATE catalog_product_images SET product_id = '01932f01-0009-7000-8000-000000000009' WHERE product_id = '9';
UPDATE catalog_product_attributes SET product_id = '01932f01-0009-7000-8000-000000000009' WHERE product_id = '9';

UPDATE catalog_products SET id = '01932f01-0010-7000-8000-000000000010' WHERE id = '10';
UPDATE catalog_product_images SET product_id = '01932f01-0010-7000-8000-000000000010' WHERE product_id = '10';
UPDATE catalog_product_attributes SET product_id = '01932f01-0010-7000-8000-000000000010' WHERE product_id = '10';

UPDATE catalog_products SET id = '01932f01-0011-7000-8000-000000000011' WHERE id = '11';
UPDATE catalog_product_images SET product_id = '01932f01-0011-7000-8000-000000000011' WHERE product_id = '11';
UPDATE catalog_product_attributes SET product_id = '01932f01-0011-7000-8000-000000000011' WHERE product_id = '11';

UPDATE catalog_products SET id = '01932f01-0012-7000-8000-000000000012' WHERE id = '12';
UPDATE catalog_product_images SET product_id = '01932f01-0012-7000-8000-000000000012' WHERE product_id = '12';
UPDATE catalog_product_attributes SET product_id = '01932f01-0012-7000-8000-000000000012' WHERE product_id = '12';

UPDATE catalog_products SET id = '01932f01-0013-7000-8000-000000000013' WHERE id = '13';
UPDATE catalog_product_images SET product_id = '01932f01-0013-7000-8000-000000000013' WHERE product_id = '13';
UPDATE catalog_product_attributes SET product_id = '01932f01-0013-7000-8000-000000000013' WHERE product_id = '13';

UPDATE catalog_products SET id = '01932f01-0014-7000-8000-000000000014' WHERE id = '14';
UPDATE catalog_product_images SET product_id = '01932f01-0014-7000-8000-000000000014' WHERE product_id = '14';
UPDATE catalog_product_attributes SET product_id = '01932f01-0014-7000-8000-000000000014' WHERE product_id = '14';

UPDATE catalog_products SET id = '01932f01-0015-7000-8000-000000000015' WHERE id = '15';
UPDATE catalog_product_images SET product_id = '01932f01-0015-7000-8000-000000000015' WHERE product_id = '15';
UPDATE catalog_product_attributes SET product_id = '01932f01-0015-7000-8000-000000000015' WHERE product_id = '15';

-- 5. Khôi phục lại các ràng buộc khóa ngoại
ALTER TABLE catalog_product_images ADD CONSTRAINT fk_image_product FOREIGN KEY (product_id) REFERENCES catalog_products(id) ON DELETE CASCADE;
ALTER TABLE catalog_product_attributes ADD CONSTRAINT fk_attribute_product FOREIGN KEY (product_id) REFERENCES catalog_products(id) ON DELETE CASCADE;
