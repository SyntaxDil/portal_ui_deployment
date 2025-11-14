// Netlify Function: Create Space
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
    const { name, description } = JSON.parse(event.body);

    if (!name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Space name required' })
      };
    }

    const sql = getDb();
    const result = await sql`
      INSERT INTO spaces (name, description)
      VALUES (${name}, ${description || ''})
      RETURNING id
    `;

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Space created successfully',
        spaceId: result[0].id
      })
    };
  } catch (error) {
    console.error('Create space error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
};
