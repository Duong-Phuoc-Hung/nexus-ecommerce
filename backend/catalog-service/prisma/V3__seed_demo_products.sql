-- =============================================================================
-- Project Nexus - Catalog Service Seed Products & Images (SRS 3.3)
-- Database: PostgreSQL (nexus_catalog_db - Port 5433)
-- =============================================================================

-- 0. Đảm bảo cột seller_id chấp nhận chuỗi UUID (đồng bộ với user-service)
ALTER TABLE catalog_products ALTER COLUMN seller_id TYPE VARCHAR(36) USING seller_id::varchar;

-- 1. Bổ sung các danh mục sản phẩm phong phú
INSERT INTO catalog_categories (id, name, slug, description, parent_id, level, is_active, display_order)
VALUES 
(14, 'Âm thanh & Tai nghe', 'am-thanh-tai-nghe', 'Tai nghe cao cấp, loa Bluetooth, mâm đĩa than', 1, 2, TRUE, 3),
(15, 'Máy ảnh & Nhiếp ảnh', 'may-anh-nhiep-anh', 'Máy ảnh mirrorless, ống kính cao cấp, máy ảnh film', 1, 2, TRUE, 4),
(16, 'Đồng hồ cao cấp', 'dong-ho-cao-cap', 'Đồng hồ cơ khí Thụy Sĩ, đồng hồ thể thao xa xỉ', 2, 2, TRUE, 3),
(17, 'Nhà thông minh & Đời sống', 'nha-thong-minh-doi-song', 'Robot hút bụi, thiết bị gia dụng tự động, smart home', 3, 2, TRUE, 1),
(18, 'Đồ sưu tầm & Nghệ thuật', 'do-suu-tam-nghe-thuat', 'Mô hình Lego, đồ chơi nghệ thuật, tranh ảnh, đồ cổ', 3, 2, TRUE, 2)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, description = EXCLUDED.description;

SELECT setval('catalog_categories_id_seq', (SELECT MAX(id) FROM catalog_categories));

-- 2. Thêm 15 sản phẩm mẫu thực tế trải đều các danh mục
-- Người bán: a0000000-0000-0000-0000-000000000002 (Trần Thị Seller)
INSERT INTO catalog_products (id, seller_id, category_id, title, slug, description, status, condition, base_price, allow_auction)
VALUES 
(
    1,
    'a0000000-0000-0000-0000-000000000002',
    100,
    'iPhone 15 Pro Max 256GB Titan Tự Nhiên',
    'iphone-15-pro-max-256gb-titan-tu-nhien',
    'Flagship cao cấp nhất của Apple với khung viền Titan siêu nhẹ, camera tiềm vọng 5x và chip A17 Pro mạnh mẽ bậc nhất.',
    'ACTIVE',
    'NEW',
    29990000.00,
    TRUE
),
(
    2,
    'a0000000-0000-0000-0000-000000000002',
    102,
    'MacBook Pro 14 inch M3 Pro 18GB/512GB Space Black',
    'macbook-pro-14-m3-pro-space-black',
    'Cỗ máy sáng tạo chuyên nghiệp thế hệ mới. Màn hình Liquid Retina XDR 120Hz siêu sáng, pin 18 tiếng liên tục.',
    'ACTIVE',
    'NEW',
    49990000.00,
    FALSE
),
(
    3,
    'a0000000-0000-0000-0000-000000000002',
    15,
    'Máy ảnh Leica Q3 Full-Frame Compact Camera',
    'may-anh-leica-q3-full-frame-compact',
    'Kiệt tác nhiếp ảnh từ Đức với cảm biến BSI CMOS 60MP, ống kính huyền thoại Leica Summilux 28mm f/1.7 ASPH sắc nét từng chi tiết.',
    'ACTIVE',
    'NEW',
    145000000.00,
    TRUE
),
(
    4,
    'a0000000-0000-0000-0000-000000000002',
    14,
    'Tai nghe chống ồn Sony WH-1000XM5 Silver',
    'tai-nghe-chong-on-sony-wh-1000xm5-silver',
    'Đỉnh cao chống ồn chủ động công nghiệp với bộ xử lý tích hợp V1 và QN1. Đệm tai da êm ái, thời lượng pin 30 giờ.',
    'ACTIVE',
    'LIKE_NEW',
    8490000.00,
    TRUE
),
(
    5,
    'a0000000-0000-0000-0000-000000000002',
    16,
    'Đồng hồ Rolex Submariner Date 41mm Oystersteel',
    'dong-ho-rolex-submariner-date-41mm-oystersteel',
    'Biểu tượng đồng hồ lặn biển kinh điển thế giới. Khung thép 904L chống ăn mòn, vành Cerachrom đen gốm siêu cứng chống xước.',
    'ACTIVE',
    'LIKE_NEW',
    285000000.00,
    TRUE
),
(
    6,
    'a0000000-0000-0000-0000-000000000002',
    11,
    'Bàn phím cơ Custom Keychron Q1 Pro Wireless',
    'ban-phim-co-keychron-q1-pro-wireless',
    'Khung nhôm CNC nguyên khối, kết nối Bluetooth 5.1/Type-C, gasket mount êm ái, hỗ trợ QMK/VIA tùy biến toàn diện.',
    'ACTIVE',
    'NEW',
    4650000.00,
    FALSE
),
(
    7,
    'a0000000-0000-0000-0000-000000000002',
    101,
    'Samsung Galaxy S24 Ultra 512GB Titanium Gray',
    'samsung-galaxy-s24-ultra-512gb-titanium-gray',
    'Trang bị hệ thống Galaxy AI đột phá, camera 200MP zoom quang 5x đỉnh cao cùng màn hình phẳng chống chói Dynamic AMOLED 2X.',
    'ACTIVE',
    'NEW',
    31990000.00,
    TRUE
),
(
    8,
    'a0000000-0000-0000-0000-000000000002',
    103,
    'Laptop Gaming ASUS ROG Zephyrus G14 OLED 2024',
    'asus-rog-zephyrus-g14-oled-2024',
    'Thiết kế nhôm nguyên khối siêu mỏng nhẹ với màn hình OLED 3K 120Hz ROG Nebula, trang bị CPU AMD Ryzen 9 8945HS và RTX 4070.',
    'ACTIVE',
    'NEW',
    54990000.00,
    TRUE
),
(
    9,
    'a0000000-0000-0000-0000-000000000002',
    12,
    'Áo khoác da thật nam Biker AllSaints Milo Leather',
    'ao-khoac-da-nam-allsaints-milo-leather',
    'Áo khoác da cừu tự nhiên 100% cao cấp phong cách Biker kinh điển từ thương hiệu Anh Quốc AllSaints, khóa kéo kim loại bất đối xứng.',
    'ACTIVE',
    'NEW',
    12500000.00,
    FALSE
),
(
    10,
    'a0000000-0000-0000-0000-000000000002',
    13,
    'Túi xách Chanel Classic Double Flap Bag Da Caviar',
    'tui-xach-chanel-classic-double-flap-caviar',
    'Tuyệt tác túi xách xa xỉ vượt thời gian của Chanel với da Caviar sần chống xước, khóa xoay mạ vàng 24K đặc trưng.',
    'ACTIVE',
    'LIKE_NEW',
    235000000.00,
    TRUE
),
(
    11,
    'a0000000-0000-0000-0000-000000000002',
    14,
    'Mâm đĩa than Audio-Technica AT-LP120XUSB Direct-Drive',
    'mam-dia-than-audio-technica-at-lp120xusb',
    'Trải nghiệm âm thanh analog thuần khiết, motor truyền động trực tiếp Direct-Drive chống rung, tích hợp preamp và ngõ ra USB.',
    'ACTIVE',
    'NEW',
    10890000.00,
    TRUE
),
(
    12,
    'a0000000-0000-0000-0000-000000000002',
    15,
    'Máy ảnh Film Vintage Canon AE-1 Program kèm Lens 50mm f/1.4',
    'may-anh-film-canon-ae-1-program-50mm-f14',
    'Huyền thoại máy ảnh film 35mm của thập niên 80. Tình trạng sưu tầm xuất sắc 98%, thấu kính trong veo, cơ tốc hoàn hảo.',
    'ACTIVE',
    'LIKE_NEW',
    6500000.00,
    TRUE
),
(
    13,
    'a0000000-0000-0000-0000-000000000002',
    16,
    'Đồng hồ cơ Omega Speedmaster Moonwatch Professional',
    'dong-ho-omega-speedmaster-moonwatch-professional',
    'Chiếc đồng hồ đầu tiên được NASA lựa chọn đồng hành cùng các phi hành gia đặt chân lên Mặt Trăng. Bộ máy Co-Axial Master Chronometer 3861.',
    'ACTIVE',
    'NEW',
    195000000.00,
    TRUE
),
(
    14,
    'a0000000-0000-0000-0000-000000000002',
    17,
    'Robot hút bụi lau nhà thông minh Dreame L20 Ultra',
    'robot-hut-bui-dreame-l20-ultra-smart',
    'Công nghệ tự động giặt giẻ sấy khô nước nóng, lực hút khủng 7000Pa, cánh tay xòe MopExtend lau sát mép tường vượt trội.',
    'ACTIVE',
    'NEW',
    21990000.00,
    FALSE
),
(
    15,
    'a0000000-0000-0000-0000-000000000002',
    18,
    'Mô hình LEGO Icons NASA Apollo 11 Lunar Lander 10266',
    'lego-icons-nasa-apollo-11-lunar-lander-10266',
    'Bộ lắp ráp sưu tầm kỷ niệm 50 năm chuyến đổ bộ Mặt Trăng lịch sử với 1087 chi tiết tinh xảo và 2 phi hành gia Apollo 11.',
    'ACTIVE',
    'NEW',
    3450000.00,
    TRUE
)
ON CONFLICT (id) DO UPDATE 
SET title = EXCLUDED.title,
    base_price = EXCLUDED.base_price,
    description = EXCLUDED.description,
    allow_auction = EXCLUDED.allow_auction;

SELECT setval('catalog_products_id_seq', (SELECT MAX(id) FROM catalog_products));

-- 3. Thêm Album ảnh chất lượng cao từ Unsplash cho từng sản phẩm (15 sản phẩm)
DELETE FROM catalog_product_images WHERE product_id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15);
ALTER SEQUENCE catalog_product_images_id_seq RESTART WITH 1;

INSERT INTO catalog_product_images (product_id, image_url, display_order, is_primary)
VALUES 
-- 1. iPhone 15 Pro Max
(1, 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=85', 1, TRUE),
(1, 'https://images.unsplash.com/photo-1695048133149-6a9788f6c567?auto=format&fit=crop&w=800&q=85', 2, FALSE),

-- 2. MacBook Pro 14 M3 Pro
(2, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=85', 1, TRUE),
(2, 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=800&q=85', 2, FALSE),

-- 3. Leica Q3
(3, 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=85', 1, TRUE),
(3, 'https://images.unsplash.com/photo-1510127034890-7e566e7eb3a7?auto=format&fit=crop&w=800&q=85', 2, FALSE),

-- 4. Tai nghe Sony WH-1000XM5
(4, 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=85', 1, TRUE),
(4, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=85', 2, FALSE),

-- 5. Đồng hồ Rolex Submariner
(5, 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=85', 1, TRUE),
(5, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=85', 2, FALSE),

-- 6. Bàn phím cơ Keychron Q1 Pro
(6, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=85', 1, TRUE),
(6, 'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=800&q=85', 2, FALSE),

-- 7. Samsung Galaxy S24 Ultra
(7, 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=800&q=85', 1, TRUE),

-- 8. ASUS ROG Zephyrus G14 OLED
(8, 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=85', 1, TRUE),
(8, 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=800&q=85', 2, FALSE),

-- 9. Áo khoác da AllSaints Biker
(9, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=85', 1, TRUE),
(9, 'https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?auto=format&fit=crop&w=800&q=85', 2, FALSE),

-- 10. Túi xách Chanel Classic Flap
(10, 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=85', 1, TRUE),
(10, 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=85', 2, FALSE),

-- 11. Mâm đĩa than Audio-Technica
(11, 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=800&q=85', 1, TRUE),
(11, 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=800&q=85', 2, FALSE),

-- 12. Máy ảnh Film Vintage Canon AE-1
(12, 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=85', 1, TRUE),
(12, 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=800&q=85', 2, FALSE),

-- 13. Đồng hồ cơ Omega Speedmaster Moonwatch
(13, 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=85', 1, TRUE),

-- 14. Robot hút bụi Dreame L20 Ultra
(14, 'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=800&q=85', 1, TRUE),

-- 15. Mô hình LEGO Apollo 11
(15, 'https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?auto=format&fit=crop&w=800&q=85', 1, TRUE);

-- 4. Thêm Thông số kỹ thuật chi tiết (Product Attributes)
DELETE FROM catalog_product_attributes WHERE product_id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15);
ALTER SEQUENCE catalog_product_attributes_id_seq RESTART WITH 1;

INSERT INTO catalog_product_attributes (product_id, attribute_key, attribute_value)
VALUES 
-- 1. iPhone 15 Pro Max
(1, 'Màu sắc', 'Titan Tự Nhiên'),
(1, 'Dung lượng lưu trữ', '256GB'),
(1, 'Màn hình', '6.7 inch Super Retina XDR 120Hz'),
(1, 'Chip xử lý', 'Apple A17 Pro (3nm)'),

-- 2. MacBook Pro 14 M3 Pro
(2, 'Chip xử lý', 'Apple M3 Pro (11 CPU, 14 GPU)'),
(2, 'RAM', '18GB Unified Memory'),
(2, 'Ổ cứng SSD', '512GB PCIe'),
(2, 'Màu sắc', 'Space Black (Đen không gian)'),

-- 3. Leica Q3
(3, 'Cảm biến', 'Full-Frame BSI CMOS 60 Megapixels'),
(3, 'Ống kính', 'Leica Summilux 28mm f/1.7 ASPH'),
(3, 'Quay video', '8K 30fps ProRes / H.265'),

-- 4. Sony WH-1000XM5
(4, 'Thời lượng pin', '30 giờ (Bật chống ồn)'),
(4, 'Công nghệ chống ồn', 'Auto NC Optimizer kép'),
(4, 'Bộ giải mã', 'LDAC, AAC, SBC, Hi-Res Audio'),

-- 5. Rolex Submariner
(5, 'Đường kính mặt', '41 mm'),
(5, 'Chất liệu vỏ', 'Thép không gỉ 904L Oystersteel'),
(5, 'Kháng nước', '300 mét / 1000 feet'),

-- 6. Keychron Q1 Pro
(6, 'Layout', '75% (81 phím)'),
(6, 'Chất liệu vỏ', 'Nhôm CNC nguyên khối'),
(6, 'Kết nối', 'Bluetooth 5.1 & Type-C'),

-- 8. ASUS ROG Zephyrus G14
(8, 'CPU', 'AMD Ryzen 9 8945HS (8 nhân, 16 luồng)'),
(8, 'GPU', 'NVIDIA GeForce RTX 4070 8GB GDDR6'),
(8, 'Màn hình', '14 inch 3K OLED 120Hz 0.2ms ROG Nebula'),
(8, 'Trọng lượng', '1.5 kg'),

-- 9. Áo khoác da AllSaints
(9, 'Chất liệu', 'Da cừu 100% tự nhiên (Lambskin)'),
(9, 'Màu sắc', 'Đen nhám (Matte Black)'),
(9, 'Xuất xứ', 'Anh Quốc (United Kingdom)'),

-- 10. Túi xách Chanel Classic Flap
(10, 'Chất liệu', 'Da Caviar sần cao cấp'),
(10, 'Màu sắc', 'Đen viền vàng (Black / Gold Hardware)'),
(10, 'Kích thước', '25.5 x 15.5 x 6.5 cm'),

-- 11. Mâm đĩa than Audio-Technica
(11, 'Truyền động', 'Direct Drive (Truyền động trực tiếp)'),
(11, 'Tốc độ quay', '33-1/3, 45, 78 RPM'),
(11, 'Kim đọc', 'AT-VM95E Dual Magnet Cartridge'),

-- 12. Máy ảnh Film Vintage Canon AE-1
(12, 'Khổ film', '35mm (Film 135)'),
(12, 'Ngàm ống kính', 'Canon FD'),
(12, 'Ống kính đi kèm', 'Canon FD 50mm f/1.4 S.S.C'),

-- 13. Omega Speedmaster Moonwatch
(13, 'Bộ máy', 'Omega Calibre 3861 Lên cót tay (Manual-winding)'),
(13, 'Đường kính', '42 mm'),
(13, 'Mặt kính', 'Kính Hesalite nguyên bản'),

-- 14. Robot hút bụi Dreame L20 Ultra
(14, 'Lực hút', '7000 Pa Vormax'),
(14, 'Dung tích pin', '6400 mAh'),
(14, 'Tính năng trạm sạc', 'Tự đổ bụi, tự giặt giẻ nước nóng & sấy khô'),

-- 15. LEGO Icons Apollo 11
(15, 'Số lượng mảnh ghép', '1087 mảnh'),
(15, 'Độ tuổi khuyên dùng', '16+ (Dòng Icons Người lớn)'),
(15, 'Kích thước mô hình', 'Cao hơn 20cm, rộng 22cm');
