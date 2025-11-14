// Change Password Form Handler
// Handles forced password change on first login

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('user_id');
const tempToken = urlParams.get('temp_token');

// Populate hidden fields
if (userId) document.getElementById('userId').value = userId;
if (tempToken) document.getElementById('tempToken').value = tempToken;

// Redirect to login if missing parameters
if (!userId || !tempToken) {
    showMessage('Invalid access. Please login again.', 'error');
    setTimeout(() => window.location.href = './login.html', 2000);
}

// Password strength checker
const newPasswordInput = document.getElementById('new_password');
const strengthBar = document.getElementById('strength-bar');
const strengthText = document.getElementById('strength-text');
const strengthContainer = document.getElementById('password-strength');

newPasswordInput.addEventListener('input', (e) => {
    const password = e.target.value;
    
    if (password.length === 0) {
        strengthContainer.style.display = 'none';
        return;
    }
    
    strengthContainer.style.display = 'block';
    const strength = calculatePasswordStrength(password);
    
    strengthBar.style.width = `${strength.score}%`;
    strengthBar.style.background = strength.color;
    strengthText.textContent = strength.text;
    strengthText.style.color = strength.color;
});

function calculatePasswordStrength(password) {
    let score = 0;
    const checks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    // Calculate score
    if (checks.length) score += 20;
    if (checks.uppercase) score += 20;
    if (checks.lowercase) score += 20;
    if (checks.number) score += 20;
    if (checks.special) score += 20;
    
    // Bonus for length
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;
    
    // Cap at 100
    score = Math.min(score, 100);
    
    let color, text;
    if (score < 40) {
        color = '#ef4444';
        text = 'Weak';
    } else if (score < 60) {
        color = '#f59e0b';
        text = 'Fair';
    } else if (score < 80) {
        color = '#3b82f6';
        text = 'Good';
    } else {
        color = '#22c55e';
        text = 'Strong';
    }
    
    return { score, color, text };
}

// Confirm password match indicator
const confirmPasswordInput = document.getElementById('confirm_password');
const matchIndicator = document.getElementById('match-indicator');

confirmPasswordInput.addEventListener('input', () => {
    const newPass = newPasswordInput.value;
    const confirmPass = confirmPasswordInput.value;
    
    if (confirmPass.length === 0) {
        matchIndicator.style.display = 'none';
        return;
    }
    
    matchIndicator.style.display = 'block';
    
    if (newPass === confirmPass) {
        matchIndicator.textContent = '✅ Passwords match';
        matchIndicator.style.color = '#22c55e';
    } else {
        matchIndicator.textContent = '❌ Passwords do not match';
        matchIndicator.style.color = '#ef4444';
    }
});

// Form submission
document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const currentPassword = document.getElementById('current_password').value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    // Client-side validation
    if (newPassword !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 8) {
        showMessage('Password must be at least 8 characters', 'error');
        return;
    }
    
    // Password strength requirements
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    
    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
        showMessage('Password must include uppercase, lowercase, number, and special character', 'error');
        return;
    }
    
    if (currentPassword === newPassword) {
        showMessage('New password must be different from current password', 'error');
        return;
    }
    
    // Disable submit button
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '🔄 Changing password...';
    
    try {
        const response = await fetch('/.netlify/functions/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'change_password',
                user_id: userId,
                temp_token: tempToken,
                current_password: currentPassword,
                new_password: newPassword
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('✅ Password changed successfully! Redirecting to dashboard...', 'success');
            
            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                window.location.href = './dashboard.html';
            }, 2000);
        } else {
            showMessage(data.error || 'Failed to change password', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            
            // Log error for debugging
            if (data.debug_message) {
                console.error('Debug:', data.debug_message);
            }
        }
    } catch (error) {
        console.error('Network error:', error);
        showMessage('Network error. Please check your connection and try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
});

function showMessage(text, type = 'info') {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    // Scroll to message
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Clear messages on input
document.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', () => {
        const messageDiv = document.getElementById('message');
        if (messageDiv.style.display === 'block') {
            messageDiv.style.display = 'none';
        }
    });
});
