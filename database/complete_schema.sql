-- ============================================
-- PORTAL-UI COMPLETE DATABASE SCHEMA
-- For Neon PostgreSQL
-- ============================================

-- ============================================
-- 1. PORTAL USERS (Main authentication)
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(64) DEFAULT NULL,
    reset_token VARCHAR(64) DEFAULT NULL,
    reset_expires TIMESTAMP NULL DEFAULT NULL,
    last_login TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_active ON users(active);

-- ============================================
-- 2. SPACES (Workspaces/Organizations/Teams)
-- ============================================

CREATE TABLE IF NOT EXISTS spaces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitation_code VARCHAR(12) NOT NULL UNIQUE,
    code_expires_at TIMESTAMP NULL DEFAULT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    max_members INTEGER DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_spaces_owner ON spaces(owner_id);
CREATE INDEX idx_spaces_code ON spaces(invitation_code);
CREATE INDEX idx_spaces_active ON spaces(is_active);
CREATE INDEX idx_spaces_public ON spaces(is_public);

-- ============================================
-- 3. SPACE MEMBERS (Who has access to which spaces)
-- ============================================

DO $$ BEGIN
    CREATE TYPE space_role AS ENUM ('owner', 'admin', 'member', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS space_members (
    id SERIAL PRIMARY KEY,
    space_id INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role space_role DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(space_id, user_id)
);

CREATE INDEX idx_space_members_space ON space_members(space_id);
CREATE INDEX idx_space_members_user ON space_members(user_id);
CREATE INDEX idx_space_members_role ON space_members(role);

-- ============================================
-- 4. SPACE ACTIVITY (Track user activity in spaces)
-- ============================================

DO $$ BEGIN
    CREATE TYPE activity_type AS ENUM (
        'joined_space',
        'left_space',
        'created_inspection',
        'updated_inspection',
        'deleted_inspection',
        'uploaded_file',
        'deleted_file',
        'created_report',
        'updated_report',
        'invited_member',
        'removed_member',
        'updated_settings',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS space_activity (
    id SERIAL PRIMARY KEY,
    space_id INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type activity_type NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_space_activity_space ON space_activity(space_id);
CREATE INDEX idx_space_activity_user ON space_activity(user_id);
CREATE INDEX idx_space_activity_type ON space_activity(activity_type);
CREATE INDEX idx_space_activity_created ON space_activity(created_at DESC);

-- ============================================
-- 5. INSPECTIONS (Space-specific data)
-- Each inspection belongs to a space
-- ============================================

DO $$ BEGIN
    CREATE TYPE inspection_status AS ENUM (
        'draft',
        'in_progress',
        'completed',
        'approved',
        'rejected'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS inspections (
    id SERIAL PRIMARY KEY,
    space_id INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status inspection_status DEFAULT 'draft',
    location VARCHAR(255),
    latitude DECIMAL(10, 8) DEFAULT NULL,
    longitude DECIMAL(11, 8) DEFAULT NULL,
    scheduled_date TIMESTAMP DEFAULT NULL,
    completed_date TIMESTAMP DEFAULT NULL,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inspections_space ON inspections(space_id);
CREATE INDEX idx_inspections_created_by ON inspections(created_by);
CREATE INDEX idx_inspections_assigned_to ON inspections(assigned_to);
CREATE INDEX idx_inspections_status ON inspections(status);
CREATE INDEX idx_inspections_scheduled ON inspections(scheduled_date);

-- ============================================
-- 6. INSPECTION ITEMS (Checklist items per inspection)
-- ============================================

DO $$ BEGIN
    CREATE TYPE item_status AS ENUM ('pass', 'fail', 'na', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS inspection_items (
    id SERIAL PRIMARY KEY,
    inspection_id INTEGER NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    item_name VARCHAR(200) NOT NULL,
    description TEXT,
    status item_status DEFAULT 'pending',
    notes TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inspection_items_inspection ON inspection_items(inspection_id);
CREATE INDEX idx_inspection_items_status ON inspection_items(status);

-- ============================================
-- 7. INSPECTION PHOTOS (Images attached to inspections)
-- ============================================

CREATE TABLE IF NOT EXISTS inspection_photos (
    id SERIAL PRIMARY KEY,
    inspection_id INTEGER NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES inspection_items(id) ON DELETE CASCADE,
    uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    file_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255),
    file_size INTEGER,
    caption TEXT,
    metadata JSONB DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inspection_photos_inspection ON inspection_photos(inspection_id);
CREATE INDEX idx_inspection_photos_item ON inspection_photos(item_id);
CREATE INDEX idx_inspection_photos_uploaded_by ON inspection_photos(uploaded_by);

-- ============================================
-- 8. REPORTS (Generated reports per space)
-- ============================================

CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    space_id INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    inspection_id INTEGER REFERENCES inspections(id) ON DELETE SET NULL,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    report_type VARCHAR(50) DEFAULT 'inspection_summary',
    file_url VARCHAR(500),
    metadata JSONB DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reports_space ON reports(space_id);
CREATE INDEX idx_reports_inspection ON reports(inspection_id);
CREATE INDEX idx_reports_created_by ON reports(created_by);

-- ============================================
-- 9. NOTIFICATIONS (User notifications)
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    space_id INTEGER REFERENCES spaces(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    type VARCHAR(50) DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    link VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_space ON notifications(space_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to tables with updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_spaces_updated_at ON spaces;
CREATE TRIGGER update_spaces_updated_at BEFORE UPDATE ON spaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inspections_updated_at ON inspections;
CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON inspections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inspection_items_updated_at ON inspection_items;
CREATE TRIGGER update_inspection_items_updated_at BEFORE UPDATE ON inspection_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- EXAMPLE: Create "Mountain Watch" Space
-- ============================================

-- This is commented out - uncomment to create the example space
/*
INSERT INTO spaces (name, description, owner_id, invitation_code, is_public, is_active)
VALUES (
    'Mountain Watch',
    'Mountain inspection and monitoring workspace',
    1, -- Assumes user ID 1 exists
    'MTN-WATCH-01',
    FALSE,
    TRUE
)
RETURNING id;

-- Add owner as first member (replace 1 with actual space_id and user_id)
INSERT INTO space_members (space_id, user_id, role)
VALUES (1, 1, 'owner');
*/

-- ============================================
-- SCHEMA SUMMARY
-- ============================================

/*
This schema provides:

1. **users** - Portal users with authentication
2. **spaces** - Workspaces/teams (like "Mountain Watch")
3. **space_members** - Many-to-many: which users belong to which spaces + their roles
4. **space_activity** - Activity log: what users do in each space
5. **inspections** - Space-specific inspection records
6. **inspection_items** - Checklist items for each inspection
7. **inspection_photos** - Photos attached to inspections
8. **reports** - Generated reports per space
9. **notifications** - User notifications

KEY FEATURES:
- Each space is isolated - data belongs to a space
- Users can belong to multiple spaces with different roles
- Activity tracking for auditing
- Proper foreign keys and cascade deletes
- Indexes for performance
- Auto-updating timestamps
*/
