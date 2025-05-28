import { API_URL, fetchWithAuth } from './core';

export const adminApi = {
  createAdmin: async (userData: Record<string, any>) => {
    try {
      const response = await fetchWithAuth('/api/admin/users/create-admin', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create admin');
      }

      return data;
    } catch (error) {
      console.error('Admin creation error:', error);
      throw error;
    }
  },

  checkAdminExists: async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/check-admin-exists`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error checking if admin exists:', error);
      return {
        success: false,
        adminExists: true,
        message: 'Network error while checking admin status',
      };
    }
  },

  initialAdminSetup: async (userData: Record<string, any>) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/initial-admin-setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create initial admin');
      }

      return data;
    } catch (error) {
      console.error('Initial admin setup error:', error);
      throw error;
    }
  },

  getDashboardSummary: async () => {
    try {
      console.log('Fetching admin dashboard summary...');

      const response = await fetchWithAuth('/api/admin/dashboard-summary');

      if (!response.ok) {
        console.error(
          'Server error fetching dashboard summary:',
          response.status,
          response.statusText
        );
        throw new Error(
          `Server error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log('Dashboard summary data received:', data);

      return data;
    } catch (error) {
      console.error('Error in getDashboardSummary:', error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to fetch dashboard summary',
        data: {
          totalUsers: 0,
          verifiedUsers: 0,
          unverifiedUsers: 0,
          bannedUsers: 0,
          pendingVerifications: 0,
          totalSpaces: 0,
          hostCount: 0,
        },
      };
    }
  },

  // User management
  getUsers: async (page = 1, limit = 10, filters = {}) => {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters,
      });

      const response = await fetchWithAuth(
        `/api/admin/users?${queryParams.toString()}`
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching users:', error);
      return {
        success: false,
        message: 'Failed to fetch users',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  getUserById: async (userId: string) => {
    try {
      const response = await fetchWithAuth(`/api/admin/users/${userId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return {
        success: false,
        message: 'Network error while fetching user details',
      };
    }
  },

  updateUserById: async (userId: string, userData: Record<string, any>) => {
    try {
      const response = await fetchWithAuth(`/api/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating user:', error);
      return {
        success: false,
        message: 'Network error while updating user',
      };
    }
  },

  deleteUser: async (userId: string) => {
    try {
      const response = await fetchWithAuth(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      return await response.json();
    } catch (error) {
      console.error('Error deleting user:', error);
      return {
        success: false,
        message: 'Failed to delete user',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  // User banning/unbanning
  banUser: async (userId: string, reason?: string) => {
    try {
      const response = await fetchWithAuth(`/api/admin/users/${userId}/ban`, {
        method: 'PATCH',
        body: JSON.stringify({ reason }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error banning user:', error);
      return {
        success: false,
        message: 'Network error while banning user',
      };
    }
  },

  unbanUser: async (userId: string) => {
    try {
      const response = await fetchWithAuth(`/api/admin/users/${userId}/unban`, {
        method: 'PATCH',
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error unbanning user:', error);
      return {
        success: false,
        message: 'Network error while unbanning user',
      };
    }
  },

  getBannedUsers: async (page = 1, limit = 10) => {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await fetchWithAuth(
        `/api/admin/users/banned?${queryParams.toString()}`
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching banned users:', error);
      return {
        success: false,
        message: 'Failed to fetch banned users',
        data: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  // ID verification management
  getPendingIdVerifications: async (page = 1, limit = 10) => {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await fetchWithAuth(
        `/api/admin/id-verifications?${queryParams.toString()}`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching pending ID verifications:', error);
      return {
        success: false,
        message: 'Network error while fetching verification requests',
      };
    }
  },

  verifyUserIdDocument: async (
    userId: string,
    verificationData: {
      isApproved: boolean;
      rejectionReason?: string;
    }
  ) => {
    try {
      const response = await fetchWithAuth(
        `/api/admin/id-verification/${userId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(verificationData),
        }
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error verifying user ID document:', error);
      return {
        success: false,
        message: 'Network error while processing verification',
      };
    }
  },

  getPendingRoomApprovals: async (page = 1, limit = 10) => {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await fetchWithAuth(
        `/api/admin/rooms/pending?${queryParams.toString()}`
      );

      console.log('Raw API response:', response);

      const data = await response.json();
      console.log('Parsed data:', data);

      return data;
    } catch (error) {
      console.error('Error fetching room approvals:', error);
      return {
        success: false,
        message: 'Failed to fetch room approvals',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  approveRoom: async (
    roomId: string,
    approved: boolean,
    rejectionReason?: string
  ) => {
    try {
      const response = await fetchWithAuth(
        `/api/admin/rooms/${roomId}/approve`,
        {
          method: 'PATCH',
          body: JSON.stringify({ approved, rejectionReason }),
        }
      );
      return await response.json();
    } catch (error) {
      console.error('Error approving/rejecting room:', error);
      return {
        success: false,
        message: 'Failed to process room approval',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  // Booking management
  getAllBookings: async (page = 1, limit = 10, status?: string) => {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(status ? { status } : {}),
      });

      const response = await fetchWithAuth(
        `/api/admin/bookings?${queryParams.toString()}`
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching bookings:', error);
      return {
        success: false,
        message: 'Failed to fetch bookings',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  updateBookingStatus: async (
    bookingId: string,
    status: string,
    reason?: string
  ) => {
    try {
      const response = await fetchWithAuth(
        `/api/admin/bookings/${bookingId}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status, reason }),
        }
      );
      return await response.json();
    } catch (error) {
      console.error('Error updating booking status:', error);
      return {
        success: false,
        message: 'Failed to update booking status',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  deleteBooking: async (bookingId: string) => {
    try {
      const response = await fetchWithAuth(`/api/admin/bookings/${bookingId}`, {
        method: 'DELETE',
      });
      return await response.json();
    } catch (error) {
      console.error('Error deleting booking:', error);
      return {
        success: false,
        message: 'Failed to delete booking',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
