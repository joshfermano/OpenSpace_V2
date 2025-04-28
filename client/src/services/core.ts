const isDev = process.env.NODE_ENV !== 'production';

export const API_URL = isDev
  ? import.meta.env.VITE_API_URL || 'http://localhost:5000'
  : 'https://openspace-api.onrender.com';

console.log(`Environment: ${isDev ? 'development' : 'production'}`);
console.log(`Using API URL: ${API_URL}`);
console.log(`Window origin: ${window.location.origin}`);

export const fetchPublic = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    return response;
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
};

export const fetchWithAuth = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
    credentials: 'include',
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);

    if (response.status === 401) {
      console.warn('Authentication failed:', await response.text());
    }

    return response;
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
};
