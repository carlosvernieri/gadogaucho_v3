-- Add 'sold' column to listings table
ALTER TABLE listings ADD COLUMN IF NOT EXISTS sold BOOLEAN DEFAULT FALSE;
