# Database Schema Improvements

## Overview
This migration adds human-readable identifiers to improve data management and URL structure.

## Changes

### 1. Users Table - Username
- **Column Added**: `username VARCHAR(50) UNIQUE NOT NULL`
- **Purpose**: Human-readable identifier for users (e.g., "beableed02" instead of user ID 1)
- **Benefits**:
  - Better for mentions and @-tags
  - URL-friendly profile links: `/profile/beableed02`
  - Easier to remember and share
  - Still have numeric ID for database relations

### 2. Spaces Table - Space Slug
- **Column Added**: `space_slug VARCHAR(100) UNIQUE NOT NULL`
- **Purpose**: URL-friendly identifier for spaces (e.g., "mountain-watch" instead of space ID 3)
- **Benefits**:
  - Clean URLs: `/space/mountain-watch` instead of `/space/3`
  - SEO-friendly
  - Spaces can be renamed without breaking links
  - Easier to identify spaces in logs and analytics

### 3. Default Mountain Watch Space
The migration automatically creates the Mountain Watch space as a permanent workspace:
- **Name**: "Mountain Watch"
- **Slug**: `mountain-watch`
- **Code**: `MOUNTAINWATCH`
- **Owner**: User ID 1 (beableed02@gmail.com)
- **Public**: Yes
- **Max Members**: 100

## How It Works

### Slug Generation
Spaces automatically generate slugs from their names:
- "Mountain Watch" → "mountain-watch"
- "My Team Space" → "my-team-space"
- "Project 2024!" → "project-2024"

If a slug already exists, a timestamp suffix is added:
- "mountain-watch-1234"

### Username Generation
For existing users, usernames are auto-generated from email prefixes:
- "beableed02@gmail.com" → "beableed02"

New users provide usernames during registration.

## API Updates

### Spaces API Now Returns:
```json
{
  "spaces": [
    {
      "id": 1,
      "name": "Mountain Watch",
      "space_slug": "mountain-watch",
      "invitation_code": "MOUNTAINWATCH",
      "user_role": "owner",
      "member_count": 1
    }
  ]
}
```

### Create Space Now Returns:
```json
{
  "space_id": 1,
  "space_slug": "mountain-watch",
  "invitation_code": "ABC123DEF456",
  "name": "Mountain Watch"
}
```

## Migration Steps

1. **Run the SQL migration** in Neon SQL Editor:
   ```bash
   # Copy contents of migration_add_identifiers.sql
   # Paste into Neon SQL Editor
   # Execute
   ```

2. **Verify the migration**:
   ```sql
   -- Check users have usernames
   SELECT id, username, email FROM users;
   
   -- Check spaces have slugs
   SELECT id, name, space_slug, invitation_code FROM spaces;
   
   -- Verify Mountain Watch space exists
   SELECT * FROM spaces WHERE space_slug = 'mountain-watch';
   ```

3. **Deploy updated backend**:
   ```bash
   netlify deploy --prod
   ```

## Database Structure

### Users Table (Updated)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,  -- NEW
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Spaces Table (Updated)
```sql
CREATE TABLE spaces (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  space_slug VARCHAR(100) UNIQUE NOT NULL,  -- NEW
  description TEXT,
  owner_id INTEGER REFERENCES users(id),
  invitation_code VARCHAR(12) UNIQUE NOT NULL,
  code_expires_at TIMESTAMPTZ,
  is_public BOOLEAN DEFAULT false,
  max_members INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Benefits Summary

✅ **Better URLs**: `/space/mountain-watch` instead of `/space/1`
✅ **User-Friendly**: Readable identifiers in logs and UI
✅ **Flexible**: Can rename without breaking references
✅ **Persistent**: Mountain Watch space is always available
✅ **Scalable**: Still use numeric IDs for database efficiency

## Next Steps

1. Update frontend to use space slugs in URLs
2. Add username mentions in chat widgets
3. Create profile pages using usernames
4. Add space slug validation on frontend
