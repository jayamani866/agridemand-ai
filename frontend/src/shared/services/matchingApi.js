
const API_BASE_URL = 'http://127.0.0.1:8001';

export async function getMatchingResults(requestId) {
  const token = localStorage.getItem('agridemand_access_token');

  if (!token) {
    throw new Error('Session expired. Please login again.');
  }

  const response = await fetch(
    `${API_BASE_URL}/api/requests/${requestId}/match`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data.detail === 'string'
        ? data.detail
        : `Matching API failed: ${response.status}`
    );
  }

  return data;
}
