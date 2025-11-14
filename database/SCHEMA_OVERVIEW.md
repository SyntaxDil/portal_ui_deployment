# Database Schema Overview

## Architecture Concept

Your portal works like this:

```
PORTAL LEVEL (Single Database)
├── Users Table (all portal users)
├── Spaces Table (workspaces like "Mountain Watch")
└── Space Members Table (who has access to which spaces)

SPACE LEVEL (Data isolation within same database)
├── Inspections (belong to a space)
├── Inspection Items (belong to inspections)
├── Photos (belong to inspections)
├── Reports (belong to a space)
└── Activity Logs (track user actions in a space)
```

## Key Relationships

### 1. Users ↔ Spaces (Many-to-Many)
- A user can belong to multiple spaces
- A space can have multiple users
- Linked through `space_members` table

```
users                 space_members              spaces
-----                 -------------              ------
id (1) ------------> user_id                    id (1)
username              space_id <---------------- owner_id
email                 role (owner/admin/member)  name
                      joined_at                  invitation_code
                                                 is_public
```

### 2. Spaces → Data (One-to-Many)
- Each space owns its data
- When you create "Mountain Watch" space, all inspections/reports belong to it

```
spaces (id: 1, name: "Mountain Watch")
  ├── inspections (space_id: 1)
  │   ├── inspection_items
  │   └── inspection_photos
  ├── reports (space_id: 1)
  └── space_activity (space_id: 1)
```

### 3. Activity Tracking
Every action is logged:

```
space_activity
--------------
space_id: 1 (Mountain Watch)
user_id: 2 (beableed02@gmail.com)
activity_type: 'created_inspection'
description: 'Created inspection "Lift A-1 Safety Check"'
created_at: 2025-11-15 10:30:00
```

## Example: Mountain Watch Space

When you create the "Mountain Watch" space:

1. **Record created in `spaces` table:**
```sql
id: 3
name: "Mountain Watch"
owner_id: 2 (beableed02@gmail.com)
invitation_code: "MTN5K8P2X1Q7"
is_public: false
```

2. **Owner added to `space_members`:**
```sql
space_id: 3
user_id: 2
role: 'owner'
```

3. **When you create an inspection:**
```sql
inspections table:
  id: 1
  space_id: 3 (Mountain Watch)
  created_by: 2 (beableed02@gmail.com)
  title: "Chair Lift A-1 Weekly Inspection"
  status: 'draft'
```

4. **Activity logged:**
```sql
space_activity:
  space_id: 3
  user_id: 2
  activity_type: 'created_inspection'
```

## User's Space Access

A user's dashboard shows spaces they belong to:

```sql
-- Get all spaces for user ID 2
SELECT 
    s.id,
    s.name,
    s.description,
    sm.role,
    sm.joined_at,
    (SELECT COUNT(*) FROM space_members WHERE space_id = s.id) as member_count
FROM spaces s
INNER JOIN space_members sm ON s.id = sm.space_id
WHERE sm.user_id = 2;
```

Result:
```
id | name            | role  | member_count
---|-----------------|-------|-------------
1  | Test Space      | owner | 1
3  | Mountain Watch  | owner | 1
```

## Data Isolation

✅ **Same Database, Separate Spaces:**
- All data in one PostgreSQL database (your Neon DB)
- Each space has isolated data via `space_id` foreign key
- Users only see data from spaces they're members of

❌ **NOT:**
- Each space does NOT get its own database
- That would be complex and expensive
- Instead: use `WHERE space_id = X` in all queries

## Security Model

```sql
-- User 2 tries to access inspection from Space 5
-- But user 2 is not a member of Space 5

-- Backend checks:
SELECT 1 FROM space_members
WHERE space_id = 5 AND user_id = 2
-- Returns nothing = Access Denied
```

## Tables You'll Use Most

### Portal Management:
- `users` - Authentication
- `spaces` - Workspaces
- `space_members` - Access control

### Space Data:
- `inspections` - Main inspection records
- `inspection_items` - Checklist items
- `inspection_photos` - Uploaded images
- `space_activity` - Audit trail

### Future Features:
- `reports` - Generated PDFs/exports
- `notifications` - User alerts

## Next Steps

1. **Run the migration SQL** in Neon SQL Editor:
   ```sql
   -- From: database/update_spaces_add_public.sql
   ALTER TABLE spaces ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
   ```

2. **Create Mountain Watch space** (via web UI):
   - Name: "Mountain Watch"
   - Description: "Mountain resort inspection management"
   - Private: ✓ (checked)

3. **Space will auto-generate:**
   - Unique invitation code (e.g., "Q7K3M9P1X5A2")
   - Owner membership for you
   - Ready for inspections!
