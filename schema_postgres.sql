-- Portal-UI Database Schema for PostgreSQL (Netlify/Neon)
-- Converted from MySQL schema_with_invitations.sql

-- ============================================
-- CORE AUTHENTICATION TABLES
-- ============================================

-- Users table (with password change enforcement)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(64) DEFAULT NULL,
    reset_token VARCHAR(64) DEFAULT NULL,
    reset_expires TIMESTAMP NULL DEFAULT NULL,
    must_change_password BOOLEAN DEFAULT FALSE,
    password_changed_at TIMESTAMP NULL DEFAULT NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_must_change ON users(must_change_password);

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(20) DEFAULT NULL,
    bio TEXT DEFAULT NULL,
    avatar_url VARCHAR(500) DEFAULT NULL,
    preferences JSONB DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(64) NOT NULL UNIQUE,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Login attempts table
CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_login_attempts_email_ip ON login_attempts(email, ip_address);
CREATE INDEX idx_login_attempts_attempted ON login_attempts(attempted_at);

-- ============================================
-- SPACES & INVITATION SYSTEM
-- ============================================

-- Spaces table (teams/organizations/workspaces)
CREATE TABLE IF NOT EXISTS spaces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitation_code VARCHAR(12) NOT NULL UNIQUE,
    code_expires_at TIMESTAMP NULL DEFAULT NULL,
    max_members INTEGER DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_spaces_owner ON spaces(owner_id);
CREATE INDEX idx_spaces_code ON spaces(invitation_code);
CREATE INDEX idx_spaces_active ON spaces(is_active);

-- Space members table (many-to-many with roles)
CREATE TYPE space_role AS ENUM ('owner', 'admin', 'member', 'viewer');

CREATE TABLE IF NOT EXISTS space_members (
    id SERIAL PRIMARY KEY,
    space_id INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role space_role DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    invited_by INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE (space_id, user_id)
);

CREATE INDEX idx_space_members_space ON space_members(space_id);
CREATE INDEX idx_space_members_user ON space_members(user_id);
CREATE INDEX idx_space_members_role ON space_members(role);

-- Invitation usage table (for tracking usage and analytics)
CREATE TABLE IF NOT EXISTS invitation_usage (
    id SERIAL PRIMARY KEY,
    invitation_code VARCHAR(12) NOT NULL,
    space_id INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    used_by INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
    used_at TIMESTAMP NULL DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL
);

CREATE INDEX idx_invitation_usage_code ON invitation_usage(invitation_code);
CREATE INDEX idx_invitation_usage_space ON invitation_usage(space_id);
CREATE INDEX idx_invitation_usage_used_at ON invitation_usage(used_at);

-- ============================================
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spaces_updated_at BEFORE UPDATE ON spaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
