BEGIN;

CREATE TABLE IF NOT EXISTS catalog_moderation_reports (
  case_id VARCHAR(36) NOT NULL REFERENCES catalog_moderation_cases(id) ON DELETE CASCADE,
  reporter_id VARCHAR(36) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (case_id, reporter_id)
);

INSERT INTO catalog_moderation_reports (case_id, reporter_id, reason, created_at)
SELECT id, reporter_id, report_reason, created_at FROM catalog_moderation_cases
WHERE reporter_id IS NOT NULL AND report_reason IS NOT NULL
ON CONFLICT (case_id, reporter_id) DO NOTHING;

COMMIT;
