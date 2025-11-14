-- ============================================
-- QUICK SETUP: Run this in Neon SQL Editor
-- ============================================

-- Step 1: Add is_public column to existing spaces table
ALTER TABLE spaces 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_spaces_public ON spaces(is_public);

-- Step 2: Create space_members table if it doesn't exist
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

-- Step 3: Verify your setup
SELECT 'Users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'Spaces', COUNT(*) FROM spaces
UNION ALL
SELECT 'Space Members', COUNT(*) FROM space_members;

-- Step 4: Check your spaces table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'spaces'
ORDER BY ordinal_position;

-- ============================================
-- READY TO GO!
-- ============================================
-- After running this, you can:
-- 1. Go to https://inspectionapptest.netlify.app/spaces
-- 2. Click "Create Space"
-- 3. Enter "Mountain Watch" as the name
-- 4. Check or uncheck "Make this space public"
-- 5. Click Create Space
-- 
-- The system will:
-- - Generate a unique invitation code
-- - Create the space record
-- - Add you as the owner in space_members
-- - Show you the invitation code to share with others
