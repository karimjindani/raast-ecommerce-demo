-- Additive and repeatable; historical fixture payments remain readable.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payer_type text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payer_reference text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS account_title text;
