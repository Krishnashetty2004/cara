-- Add clerk_id column for Clerk authentication
ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE;

-- Create index for clerk_id lookups
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);

-- Update existing users: copy google_id to clerk_id if not set
-- This helps with backward compatibility during migration
UPDATE users SET clerk_id = google_id WHERE clerk_id IS NULL;
