// Netlify Function: Authentication API
// Handles user registration, login, logout, and session management

const bcrypt = require('bcryptjs');

// In-memory session store (upgrade to Redis for production)
const sessions = new Map();

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

// Database helper (will connect to Netlify Postgres)
async function getDbClient() {
  // TODO: Connect to Netlify Postgres once configured
  // For now, return mock client
  throw new Error('Database not yet configured. Please set up Netlify Postgres.');
}

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(200, true, 'OK');
  }

  try {
    // Parse action from query parameters
    const params = new URLSearchParams(event.rawQuery || '');
    const action = params.get('action');
    
    // Parse request body
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

        // TODO: Database operations
        // 1. Check if email exists
        // 2. Validate invitation code if provided
        // 3. Hash password with bcrypt
        // 4. Insert user record
        // 5. Create user profile
        // 6. Add to space if invitation code valid

        // Mock response for now
        const passwordHash = await bcrypt.hash(password, 12);
        const verificationToken = generateToken();

        return jsonResponse(200, true, 'Registration successful. Database integration pending.', {
          user_id: 1, // Mock ID
          email: email,
          space_joined: !!invitation_code
        });

      case 'login':
        if (event.httpMethod !== 'POST') {
          return jsonResponse(405, false, 'Method not allowed');
        }

        const loginEmail = body.email?.trim() || '';
        const loginPassword = body.password || '';
        const rememberMe = body.remember_me || false;

        // TODO: Database operations
        // 1. Get user by email
        // 2. Verify password with bcrypt.compare()
        // 3. Check if account is active
        // 4. Log login attempt
        // 5. Create session

        // Mock response
        return jsonResponse(200, true, 'Login successful. Database integration pending.', {
          user: {
            id: 1,
            email: loginEmail,
            full_name: 'Mock User',
            email_verified: false
          }
        });

      case 'logout':
        // TODO: Clear session from database/store
        return jsonResponse(200, true, 'Logged out successfully');

      case 'status':
        // TODO: Check session validity
        return jsonResponse(401, false, 'Not authenticated');

      case 'change_password':
        if (event.httpMethod !== 'POST') {
          return jsonResponse(405, false, 'Method not allowed');
        }

        const { user_id, temp_token, current_password, new_password } = body;

        // Validation
        if (new_password.length < 8) {
          return jsonResponse(400, false, 'New password must be at least 8 characters');
        }

        // Password strength check
        if (!/[A-Z]/.test(new_password) ||
            !/[a-z]/.test(new_password) ||
            !/[0-9]/.test(new_password) ||
            !/[!@#$%^&*(),.?":{}|<>]/.test(new_password)) {
          return jsonResponse(400, false, 'Password must include uppercase, lowercase, number, and special character');
        }

        // TODO: Database operations
        // 1. Verify temp token
        // 2. Verify current password
        // 3. Hash new password
        // 4. Update user record
        // 5. Clear must_change_password flag

        return jsonResponse(200, true, 'Password changed successfully. Database integration pending.', {
          redirect: './dashboard.html'
        });

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
