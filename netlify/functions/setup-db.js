// Netlify Function: Database Setup
// Run this once to create all database tables

const { getDb } = require('./db');

exports.handler = async (event, context) => {
  try {
    const sql = getDb();
    
    // Create users table
    await sql`
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
      )
    `;
    
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)`;
    
    // Create user_profiles table
    await sql`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        phone VARCHAR(20) DEFAULT NULL,
        bio TEXT DEFAULT NULL,
        avatar_url VARCHAR(500) DEFAULT NULL,
        preferences JSONB DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await sql`CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id)`;
    
    // Create sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_token VARCHAR(64) NOT NULL UNIQUE,
        ip_address VARCHAR(45) DEFAULT NULL,
        user_agent VARCHAR(500) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
      )
    `;
    
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token)`;
    
    // Create login_attempts table
    await sql`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN DEFAULT FALSE
      )
    `;
    
    await sql`CREATE INDEX IF NOT EXISTS idx_login_attempts_email_ip ON login_attempts(email, ip_address)`;
    
    // Create spaces table
    await sql`
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
      )
    `;
    
    await sql`CREATE INDEX IF NOT EXISTS idx_spaces_owner ON spaces(owner_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_spaces_code ON spaces(invitation_code)`;
    
    // Create space_role ENUM type if it doesn't exist
    await sql`
      DO $$ BEGIN
        CREATE TYPE space_role AS ENUM ('owner', 'admin', 'member', 'viewer');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    
    // Create space_members table
    await sql`
      CREATE TABLE IF NOT EXISTS space_members (
        id SERIAL PRIMARY KEY,
        space_id INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role space_role DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        invited_by INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE (space_id, user_id)
      )
    `;
    
    await sql`CREATE INDEX IF NOT EXISTS idx_space_members_space ON space_members(space_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_space_members_user ON space_members(user_id)`;
    
    // Create invitation_usage table
    await sql`
      CREATE TABLE IF NOT EXISTS invitation_usage (
        id SERIAL PRIMARY KEY,
        invitation_code VARCHAR(12) NOT NULL,
        space_id INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
        used_by INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
        used_at TIMESTAMP NULL DEFAULT NULL,
        ip_address VARCHAR(45) DEFAULT NULL
      )
    `;
    
    await sql`CREATE INDEX IF NOT EXISTS idx_invitation_usage_code ON invitation_usage(invitation_code)`;
    
    // Create or replace update trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    // Create triggers for auto-updating timestamps
    await sql`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;
    
    await sql`
      DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
      CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;
    
    await sql`
      DROP TRIGGER IF EXISTS update_spaces_updated_at ON spaces;
      CREATE TRIGGER update_spaces_updated_at BEFORE UPDATE ON spaces
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;
    
    // Get table count
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Database schema created successfully',
        tables_created: tables.length,
        tables: tables.map(t => t.table_name)
      })
    };
    
  } catch (error) {
    console.error('Database setup error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        message: 'Database setup failed',
        error: error.message
      })
    };
  }
};
