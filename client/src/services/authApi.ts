import { API_URL, fetchWithAuth, fetchAuthWithRetry } from './core';

export const authApi = {
  register: async (userData: FormData | any) => {
    try {
      console.log('Sending registration request with data:', userData);

      let headers = {};
      let requestBody;

      if (userData instanceof FormData) {
        requestBody = userData;
      } else {
        headers = {
          'Content-Type': 'application/json',
        };
        requestBody = JSON.stringify(userData);
      }

      // Use retry logic for registration requests
      const response = await fetchAuthWithRetry('/api/auth/register', {
        method: 'POST',
        headers,
        body: requestBody,
      });

      const data = await response.json();
      console.log('Registration response:', data);

      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  login: async (email: string, password: string) => {
    try {
      console.log(
        `Attempting login for email: ${email} to ${API_URL}/api/auth/login`
      );

      // Use retry logic for login requests
      const response = await fetchAuthWithRetry('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
        }),
      });

      const data = await response.json();
      console.log('Login response data:', data);

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/logout`, {
        method: 'GET',
        credentials: 'include',
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        message: 'Network error during logout',
      };
    }
  },

  getCurrentUser: async () => {
    try {
      console.log('Fetching current user data...');
      console.log('Current environment:', process.env.NODE_ENV);

      const requestUrl = `${API_URL}/api/auth/me`;
      console.log(`Sending request to: ${requestUrl}`);

      const response = await fetch(requestUrl, {
        method: 'GET',
        credentials: 'include',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Origin: window.location.origin,
        },
      });

      console.log('Current user response status:', response.status);
      console.log('Response headers:', [...response.headers.entries()]);

      // Log cookies if available in the browser
      console.log('Current cookies:', document.cookie);

      if (!response.ok) {
        if (response.status === 401) {
          const errorText = await response.text();
          console.error('Auth error from /api/auth/me:', errorText);

          return {
            success: false,
            status: 401,
            message: 'User session expired or invalid',
          };
        }

        const errorText = await response.text();
        console.error('Error response from /api/auth/me:', errorText);

        return {
          success: false,
          status: response.status,
          message: `Server error: ${response.status} ${response.statusText}`,
          isAuthError: false,
        };
      }

      const data = await response.json();
      console.log('Current user data retrieved successfully:', data);
      return data;
    } catch (error) {
      console.error('Get current user error:', error);

      // Show more detailed network error for debugging
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }

      return {
        success: false,
        isAuthError: false,
        message:
          error instanceof Error
            ? error.message
            : 'Network error while fetching user data',
      };
    }
  },

  updatePassword: async (passwordData: {
    currentPassword: string;
    newPassword: string;
  }) => {
    try {
      const response = await fetchWithAuth('/api/auth/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(passwordData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update password');
      }

      return data;
    } catch (error) {
      console.error('Password update error:', error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Network error while updating password',
      };
    }
  },

  initiatePhoneVerification: async (phoneNumber: string) => {
    try {
      const response = await fetchWithAuth(
        '/api/auth/phone-verification/initiate',
        {
          method: 'POST',
          body: JSON.stringify({ phoneNumber }),
        }
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error initiating phone verification:', error);
      return {
        success: false,
        message: 'Network error while initiating phone verification',
      };
    }
  },

  verifyPhoneWithOTP: async (otp: string) => {
    try {
      const response = await fetchWithAuth(
        '/api/auth/phone-verification/verify',
        {
          method: 'POST',
          body: JSON.stringify({ otp }),
        }
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error verifying phone:', error);
      return {
        success: false,
        message: 'Network error while verifying phone',
      };
    }
  },

  // ID verification
  uploadIdVerification: async (verificationData: {
    idType: string;
    idNumber: string;
    idImage: string;
    businessDocument?: {
      certificateType: string;
      certificateNumber: string;
      certificateImage: string;
    };
  }) => {
    try {
      const response = await fetchWithAuth('/api/auth/id-verification/upload', {
        method: 'POST',
        body: JSON.stringify(verificationData),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error uploading ID verification:', error);
      return {
        success: false,
        message: 'Network error while uploading ID verification',
      };
    }
  },

  // Password reset
  requestPasswordReset: async (email: string) => {
    try {
      console.log(`Sending password reset email to: ${email}`);
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return {
        success: false,
        message: 'Network error while sending password reset email',
      };
    }
  },

  validateResetToken: async (token: string) => {
    try {
      const response = await fetch(
        `${API_URL}/api/auth/validate-reset-token/${token}`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error validating reset token:', error);
      return {
        success: false,
        message: 'Network error while validating reset token',
      };
    }
  },

  resetPassword: async (token: string, password: string) => {
    try {
      console.log('Resetting password with token');
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error resetting password:', error);
      return {
        success: false,
        message: 'Network error while resetting password',
      };
    }
  },

  // Host functionality
  becomeHost: async () => {
    try {
      const response = await fetchWithAuth('/api/auth/become-host', {
        method: 'POST',
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error becoming host:', error);
      return {
        success: false,
        message: 'Network error while processing host request',
      };
    }
  },

  // Initial admin setup
  checkAdminExists: async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/check-admin-exists`, {
        credentials: 'include',
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error checking admin existence:', error);
      return {
        success: false,
        adminExists: true,
        message: 'Network error while checking admin existence',
      };
    }
  },

  initialAdminSetup: async (userData: Record<string, any>) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/initial-admin-setup`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error in initial admin setup:', error);
      return {
        success: false,
        message: 'Network error while setting up admin account',
      };
    }
  },

  createAdmin: async (userData: Record<string, any>) => {
    try {
      const response = await fetchWithAuth('/api/admin/users/create-admin', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating admin user:', error);
      return {
        success: false,
        message: 'Network error while creating admin user',
      };
    }
  },
};
