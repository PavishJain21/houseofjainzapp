-- Sangh message reactions: members can react to messages with emoji (e.g. 👍 🙏)
-- Run in Supabase SQL Editor after sangh_messages exists.

CREATE TABLE IF NOT EXISTS sangh_message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES sangh_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_sangh_message_reactions_message ON sangh_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_sangh_message_reactions_user ON sangh_message_reactions(user_id);

COMMENT ON TABLE sangh_message_reactions IS 'One reaction per user per message (user can change emoji)';
