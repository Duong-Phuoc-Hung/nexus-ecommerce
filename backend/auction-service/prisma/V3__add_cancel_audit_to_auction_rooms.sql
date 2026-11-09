-- =============================================================================
-- Migration V3: Bo sung thong tin audit huy / dung khan cap phong dau gia (SCRUM-298)
-- Bounded Context: Auction Service (nexus_auction_db - Port 5435)
-- =============================================================================

ALTER TABLE auction_rooms
  ADD COLUMN IF NOT EXISTS cancel_reason VARCHAR(500),
  ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(36),
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_auction_cancelled_by ON auction_rooms (cancelled_by);
