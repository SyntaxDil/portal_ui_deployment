-- URGENT: Enable Row Level Security (RLS)
-- This protects your data from unauthorized access via the Neon Data API

-- Step 1: Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_activity ENABLE ROW LEVEL SECURITY;

-- Step 2: Create policies for users table
-- Users can read their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT
  USING (id = current_setting('app.user_id', true)::INTEGER);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE
  USING (id = current_setting('app.user_id', true)::INTEGER);

-- Step 3: Create policies for spaces table
-- Users can view spaces they're members of
CREATE POLICY "Users can view accessible spaces" ON spaces
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM space_members 
      WHERE space_members.space_id = spaces.id 
      AND space_members.user_id = current_setting('app.user_id', true)::INTEGER
    )
    OR is_public = true
  );

-- Space owners can update their spaces
CREATE POLICY "Owners can update spaces" ON spaces
  FOR UPDATE
  USING (owner_id = current_setting('app.user_id', true)::INTEGER);

-- Any authenticated user can create spaces
CREATE POLICY "Authenticated users can create spaces" ON spaces
  FOR INSERT
  WITH CHECK (current_setting('app.user_id', true) IS NOT NULL);

-- Step 4: Create policies for space_members table
-- Users can view members of spaces they belong to
CREATE POLICY "View members of accessible spaces" ON space_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM space_members sm2
      WHERE sm2.space_id = space_members.space_id 
      AND sm2.user_id = current_setting('app.user_id', true)::INTEGER
    )
  );

-- Space owners/admins can manage members
CREATE POLICY "Owners and admins can manage members" ON space_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM spaces 
      WHERE spaces.id = space_members.space_id 
      AND spaces.owner_id = current_setting('app.user_id', true)::INTEGER
    )
    OR
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = space_members.space_id 
      AND sm.user_id = current_setting('app.user_id', true)::INTEGER
      AND sm.role IN ('owner', 'admin')
    )
  );

-- Step 5: Create policies for space_activity table
-- Users can view activity in spaces they're members of
CREATE POLICY "View activity in accessible spaces" ON space_activity
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM space_members 
      WHERE space_members.space_id = space_activity.space_id 
      AND space_members.user_id = current_setting('app.user_id', true)::INTEGER
    )
  );

-- System can insert activity logs
CREATE POLICY "System can log activity" ON space_activity
  FOR INSERT
  WITH CHECK (true);

-- Verification
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'spaces', 'space_members', 'space_activity');

-- Should show 'true' for rowsecurity column
