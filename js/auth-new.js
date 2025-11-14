// Simple Authentication for Netlify Functions
// Handles login, register, and session management

// Toast notification system
function showToast(message, type = 'success') {
  // Remove existing toast
  const existingToast = document.querySelector('.toast');
  if (existingToast) existingToast.remove();
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  // Add to body
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Remove after 4 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Show message to user (for forms)
function showMessage(message, type = 'success') {
  const messageDiv = document.getElementById('message');
  if (messageDiv) {
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    if (type === 'success') {
      setTimeout(() => {
        messageDiv.style.display = 'none';
      }, 5000);
    }
  }
  
  // Also show toast
  showToast(message, type);
}

// Handle registration
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    
    // Validation
    if (confirmPassword && password !== confirmPassword) {
      showMessage('Passwords do not match', 'error');
      return;
    }
    
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';
    
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showMessage('Account created! Redirecting to login...', 'success');
        setTimeout(() => {
          window.location.href = './login.html';
        }, 2000);
      } else {
        showMessage(data.error || 'Registration failed', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
      }
    } catch (error) {
      console.error('Registration error:', error);
      showMessage('An error occurred. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
  });
}

// Handle login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';
    
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (data.success && data.user) {
        // Store user data in localStorage with timestamp
        const loginData = {
          user: data.user,
          loginTime: new Date().getTime(),
          expiresIn: 30 * 24 * 60 * 60 * 1000 // 30 days
        };
        localStorage.setItem('authData', JSON.stringify(loginData));
        localStorage.setItem('isLoggedIn', 'true');
        
        showToast(`Welcome back, ${data.user.username}!`, 'success');
        
        setTimeout(() => {
          window.location.href = './dashboard.html';
        }, 1000);
      } else {
        showMessage(data.error || 'Login failed', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
      }
    } catch (error) {
      console.error('Login error:', error);
      showMessage('An error occurred. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
    }
  });
}

// Handle logout
const logoutLink = document.getElementById('logoutLink');
if (logoutLink) {
  logoutLink.addEventListener('click', (e) => {
    e.preventDefault();
    const user = getLoggedInUser();
    localStorage.removeItem('authData');
    localStorage.removeItem('isLoggedIn');
    showToast(`Goodbye, ${user?.username || 'user'}!`, 'success');
    setTimeout(() => {
      window.location.href = './login.html';
    }, 500);
  });
}

// Get logged in user with expiration check
function getLoggedInUser() {
  const authDataStr = localStorage.getItem('authData');
  if (!authDataStr) return null;
  
  try {
    const authData = JSON.parse(authDataStr);
    const now = new Date().getTime();
    const loginTime = authData.loginTime || 0;
    const expiresIn = authData.expiresIn || (30 * 24 * 60 * 60 * 1000);
    
    // Check if session expired
    if (now - loginTime > expiresIn) {
      localStorage.removeItem('authData');
      localStorage.removeItem('isLoggedIn');
      return null;
    }
    
    return authData.user;
  } catch {
    return null;
  }
}

// Update user profile display in header
function updateUserProfile() {
  const user = getLoggedInUser();
  
  if (user) {
    // Update username display
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
      userNameElement.textContent = user.username;
    }
    
    // Add user profile to header if not exists
    const header = document.querySelector('.site-header .container');
    if (header && !document.getElementById('userProfile')) {
      const nav = header.querySelector('.nav');
      
      // Create user profile element
      const userProfile = document.createElement('div');
      userProfile.id = 'userProfile';
      userProfile.className = 'user-profile';
      userProfile.innerHTML = `
        <span class="user-avatar">${user.username.charAt(0).toUpperCase()}</span>
        <span class="user-name">${user.username}</span>
      `;
      
      // Insert before nav or at end
      if (nav) {
        header.insertBefore(userProfile, nav);
      } else {
        header.appendChild(userProfile);
      }
    }
  }
}

// Check if user is logged in (for protected pages)
function checkAuth() {
  const user = getLoggedInUser();
  const currentPage = window.location.pathname;
  
  // Protected pages
  const protectedPages = ['/dashboard.html', '/spaces.html'];
  const isProtectedPage = protectedPages.some(page => currentPage.includes(page));
  
  if (isProtectedPage && !user) {
    showToast('Please login to continue', 'error');
    setTimeout(() => {
      window.location.href = './login.html';
    }, 1000);
    return;
  }
  
  // Update user profile display
  if (user) {
    updateUserProfile();
  }
  
  // Redirect to dashboard if already logged in and on login/register page
  const authPages = ['/login.html', '/register.html'];
  const isAuthPage = authPages.some(page => currentPage.includes(page));
  if (isAuthPage && user) {
    window.location.href = './dashboard.html';
  }
}

// Run auth check on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkAuth);
} else {
  checkAuth();
}
