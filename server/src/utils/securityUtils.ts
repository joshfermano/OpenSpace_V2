import mongoose from 'mongoose';

export const sanitizeInput = (input: string): string => {
  if (!input) return '';

  // Remove potential NoSQL injection characters
  return input.replace(/\$/g, '').replace(/\{/g, '').replace(/\}/g, '').trim();
};

export const sanitizeEmail = (email: string): string => {
  if (!email) return '';

  // Only remove the most dangerous MongoDB operators while keeping email valid
  return email.replace(/\$/g, '').replace(/\{/g, '').replace(/\}/g, '').trim();
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

export const isStrongPassword = (
  password: string
): { valid: boolean; message: string } => {
  if (!password || password.length < 8) {
    return {
      valid: false,
      message: 'Password must be at least 8 characters long',
    };
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
    return {
      valid: false,
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    };
  }

  return { valid: true, message: '' };
};

export const sanitizeMongoQuery = (query: any): any => {
  if (!query || typeof query !== 'object') return query;

  const sanitized = { ...query };

  Object.keys(sanitized).forEach((key) => {
    // Convert MongoDB operator keys ($...) to safe strings
    if (key.startsWith('$')) {
      delete sanitized[key];
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeMongoQuery(sanitized[key]);
    }
  });

  return sanitized;
};

/**
 * Validates and sanitizes MongoDB ObjectId
 */
export const safeObjectId = (id: string): mongoose.Types.ObjectId | null => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return new mongoose.Types.ObjectId(id);
  } catch (error) {
    return null;
  }
};

/**
 * Adds a delay to prevent timing attacks
 */
export const addDelay = async (milliseconds = 500): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
};
