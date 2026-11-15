-- =============================================================================
-- Migration V7: Tạo bảng lưu đánh giá và nhận xét sản phẩm (Product Reviews)
-- Bounded Context: Catalog Service (nexus_catalog_db - Port 5433)
-- =============================================================================

CREATE TABLE IF NOT EXISTS catalog_product_reviews (
    id VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    user_name VARCHAR(100),
    rating INT NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_review_product FOREIGN KEY (product_id) REFERENCES catalog_products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_review_product ON catalog_product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_review_user ON catalog_product_reviews(user_id);
