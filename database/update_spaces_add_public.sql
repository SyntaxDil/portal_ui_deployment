-- ============================================
-- Add is_public column to spaces table
-- Run this in Neon SQL Editor
-- ============================================

-- Add is_public column
ALTER TABLE spaces 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Add index for public spaces
CREATE INDEX IF NOT EXISTS idx_spaces_public ON spaces(is_public);

-- Set all existing spaces to private by default
UPDATE spaces SET is_public = FALSE WHERE is_public IS NULL;

-- Also ensure we have the space_members table with proper structure
CREATE TABLE IF NOT EXISTS space_members (
    id SERIAL PRIMARY KEY,
    space_id INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(space_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_space_members_space ON space_members(space_id);
CREATE INDEX IF NOT EXISTS idx_space_members_user ON space_members(user_id);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'spaces'
ORDER BY ordinal_position;
