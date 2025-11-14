# 🚀 Quick Setup Guide: Mountain Watch Space

## What's New?
- ✅ **Usernames**: Users now have readable identifiers (e.g., `beableed02`)
- ✅ **Space Slugs**: Spaces have URL-friendly names (e.g., `mountain-watch`)
- ✅ **Default Space**: Mountain Watch is automatically created as a permanent workspace

## Step 1: Run the Database Migration

1. **Open Neon Console**: https://console.neon.tech
2. **Navigate to**: Your project → SQL Editor
3. **Copy and paste** the entire contents of `migration_add_identifiers.sql`
4. **Click "Run"**

The migration will:
- Add `username` column to users table
- Add `space_slug` column to spaces table  
- Create the Mountain Watch space with code `MOUNTAINWATCH`
- Add you as the owner of Mountain Watch
- Generate slugs for all existing spaces

## Step 2: Verify the Migration

Run these queries in Neon SQL Editor to confirm:

```sql
-- Check users have usernames
SELECT id, username, email FROM users;

-- Check spaces have slugs
SELECT id, name, space_slug, invitation_code FROM spaces;

-- Verify Mountain Watch exists
SELECT * FROM spaces WHERE space_slug = 'mountain-watch';

-- Check you're a member
SELECT * FROM space_members WHERE space_id = (
  SELECT id FROM spaces WHERE space_slug = 'mountain-watch'
);
```

Expected results:
- ✅ User `beableed02` exists
- ✅ Mountain Watch space with slug `mountain-watch` exists
- ✅ Invitation code is `MOUNTAINWATCH`
- ✅ You're listed as owner

## Step 3: Deploy to Netlify

```powershell
cd d:\Portal-UI_Deployment\Portal-UI\portal-ui-static
netlify deploy --prod
```

## Step 4: Test the Invitation Flow

1. **Login**: https://inspectionapptest.netlify.app/login
2. **Go to Spaces**: https://inspectionapptest.netlify.app/spaces.html
3. **See Mountain Watch**: Should appear as a default space
4. **Copy Invitation Link**: Click "🔗 Copy Link" button
5. **Test in Incognito**: Open the link in a private window
6. **Verify**: Should show invitation page with Mountain Watch details

## Invitation Link Format

The new invitation links look like:
```
https://inspectionapptest.netlify.app/invite.html?code=MOUNTAINWATCH
```

Much better than just sharing a code!

## Mountain Watch Space Details

- **Name**: Mountain Watch
- **Slug**: `mountain-watch`
- **Code**: `MOUNTAINWATCH`
- **URL**: `https://inspectionapptest.netlify.app/space-detail.html?slug=mountain-watch`
- **Invitation**: `https://inspectionapptest.netlify.app/invite.html?code=MOUNTAINWATCH`
- **Public**: Yes (anyone with link can join)
- **Max Members**: 100
- **Owner**: beableed02@gmail.com

## URL Examples

### Old Way (Numeric IDs)
- Space: `/space-detail.html?id=1` ❌
- Profile: `/profile?userId=1` ❌

### New Way (Human-Readable)
- Space: `/space-detail.html?slug=mountain-watch` ✅
- Profile: `/profile?username=beableed02` ✅

## Troubleshooting

### "Column already exists"
The migration checks for existing columns. If you see this error, the columns are already added. Check with:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'username';
```

### "Space already exists"
The migration uses `ON CONFLICT DO NOTHING`, so it won't create duplicates. Check:
```sql
SELECT * FROM spaces WHERE space_slug = 'mountain-watch';
```

### "No username for existing users"
Run the username update manually:
```sql
UPDATE users 
SET username = split_part(email, '@', 1)
WHERE username IS NULL;
```

## What's Working Now?

✅ Login/Register with usernames
✅ Space creation with automatic slug generation
✅ Invitation links with full URL
✅ Mountain Watch as default space
✅ Space cards show slug URLs
✅ Better database structure

## Next: Update Space Detail Page

The space detail page still uses `?id=X` URLs. Next session we can:
1. Update `space-detail.html` to accept `?slug=` parameter
2. Modify the backend to query by slug
3. Add username mentions in widgets
4. Create profile pages with username URLs
