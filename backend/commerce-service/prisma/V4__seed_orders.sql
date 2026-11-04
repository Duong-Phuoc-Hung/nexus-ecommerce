-- =============================================================================
-- Project Nexus - Commerce Service Migration V4: Seed Demo Orders
-- =============================================================================

INSERT INTO commerce_orders (
    order_code, buyer_id, buyer_name, buyer_email, seller_id, seller_name,
    total_amount, shipping_fee, status, shipping_address, tracking_code,
    timeline, created_at, updated_at
) VALUES 
(
    'NX-ORD-8021', 'usr_01hqz789abc', 'Minh Anh', 'minhanh@example.com',
    'usr_seller_001', 'Nexus Audio', 1290000, 0, 'PROCESSING',
    '{"name": "Minh Anh", "email": "minhanh@example.com"}'::jsonb,
    'GHN8829103VN',
    '[{"status": "CREATED", "title": "Đơn hàng được tạo", "timestamp": "2026-10-28T09:00:00Z"}, {"status": "PAID", "title": "Đã xác nhận thanh toán", "timestamp": "2026-10-28T09:02:00Z"}, {"status": "PROCESSING", "title": "Chờ người bán xử lý", "timestamp": "2026-10-29T10:00:00Z"}]'::jsonb,
    NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'
),
(
    'NX-ORD-8017', 'usr_01hqz789def', 'Quốc Bảo', 'quocbao@example.com',
    'usr_seller_002', 'Retro Lab', 2450000, 0, 'SHIPPED',
    '{"name": "Quốc Bảo", "email": "quocbao@example.com"}'::jsonb,
    'GHTK5908112',
    '[{"status": "CREATED", "title": "Đơn hàng được tạo", "timestamp": "2026-10-27T08:00:00Z"}, {"status": "PAID", "title": "Đã xác nhận thanh toán", "timestamp": "2026-10-27T08:03:00Z"}, {"status": "SHIPPED", "title": "Đã bàn giao vận chuyển cho GHTK", "timestamp": "2026-10-28T11:00:00Z"}]'::jsonb,
    NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days'
),
(
    'NX-ORD-8009', 'usr_01hqz789ghi', 'Thu Hà', 'thuha@example.com',
    'usr_seller_003', 'Nexus Sport', 890000, 0, 'DELIVERED',
    '{"name": "Thu Hà", "email": "thuha@example.com"}'::jsonb,
    'VTP22100831',
    '[{"status": "CREATED", "title": "Đơn hàng được tạo", "timestamp": "2026-10-26T14:00:00Z"}, {"status": "PAID", "title": "Đã xác nhận thanh toán", "timestamp": "2026-10-26T14:01:00Z"}, {"status": "DELIVERED", "title": "Giao hàng hoàn tất thành công", "timestamp": "2026-10-27T16:00:00Z"}]'::jsonb,
    NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days'
),
(
    'NX-ORD-7998', 'usr_01hqz789jkl', 'Gia Huy', 'giahuy@example.com',
    'usr_seller_004', 'Home & Co.', 480000, 0, 'CANCELLED',
    '{"name": "Gia Huy", "email": "giahuy@example.com"}'::jsonb,
    '—',
    '[{"status": "CREATED", "title": "Đơn hàng được tạo", "timestamp": "2026-10-25T10:00:00Z"}, {"status": "CANCELLED", "title": "Đã hủy đơn hàng theo yêu cầu khách hàng", "timestamp": "2026-10-26T09:00:00Z"}]'::jsonb,
    NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days'
),
(
    'ord_01hqz555abc', 'usr_01hqz789abc', 'Nguyen Van Buyer', 'buyer.test@nexus-ecommerce.com',
    'usr_01hqz333sel', 'Nexus Official Store', 399.99, 0, 'PAID',
    '{"name": "Nguyen Van Buyer", "email": "buyer.test@nexus-ecommerce.com"}'::jsonb,
    'GHN112233VN',
    '[{"status": "CREATED", "title": "Đơn hàng được tạo", "timestamp": "2026-11-02T00:00:00Z"}, {"status": "PAID", "title": "Đã xác nhận thanh toán PayOS", "timestamp": "2026-11-02T00:05:00Z"}]'::jsonb,
    NOW(), NOW()
)
ON CONFLICT (order_code) DO NOTHING;

-- Insert items for orders
INSERT INTO commerce_order_items (order_id, product_id, product_title, unit_price, quantity, subtotal)
SELECT o.id, 'prod_nexus_air', 'Tai nghe không dây Nexus Air', 1290000, 1, 1290000
FROM commerce_orders o WHERE o.order_code = 'NX-ORD-8021'
AND NOT EXISTS (SELECT 1 FROM commerce_order_items oi WHERE oi.order_id = o.id);

INSERT INTO commerce_order_items (order_id, product_id, product_title, unit_price, quantity, subtotal)
SELECT o.id, 'prod_retro_35', 'Máy ảnh film Retro 35', 2450000, 1, 2450000
FROM commerce_orders o WHERE o.order_code = 'NX-ORD-8017'
AND NOT EXISTS (SELECT 1 FROM commerce_order_items oi WHERE oi.order_id = o.id);

INSERT INTO commerce_order_items (order_id, product_id, product_title, unit_price, quantity, subtotal)
SELECT o.id, 'prod_sport_s2', 'Đồng hồ thể thao S2', 890000, 1, 890000
FROM commerce_orders o WHERE o.order_code = 'NX-ORD-8009'
AND NOT EXISTS (SELECT 1 FROM commerce_order_items oi WHERE oi.order_id = o.id);

INSERT INTO commerce_order_items (order_id, product_id, product_title, unit_price, quantity, subtotal)
SELECT o.id, 'prod_lamp_nordic', 'Đèn bàn tối giản', 480000, 1, 480000
FROM commerce_orders o WHERE o.order_code = 'NX-ORD-7998'
AND NOT EXISTS (SELECT 1 FROM commerce_order_items oi WHERE oi.order_id = o.id);

INSERT INTO commerce_order_items (order_id, product_id, product_title, unit_price, quantity, subtotal)
SELECT o.id, 'prod_01hqz999xyz', 'Nexus Pro Audio Wireless', 399.99, 1, 399.99
FROM commerce_orders o WHERE o.order_code = 'ord_01hqz555abc'
AND NOT EXISTS (SELECT 1 FROM commerce_order_items oi WHERE oi.order_id = o.id);
