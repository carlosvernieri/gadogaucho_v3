-- Add 'verification_requested' column to listings table
ALTER TABLE listings ADD COLUMN IF NOT EXISTS verification_requested BOOLEAN DEFAULT FALSE;
