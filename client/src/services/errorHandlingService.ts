import { toast } from 'react-toastify';

// Error types
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  NOT_FOUND = 'NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMITED = 'RATE_LIMITED',
  UNKNOWN = 'UNKNOWN',
}

// Error structure
interface AppError {
  type: ErrorType;
  message: string;
  originalError?: Error | unknown;
  statusCode?: number;
  retryAfter?: number;
  retryCount?: number;
}

// Rate limiting state management
const rateLimitState = new Map<
  string,
  { nextAllowedTime: number; retryCount: number }
>();

// Map HTTP status codes to error types
const mapStatusToErrorType = (status: number): ErrorType => {
  if (status === 401) return ErrorType.AUTHENTICATION;
  if (status === 403) return ErrorType.AUTHORIZATION;
  if (status === 404) return ErrorType.NOT_FOUND;
  if (status === 429) return ErrorType.RATE_LIMITED;
  if (status >= 400 && status < 500) return ErrorType.VALIDATION;
  if (status >= 500) return ErrorType.SERVER;
  return ErrorType.UNKNOWN;
};

// User-friendly error messages
const getFriendlyMessage = (
  errorType: ErrorType,
  defaultMessage: string
): string => {
  const messages: Record<ErrorType, string> = {
    [ErrorType.NETWORK]:
      'Network connection issue. Please check your internet connection.',
    [ErrorType.AUTHENTICATION]:
      'Your session has expired. Please log in again.',
    [ErrorType.AUTHORIZATION]:
      'You do not have permission to perform this action.',
    [ErrorType.VALIDATION]:
      defaultMessage || 'Please check your input and try again.',
    [ErrorType.SERVER]: 'Server error occurred. Our team has been notified.',
    [ErrorType.NOT_FOUND]: 'The requested resource was not found.',
    [ErrorType.TIMEOUT]: 'Request timed out. Please try again.',
    [ErrorType.RATE_LIMITED]:
      'Too many requests. Please wait before trying again.',
    [ErrorType.UNKNOWN]: 'An unexpected error occurred. Please try again.',
  };

  return messages[errorType];
};

// Parse API error responses
export const parseApiError = async (response: Response): Promise<AppError> => {
  let errorMessage = '';
  let errorType = mapStatusToErrorType(response.status);
  let retryAfter: number | undefined;

  try {
    const data = await response.json();
    errorMessage = data.message || data.error || 'Unknown error';
    retryAfter = data.retryAfter;
  } catch {
    errorMessage = 'Failed to parse error response';
  }

  return {
    type: errorType,
    message: errorMessage,
    statusCode: response.status,
    retryAfter,
  };
};

// Check if we should delay request due to rate limiting
export const shouldDelayRequest = (endpoint: string): number => {
  const state = rateLimitState.get(endpoint);
  if (!state) return 0;

  const now = Date.now();
  return Math.max(0, state.nextAllowedTime - now);
};

// Update rate limit state after a 429 response
export const updateRateLimitState = (
  endpoint: string,
  retryAfter: number
): void => {
  const now = Date.now();
  const state = rateLimitState.get(endpoint) || {
    nextAllowedTime: 0,
    retryCount: 0,
  };

  state.nextAllowedTime = now + retryAfter * 1000;
  state.retryCount = Math.min(state.retryCount + 1, 10); // Cap at 10 retries

  rateLimitState.set(endpoint, state);
};

// Clear rate limit state after successful request
export const clearRateLimitState = (endpoint: string): void => {
  rateLimitState.delete(endpoint);
};

// Exponential backoff with jitter for rate limited requests
export const calculateBackoffDelay = (
  retryCount: number,
  baseDelay = 1000
): number => {
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, retryCount), 30000); // Max 30 seconds
  const jitter = Math.random() * 0.1 * exponentialDelay; // Add 10% jitter
  return exponentialDelay + jitter;
};

// Retry function with exponential backoff
export const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  endpoint: string,
  maxRetries = 3
): Promise<T> => {
  let lastError: AppError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check if we need to delay due to rate limiting
      const delay = shouldDelayRequest(endpoint);
      if (delay > 0) {
        console.log(
          `Delaying request to ${endpoint} for ${delay}ms due to rate limiting`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const result = await operation();

      // Clear rate limit state on success
      clearRateLimitState(endpoint);

      return result;
    } catch (error) {
      const appError = error as AppError;
      lastError = appError;

      // Handle rate limiting
      if (appError.type === ErrorType.RATE_LIMITED && attempt < maxRetries) {
        const retryAfter =
          appError.retryAfter || calculateBackoffDelay(attempt);
        updateRateLimitState(endpoint, retryAfter / 1000);

        console.log(
          `Rate limited on ${endpoint}, retrying in ${retryAfter}ms (attempt ${
            attempt + 1
          }/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, retryAfter));
        continue;
      }

      // For non-rate-limit errors or max retries exceeded
      throw appError;
    }
  }

  throw lastError || new Error('Retry limit exceeded');
};

// Create error from exception
export const createError = (
  error: Error | unknown,
  defaultMessage?: string
): AppError => {
  if (error instanceof Error) {
    // Network error detection
    if (
      error.message.includes('NetworkError') ||
      error.message.includes('Failed to fetch')
    ) {
      return {
        type: ErrorType.NETWORK,
        message: getFriendlyMessage(ErrorType.NETWORK, error.message),
        originalError: error,
      };
    }

    // Timeout detection
    if (
      error.message.includes('timeout') ||
      error.message.includes('Timeout')
    ) {
      return {
        type: ErrorType.TIMEOUT,
        message: getFriendlyMessage(ErrorType.TIMEOUT, error.message),
        originalError: error,
      };
    }

    return {
      type: ErrorType.UNKNOWN,
      message: defaultMessage || error.message,
      originalError: error,
    };
  }

  return {
    type: ErrorType.UNKNOWN,
    message: defaultMessage || 'Unknown error occurred',
    originalError: error,
  };
};

// Handle and display error to user
export const handleError = (
  error: AppError | Error | unknown,
  showToast = true
): AppError => {
  const appError: AppError =
    error === null ||
    error instanceof Error ||
    typeof error !== 'object' ||
    !('type' in error)
      ? createError(error)
      : (error as AppError);

  if (process.env.NODE_ENV !== 'production') {
    console.error('Error details:', appError);
  }

  // Show user-friendly message
  if (showToast) {
    const friendlyMessage = getFriendlyMessage(appError.type, appError.message);
    toast.error(friendlyMessage);
  }

  if (appError.type === ErrorType.AUTHENTICATION) {
    setTimeout(() => {
      window.location.href = '/auth/login';
    }, 1500);
  }

  return appError;
};

export const withErrorHandling = async <T>(
  apiCall: () => Promise<T>,
  endpoint?: string,
  enableRetry = true
): Promise<T> => {
  try {
    if (endpoint && enableRetry) {
      return await retryWithBackoff(apiCall, endpoint);
    } else {
      return await apiCall();
    }
  } catch (error) {
    throw handleError(error, true);
  }
};

export default {
  handleError,
  parseApiError,
  createError,
  withErrorHandling,
  retryWithBackoff,
  shouldDelayRequest,
  updateRateLimitState,
  clearRateLimitState,
  calculateBackoffDelay,
  ErrorType,
};
