-- Profile picture: add avatar_url to users table.
-- Run in Supabase SQL Editor if not using migrations.

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
