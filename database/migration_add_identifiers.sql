-- Migration: Add human-readable identifiers
-- Date: 2025-11-15
-- Purpose: Add username to users table and space_slug to spaces table

-- Step 1: Add username column to users table (unique identifier)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- Step 2: Add space_slug column to spaces table (unique identifier)
ALTER TABLE spaces 
ADD COLUMN IF NOT EXISTS space_slug VARCHAR(100) UNIQUE;

-- Step 3: Create function to generate slug from name
CREATE OR REPLACE FUNCTION generate_slug(input_text TEXT) 
RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(
    regexp_replace(trim(input_text), '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  ));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 4: Update existing users with usernames (using email prefix)
UPDATE users 
SET username = split_part(email, '@', 1)
WHERE username IS NULL;

-- Step 5: Update existing spaces with slugs (using name)
UPDATE spaces 
SET space_slug = generate_slug(name) || '-' || id
WHERE space_slug IS NULL;

-- Step 6: Create default Mountain Watch space
INSERT INTO spaces (
  name, 
  space_slug,
  description, 
  owner_id, 
  invitation_code, 
  is_public, 
  max_members,
  is_active
) VALUES (
  'Mountain Watch',
  'mountain-watch',
  'Official Mountain Watch Inspections workspace. Manage inspections, reports, and team collaboration.',
  1, -- Owner is beableed02@gmail.com (user id 1)
  'MOUNTAINWATCH',
  true,
  100,
  true
) ON CONFLICT (space_slug) DO NOTHING;

-- Step 7: Add the owner as a member of Mountain Watch
INSERT INTO space_members (space_id, user_id, role)
SELECT s.id, 1, 'owner'
FROM spaces s
WHERE s.space_slug = 'mountain-watch'
AND NOT EXISTS (
  SELECT 1 FROM space_members 
  WHERE space_id = s.id AND user_id = 1
);

-- Step 8: Log the creation activity
INSERT INTO space_activity (space_id, user_id, activity_type, description)
SELECT s.id, 1, 'created_space', 'Mountain Watch space initialized as default workspace'
FROM spaces s
WHERE s.space_slug = 'mountain-watch'
AND NOT EXISTS (
  SELECT 1 FROM space_activity 
  WHERE space_id = s.id AND activity_type = 'created_space'
);

-- Step 9: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_spaces_space_slug ON spaces(space_slug);

-- Step 10: Make columns NOT NULL after populating
ALTER TABLE users 
ALTER COLUMN username SET NOT NULL;

ALTER TABLE spaces 
ALTER COLUMN space_slug SET NOT NULL;

-- Verification queries
SELECT 'Users with usernames:' as info, COUNT(*) as count FROM users WHERE username IS NOT NULL;
SELECT 'Spaces with slugs:' as info, COUNT(*) as count FROM spaces WHERE space_slug IS NOT NULL;
SELECT 'Mountain Watch space:' as info, id, name, space_slug, invitation_code FROM spaces WHERE space_slug = 'mountain-watch';
