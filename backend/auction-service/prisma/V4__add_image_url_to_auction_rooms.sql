-- =============================================================================
-- Migration V4: Add image_url to auction_rooms
-- SRS 3.5: Support dedicated custom image for auction room
-- =============================================================================

ALTER TABLE auction_rooms ADD COLUMN IF NOT EXISTS image_url VARCHAR(1000);
