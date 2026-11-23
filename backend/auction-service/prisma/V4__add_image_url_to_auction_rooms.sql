-- =============================================================================
-- Migration V4: Add image_url to auction_rooms
-- SRS 3.5: Support dedicated custom image for auction room (supports long URLs and Base64 Data URLs)
-- =============================================================================

ALTER TABLE auction_rooms ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE auction_rooms ALTER COLUMN image_url TYPE TEXT;
