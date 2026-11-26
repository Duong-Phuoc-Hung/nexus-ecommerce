ALTER TABLE catalog_products
  ADD COLUMN IF NOT EXISTS moderation_blocked BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE catalog_product_reviews
  ADD COLUMN IF NOT EXISTS moderated_hidden BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS catalog_moderation_cases (
  id VARCHAR(36) PRIMARY KEY,
  product_id VARCHAR(36) NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,
  review_id VARCHAR(36) REFERENCES catalog_product_reviews(id) ON DELETE CASCADE,
  kind VARCHAR(24) NOT NULL CHECK (kind IN ('NEW_PRODUCT','REPORTED_PRODUCT','REPORTED_REVIEW')),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','CHANGES_REQUESTED','APPROVED','REJECTED')),
  reporter_id VARCHAR(36),
  report_reason VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((kind = 'REPORTED_REVIEW') = (review_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_moderation_queue ON catalog_moderation_cases(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_product ON catalog_moderation_cases(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_moderation_open_product
  ON catalog_moderation_cases(product_id) WHERE status='PENDING' AND review_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_moderation_open_review
  ON catalog_moderation_cases(review_id) WHERE status='PENDING' AND review_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS catalog_moderation_actions (
  id BIGSERIAL PRIMARY KEY,
  case_id VARCHAR(36) NOT NULL REFERENCES catalog_moderation_cases(id) ON DELETE CASCADE,
  actor_id VARCHAR(36) NOT NULL,
  decision VARCHAR(24) NOT NULL CHECK (decision IN ('APPROVE','REQUEST_CHANGES','REJECT','RESUBMIT')),
  reason VARCHAR(500),
  violation_category VARCHAR(40),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moderation_action_case ON catalog_moderation_actions(case_id, id);

CREATE OR REPLACE FUNCTION catalog_guard_moderated_visibility() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.moderation_blocked := true;
    NEW.status := 'DRAFT';
  ELSIF NEW.moderation_blocked AND NEW.status = 'ACTIVE' THEN
    RAISE EXCEPTION 'PRODUCT_MODERATION_REQUIRED' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS catalog_guard_moderated_visibility ON catalog_products;
CREATE TRIGGER catalog_guard_moderated_visibility
BEFORE INSERT OR UPDATE OF status, moderation_blocked ON catalog_products
FOR EACH ROW EXECUTE FUNCTION catalog_guard_moderated_visibility();

CREATE OR REPLACE FUNCTION catalog_enqueue_new_product() RETURNS trigger AS $$
BEGIN
  INSERT INTO catalog_moderation_cases (id, product_id, kind) VALUES (NEW.id, NEW.id, 'NEW_PRODUCT');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS catalog_enqueue_new_product ON catalog_products;
CREATE TRIGGER catalog_enqueue_new_product
AFTER INSERT ON catalog_products FOR EACH ROW EXECUTE FUNCTION catalog_enqueue_new_product();
