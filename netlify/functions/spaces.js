// Netlify Function: Spaces API
// Handles space creation, invitation codes, and member management

function jsonResponse(statusCode, success, message, data = null) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
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

function generateInvitationCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

exports.handler = async (event, context) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(200, true, 'OK');
  }

  try {
    // TODO: Check authentication from session/token
    const userId = null; // Get from session
    
    if (!userId) {
      return jsonResponse(401, false, 'Unauthorized - Please login');
    }

    const params = new URLSearchParams(event.rawQuery || '');
    const action = params.get('action');
    const body = event.body ? JSON.parse(event.body) : {};

    switch (action) {
      case 'list':
        // TODO: Get all spaces owned by user from database
        return jsonResponse(200, true, 'Spaces retrieved successfully', {
          spaces: [] // Mock empty array
        });

      case 'create':
        if (event.httpMethod !== 'POST') {
          return jsonResponse(405, false, 'Method not allowed');
        }

        const { name, description, max_members, code_expires } = body;

        // Validation
        if (!name || name.trim() === '') {
          return jsonResponse(400, false, 'Space name is required');
        }

        if (name.length > 100) {
          return jsonResponse(400, false, 'Space name must be 100 characters or less');
        }

        if (max_members !== null && max_members !== undefined && (max_members < 1 || max_members > 1000)) {
          return jsonResponse(400, false, 'Max members must be between 1 and 1000');
        }

        // Generate unique invitation code
        const invitationCode = generateInvitationCode();

        // TODO: Database operations
        // 1. Insert space record
        // 2. Add owner as member with 'owner' role
        // 3. Return space details

        return jsonResponse(200, true, 'Space created successfully. Database integration pending.', {
          space_id: 1, // Mock ID
          invitation_code: invitationCode,
          name: name
        });

      case 'validate_code':
        const code = params.get('code')?.toUpperCase().trim();

        if (!code) {
          return jsonResponse(400, false, 'Invitation code required');
        }

        // TODO: Database operations
        // 1. Find space by invitation code
        // 2. Check if active
        // 3. Check expiration
        // 4. Check max members
        // 5. Return space details

        return jsonResponse(404, false, 'Invalid invitation code');

      case 'members':
        const spaceId = params.get('space_id');

        if (!spaceId) {
          return jsonResponse(400, false, 'Space ID required');
        }

        // TODO: Database operations
        // 1. Verify user owns the space
        // 2. Get all members with their details
        // 3. Return members list

        return jsonResponse(200, true, 'Members retrieved successfully', {
          members: [] // Mock empty array
        });

      case 'regenerate_code':
        if (event.httpMethod !== 'POST') {
          return jsonResponse(405, false, 'Method not allowed');
        }

        const regenSpaceId = body.space_id;

        if (!regenSpaceId) {
          return jsonResponse(400, false, 'Space ID required');
        }

        // TODO: Database operations
        // 1. Verify user owns the space
        // 2. Generate new unique code
        // 3. Update space record
        // 4. Return new code

        const newCode = generateInvitationCode();

        return jsonResponse(200, true, 'Invitation code regenerated. Database integration pending.', {
          invitation_code: newCode
        });

      case 'toggle_active':
        if (event.httpMethod !== 'POST') {
          return jsonResponse(405, false, 'Method not allowed');
        }

        const toggleSpaceId = body.space_id;

        if (!toggleSpaceId) {
          return jsonResponse(400, false, 'Space ID required');
        }

        // TODO: Database operations
        // 1. Verify user owns the space
        // 2. Toggle is_active status
        // 3. Return new status

        return jsonResponse(200, true, 'Space status toggled. Database integration pending.', {
          is_active: 1
        });

      default:
        return jsonResponse(400, false, 'Invalid action');
    }

  } catch (error) {
    console.error('Spaces API Error:', error);
    return jsonResponse(500, false, 'An error occurred processing your request', {
      debug_message: error.message
    });
  }
};
