-- Google Sign-In: allow users without password and link Google account.
-- Run in Supabase SQL Editor.

-- Allow NULL password for Google-only users
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

-- Link to Google account (sub from Google ID token)
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;

-- Optional: index for lookups by google_id
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
