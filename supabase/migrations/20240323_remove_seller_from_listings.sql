-- Add rating to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0.0;

-- Remove seller and seller_rating from listings table
ALTER TABLE listings DROP COLUMN IF EXISTS seller;
ALTER TABLE listings DROP COLUMN IF EXISTS seller_rating;
