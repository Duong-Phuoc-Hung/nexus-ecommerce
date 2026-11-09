-- =============================================================================
-- Migration V6: Tạo bảng lưu danh sách sản phẩm yêu thích (Wishlist) của Buyer
-- Bounded Context: Catalog Service (nexus_catalog_db - Port 5433)
-- =============================================================================

CREATE TABLE IF NOT EXISTS catalog_favorites (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_product_favorite UNIQUE (user_id, product_id),
    CONSTRAINT fk_favorite_product FOREIGN KEY (product_id) REFERENCES catalog_products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_favorite_user ON catalog_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_product ON catalog_favorites(product_id);
