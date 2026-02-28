-- Add location to forum_posts (for existing DBs that already ran forum_schema.sql without location)
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS location VARCHAR(255);
