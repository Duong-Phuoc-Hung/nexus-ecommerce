-- =============================================================================
-- Project Nexus - Seed Demo Accounts for Authentication & RBAC (Sprint 1)
-- Database: nexus_user_db (Port 5432)
-- Mật khẩu chung cho tất cả tài khoản: 123456 (Hash BCrypt cost 10)
-- =============================================================================

-- 1. TẠO 4 TÀI KHOẢN GMAIL MẪU (ADMIN, SELLER, BUYER, SUPPORT_STAFF)
INSERT INTO user_users (id, email, phone, password_hash, full_name, identify_number, status, is_deleted)
VALUES 
(
    'a0000000-0000-0000-0000-000000000001',
    'admin@gmail.com',
    '0900000011',
    '$2b$10$4JoMUiITb4AM9v0C3s62k.yEfkesgLxUdbZ6yvbmGQxebIRoIxoay',
    'Admin Quản Trị Viên',
    '001099000002',
    'ACTIVE',
    FALSE
),
(
    'a0000000-0000-0000-0000-000000000002',
    'seller@gmail.com',
    '0900000012',
    '$2b$10$4JoMUiITb4AM9v0C3s62k.yEfkesgLxUdbZ6yvbmGQxebIRoIxoay',
    'Trần Thị Seller',
    '001099000003',
    'ACTIVE',
    FALSE
),
(
    'a0000000-0000-0000-0000-000000000003',
    'buyer@gmail.com',
    '0900000013',
    '$2b$10$4JoMUiITb4AM9v0C3s62k.yEfkesgLxUdbZ6yvbmGQxebIRoIxoay',
    'Nguyễn Văn Buyer',
    '001099000004',
    'ACTIVE',
    FALSE
),
(
    'a0000000-0000-0000-0000-000000000004',
    'staff@gmail.com',
    '0900000014',
    '$2b$10$4JoMUiITb4AM9v0C3s62k.yEfkesgLxUdbZ6yvbmGQxebIRoIxoay',
    'Hoàng Thị Support',
    '001099000005',
    'ACTIVE',
    FALSE
)
ON CONFLICT (email) DO UPDATE 
SET password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name;

-- 2. GÁN ĐÚNG VAI TRÒ (ROLE) CHO TỪNG TÀI KHOẢN
-- Gán ADMIN cho admin@gmail.com
INSERT INTO user_user_roles (user_id, role_id)
SELECT u.id, r.id
FROM user_users u CROSS JOIN user_roles r
WHERE u.email = 'admin@gmail.com' AND r.role_code = 'ADMIN'
ON CONFLICT DO NOTHING;

-- Gán SELLER cho seller@gmail.com
INSERT INTO user_user_roles (user_id, role_id)
SELECT u.id, r.id
FROM user_users u CROSS JOIN user_roles r
WHERE u.email = 'seller@gmail.com' AND r.role_code = 'SELLER'
ON CONFLICT DO NOTHING;

-- Gán BUYER cho buyer@gmail.com
INSERT INTO user_user_roles (user_id, role_id)
SELECT u.id, r.id
FROM user_users u CROSS JOIN user_roles r
WHERE u.email = 'buyer@gmail.com' AND r.role_code = 'BUYER'
ON CONFLICT DO NOTHING;

-- Gán SUPPORT_STAFF cho staff@gmail.com
INSERT INTO user_user_roles (user_id, role_id)
SELECT u.id, r.id
FROM user_users u CROSS JOIN user_roles r
WHERE u.email = 'staff@gmail.com' AND r.role_code = 'SUPPORT_STAFF'
ON CONFLICT DO NOTHING;

-- 3. KHỞI TẠO ĐIỂM UY TÍN (REPUTATION) CHO TỪNG TÀI KHOẢN
INSERT INTO user_reputations (user_id, trust_level, score, total_orders, total_penalties)
SELECT u.id, 'VIP', 100, 0, 0
FROM user_users u WHERE u.email = 'admin@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_reputations (user_id, trust_level, score, total_orders, total_penalties)
SELECT u.id, 'STANDARD', 100, 0, 0
FROM user_users u WHERE u.email = 'seller@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_reputations (user_id, trust_level, score, total_orders, total_penalties)
SELECT u.id, 'NEWBORN', 100, 0, 0
FROM user_users u WHERE u.email = 'buyer@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_reputations (user_id, trust_level, score, total_orders, total_penalties)
SELECT u.id, 'STANDARD', 100, 0, 0
FROM user_users u WHERE u.email = 'staff@gmail.com'
ON CONFLICT (user_id) DO NOTHING;
