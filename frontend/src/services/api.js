// API service for CFA SAT Tracker.
//
// Auth model: Django session cookies. Every request sends `credentials: 'include'`
// so the sessionid + csrftoken cookies travel with the request. In production
// the React build is served by Django itself (same origin → no CORS issues).
// In dev, CRA runs on :3000 and Django on :8000, and CORS_ALLOW_CREDENTIALS
// in Django settings makes that work.

// Base URL strategy:
//   - In dev (npm start), point at Django on localhost:8000.
//   - In prod (Django serves the React build), use a relative path so requests
//     hit the same origin the page was served from.
const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000/api');

// Read the CSRF cookie that Django sets when needed for unsafe methods.
function getCookie(name) {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const method = (options.method || 'GET').toUpperCase();

    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    };

    // Django requires CSRF for unsafe methods when using session auth.
    if (!['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)) {
      const csrfToken = getCookie('csrftoken');
      if (csrfToken) headers['X-CSRFToken'] = csrfToken;
    }

    const response = await fetch(url, {
      ...options,
      method,
      credentials: 'include',
      headers,
    });

    // Try to parse JSON either way; empty bodies are fine.
    let data = null;
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }

    if (!response.ok) {
      const message =
        (data && (data.error || data.detail)) ||
        `Request failed (${response.status})`;
      const err = new Error(message);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  // ---------- Auth ----------

  async login(email, password) {
    // Hits the REAL Django endpoint. No more hardcoded credentials.
    return this.request('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout() {
    return this.request('/auth/logout/', { method: 'POST' });
  }

  async getCurrentUser() {
    return this.request('/auth/me/');
  }

  async forgotPassword(email) {
    return this.request('/auth/forgot-password/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(uid, token, newPassword) {
    return this.request('/auth/reset-password/', {
      method: 'POST',
      body: JSON.stringify({ uid, token, new_password: newPassword }),
    });
  }

  // ---------- Future authenticated endpoints ----------
  // These will work as soon as you build the Django views for them. They'll
  // automatically include the session cookie and 401 if the user isn't logged in.

  async getDashboardData() {
    return this.request('/dashboard/');
  }

  async getLeadershipDashboard() {
    return this.request('/leadership/dashboard/');
  }

  async getTeamMembers() {
    return this.request('/team/members/');
  }
}

export default new ApiService();
