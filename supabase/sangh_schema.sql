-- Sangh (groups): public/private groups, members
-- Run in Supabase SQL Editor after users table exists.

CREATE TABLE IF NOT EXISTS sanghs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sanghs_created_by ON sanghs(created_by);
CREATE INDEX IF NOT EXISTS idx_sanghs_is_public ON sanghs(is_public);
CREATE INDEX IF NOT EXISTS idx_sanghs_created_at ON sanghs(created_at DESC);

CREATE TABLE IF NOT EXISTS sangh_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sangh_id UUID NOT NULL REFERENCES sanghs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(sangh_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_sangh_members_sangh ON sangh_members(sangh_id);
CREATE INDEX IF NOT EXISTS idx_sangh_members_user ON sangh_members(user_id);

-- Sangh messages: only admin (creator) can post; all members can read
CREATE TABLE IF NOT EXISTS sangh_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sangh_id UUID NOT NULL REFERENCES sanghs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sangh_messages_sangh ON sangh_messages(sangh_id);
CREATE INDEX IF NOT EXISTS idx_sangh_messages_created ON sangh_messages(created_at DESC);
