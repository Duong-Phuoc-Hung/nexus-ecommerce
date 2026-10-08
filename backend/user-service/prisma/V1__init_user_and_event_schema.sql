-- =============================================================================
-- Project Nexus - User Service Schema DDL (SRS 3.1 & 2.7)
-- Database: PostgreSQL (nexus_user_db - Port 5432)
-- =============================================================================

-- 1. CỤM BẢNG VAI TRÒ & PHÂN QUYỀN
CREATE TABLE IF NOT EXISTS user_roles (
    id BIGSERIAL PRIMARY KEY,
    role_code VARCHAR(50) NOT NULL UNIQUE,
    role_name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_role_name ON user_roles (role_name);

CREATE TABLE IF NOT EXISTS user_privileges (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_role_privileges (
    role_id BIGINT NOT NULL,
    privilege_id BIGINT NOT NULL,
    PRIMARY KEY (role_id, privilege_id),
    CONSTRAINT fk_urp_role FOREIGN KEY (role_id) REFERENCES user_roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_urp_privilege FOREIGN KEY (privilege_id) REFERENCES user_privileges(id) ON DELETE CASCADE
);

-- 2. CỤM BẢNG TÀI KHOẢN NGƯỜI DÙNG
CREATE TABLE IF NOT EXISTS user_users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    identify_number VARCHAR(20) NOT NULL,
    gender VARCHAR(10),
    date_of_birth DATE,
    address VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_full_name ON user_users (full_name);
CREATE INDEX IF NOT EXISTS idx_user_status ON user_users (status);

CREATE TABLE IF NOT EXISTS user_user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_uur_user FOREIGN KEY (user_id) REFERENCES user_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_uur_role FOREIGN KEY (role_id) REFERENCES user_roles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_uprt_user FOREIGN KEY (user_id) REFERENCES user_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_token_user_expires ON user_password_reset_tokens (user_id, expires_at);

-- 3. CỤM BẢNG ĐIỂM UY TÍN & ĐÁNH GIÁ (SRS 3.1.2)
CREATE TABLE IF NOT EXISTS user_reputations (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    trust_level VARCHAR(20) NOT NULL DEFAULT 'NEWBORN',
    score INT NOT NULL DEFAULT 100,
    total_orders INT NOT NULL DEFAULT 0,
    total_penalties INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rep_user FOREIGN KEY (user_id) REFERENCES user_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_ratings (
    id BIGSERIAL PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL,
    from_user_id BIGINT NOT NULL,
    to_user_id BIGINT NOT NULL,
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_order_rating_pair UNIQUE (order_id, from_user_id, to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_rating_to_user ON user_ratings (to_user_id);

CREATE TABLE IF NOT EXISTS user_penalties (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    deduct_score INT NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pen_user FOREIGN KEY (user_id) REFERENCES user_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_penalty_user ON user_penalties (user_id);

-- 4. BẢNG NHẬT KÝ KIỂM TOÁN (SRS 3.1.1)
CREATE TABLE IF NOT EXISTS user_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_id BIGINT NULL,
    action VARCHAR(50) NOT NULL,
    target_resource VARCHAR(50) NOT NULL,
    target_id VARCHAR(64) NOT NULL,
    details TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON user_audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_target ON user_audit_logs (target_resource, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON user_audit_logs (created_at DESC);
