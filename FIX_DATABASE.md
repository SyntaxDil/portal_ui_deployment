# 🔧 Fix the Database - Step by Step

## The Error You're Seeing

`relation "users" does not exist` means the database tables haven't been created yet.

---

## Fix It in 3 Steps:

### Step 1: Open Neon Database Console

Visit: **https://console.neon.tech/app/projects**

1. Click on your project (should see `neondb`)
2. Click **SQL Editor** (left sidebar)

### Step 2: Create the Tables

Copy and paste this SQL into the editor:

\`\`\`sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Spaces table
CREATE TABLE IF NOT EXISTS spaces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

3. Click **Run** button
4. You should see: "Tables created successfully!"

### Step 3: Redeploy Netlify

\`\`\`powershell
cd d:\\Portal-UI_Deployment\\Portal-UI\\portal-ui-static
netlify deploy --prod
\`\`\`

---

## Then Test Registration

Visit: https://inspectionapptest.netlify.app/register

Try creating an account - it should work!

---

## What Each Service Does:

| Service | What It Does | Cost |
|---------|-------------|------|
| **Netlify** | Hosts your website + runs API functions | FREE |
| **Neon** | Stores your user data (PostgreSQL database) | FREE |

You need BOTH:
- Netlify = the restaurant (serves your app)
- Neon = the kitchen/storage (keeps your data)

---

## Quick Link

Open Neon Console: https://console.neon.tech/app/projects

(See file: SETUP_DATABASE.sql for the SQL code)
