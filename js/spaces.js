// Spaces Management JavaScript
// Handles space creation, invitation codes, and member management

// Load user's spaces on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadSpaces();
});

// Check if user is authenticated
async function checkAuth() {
    try {
        const response = await fetch('/.netlify/functions/auth?action=status', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (!data.success) {
            window.location.href = './login.html';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = './login.html';
    }
}

// Load all spaces owned by or accessible to user
async function loadSpaces() {
    try {
        const response = await fetch('/.netlify/functions/spaces?action=list', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            displaySpaces(data.spaces || []);
        } else {
            showMessage(data.message || 'Failed to load spaces', 'error');
            displaySpaces([]);
        }
    } catch (error) {
        console.error('Error loading spaces:', error);
        showMessage('Network error loading spaces', 'error');
        displaySpaces([]);
    }
}

// Display spaces in the UI
function displaySpaces(spaces) {
    const container = document.getElementById('spacesList');
    
    if (spaces.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--muted);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📦</div>
                <h3>No spaces yet</h3>
                <p>Create your first space to start collaborating with your team!</p>
                <button class="btn" onclick="showCreateSpaceModal()" style="margin-top: 1rem;">
                    ➕ Create Your First Space
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = spaces.map(space => {
        const expiresText = space.code_expires_at 
            ? `<p style="color: var(--muted); font-size: 0.9rem;">⏰ Code expires: ${new Date(space.code_expires_at).toLocaleString()}</p>`
            : '';
        
        const maxMembersText = space.max_members 
            ? ` / ${space.max_members}`
            : '';
        
        const isActive = space.is_active == 1 ? '' : '<span style="color: #ef4444;"> (Inactive)</span>';
        
        return `
            <div class="space-card">
                <h3>${escapeHtml(space.name)}${isActive}</h3>
                <p style="color: var(--muted);">${escapeHtml(space.description || 'No description')}</p>
                
                <div style="margin: 1rem 0;">
                    <p style="margin: 0.5rem 0;">
                        👥 <strong>${space.member_count || 0}${maxMembersText}</strong> members
                    </p>
                    <p style="margin: 0.5rem 0;">
                        🎫 Invitation Code: 
                        <span class="invitation-code" id="code-${space.id}">${space.invitation_code}</span>
                        <button onclick="copyCode('${space.invitation_code}')" style="margin-left: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.85rem; background: var(--accent); color: var(--accent-contrast); border: none; border-radius: 4px; cursor: pointer;">
                            📋 Copy
                        </button>
                    </p>
                    ${expiresText}
                    <p style="color: var(--muted); font-size: 0.9rem;">
                        Created: ${new Date(space.created_at).toLocaleDateString()}
                    </p>
                </div>
                
                <div class="space-actions">
                    <button onclick="viewSpaceMembers(${space.id}, '${escapeHtml(space.name)}')">
                        👥 View Members
                    </button>
                    <button onclick="regenerateCode(${space.id})">
                        🔄 New Code
                    </button>
                    <button onclick="shareSpace('${space.invitation_code}', '${escapeHtml(space.name)}')">
                        🔗 Share Link
                    </button>
                    <button onclick="toggleSpaceActive(${space.id}, ${space.is_active})" style="color: ${space.is_active == 1 ? '#ef4444' : '#22c55e'};">
                        ${space.is_active == 1 ? '⏸️ Deactivate' : '▶️ Activate'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Show create space modal
function showCreateSpaceModal() {
    document.getElementById('createSpaceModal').classList.add('show');
    document.getElementById('createSpaceForm').reset();
}

// Hide create space modal
function hideCreateSpaceModal() {
    document.getElementById('createSpaceModal').classList.remove('show');
}

// Handle create space form submission
document.getElementById('createSpaceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('space_name').value.trim(),
        description: document.getElementById('space_description').value.trim() || null,
        max_members: document.getElementById('max_members').value || null,
        code_expires: document.getElementById('code_expires').value || null
    };
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '🔄 Creating...';
    
    try {
        const response = await fetch('/.netlify/functions/spaces', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ action: 'create', ...formData })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(`✅ Space created! Invitation code: ${data.invitation_code}`, 'success');
            hideCreateSpaceModal();
            await loadSpaces();
            
            // Auto-copy invitation code
            copyCode(data.invitation_code);
        } else {
            showMessage(data.message || 'Failed to create space', 'error');
        }
    } catch (error) {
        console.error('Error creating space:', error);
        showMessage('Network error. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
});

// Copy invitation code to clipboard
function copyCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        showMessage('📋 Invitation code copied: ' + code, 'success');
    }).catch(() => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showMessage('📋 Invitation code copied: ' + code, 'success');
    });
}

// Share space invitation link
function shareSpace(code, spaceName) {
    const url = `${window.location.origin}/register.html?invitation=${code}`;
    
    navigator.clipboard.writeText(url).then(() => {
        showMessage(`🔗 Invitation link copied for "${spaceName}"`, 'success');
    }).catch(() => {
        // Show URL in alert if copy fails
        alert(`Share this link:\n${url}`);
    });
}

// View space members
async function viewSpaceMembers(spaceId, spaceName) {
    document.getElementById('membersModalTitle').textContent = `Members of ${spaceName}`;
    document.getElementById('viewMembersModal').classList.add('show');
    document.getElementById('membersList').innerHTML = '<p style="text-align: center; color: var(--muted);">Loading members...</p>';
    
    try {
        const response = await fetch(`/.netlify/functions/spaces?action=members&space_id=${spaceId}`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.members) {
            displayMembers(data.members);
        } else {
            document.getElementById('membersList').innerHTML = `<p style="color: #ef4444;">${data.message || 'Failed to load members'}</p>`;
        }
    } catch (error) {
        console.error('Error loading members:', error);
        document.getElementById('membersList').innerHTML = '<p style="color: #ef4444;">Network error loading members</p>';
    }
}

// Display members list
function displayMembers(members) {
    const container = document.getElementById('membersList');
    
    if (members.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--muted);">No members yet</p>';
        return;
    }
    
    container.innerHTML = `
        <ul class="member-list">
            ${members.map(member => `
                <li class="member-item">
                    <div>
                        <strong>${escapeHtml(member.full_name || member.email)}</strong>
                        <br>
                        <small style="color: var(--muted);">${escapeHtml(member.email)}</small>
                        <br>
                        <small style="color: var(--muted);">Joined: ${new Date(member.joined_at).toLocaleDateString()}</small>
                    </div>
                    <span class="role-badge role-${member.role}">${member.role.toUpperCase()}</span>
                </li>
            `).join('')}
        </ul>
    `;
}

// Hide members modal
function hideMembersModal() {
    document.getElementById('viewMembersModal').classList.remove('show');
}

// Regenerate invitation code
async function regenerateCode(spaceId) {
    if (!confirm('Generate a new invitation code? The old code will stop working.')) {
        return;
    }
    
    try {
        const response = await fetch('/.netlify/functions/spaces', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ action: 'regenerate_code', space_id: spaceId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(`✅ New invitation code: ${data.invitation_code}`, 'success');
            await loadSpaces();
            copyCode(data.invitation_code);
        } else {
            showMessage(data.message || 'Failed to regenerate code', 'error');
        }
    } catch (error) {
        console.error('Error regenerating code:', error);
        showMessage('Network error. Please try again.', 'error');
    }
}

// Toggle space active status
async function toggleSpaceActive(spaceId, currentStatus) {
    const action = currentStatus == 1 ? 'deactivate' : 'activate';
    const verb = currentStatus == 1 ? 'deactivate' : 'activate';
    
    if (!confirm(`Are you sure you want to ${verb} this space?`)) {
        return;
    }
    
    try {
        const response = await fetch('/.netlify/functions/spaces', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ action: 'toggle_active', space_id: spaceId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(`✅ Space ${verb}d successfully`, 'success');
            await loadSpaces();
        } else {
            showMessage(data.message || `Failed to ${verb} space`, 'error');
        }
    } catch (error) {
        console.error('Error toggling space:', error);
        showMessage('Network error. Please try again.', 'error');
    }
}

// Logout function
async function logout() {
    try {
        await fetch('/.netlify/functions/auth?action=logout', {
            credentials: 'include'
        });
        window.location.href = './login.html';
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = './login.html';
    }
}

// Show message
function showMessage(text, type = 'info') {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Mobile navigation toggle
document.querySelector('.nav-toggle')?.addEventListener('click', function() {
    const nav = document.getElementById('site-nav');
    const isOpen = nav.classList.toggle('open');
    this.setAttribute('aria-expanded', isOpen);
});

// Close modals on outside click
document.getElementById('createSpaceModal').addEventListener('click', (e) => {
    if (e.target.id === 'createSpaceModal') {
        hideCreateSpaceModal();
    }
});

document.getElementById('viewMembersModal').addEventListener('click', (e) => {
    if (e.target.id === 'viewMembersModal') {
        hideMembersModal();
    }
});
