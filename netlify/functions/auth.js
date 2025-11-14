// Netlify Function: Authentication API
// Handles user registration, login, logout, and session management

const bcrypt = require('bcryptjs');
const { getDb } = require('./db');

// Helper functions
function jsonResponse(statusCode, success, message, data = null) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // Update with your Netlify domain
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY'
    },
    body: JSON.stringify({
      success,
      message,
      data
    })
  };
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function generateToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getClientIP(event) {
  return event.headers['x-forwarded-for']?.split(',')[0] || 
         event.headers['client-ip'] || 
         '0.0.0.0';
}

async function checkRateLimit(sql, email, ip) {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  const attempts = await sql`
    SELECT COUNT(*) as count 
    FROM login_attempts 
    WHERE (email = ${email} OR ip_address = ${ip}) 
    AND success = false 
    AND attempted_at > ${fifteenMinutesAgo}
  `;
  return attempts[0].count < 5;
}

async function logLoginAttempt(sql, email, ip, success) {
  await sql`
    INSERT INTO login_attempts (email, ip_address, success) 
    VALUES (${email}, ${ip}, ${success})
  `;
}

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(200, true, 'OK');
  }

  try {
    const sql = getDb();
    const params = new URLSearchParams(event.rawQuery || '');
    const action = params.get('action');
    const body = event.body ? JSON.parse(event.body) : {};

    switch (action) {
      case 'register':
        if (event.httpMethod !== 'POST') {
          return jsonResponse(405, false, 'Method not allowed');
        }

        const { email, password, full_name, invitation_code } = body;

        // Validation
        if (!validateEmail(email)) {
          return jsonResponse(400, false, 'Invalid email address');
        }

        if (password.length < 8) {
          return jsonResponse(400, false, 'Password must be at least 8 characters');
        }

        if (!full_name || full_name.trim() === '') {
          return jsonResponse(400, false, 'Full name is required');
        }

        // Check if email exists
        const existingUser = await sql`
          SELECT id FROM users WHERE email = ${email}
        `;
        
        if (existingUser.length > 0) {
          return jsonResponse(409, false, 'Email already registered');
        }

        // Validate invitation code if provided
        let spaceId = null;
        if (invitation_code) {
          const codeUpper = invitation_code.toUpperCase().trim();
          const space = await sql`
            SELECT s.id, s.max_members, s.code_expires_at, s.is_active,
                   COUNT(sm.user_id) as member_count
            FROM spaces s
            LEFT JOIN space_members sm ON s.id = sm.space_id
            WHERE s.invitation_code = ${codeUpper}
            GROUP BY s.id, s.max_members, s.code_expires_at, s.is_active
          `;

          if (space.length === 0) {
            return jsonResponse(404, false, 'Invalid invitation code');
          }

          if (!space[0].is_active) {
            return jsonResponse(410, false, 'This space is no longer active');
          }

          if (space[0].code_expires_at && new Date(space[0].code_expires_at) < new Date()) {
            return jsonResponse(410, false, 'Invitation code has expired');
          }

          if (space[0].max_members && parseInt(space[0].member_count) >= space[0].max_members) {
            return jsonResponse(409, false, 'Space has reached maximum member limit');
          }

          spaceId = space[0].id;
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);
        const verificationToken = generateToken();

        // Create user
        const newUser = await sql`
          INSERT INTO users (email, password_hash, full_name, verification_token, must_change_password)
          VALUES (${email}, ${passwordHash}, ${full_name}, ${verificationToken}, true)
          RETURNING id
        `;

        const userId = newUser[0].id;

        // Create user profile
        await sql`
          INSERT INTO user_profiles (user_id)
          VALUES (${userId})
        `;

        // Add to space if invitation code was used
        if (spaceId) {
          await sql`
            INSERT INTO space_members (space_id, user_id, role)
            VALUES (${spaceId}, ${userId}, 'member')
          `;

          await sql`
            INSERT INTO invitation_usage (invitation_code, space_id, used_by, used_at, ip_address)
            VALUES (${invitation_code.toUpperCase()}, ${spaceId}, ${userId}, NOW(), ${getClientIP(event)})
          `;
        }

        let message = 'Registration successful. Please check your email to verify your account.';
        if (spaceId) {
          message += ' You have been added to the space.';
        }

        return jsonResponse(200, true, message, {
          user_id: userId,
          email: email,
          space_joined: !!spaceId
        });

      case 'login':
        if (event.httpMethod !== 'POST') {
          return jsonResponse(405, false, 'Method not allowed');
        }

        const loginEmail = body.email?.trim() || '';
        const loginPassword = body.password || '';
        const rememberMe = body.remember_me || false;
        const ip = getClientIP(event);

        // Rate limiting
        if (!(await checkRateLimit(sql, loginEmail, ip))) {
          await logLoginAttempt(sql, loginEmail, ip, false);
          return jsonResponse(429, false, 'Too many failed attempts. Please try again in 15 minutes.');
        }

        // Get user
        const users = await sql`
          SELECT id, email, password_hash, full_name, is_active, email_verified, must_change_password
          FROM users
          WHERE email = ${loginEmail}
        `;

        if (users.length === 0) {
          await logLoginAttempt(sql, loginEmail, ip, false);
          return jsonResponse(401, false, 'Invalid email or password');
        }

        const user = users[0];

        // Verify password
        const passwordMatch = await bcrypt.compare(loginPassword, user.password_hash);
        if (!passwordMatch) {
          await logLoginAttempt(sql, loginEmail, ip, false);
          return jsonResponse(401, false, 'Invalid email or password');
        }

        if (!user.is_active) {
          return jsonResponse(403, false, 'Account is disabled. Please contact support.');
        }

        // Successful login
        await logLoginAttempt(sql, loginEmail, ip, true);

        // Check if password change is required
        if (user.must_change_password) {
          const tempToken = generateToken();
          
          return jsonResponse(200, false, 'Password change required', {
            redirect: `./change-password.html?user_id=${user.id}&temp_token=${tempToken}`,
            requires_password_change: true
          });
        }

        // Update last login
        await sql`
          UPDATE users SET last_login = NOW() WHERE id = ${user.id}
        `;

        // Create session if remember me
        if (rememberMe) {
          const sessionToken = generateToken();
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

          await sql`
            INSERT INTO sessions (user_id, session_token, ip_address, user_agent, expires_at)
            VALUES (${user.id}, ${sessionToken}, ${ip}, ${event.headers['user-agent'] || ''}, ${expiresAt})
          `;
        }

        return jsonResponse(200, true, 'Login successful', {
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            email_verified: user.email_verified
          }
        });

      case 'logout':
        return jsonResponse(200, true, 'Logged out successfully');

      case 'status':
        return jsonResponse(401, false, 'Not authenticated');

      default:
        return jsonResponse(400, false, 'Invalid action');
    }

  } catch (error) {
    console.error('Auth API Error:', error);
    return jsonResponse(500, false, 'An error occurred. Please try again later.', {
      debug_message: error.message
    });
  }
};
