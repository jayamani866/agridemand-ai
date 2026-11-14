
const API_BASE_URL = 'http://127.0.0.1:8001';

export async function getOrders() {
  const response = await fetch(`${API_BASE_URL}/api/orders`);

  if (!response.ok) {
    throw new Error(`Unable to load orders (${response.status})`);
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error('Invalid orders response from server.');
  }

  return data;
}
