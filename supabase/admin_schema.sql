-- Super Admin Schema Updates
-- Run this in Supabase SQL Editor to add admin functionality

-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin'));

-- Create index for role lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Update existing users to have 'user' role (if not set)
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Example: Create a super admin user (update email and password as needed)
-- You can create this manually or through the admin interface
-- INSERT INTO users (email, password, name, religion, role) 
-- VALUES ('admin@example.com', '$2b$10$hashedpassword', 'Super Admin', 'Jain', 'superadmin');

