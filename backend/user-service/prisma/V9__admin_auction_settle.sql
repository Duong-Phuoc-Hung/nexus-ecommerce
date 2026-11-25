BEGIN;

INSERT INTO user_privileges (code, description)
VALUES ('AUCTION.SETTLE', 'Chốt phiên đấu giá đã hết giờ')
ON CONFLICT (code) DO NOTHING;

INSERT INTO user_role_privileges (role_id, privilege_id)
SELECT r.id, p.id FROM user_roles r JOIN user_privileges p ON p.code = 'AUCTION.SETTLE'
WHERE r.role_code = 'ADMIN'
ON CONFLICT DO NOTHING;

COMMIT;
