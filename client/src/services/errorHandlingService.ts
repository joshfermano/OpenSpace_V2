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
  UNKNOWN = 'UNKNOWN',
}

// Error structure
interface AppError {
  type: ErrorType;
  message: string;
  originalError?: Error | unknown;
  statusCode?: number;
}

// Map HTTP status codes to error types
const mapStatusToErrorType = (status: number): ErrorType => {
  if (status === 401) return ErrorType.AUTHENTICATION;
  if (status === 403) return ErrorType.AUTHORIZATION;
  if (status === 404) return ErrorType.NOT_FOUND;
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
    [ErrorType.UNKNOWN]: 'An unexpected error occurred. Please try again.',
  };

  return messages[errorType];
};

// Parse API error responses
export const parseApiError = async (response: Response): Promise<AppError> => {
  let errorMessage = '';
  let errorType = mapStatusToErrorType(response.status);

  try {
    const data = await response.json();
    errorMessage = data.message || data.error || 'Unknown error';
  } catch {
    errorMessage = 'Failed to parse error response';
  }

  return {
    type: errorType,
    message: errorMessage,
    statusCode: response.status,
  };
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
  apiCall: () => Promise<T>
): Promise<T> => {
  try {
    return await apiCall();
  } catch (error) {
    throw handleError(error, true);
  }
};

export default {
  handleError,
  parseApiError,
  createError,
  withErrorHandling,
  ErrorType,
};
