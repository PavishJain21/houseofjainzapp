-- Add contact name to shops for seller contact details during onboarding
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);

COMMENT ON COLUMN shops.contact_name IS 'Contact person name for the shop (seller contact)';
