-- Add user_id to listings table
ALTER TABLE listings ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

-- Update existing listings to link to users by email if possible (assuming seller is name, which is not unique, but it's a start)
-- In a real migration we would need more logic, but for now let's just add the column.
