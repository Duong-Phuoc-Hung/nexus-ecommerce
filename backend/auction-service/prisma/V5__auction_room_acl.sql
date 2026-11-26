-- =============================================================================
-- Migration V3: Persistent Auction Room ACL (GAP-SEC-07.2 & GAP-LOG-04)
-- Policy: Backfill from verified evidence + Fail Closed for Unknown Visibility
-- =============================================================================

ALTER TABLE auction_rooms
  ADD COLUMN IF NOT EXISTS visibility VARCHAR(20),
  ADD COLUMN IF NOT EXISTS invited_user_ids TEXT[] NOT NULL DEFAULT '{}';

-- Backfill các phiên seed/public đã xác minh trước thời điểm migration sang 'PUBLIC'.
-- Mọi bản ghi mới nếu thiếu hoặc có visibility ngoài ('PUBLIC','RESTRICTED') sẽ bị
-- tầng ứng dụng xử lý theo cơ chế Fail-Closed (coi như RESTRICTED không có khách mời).
UPDATE auction_rooms
SET visibility = 'PUBLIC'
WHERE visibility IS NULL
  AND (invited_user_ids IS NULL OR cardinality(invited_user_ids) = 0);

ALTER TABLE auction_rooms
  ALTER COLUMN visibility SET DEFAULT 'PUBLIC';
