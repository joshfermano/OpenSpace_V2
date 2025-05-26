import {
  parseApiError,
  withErrorHandling,
  retryWithBackoff,
  shouldDelayRequest,
} from './errorHandlingService';

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

// Request throttling to prevent rapid successive calls
const requestThrottle = new Map<string, number>();
const THROTTLE_DELAY = 100; // 100ms between similar requests

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

// Throttle similar requests
const shouldThrottleRequest = (cacheKey: string): number => {
  const lastRequestTime = requestThrottle.get(cacheKey) || 0;
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < THROTTLE_DELAY) {
    return THROTTLE_DELAY - timeSinceLastRequest;
  }

  requestThrottle.set(cacheKey, now);
  return 0;
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

  // Throttle similar requests to prevent rapid calls
  const throttleDelay = shouldThrottleRequest(cacheKey);
  if (throttleDelay > 0) {
    await new Promise((resolve) => setTimeout(resolve, throttleDelay));
  }

  // Check for rate limiting delays
  const rateLimitDelay = shouldDelayRequest(endpoint);
  if (rateLimitDelay > 0) {
    console.log(
      `Delaying request to ${endpoint} for ${rateLimitDelay}ms due to rate limiting`
    );
    await new Promise((resolve) => setTimeout(resolve, rateLimitDelay));
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

// Helper functions to wrap API calls with error handling and retries
export const safePublicFetch = <T>(
  endpoint: string,
  options?: RequestInit & { cache?: boolean; cacheMaxAge?: number }
) => {
  return withErrorHandling<T>(
    async () => {
      const response = await fetchPublic(endpoint, options);
      return (await response.json()) as T;
    },
    endpoint,
    true
  );
};

export const safeAuthFetch = <T>(
  endpoint: string,
  options?: RequestInit & { cache?: boolean; cacheMaxAge?: number }
) => {
  return withErrorHandling<T>(
    async () => {
      const response = await fetchWithAuth(endpoint, options);
      return (await response.json()) as T;
    },
    endpoint,
    true
  );
};

// Enhanced fetch functions with built-in retry logic for 429 errors
export const fetchPublicWithRetry = async (
  endpoint: string,
  options: RequestInit & { cache?: boolean; cacheMaxAge?: number } = {},
  maxRetries = 3
) => {
  return retryWithBackoff(
    () => fetchPublic(endpoint, options),
    endpoint,
    maxRetries
  );
};

export const fetchAuthWithRetry = async (
  endpoint: string,
  options: RequestInit & { cache?: boolean; cacheMaxAge?: number } = {},
  maxRetries = 3
) => {
  return retryWithBackoff(
    () => fetchWithAuth(endpoint, options),
    endpoint,
    maxRetries
  );
};
