
const API_BASE_URL = 'http://127.0.0.1:8002';

const TOKEN_KEY = 'agridemand_access_token';
const USER_KEY = 'agridemand_user';

// Common authentication API request
async function authRequest(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.detail || `Authentication failed (${response.status})`
    );
  }

  return data;
}

// Save login session
export function saveSession(data) {
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

// Clear login session
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// Read saved session
export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  try {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  } catch {
    clearSession();
    return null;
  }
}

// Register user
export async function registerUser(payload) {
  return authRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Login user
export async function loginUser(email, password) {
  return authRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

// Get authenticated user profile
export async function getMyProfile() {
  const token = getStoredToken();

  if (!token) {
    throw new Error('Authentication token not found.');
  }

  return authRequest('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
