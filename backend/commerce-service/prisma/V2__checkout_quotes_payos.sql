-- -----------------------------------------------------------------------------
-- V2: Báo giá checkout, idempotency, giữ hàng và cột PayOS cho commerce_payments
-- (Chỉ bổ sung, không sửa V1)
-- -----------------------------------------------------------------------------

-- 1. Báo giá checkout (hiệu lực 15 phút)
CREATE TABLE IF NOT EXISTS commerce_checkout_quotes (
    id VARCHAR(36) PRIMARY KEY,
    buyer_id VARCHAR(36) NOT NULL,
    seller_id VARCHAR(36) NOT NULL,
    items JSONB NOT NULL,
    shipping_address JSONB NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    shipping_fee DECIMAL(12, 2) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'VND',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quote_buyer ON commerce_checkout_quotes (buyer_id);

-- 2. Khóa Idempotency-Key của checkout (chống double-click tạo 2 đơn)
CREATE TABLE IF NOT EXISTS commerce_checkout_idempotency (
    buyer_id VARCHAR(36) NOT NULL,
    idempotency_key VARCHAR(100) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    order_id BIGINT REFERENCES commerce_orders(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (buyer_id, idempotency_key)
);

-- 3. Giữ hàng tồn kho tạm thời 30 phút (ACTIVE | COMMITTED | RELEASED)
CREATE TABLE IF NOT EXISTS commerce_stock_reservations (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES commerce_orders(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    status VARCHAR(12) NOT NULL DEFAULT 'ACTIVE',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reservation_product ON commerce_stock_reservations (product_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_reservation_order ON commerce_stock_reservations (order_id);

-- 4. Mỗi lần tạo link PayOS là một dòng commerce_payments (tối đa 3 lần/đơn)
ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS payos_order_code BIGINT UNIQUE;
ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS payment_link_id VARCHAR(100);
ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS checkout_url TEXT;
ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- 5. Bộ đếm sinh mã đơn và orderCode số nguyên cho PayOS
CREATE SEQUENCE IF NOT EXISTS commerce_order_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS commerce_payos_order_code_seq START 1000000;
