// Authentication JavaScript
// Handles login, register, logout, and session management

const API_BASE = '/api/auth.php';

// Store last error for bug reporting
let lastError = null;

// Utility: Show message
function showMessage(elementId, message, type = 'success', errorData = null) {
  const el = document.getElementById(elementId);
  if (!el) return;
  
  // Store error data
  if (type === 'error' && errorData) {
    lastError = {
      message: message,
      details: errorData,
      timestamp: new Date().toISOString(),
      page: window.location.pathname
    };
  }
  
  el.textContent = message;
  el.className = 'message ' + type;
  el.style.display = 'block';
  
  // Add debug info button if there's error data
  if (type === 'error' && errorData && errorData.debug_message) {
    const debugBtn = document.createElement('button');
    debugBtn.textContent = '🐛 Show Details';
    debugBtn.className = 'btn-small';
    debugBtn.style.marginTop = '0.5rem';
    debugBtn.style.fontSize = '0.85rem';
    debugBtn.onclick = () => showErrorDetails(errorData);
    
    // Clear previous buttons
    const existingBtn = el.querySelector('button');
    if (existingBtn) existingBtn.remove();
    
    el.appendChild(document.createElement('br'));
    el.appendChild(debugBtn);
  }
  
  setTimeout(() => {
    el.style.display = 'none';
  }, 10000); // Increased to 10s for errors
}

// Show detailed error information
function showErrorDetails(errorData) {
  const details = `
Error Details:
━━━━━━━━━━━━━━━━━━━━━━━━
Time: ${errorData.timestamp || 'Unknown'}
Type: ${errorData.error_type || 'Unknown'}

Message:
${errorData.debug_message || 'No details available'}

━━━━━━━━━━━━━━━━━━━━━━━━

Would you like to report this error?
This will help us fix the issue.
  `;
  
  if (confirm(details)) {
    reportBug(errorData);
  }
}

// Report bug to server
function reportBug(errorData) {
  // Store bug report locally for now
  const bugReport = {
    ...lastError,
    userAgent: navigator.userAgent,
    url: window.location.href,
    reported_at: new Date().toISOString()
  };
  
  // Save to localStorage
  const existingReports = JSON.parse(localStorage.getItem('bugReports') || '[]');
  existingReports.push(bugReport);
  localStorage.setItem('bugReports', JSON.stringify(existingReports));
  
  alert('✓ Bug report saved!\n\nThe error has been logged and can be reviewed in the Developer Tools.');
  console.log('Bug Report:', bugReport);
}

// Utility: Set form submitting state
function setSubmitting(form, submitting) {
  const btn = form.querySelector('button[type="submit"]');
  const inputs = form.querySelectorAll('input, button');
  
  inputs.forEach(input => input.disabled = submitting);
  
  if (btn) {
    btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
    btn.textContent = submitting ? 'Please wait...' : btn.dataset.originalText;
  }
}

// API: Make authenticated request
async function apiRequest(action, data = null) {
  const url = `${API_BASE}?action=${action}`;
  const options = {
    method: data ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(url, options);
  const result = await response.json();
  
  if (!response.ok) {
    const error = new Error(result.message || 'Request failed');
    error.errorData = result.data || null;
    throw error;
  }
  
  return result;
}

// Login form handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    try {
      setSubmitting(loginForm, true);
      
      const result = await apiRequest('login', {
        email,
        password,
        remember_me: rememberMe
      });
      
      showMessage('message', result.message, 'success');
      
      // Check if password change is required
      if (result.data && result.data.requires_password_change && result.data.redirect) {
        setTimeout(() => {
          window.location.href = result.data.redirect;
        }, 1000);
        return;
      }
      
      // Normal redirect to dashboard
      setTimeout(() => {
        window.location.href = './dashboard.html';
      }, 1000);
      
    } catch (error) {
      // Extract error data if available
      const errorData = error.errorData || null;
      showMessage('message', error.message, 'error', errorData);
      setSubmitting(loginForm, false);
    }
  });
  
  // Forgot password handler
  const forgotPassword = document.getElementById('forgotPassword');
  if (forgotPassword) {
    forgotPassword.addEventListener('click', (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      
      if (!email) {
        showMessage('message', 'Please enter your email first', 'error');
        return;
      }
      
      // TODO: Implement password reset
      showMessage('message', 'Password reset feature coming soon!', 'info');
    });
  }
}

// Register form handler
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  // Invitation code validation
  const invitationCodeInput = document.getElementById('invitationCode');
  const codeValidation = document.getElementById('codeValidation');
  let validatedSpaceData = null;
  
  if (invitationCodeInput) {
    // Auto-fill from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const invitationFromUrl = urlParams.get('invitation');
    if (invitationFromUrl) {
      invitationCodeInput.value = invitationFromUrl.toUpperCase();
      validateInvitationCode(invitationFromUrl);
    }
    
    // Validate on blur
    invitationCodeInput.addEventListener('blur', async (e) => {
      const code = e.target.value.trim().toUpperCase();
      if (code) {
        await validateInvitationCode(code);
      } else {
        codeValidation.textContent = '';
        validatedSpaceData = null;
      }
    });
    
    // Auto-uppercase
    invitationCodeInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase();
    });
  }
  
  async function validateInvitationCode(code) {
    if (!code) return;
    
    codeValidation.textContent = '🔄 Validating...';
    codeValidation.style.color = 'var(--muted)';
    
    try {
      const response = await fetch(`./api/spaces.php?action=validate_code&code=${encodeURIComponent(code)}`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success && data.space) {
        validatedSpaceData = data.space;
        codeValidation.innerHTML = `✅ Valid! You'll join <strong>"${data.space.name}"</strong>`;
        codeValidation.style.color = '#22c55e';
      } else {
        validatedSpaceData = null;
        codeValidation.textContent = `❌ ${data.message || 'Invalid code'}`;
        codeValidation.style.color = '#ef4444';
      }
    } catch (error) {
      console.error('Code validation error:', error);
      codeValidation.textContent = '⚠️ Could not validate code';
      codeValidation.style.color = '#f59e0b';
      validatedSpaceData = null;
    }
  }
  
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const invitationCode = invitationCodeInput ? invitationCodeInput.value.trim().toUpperCase() : null;
    
    // Client-side validation
    if (password !== confirmPassword) {
      showMessage('message', 'Passwords do not match', 'error');
      return;
    }
    
    if (password.length < 8) {
      showMessage('message', 'Password must be at least 8 characters', 'error');
      return;
    }
    
    try {
      setSubmitting(registerForm, true);
      
      const requestData = {
        full_name: fullName,
        email,
        password
      };
      
      // Add invitation code if provided
      if (invitationCode) {
        requestData.invitation_code = invitationCode;
      }
      
      const result = await apiRequest('register', requestData);
      
      let message = result.message;
      if (validatedSpaceData) {
        message += ` You will be added to "${validatedSpaceData.name}"`;
      }
      
      showMessage('message', message, 'success');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = './login.html';
      }, 2000);
      
    } catch (error) {
      const errorData = error.errorData || null;
      showMessage('message', error.message, 'error', errorData);
      setSubmitting(registerForm, false);
    }
  });
}

// Dashboard: Check auth and load user data
const dashboardContent = document.getElementById('dashboardContent');
if (dashboardContent) {
  (async () => {
    try {
      const result = await apiRequest('status');
      
      if (result.success && result.data?.user) {
        const user = result.data.user;
        
        // Update UI
        document.getElementById('userName').textContent = user.full_name;
        document.getElementById('accountInfo').innerHTML = `
          <p style="margin: 0.5rem 0;"><strong>Email:</strong> ${user.email}</p>
          <p style="margin: 0.5rem 0;"><strong>Verified:</strong> ${user.email_verified ? '✓ Yes' : '✗ No'}</p>
          <p style="margin: 0.5rem 0;"><strong>Member since:</strong> ${new Date(user.created_at).toLocaleDateString()}</p>
        `;
        
        // Load user's spaces
        loadUserSpaces();
        
        document.getElementById('loading').style.display = 'none';
        dashboardContent.style.display = 'block';
      } else {
        // Not logged in, redirect to login
        window.location.href = './login.html';
      }
    } catch (error) {
      window.location.href = './login.html';
    }
  })();
  
  // Logout handler
  const logoutLink = document.getElementById('logoutLink');
  if (logoutLink) {
    logoutLink.addEventListener('click', async (e) => {
      e.preventDefault();
      
      try {
        await apiRequest('logout');
        window.location.href = './login.html';
      } catch (error) {
        console.error('Logout failed:', error);
        window.location.href = './login.html';
      }
    });
  }
}
