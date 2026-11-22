BEGIN;
ALTER TABLE user_users ALTER COLUMN gender TYPE VARCHAR(20);

CREATE TABLE IF NOT EXISTS user_reputation_events (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES user_users(id) ON DELETE CASCADE,
    delta INT NOT NULL,
    reason TEXT NOT NULL,
    actor_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_reputation_events_recent
    ON user_reputation_events (user_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS user_feature_restrictions (
    user_id VARCHAR(36) NOT NULL REFERENCES user_users(id) ON DELETE CASCADE,
    feature VARCHAR(80) NOT NULL,
    duration_days INT NOT NULL CHECK (duration_days > 0),
    reason TEXT NOT NULL,
    actor_id VARCHAR(36) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, feature)
);

ALTER TABLE user_ratings ADD COLUMN IF NOT EXISTS is_seller_review BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_seller_review_order
    ON user_ratings (from_user_id, order_id) WHERE is_seller_review;
CREATE INDEX IF NOT EXISTS idx_user_seller_review_recent
    ON user_ratings (to_user_id, created_at DESC, id DESC) WHERE is_seller_review;
COMMIT;
