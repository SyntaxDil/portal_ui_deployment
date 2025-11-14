// Netlify Function: Spaces API
// Handles space creation, invitation codes, and member management

const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.NETLIFY_DATABASE_URL);

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

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 100);
}

// Log activity in a space
async function logActivity(spaceId, userId, activityType, description, metadata = null) {
  try {
    await sql`
      INSERT INTO space_activity (space_id, user_id, activity_type, description, metadata)
      VALUES (${spaceId}, ${userId}, ${activityType}, ${description}, ${metadata ? JSON.stringify(metadata) : null})
    `;
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw - activity logging shouldn't break the main operation
  }
}

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(200, true, 'OK');
  }

  try {
    const params = new URLSearchParams(event.rawQuery || '');
    const body = event.body ? JSON.parse(event.body) : {};
    
    // Get action from query params OR body
    const action = params.get('action') || body.action;
    
    // Get userId from request body
    const userId = body.userId;
    
    if (!userId) {
      return jsonResponse(401, false, 'Unauthorized - Please login');
    }

    switch (action) {
      case 'list':
        // Get all spaces owned by or accessible to user
        const userSpaces = await sql`
          SELECT s.id, s.name, s.space_slug, s.description, s.is_public, 
                 s.invitation_code, s.code_expires_at, s.max_members, 
                 s.is_active, s.created_at, s.updated_at,
                 sm.role as user_role,
                 COUNT(DISTINCT sm2.id) as member_count
          FROM spaces s
          INNER JOIN space_members sm ON s.id = sm.space_id
          LEFT JOIN space_members sm2 ON s.id = sm2.space_id
          WHERE sm.user_id = ${userId}
          GROUP BY s.id, s.space_slug, s.name, s.description, s.is_public, 
                   s.invitation_code, s.code_expires_at, s.max_members, 
                   s.is_active, s.created_at, s.updated_at, sm.role
          ORDER BY s.created_at DESC
        `;
        
        return jsonResponse(200, true, 'Spaces retrieved successfully', {
          spaces: userSpaces
        });

      case 'create':
        if (event.httpMethod !== 'POST') {
          return jsonResponse(405, false, 'Method not allowed');
        }

        const { name, description, is_public, max_members, code_expires } = body;

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
        let invitationCode;
        let createCodeIsUnique = false;
        let createAttempts = 0;
        
        while (!createCodeIsUnique && createAttempts < 10) {
          invitationCode = generateInvitationCode();
          const existing = await sql`
            SELECT id FROM spaces WHERE invitation_code = ${invitationCode}
          `;
          if (existing.length === 0) {
            createCodeIsUnique = true;
          }
          createAttempts++;
        }

        if (!createCodeIsUnique) {
          return jsonResponse(500, false, 'Failed to generate unique invitation code. Please try again.');
        }

        // Parse code expiration
        const codeExpiresAt = code_expires ? new Date(code_expires).toISOString() : null;

        // Generate unique space slug
        let spaceSlug = generateSlug(name);
        let slugIsUnique = false;
        let slugAttempts = 0;
        
        while (!slugIsUnique && slugAttempts < 10) {
          const existingSlug = await sql`
            SELECT id FROM spaces WHERE space_slug = ${spaceSlug}
          `;
          if (existingSlug.length === 0) {
            slugIsUnique = true;
          } else {
            spaceSlug = `${generateSlug(name)}-${Date.now().toString().slice(-4)}`;
          }
          slugAttempts++;
        }

        if (!slugIsUnique) {
          return jsonResponse(500, false, 'Failed to generate unique space identifier. Please try again.');
        }

        // Create space
        const newSpace = await sql`
          INSERT INTO spaces (
            name, 
            space_slug,
            description, 
            owner_id, 
            is_public,
            invitation_code, 
            code_expires_at, 
            max_members,
            is_active
          ) VALUES (
            ${name},
            ${spaceSlug},
            ${description || null},
            ${userId},
            ${is_public || false},
            ${invitationCode},
            ${codeExpiresAt},
            ${max_members || null},
            true
          )
          RETURNING id, name, space_slug, invitation_code
        `;

        const spaceId = newSpace[0].id;

        // Add owner as first member
        await sql`
          INSERT INTO space_members (space_id, user_id, role, joined_at)
          VALUES (${spaceId}, ${userId}, 'owner', NOW())
        `;

        // Log activity
        await logActivity(spaceId, userId, 'created_space', `Created space "${name}"`, {
          is_public: is_public || false,
          max_members: max_members
        });

        return jsonResponse(200, true, 'Space created successfully', {
          space_id: spaceId,
          space_slug: newSpace[0].space_slug,
          invitation_code: invitationCode,
          name: name,
          is_public: is_public || false
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

      case 'join':
        if (event.httpMethod !== 'POST') {
          return jsonResponse(405, false, 'Method not allowed');
        }

        const joinCode = body.invitation_code?.toUpperCase().trim();

        if (!joinCode) {
          return jsonResponse(400, false, 'Invitation code required');
        }

        // Find space by invitation code
        const spaceToJoin = await sql`
          SELECT id, name, owner_id, code_expires_at, max_members, is_active, is_public
          FROM spaces 
          WHERE invitation_code = ${joinCode}
        `;

        if (spaceToJoin.length === 0) {
          return jsonResponse(404, false, 'Invalid invitation code');
        }

        const space = spaceToJoin[0];

        // Check if space is active
        if (!space.is_active) {
          return jsonResponse(403, false, 'This space is no longer active');
        }

        // Check if code has expired
        if (space.code_expires_at && new Date(space.code_expires_at) < new Date()) {
          return jsonResponse(403, false, 'This invitation code has expired');
        }

        // Check if user is already a member
        const existingMember = await sql`
          SELECT id FROM space_members 
          WHERE space_id = ${space.id} AND user_id = ${userId}
        `;

        if (existingMember.length > 0) {
          return jsonResponse(400, false, 'You are already a member of this space');
        }

        // Check max members limit
        if (space.max_members) {
          const memberCount = await sql`
            SELECT COUNT(*) as count FROM space_members 
            WHERE space_id = ${space.id}
          `;
          
          if (memberCount[0].count >= space.max_members) {
            return jsonResponse(403, false, 'This space has reached its maximum member limit');
          }
        }

        // Add user as member
        await sql`
          INSERT INTO space_members (space_id, user_id, role)
          VALUES (${space.id}, ${userId}, 'member')
        `;

        // Log activity
        await logActivity(space.id, userId, 'joined_space', `Joined space "${space.name}" via invitation code`, {
          invitation_code: joinCode
        });

        return jsonResponse(200, true, 'Successfully joined space', {
          space_id: space.id,
          space_name: space.name
        });

      case 'members':
        const membersSpaceId = params.get('space_id');

        if (!membersSpaceId) {
          return jsonResponse(400, false, 'Space ID required');
        }

        // Verify user has access to this space
        const memberCheck = await sql`
          SELECT id FROM space_members 
          WHERE space_id = ${membersSpaceId} AND user_id = ${userId}
        `;
        
        if (memberCheck.length === 0) {
          return jsonResponse(403, false, 'You do not have access to this space');
        }

        // Get all members with their details
        const members = await sql`
          SELECT u.id, u.username, u.email, sm.role, sm.joined_at
          FROM space_members sm
          INNER JOIN users u ON sm.user_id = u.id
          WHERE sm.space_id = ${membersSpaceId}
          ORDER BY sm.joined_at ASC
        `;

        return jsonResponse(200, true, 'Members retrieved successfully', {
          members: members
        });

      case 'regenerate_code':
        if (event.httpMethod !== 'POST') {
          return jsonResponse(405, false, 'Method not allowed');
        }

        const regenSpaceId = body.space_id;

        if (!regenSpaceId) {
          return jsonResponse(400, false, 'Space ID required');
        }

        // Verify user owns the space
        const ownerCheck = await sql`
          SELECT id FROM spaces WHERE id = ${regenSpaceId} AND owner_id = ${userId}
        `;
        
        if (ownerCheck.length === 0) {
          return jsonResponse(403, false, 'Only the space owner can regenerate the invitation code');
        }

        // Generate new unique code
        let newCode;
        let regenCodeIsUnique = false;
        let regenAttempts = 0;
        
        while (!regenCodeIsUnique && regenAttempts < 10) {
          newCode = generateInvitationCode();
          const existing = await sql`
            SELECT id FROM spaces WHERE invitation_code = ${newCode}
          `;
          if (existing.length === 0) {
            regenCodeIsUnique = true;
          }
          regenAttempts++;
        }

        if (!regenCodeIsUnique) {
          return jsonResponse(500, false, 'Failed to generate unique code. Please try again.');
        }

        // Update space with new code
        await sql`
          UPDATE spaces 
          SET invitation_code = ${newCode}, updated_at = NOW()
          WHERE id = ${regenSpaceId}
        `;

        // Log activity
        await logActivity(regenSpaceId, userId, 'regenerated_code', 'Regenerated invitation code', {
          new_code: newCode
        });

        return jsonResponse(200, true, 'Invitation code regenerated successfully', {
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

        // Verify user owns the space
        const toggleOwnerCheck = await sql`
          SELECT is_active FROM spaces WHERE id = ${toggleSpaceId} AND owner_id = ${userId}
        `;
        
        if (toggleOwnerCheck.length === 0) {
          return jsonResponse(403, false, 'Only the space owner can toggle space status');
        }

        // Toggle is_active status
        const currentStatus = toggleOwnerCheck[0].is_active;
        const newStatus = !currentStatus;
        
        await sql`
          UPDATE spaces 
          SET is_active = ${newStatus}, updated_at = NOW()
          WHERE id = ${toggleSpaceId}
        `;

        // Log activity
        await logActivity(toggleSpaceId, userId, 'toggled_status', `${newStatus ? 'Activated' : 'Deactivated'} space`, {
          new_status: newStatus
        });

        return jsonResponse(200, true, 'Space status toggled successfully', {
          is_active: newStatus
        });

      case 'remove_member':
        if (event.httpMethod !== 'POST') {
          return jsonResponse(405, false, 'Method not allowed');
        }

        const removeMemberSpaceId = body.space_id;
        const memberToRemove = body.member_user_id;

        if (!removeMemberSpaceId || !memberToRemove) {
          return jsonResponse(400, false, 'Space ID and member user ID required');
        }

        // Check if requester is owner or admin
        const requesterRole = await sql`
          SELECT role FROM space_members 
          WHERE space_id = ${removeMemberSpaceId} AND user_id = ${userId}
        `;

        if (requesterRole.length === 0) {
          return jsonResponse(403, false, 'You are not a member of this space');
        }

        if (requesterRole[0].role !== 'owner' && requesterRole[0].role !== 'admin') {
          return jsonResponse(403, false, 'Only owners and admins can remove members');
        }

        // Cannot remove yourself
        if (memberToRemove === userId) {
          return jsonResponse(400, false, 'You cannot remove yourself from the space');
        }

        // Get member info before removing
        const memberInfo = await sql`
          SELECT u.username, sm.role 
          FROM space_members sm
          JOIN users u ON sm.user_id = u.id
          WHERE sm.space_id = ${removeMemberSpaceId} AND sm.user_id = ${memberToRemove}
        `;

        if (memberInfo.length === 0) {
          return jsonResponse(404, false, 'Member not found in this space');
        }

        // Cannot remove the owner
        if (memberInfo[0].role === 'owner') {
          return jsonResponse(403, false, 'Cannot remove the space owner');
        }

        // Remove member
        await sql`
          DELETE FROM space_members 
          WHERE space_id = ${removeMemberSpaceId} AND user_id = ${memberToRemove}
        `;

        // Log activity
        await logActivity(removeMemberSpaceId, userId, 'removed_member', `Removed ${memberInfo[0].username} from space`, {
          removed_user_id: memberToRemove,
          removed_username: memberInfo[0].username
        });

        return jsonResponse(200, true, 'Member removed successfully', {
          removed_username: memberInfo[0].username
        });

      default:
        return jsonResponse(400, false, 'Invalid action');
    }

  } catch (error) {
    console.error('Spaces API Error:', error);
    console.error('Error stack:', error.stack);
    return jsonResponse(500, false, `Error: ${error.message}`, {
      debug_message: error.message,
      stack: error.stack
    });
  }
};
