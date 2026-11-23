-- =============================================================================
-- Project Nexus - Fulfillment Service Seed Data (SRS 3.6)
-- Database: PostgreSQL (nexus_fulfillment_db - Port 5436)
-- =============================================================================

-- 1. NẠP DỮ LIỆU KHO HÀNG MẪU (SRS: Mặc định kho chính là WH_001)
INSERT INTO fulfillment_warehouses (id, code, name, address, city, is_active)
VALUES 
(1, 'WH_001', 'Kho Tổng TP.HCM', 'Khu Công Nghệ Cao, TP. Thủ Đức', 'Hồ Chí Minh', TRUE),
(2, 'WH_002', 'Kho Phân Phối Hà Nội', 'Khu Công Nghiệp Thăng Long, Đông Anh', 'Hà Nội', TRUE)
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name, 
    address = EXCLUDED.address, 
    city = EXCLUDED.city;

-- 2. NẠP DỮ LIỆU ĐỐI TÁC VẬN CHUYỂN (SRS 3.6: Tích hợp các hãng giao nhận chuẩn)
INSERT INTO fulfillment_carriers (id, carrier_code, carrier_name, is_active, api_endpoint)
VALUES 
(1, 'GHN', 'Giao Hàng Nhanh', TRUE, 'https://dev-online-gateway.ghn.vn/shiip/public-api/v2'),
(2, 'GHTK', 'Giao Hàng Tiết Kiệm', TRUE, 'https://services.giaohangtietkiem.vn/services/shipment'),
(3, 'VIETTEL_POST', 'Viettel Post', TRUE, 'https://partner.viettelpost.vn/v2'),
(4, 'JT_EXPRESS', 'J&T Express', TRUE, 'https://vip.jtexpress.vn/api/v1')
ON CONFLICT (carrier_code) DO UPDATE 
SET carrier_name = EXCLUDED.carrier_name,
    api_endpoint = EXCLUDED.api_endpoint;

-- Đặt lại giá trị Sequence tự tăng sau khi chèn dữ liệu chỉ định ID
SELECT setval('fulfillment_warehouses_id_seq', (SELECT MAX(id) FROM fulfillment_warehouses));
SELECT setval('fulfillment_carriers_id_seq', (SELECT MAX(id) FROM fulfillment_carriers));
