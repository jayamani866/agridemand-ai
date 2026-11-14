
const API_BASE_URL = 'http://127.0.0.1:8001';

export async function getBuyerRequests() {
  const response = await fetch(`${API_BASE_URL}/api/requests`);

  if (!response.ok) {
    throw new Error(`Failed to fetch buyer requests: ${response.status}`);
  }

  return response.json();
}
