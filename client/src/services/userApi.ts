import { API_URL, fetchWithAuth, fetchPublic } from './core';
interface UpdateProfileData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  profileImage: string;
  hostInfo?: {
    bio: string;
    languagesSpoken: string[];
    responseTime: number; // Changed from string to number
    responseRate?: number;
    acceptanceRate?: number;
    hostSince?: Date;
  };
}

export const userApi = {
  getUserDashboard: async () => {
    try {
      const response = await fetchWithAuth('/api/users/dashboard');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching user dashboard:', error);
      return {
        success: false,
        message: 'Network error while fetching dashboard data',
      };
    }
  },

  getUserProfile: async () => {
    try {
      const response = await fetchWithAuth('/api/users/profile');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return {
        success: false,
        message: 'Network error while fetching profile data',
      };
    }
  },

  getUserById: async (userId: string) => {
    try {
      const response = await fetchPublic(`/api/users/${userId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching user ${userId}:`, error);
      return {
        success: false,
        message: 'Network error while fetching user details',
      };
    }
  },

  getRoomsByHost: async (hostId: string, params = {}) => {
    try {
      const queryParams = new URLSearchParams(
        params as Record<string, string>
      ).toString();
      const url = `/api/rooms/host/${hostId}${
        queryParams ? `?${queryParams}` : ''
      }`;

      const response = await fetchWithAuth(url);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching rooms for host ${hostId}:`, error);
      return {
        success: false,
        message: 'Network error while fetching host rooms',
        data: [],
      };
    }
  },

  updateUserProfile: async (profileData: UpdateProfileData) => {
    try {
      const response = await fetchWithAuth('/api/users/edit-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Profile update failed:', data);
        return {
          success: false,
          message: data.message || 'Failed to update profile',
        };
      }

      return data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return {
        success: false,
        message: 'Network error while updating profile',
      };
    }
  },

  becomeHost: async (hostData: { bio: string; languagesSpoken: string[] }) => {
    try {
      const response = await fetchWithAuth('/api/auth/become-host', {
        method: 'POST',
        body: JSON.stringify(hostData),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error becoming a host:', error);
      return {
        success: false,
        message: 'Network error while becoming a host',
      };
    }
  },

  uploadProfileImage: async (formData: FormData) => {
    try {
      const response = await fetch(
        `${API_URL}/api/users/profile/upload-image`,
        {
          method: 'POST',
          credentials: 'include',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error during profile image upload:', errorData);
        return {
          success: false,
          message: errorData.message || 'Error uploading profile image',
        };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error uploading profile image:', error);
      return {
        success: false,
        message: 'Network error while uploading image',
      };
    }
  },

  changePassword: async (passwordData: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    try {
      const response = await fetchWithAuth('/api/users/password', {
        method: 'PUT',
        body: JSON.stringify(passwordData),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error changing password:', error);
      return {
        success: false,
        message: 'Network error while changing password',
      };
    }
  },

  // Saved rooms (favorites/wishlist)
  getSavedRooms: async () => {
    try {
      const response = await fetchWithAuth('/api/users/saved-rooms');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching saved rooms:', error);
      return {
        success: false,
        message: 'Network error while fetching saved rooms',
      };
    }
  },

  saveRoom: async (roomId: string) => {
    try {
      const response = await fetchWithAuth(`/api/users/save-room/${roomId}`, {
        method: 'POST',
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error saving room:', error);
      return {
        success: false,
        message: 'Failed to save room',
      };
    }
  },

  unsaveRoom: async (roomId: string) => {
    try {
      const response = await fetchWithAuth(
        `/api/users/unsave-rooms/${roomId}`,
        {
          method: 'DELETE',
        }
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error removing saved room:', error);
      return {
        success: false,
        message: 'Failed to remove room from saved list',
      };
    }
  },

  // Notifications
  getNotifications: async () => {
    try {
      const response = await fetchWithAuth('/api/users/notifications');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return {
        success: false,
        message: 'Network error while fetching notifications',
      };
    }
  },

  markNotificationAsRead: async (notificationId: string) => {
    try {
      const response = await fetchWithAuth(
        `/api/users/notifications/${notificationId}/read`,
        {
          method: 'PUT',
        }
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return {
        success: false,
        message: 'Network error while updating notification',
      };
    }
  },
};
