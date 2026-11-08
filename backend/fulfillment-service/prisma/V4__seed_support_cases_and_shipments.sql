-- =============================================================================
-- Project Nexus - Fulfillment Service Migration V4: Seed Demo Support Cases & Shipments
-- =============================================================================

INSERT INTO fulfillment_support_cases (
    id, type, order_id, order_code, user_id, customer, reason, priority, status, created_at, updated_at
) VALUES
(
    'CS-4021', 'Yêu cầu hoàn tiền', 'ord_01hqz555abc', 'NX-ORD-8021', '01a15822-43b8-78c3-a246-16bff78bc6e8', 'Minh Anh',
    'Sản phẩm chưa đúng mô tả', 'Cao', 'PENDING', NOW() - INTERVAL '12 minutes', NOW() - INTERVAL '12 minutes'
),
(
    'CS-4018', 'Khiếu nại giao hàng', 'ord_01hqz888def', 'NX-ORD-8017', '01a15822-43b8-78c3-a246-16bff78bc6e8', 'Quốc Bảo',
    'Đơn hàng giao chậm', 'Trung bình', 'PENDING', NOW() - INTERVAL '46 minutes', NOW() - INTERVAL '46 minutes'
),
(
    'CS-4012', 'Tranh chấp giao dịch', 'ord_01hqz999ghi', 'NX-ORD-8009', '01a15822-43b8-78c3-a246-16bff78bc6e8', 'Thu Hà',
    'Cần xác nhận trạng thái đơn', 'Thấp', 'PENDING', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fulfillment_shipments (
    id, order_id, warehouse_id, carrier_code, tracking_code, shipping_fee, status,
    shipping_address, recipient_name, recipient_phone, city, current_location,
    estimated_delivery_date, actual_delivery_date, created_at, updated_at
) VALUES
(
    'shp_01hqz222trk', 'NX-ORD-8021', 1, 'GHN', 'GHN8829103VN', 32000, 'PICKED_UP',
    '12 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', 'Minh Anh', '0901234567',
    'TP. Hồ Chí Minh', 'TP. Hồ Chí Minh · Trung tâm phân loại Tân Bình',
    NOW() + INTERVAL '2 days', NULL, '2026-10-18T09:12:00.000Z', '2026-10-18T14:30:00.000Z'
),
(
    'shp_02ghtk5908112', 'NX-ORD-8017', 1, 'GHTK', 'GHTK5908112', 45000, 'IN_TRANSIT',
    '45 Tràng Tiền, Hoàn Kiếm, Hà Nội', 'Quốc Bảo', '0912345678',
    'Hà Nội', 'Hà Nội · Bưu cục Cầu Giấy',
    NOW() + INTERVAL '1 day', NULL, '2026-10-17T10:00:00.000Z', '2026-10-18T11:05:00.000Z'
),
(
    'shp_03vtp22100831', 'NX-ORD-8009', 1, 'VIETTEL_POST', 'VTP22100831', 28000, 'DELIVERED',
    '78 Bạch Đằng, Hải Châu, Đà Nẵng', 'Thu Hà', '0923456789',
    'Đà Nẵng', 'Đà Nẵng · Đã giao thành công cho khách hàng',
    '2026-10-17T16:00:00.000Z', '2026-10-17T16:40:00.000Z', '2026-10-16T08:30:00.000Z', '2026-10-17T16:40:00.000Z'
)
ON CONFLICT (id) DO NOTHING;
