// Netlify Function: Authentication - Register
const bcrypt = require('bcryptjs');
const { getDb } = require('./db');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
    const { username, email, password } = JSON.parse(event.body);

    if (!username || !email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'All fields required' })
      };
    }

    const sql = getDb();
    
    // Check if user exists
    const existing = await sql`
      SELECT id FROM users WHERE email = ${email} OR username = ${username}
    `;

    if (existing.length > 0) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ success: false, error: 'User already exists' })
      };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    const result = await sql`
      INSERT INTO users (username, email, password_hash, role, active)
      VALUES (${username}, ${email}, ${passwordHash}, 'user', true)
      RETURNING id
    `;

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'User created successfully',
        userId: result[0].id
      })
    };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
};
