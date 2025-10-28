// Helper function to get the authentication token
export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken');
  }
  return null;
}

// Helper function to create authenticated fetch options
export function createAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  if (token) {
    return {
      'Authorization': `Bearer ${token}`
    };
  }
  return {};
}