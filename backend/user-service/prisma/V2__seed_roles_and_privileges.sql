-- =============================================================================
-- Project Nexus - Seed Data for User Service (SRS 2.7 & 2.3)
-- Database: nexus_user_db (Port 5432)
-- =============================================================================

-- 1. NẠP 4 VAI TRÒ CHÍNH (SRS Mục 2.3)
INSERT INTO user_roles (role_code, role_name, description) VALUES
('ADMIN', 'Administrator', 'Quản trị viên toàn quyền hệ thống'),
('SELLER', 'Seller', 'Đối tác bán hàng và đấu giá'),
('BUYER', 'Buyer', 'Khách hàng mua sắm và tham gia đấu giá'),
('SUPPORT_STAFF', 'Support Staff', 'Nhân viên hỗ trợ, giải quyết khiếu nại')
ON CONFLICT (role_code) DO UPDATE 
SET role_name = EXCLUDED.role_name,
    description = EXCLUDED.description;

-- 2. NẠP 61 QUYỀN HẠN CHI TIẾT (SRS Mục 2.7 Privileges List)
INSERT INTO user_privileges (code, description) VALUES
-- Auth & Profile
('AUTH.LOGIN', 'Đăng nhập vào hệ thống'),
('AUTH.LOGOUT', 'Đăng xuất khỏi hệ thống'),
('PROFILE.VIEW', 'Xem thông tin cá nhân của mình'),
('PROFILE.UPDATE', 'Cập nhật thông tin cá nhân'),
('PROFILE.CHANGE_PASSWORD', 'Đổi mật khẩu cá nhân'),
('PROFILE.RESET_PASSWORD', 'Đặt lại mật khẩu khi quên'),

-- User Management
('USER.CREATE', 'Tạo tài khoản người dùng'),
('USER.UPDATE', 'Cập nhật thông tin người dùng'),
('USER.DELETE', 'Xóa tài khoản người dùng'),
('USER.VIEW', 'Xem chi tiết tài khoản người dùng'),
('USER.LIST', 'Xem danh sách người dùng'),
('USER.CHANGE_PASSWORD', 'Đổi mật khẩu người dùng'),
('USER.REPUTATION.VIEW', 'Xem điểm uy tín người dùng'),
('USER.REPUTATION.ADJUST', 'Điều chỉnh điểm uy tín người dùng'),

-- Role Management
('ROLE.CREATE', 'Tạo vai trò mới'),
('ROLE.UPDATE', 'Cập nhật vai trò'),
('ROLE.DELETE', 'Xóa vai trò'),
('ROLE.VIEW', 'Xem chi tiết vai trò'),
('ROLE.LIST', 'Xem danh sách vai trò'),

-- Product Management
('PRODUCT.CREATE', 'Tạo mới sản phẩm'),
('PRODUCT.UPDATE', 'Cập nhật thông tin sản phẩm'),
('PRODUCT.DELETE', 'Xóa sản phẩm'),
('PRODUCT.VIEW', 'Xem chi tiết sản phẩm'),
('PRODUCT.LIST', 'Xem danh sách sản phẩm'),
('PRODUCT.SEARCH', 'Tìm kiếm sản phẩm'),

-- Category Management
('CATEGORY.CREATE', 'Tạo danh mục sản phẩm'),
('CATEGORY.UPDATE', 'Cập nhật danh mục'),
('CATEGORY.DELETE', 'Xóa danh mục'),
('CATEGORY.VIEW', 'Xem chi tiết danh mục'),
('CATEGORY.LIST', 'Xem danh sách danh mục'),

-- Cart & Checkout
('CART.CREATE', 'Tạo giỏ hàng'),
('CART.UPDATE', 'Cập nhật giỏ hàng'),
('CART.REMOVE_ITEM', 'Xóa món hàng khỏi giỏ'),
('CART.VIEW', 'Xem giỏ hàng'),
('CHECKOUT.START', 'Bắt đầu quá trình thanh toán'),

-- Order Management
('ORDER.CREATE', 'Tạo đơn hàng'),
('ORDER.CANCEL', 'Hủy đơn hàng'),
('ORDER.VIEW', 'Xem chi tiết đơn hàng'),
('ORDER.LIST', 'Xem danh sách đơn hàng'),
('ORDER.REFUND', 'Yêu cầu hoặc xử lý hoàn tiền'),

-- Auction Management
('AUCTION.CREATE', 'Tạo phiên đấu giá'),
('AUCTION.UPDATE', 'Cập nhật cấu hình phiên đấu giá'),
('AUCTION.CANCEL', 'Hủy phiên đấu giá'),
('AUCTION.ADMIN_CANCEL', 'Quản trị viên cưỡng chế hủy đấu giá'),
('AUCTION.VIEW', 'Xem chi tiết phiên đấu giá'),
('AUCTION.LIST', 'Xem danh sách phiên đấu giá'),
('AUCTION.BID', 'Đặt giá đấu'),
('AUCTION.VIEW_BID_HISTORY', 'Xem lịch sử đặt giá'),

-- Shipping & Fulfillment
('SHIPPING.QUOTE', 'Lấy báo giá vận chuyển'),
('SHIPPING.CREATE_SHIPMENT', 'Tạo vận đơn giao hàng'),
('SHIPPING.VIEW_SHIPMENT', 'Xem chi tiết vận đơn'),
('SHIPPING.UPDATE_STATUS', 'Cập nhật trạng thái giao hàng'),
('SHIPPING.MANUAL_OVERRIDE', 'Can thiệp điều chỉnh vận đơn thủ công'),

-- Reputation
('REPUTATION.VIEW', 'Xem tổng quan điểm uy tín'),
('REPUTATION.RATE', 'Đánh giá đối tác giao dịch'),
('REPUTATION.PENALTY.VIEW', 'Xem lịch sử vi phạm/phạt uy tín'),
('REPUTATION.PENALTY.APPLY', 'Áp dụng hình phạt uy tín'),

-- Notification & System Logs
('NOTIFICATION.VIEW', 'Xem lịch sử thông báo'),
('NOTIFICATION.MANAGE_PREFERENCE', 'Cài đặt cấu hình nhận thông báo'),
('EVENT_LOG.VIEW', 'Xem danh sách nhật ký sự kiện'),
('EVENT_LOG.VIEW_DETAIL', 'Xem chi tiết nhật ký sự kiện'),
('AUDIT_LOG.VIEW', 'Xem nhật ký kiểm toán hệ thống'),
('SYSTEM.CONFIG.VIEW', 'Xem cấu hình hệ thống'),
('SYSTEM.CONFIG.UPDATE', 'Cập nhật cấu hình hệ thống'),
('SYSTEM.HEALTH.VIEW', 'Xem trạng thái sức khỏe hệ thống')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;

-- 3. GÁN QUYỀN CHO 4 VAI TRÒ THEO MA TRẬN SRS MỤC 2.7
-- ADMIN
INSERT INTO user_role_privileges (role_id, privilege_id)
SELECT r.id, p.id 
FROM user_roles r, user_privileges p
WHERE r.role_code = 'ADMIN'
ON CONFLICT DO NOTHING;

-- SELLER
INSERT INTO user_role_privileges (role_id, privilege_id)
SELECT r.id, p.id
FROM user_roles r
CROSS JOIN user_privileges p
WHERE r.role_code = 'SELLER' AND p.code IN (
    'AUTH.LOGIN', 'AUTH.LOGOUT', 'PROFILE.VIEW', 'PROFILE.UPDATE', 'PROFILE.CHANGE_PASSWORD', 'PROFILE.RESET_PASSWORD',
    'PRODUCT.CREATE', 'PRODUCT.UPDATE', 'PRODUCT.DELETE', 'PRODUCT.VIEW', 'PRODUCT.LIST', 'PRODUCT.SEARCH',
    'CATEGORY.VIEW', 'CATEGORY.LIST',
    'ORDER.VIEW', 'ORDER.LIST',
    'AUCTION.CREATE', 'AUCTION.UPDATE', 'AUCTION.CANCEL', 'AUCTION.VIEW', 'AUCTION.LIST', 'AUCTION.VIEW_BID_HISTORY',
    'SHIPPING.QUOTE', 'SHIPPING.VIEW_SHIPMENT',
    'REPUTATION.VIEW', 'REPUTATION.RATE',
    'NOTIFICATION.VIEW', 'NOTIFICATION.MANAGE_PREFERENCE'
)
ON CONFLICT DO NOTHING;

-- BUYER
INSERT INTO user_role_privileges (role_id, privilege_id)
SELECT r.id, p.id
FROM user_roles r
CROSS JOIN user_privileges p
WHERE r.role_code = 'BUYER' AND p.code IN (
    'AUTH.LOGIN', 'AUTH.LOGOUT', 'PROFILE.VIEW', 'PROFILE.UPDATE', 'PROFILE.CHANGE_PASSWORD', 'PROFILE.RESET_PASSWORD',
    'PRODUCT.VIEW', 'PRODUCT.LIST', 'PRODUCT.SEARCH',
    'CATEGORY.VIEW', 'CATEGORY.LIST',
    'CART.CREATE', 'CART.UPDATE', 'CART.REMOVE_ITEM', 'CART.VIEW', 'CHECKOUT.START',
    'ORDER.CREATE', 'ORDER.CANCEL', 'ORDER.VIEW', 'ORDER.LIST',
    'AUCTION.VIEW', 'AUCTION.LIST', 'AUCTION.BID', 'AUCTION.VIEW_BID_HISTORY',
    'SHIPPING.QUOTE', 'SHIPPING.VIEW_SHIPMENT',
    'REPUTATION.VIEW', 'REPUTATION.RATE',
    'NOTIFICATION.VIEW', 'NOTIFICATION.MANAGE_PREFERENCE'
)
ON CONFLICT DO NOTHING;

-- SUPPORT_STAFF
INSERT INTO user_role_privileges (role_id, privilege_id)
SELECT r.id, p.id
FROM user_roles r
CROSS JOIN user_privileges p
WHERE r.role_code = 'SUPPORT_STAFF' AND p.code IN (
    'AUTH.LOGIN', 'AUTH.LOGOUT', 'PROFILE.VIEW', 'PROFILE.UPDATE', 'PROFILE.CHANGE_PASSWORD', 'PROFILE.RESET_PASSWORD',
    'USER.UPDATE', 'USER.VIEW', 'USER.LIST', 'USER.REPUTATION.VIEW',
    'ROLE.VIEW', 'ROLE.LIST',
    'PRODUCT.VIEW', 'PRODUCT.LIST', 'PRODUCT.SEARCH',
    'CATEGORY.VIEW', 'CATEGORY.LIST',
    'ORDER.CANCEL', 'ORDER.VIEW', 'ORDER.LIST', 'ORDER.REFUND',
    'AUCTION.VIEW', 'AUCTION.LIST', 'AUCTION.VIEW_BID_HISTORY',
    'SHIPPING.QUOTE', 'SHIPPING.CREATE_SHIPMENT', 'SHIPPING.VIEW_SHIPMENT', 'SHIPPING.UPDATE_STATUS', 'SHIPPING.MANUAL_OVERRIDE',
    'REPUTATION.VIEW', 'REPUTATION.PENALTY.VIEW',
    'NOTIFICATION.VIEW',
    'EVENT_LOG.VIEW', 'EVENT_LOG.VIEW_DETAIL',
    'SYSTEM.HEALTH.VIEW'
)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. NẠP TÀI KHOẢN QUẢN TRỊ VIÊN MẪU (DEFAULT ADMIN USER CHO TEST AUTH)
-- Email: admin@nexus.internal
-- Mật khẩu gốc: Admin@123
-- -----------------------------------------------------------------------------
INSERT INTO user_users (id, email, phone, password_hash, full_name, identify_number, status, is_deleted)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@nexus.internal',
    '0900000001',
    '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    'System Administrator',
    '001099000001',
    'ACTIVE',
    FALSE
)
ON CONFLICT (email) DO NOTHING;

-- Gán vai trò ADMIN cho tài khoản admin
INSERT INTO user_user_roles (user_id, role_id)
SELECT u.id, r.id
FROM user_users u
CROSS JOIN user_roles r
WHERE u.email = 'admin@nexus.internal' AND r.role_code = 'ADMIN'
ON CONFLICT DO NOTHING;

-- Khởi tạo điểm uy tín 100 cho tài khoản admin
INSERT INTO user_reputations (user_id, trust_level, score, total_orders, total_penalties)
SELECT u.id, 'VIP', 100, 0, 0
FROM user_users u
WHERE u.email = 'admin@nexus.internal'
ON CONFLICT (user_id) DO NOTHING;
