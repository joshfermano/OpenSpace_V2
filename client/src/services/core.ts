import { parseApiError, withErrorHandling } from './errorHandlingService';

const isDev = import.meta.env.MODE !== 'production';

export const API_URL =
  import.meta.env.VITE_API_URL ||
  (isDev ? 'http://localhost:5000' : 'https://openspace-api.onrender.com');

console.log(`Environment: ${isDev ? 'development' : 'production'}`);
console.log(`Using API URL: ${API_URL}`);
console.log(`Window origin: ${window.location.origin}`);

// Cache for response data
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Check if we should use cached data
const useCachedData = (cacheKey: string, maxAge = CACHE_DURATION): any => {
  if (!apiCache.has(cacheKey)) return null;

  const { data, timestamp } = apiCache.get(cacheKey)!;
  const isExpired = Date.now() - timestamp > maxAge;

  return isExpired ? null : data;
};

// Store data in cache
const cacheData = (cacheKey: string, data: any): void => {
  apiCache.set(cacheKey, { data, timestamp: Date.now() });
};

// Helper to create cache key
const createCacheKey = (endpoint: string, options?: RequestInit): string => {
  const method = options?.method || 'GET';
  const body = options?.body ? JSON.stringify(options.body) : '';
  return `${method}:${endpoint}:${body}`;
};

export const fetchPublic = async (
  endpoint: string,
  options: RequestInit & { cache?: boolean; cacheMaxAge?: number } = {}
) => {
  const {
    cache = false,
    cacheMaxAge = CACHE_DURATION,
    ...fetchOptions
  } = options;

  // For GET requests, check cache first
  const method = fetchOptions.method || 'GET';
  const cacheKey = createCacheKey(endpoint, fetchOptions);

  if (method === 'GET' && cache) {
    const cachedData = useCachedData(cacheKey, cacheMaxAge);
    if (cachedData)
      return new Response(JSON.stringify(cachedData), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
  }

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    Origin: window.location.origin,
  };

  const config: RequestInit = {
    ...fetchOptions,
    headers: {
      ...defaultHeaders,
      ...(fetchOptions.headers || {}),
    },
    credentials: 'include',
    mode: 'cors',
  };

  try {
    if (isDev) console.log(`Making public request to: ${API_URL}${endpoint}`);

    const response = await fetch(`${API_URL}${endpoint}`, config);

    // Handle error responses
    if (!response.ok) {
      const error = await parseApiError(response);
      throw error;
    }

    // For successful GET requests, cache the response
    if (method === 'GET' && cache && response.ok) {
      const clonedResponse = response.clone();
      const responseData = await clonedResponse.json();
      cacheData(cacheKey, responseData);
    }

    return response;
  } catch (error) {
    if (isDev) console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
};

export const fetchWithAuth = async (
  endpoint: string,
  options: RequestInit & { cache?: boolean; cacheMaxAge?: number } = {}
) => {
  const {
    cache = false,
    cacheMaxAge = CACHE_DURATION,
    ...fetchOptions
  } = options;

  // For GET requests, check cache first
  const method = fetchOptions.method || 'GET';
  const cacheKey = createCacheKey(endpoint, fetchOptions);

  if (method === 'GET' && cache) {
    const cachedData = useCachedData(cacheKey, cacheMaxAge);
    if (cachedData)
      return new Response(JSON.stringify(cachedData), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
  }

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    Origin: window.location.origin,
  };

  const config: RequestInit = {
    ...fetchOptions,
    headers: {
      ...defaultHeaders,
      ...(fetchOptions.headers || {}),
    },
    credentials: 'include',
    mode: 'cors',
  };

  try {
    if (isDev)
      console.log(`Making authenticated request to: ${API_URL}${endpoint}`);

    const response = await fetch(`${API_URL}${endpoint}`, config);

    // Handle error responses
    if (!response.ok) {
      const error = await parseApiError(response);
      throw error;
    }

    // For successful GET requests, cache the response
    if (method === 'GET' && cache && response.ok) {
      const clonedResponse = response.clone();
      const responseData = await clonedResponse.json();
      cacheData(cacheKey, responseData);
    }

    return response;
  } catch (error) {
    if (isDev) console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
};

// Helper functions to wrap API calls with error handling
export const safePublicFetch = <T>(
  endpoint: string,
  options?: RequestInit & { cache?: boolean; cacheMaxAge?: number }
) => {
  return withErrorHandling<T>(async () => {
    const response = await fetchPublic(endpoint, options);
    return (await response.json()) as T;
  });
};

export const safeAuthFetch = <T>(
  endpoint: string,
  options?: RequestInit & { cache?: boolean; cacheMaxAge?: number }
) => {
  return withErrorHandling<T>(async () => {
    const response = await fetchWithAuth(endpoint, options);
    return (await response.json()) as T;
  });
};
