
const API_BASE_URL = 'http://127.0.0.1:8000';

async function apiRequest(endpoint) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`);

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

export const getFarmers = () => apiRequest('/api/farmers');

export const getLots = () => apiRequest('/api/lots');

export const getBuyerRequests = () => apiRequest('/api/requests');

export const getMatches = (requestId) =>
  apiRequest(`/api/requests/${requestId}/match`);
