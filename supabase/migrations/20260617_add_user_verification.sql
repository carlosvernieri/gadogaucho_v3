-- Add user verification columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS verification_document_url TEXT,
ADD COLUMN IF NOT EXISTS verification_selfie_url TEXT,
ADD COLUMN IF NOT EXISTS verification_rejected_reason TEXT;

-- Add check constraint for verification_status values
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS chk_verification_status;
ALTER TABLE public.users ADD CONSTRAINT chk_verification_status CHECK (verification_status IN ('none', 'pending', 'verified', 'rejected'));
