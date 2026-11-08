-- =============================================================================
-- Migration V2: Chuyển đổi khóa chính id của auction_rooms và product_id sang UUIDv7 (VARCHAR(36))
-- Bounded Context: Auction Service (nexus_auction_db - Port 5435)
-- =============================================================================

-- 1. Xóa tạm thời các ràng buộc khóa ngoại tới auction_rooms(id)
ALTER TABLE auction_bids DROP CONSTRAINT IF EXISTS fk_bid_auction;
ALTER TABLE auction_settlements DROP CONSTRAINT IF EXISTS fk_settlement_auction;
ALTER TABLE auction_extensions DROP CONSTRAINT IF EXISTS fk_extension_auction;

-- 2. Xóa default sequence auto-increment của id
ALTER TABLE auction_rooms ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS auction_rooms_id_seq CASCADE;

-- 3. Đổi kiểu dữ liệu sang VARCHAR(36)
ALTER TABLE auction_rooms ALTER COLUMN id TYPE VARCHAR(36) USING id::VARCHAR(36);
ALTER TABLE auction_rooms ALTER COLUMN product_id TYPE VARCHAR(36) USING product_id::VARCHAR(36);
ALTER TABLE auction_bids ALTER COLUMN auction_id TYPE VARCHAR(36) USING auction_id::VARCHAR(36);
ALTER TABLE auction_settlements ALTER COLUMN auction_id TYPE VARCHAR(36) USING auction_id::VARCHAR(36);
ALTER TABLE auction_settlements ALTER COLUMN order_id TYPE VARCHAR(36) USING order_id::VARCHAR(36);
ALTER TABLE auction_extensions ALTER COLUMN auction_id TYPE VARCHAR(36) USING auction_id::VARCHAR(36);

-- 4. Cập nhật các phiên đấu giá mẫu cũ sang UUIDv7 đồng bộ với catalog_products
UPDATE auction_rooms SET id = '01932f01-0101-7000-8000-000000000001', product_id = '01932f01-0001-7000-8000-000000000001' WHERE id = '1';
UPDATE auction_bids SET auction_id = '01932f01-0101-7000-8000-000000000001' WHERE auction_id = '1';

UPDATE auction_rooms SET id = '01932f01-0102-7000-8000-000000000002', product_id = '01932f01-0001-7000-8000-000000000001' WHERE id = '2';
UPDATE auction_bids SET auction_id = '01932f01-0102-7000-8000-000000000002' WHERE auction_id = '2';

-- 5. Khôi phục lại các ràng buộc khóa ngoại
ALTER TABLE auction_bids ADD CONSTRAINT fk_bid_auction FOREIGN KEY (auction_id) REFERENCES auction_rooms(id) ON DELETE CASCADE;
ALTER TABLE auction_settlements ADD CONSTRAINT fk_settlement_auction FOREIGN KEY (auction_id) REFERENCES auction_rooms(id) ON DELETE RESTRICT;
ALTER TABLE auction_extensions ADD CONSTRAINT fk_extension_auction FOREIGN KEY (auction_id) REFERENCES auction_rooms(id) ON DELETE CASCADE;
