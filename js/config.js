// Netlify API Configuration
// Your site is hosted on Netlify with serverless functions

// Netlify Site URL
const SITE_URL = 'https://inspectionapptest.netlify.app';
const API_BASE = `${SITE_URL}/api`;

// API Endpoints
const API_ENDPOINTS = {
  login: `${API_BASE}/login`,
  register: `${API_BASE}/register`,
  changePassword: `${API_BASE}/changePassword`,
  testDb: `${API_BASE}/testDb`,
  getSpaces: `${API_BASE}/getSpaces`,
  createSpace: `${API_BASE}/createSpace`
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { API_BASE, API_ENDPOINTS, SITE_URL };
}
