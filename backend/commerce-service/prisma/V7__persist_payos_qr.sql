-- Persist the exact payment instructions returned by PayOS for each link.
ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS qr_code TEXT;
ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS bank_bin VARCHAR(20);
ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS account_number VARCHAR(100);
ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS account_name VARCHAR(255);
ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS transfer_description TEXT;
