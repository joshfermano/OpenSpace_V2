import { fetchWithAuth, fetchPublic, fetchPublicWithRetry } from './core';
import { API_URL } from './core';

export const roomApi = {
  getRooms: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(
        params as Record<string, string>
      ).toString();

      // Use the enhanced fetch with retry for room requests
      const response = await fetchPublicWithRetry(`/api/rooms?${queryString}`, {
        // cache: true, // Cache for 2 minutes - removed as not supported
        // cacheMaxAge: 2 * 60 * 1000,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching rooms:', error);
      return {
        success: false,
        message: 'Network error while fetching rooms',
      };
    }
  },

  getRoomsByHost: async (hostId: string, params = {}) => {
    try {
      console.log(`Fetching rooms for host ${hostId}...`);
      const queryString = new URLSearchParams(
        params as Record<string, string>
      ).toString();
      const url = `/api/rooms/host/${hostId}${
        queryString ? `?${queryString}` : ''
      }`;

      const response = await fetchPublic(url);
      if (!response.ok) {
        const errorData = await response.json();
        console.error(
          `Error fetching host rooms: ${response.status}`,
          errorData
        );
        return {
          success: false,
          message: errorData.message || 'Failed to fetch host rooms',
        };
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching rooms for host ${hostId}:`, error);
      return {
        success: false,
        message: 'Network error while fetching host rooms',
      };
    }
  },

  getAvailabilityForDateRange: async (
    roomId: string,
    startDate: Date,
    endDate: Date
  ) => {
    try {
      const formattedStart = startDate.toISOString().split('T')[0];
      const formattedEnd = endDate.toISOString().split('T')[0];

      const cacheBuster = Date.now();

      console.log(
        `[API] Fetching availability for room ${roomId} from ${formattedStart} to ${formattedEnd}`
      );

      const response = await fetchPublic(
        `/api/rooms/${roomId}/availability?startDate=${formattedStart}&endDate=${formattedEnd}&_cb=${cacheBuster}`,
        {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error(
          `[API] Availability API returned ${response.status}:`,
          errorData
        );
        return {
          success: false,
          message: errorData.message || 'Failed to fetch room availability',
          data: {
            roomId: roomId,
            unavailableDates: [],
            existingBookings: [],
          },
        };
      }

      const data = await response.json();
      console.log('[API] Raw response from availability API:', data);

      if (data.success && data.data) {
        data.data.roomId = roomId;

        // Make sure all booking entries have roomId set
        if (
          data.data.existingBookings &&
          Array.isArray(data.data.existingBookings)
        ) {
          data.data.existingBookings = data.data.existingBookings.map(
            (booking: any) => {
              // Ensure each booking has roomId
              const updatedBooking = {
                ...booking,
                roomId: booking.roomId || roomId,
              };

              // Ensure checkIn and checkOut are Date objects
              if (booking.checkIn && !(booking.checkIn instanceof Date)) {
                updatedBooking.checkIn = new Date(booking.checkIn);
                // Ensure all dates have proper time components at midnight
                updatedBooking.checkIn.setHours(0, 0, 0, 0);
              }

              if (booking.checkOut && !(booking.checkOut instanceof Date)) {
                updatedBooking.checkOut = new Date(booking.checkOut);
                // Ensure all dates have proper time components at midnight
                updatedBooking.checkOut.setHours(0, 0, 0, 0);
              }

              return updatedBooking;
            }
          );

          // Log processed bookings for debugging
          console.log(
            `[API] Processed ${data.data.existingBookings.length} bookings:`,
            data.data.existingBookings.map((b: any) => ({
              id: b._id,
              status: b.bookingStatus,
              checkIn:
                b.checkIn instanceof Date
                  ? b.checkIn.toISOString().split('T')[0]
                  : 'invalid date',
              checkOut:
                b.checkOut instanceof Date
                  ? b.checkOut.toISOString().split('T')[0]
                  : 'invalid date',
            }))
          );
        } else {
          data.data.existingBookings = [];
          console.log('[API] No existing bookings found in response');
        }

        // Validate and format unavailable dates
        if (
          data.data.unavailableDates &&
          Array.isArray(data.data.unavailableDates)
        ) {
          data.data.unavailableDates = data.data.unavailableDates
            .map((date: string | Date) => {
              // Handle various date formats
              if (date instanceof Date && !isNaN(date.getTime())) {
                const normalizedDate = new Date(date);
                normalizedDate.setHours(0, 0, 0, 0);
                return normalizedDate;
              }

              // For string dates or other formats
              try {
                const parsedDate = new Date(date);
                if (!isNaN(parsedDate.getTime())) {
                  parsedDate.setHours(0, 0, 0, 0);
                  return parsedDate;
                }
              } catch (err) {
                console.warn(`[API] Failed to parse date: ${date}`, err);
              }

              return null;
            })
            .filter(
              (date: Date | null): date is Date =>
                date !== null && !isNaN(date.getTime())
            );

          // Log processed unavailable dates for debugging
          console.log(
            `[API] Processed ${data.data.unavailableDates.length} unavailable dates:`,
            data.data.unavailableDates.map(
              (d: Date) => d.toISOString().split('T')[0]
            )
          );
        } else {
          data.data.unavailableDates = [];
          console.log('[API] No unavailable dates found in response');
        }

        console.log(
          `[API] Retrieved ${
            data.data.existingBookings?.length || 0
          } bookings and ${
            data.data.unavailableDates?.length || 0
          } unavailable dates for room ${roomId}`
        );
      } else {
        console.warn(
          '[API] Availability API returned success: false or missing data'
        );
      }

      return data;
    } catch (error) {
      console.error('[API] Error fetching room availability:', error);
      return {
        success: false,
        message: 'Failed to fetch room availability',
        data: {
          roomId: roomId,
          unavailableDates: [],
          existingBookings: [],
        },
      };
    }
  },

  getRoomById: async (roomId: string) => {
    try {
      const response = await fetchPublic(`/api/rooms/${roomId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching room ${roomId}:`, error);
      return {
        success: false,
        message: 'Network error while fetching room details',
      };
    }
  },

  getMyRooms: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(
        params as Record<string, string>
      ).toString();
      console.log('Fetching my rooms from API...');
      const response = await fetchWithAuth(
        `/api/rooms/my/listings?${queryString}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }
      const data = await response.json();
      console.log('My rooms API response:', data);
      return data;
    } catch (error) {
      console.error('Error fetching my rooms:', error);
      return {
        success: false,
        message: 'Network error while fetching your rooms',
      };
    }
  },

  createRoom: async (roomData: any) => {
    try {
      const response = await fetchWithAuth('/api/rooms', {
        method: 'POST',
        body: JSON.stringify(roomData),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating room:', error);
      return {
        success: false,
        message: 'Network error while creating room',
      };
    }
  },

  updateRoom: async (roomId: string, roomData: any) => {
    try {
      const response = await fetchWithAuth(`/api/rooms/${roomId}`, {
        method: 'PUT',
        body: JSON.stringify(roomData),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error updating room ${roomId}:`, error);
      return {
        success: false,
        message: 'Network error while updating room',
      };
    }
  },

  deleteRoom: async (roomId: string) => {
    try {
      const response = await fetchWithAuth(`/api/rooms/${roomId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error deleting room ${roomId}:`, error);
      return {
        success: false,
        message: 'Network error while deleting room',
      };
    }
  },

  uploadRoomImages: async (roomId: string, imageFiles: File[]) => {
    try {
      const formData = new FormData();
      imageFiles.forEach((file) => {
        formData.append('images', file);
      });

      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/rooms/${roomId}/images`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload images');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error uploading images for room ${roomId}:`, error);
      return {
        success: false,
        message: 'Network error while uploading images',
      };
    }
  },
  favoriteRoom: async (roomId: string) => {
    try {
      console.log(`[roomApi] Adding room ${roomId} to favorites`);
      const response = await fetchWithAuth('/api/users/save-room', {
        method: 'POST',
        body: JSON.stringify({ roomId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[roomApi] favoriteRoom error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });

        // Try to parse error as JSON, fallback to text
        let errorMessage = `Failed to add to favorites: ${response.status} ${response.statusText}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Use default message if parsing fails
        }

        return {
          success: false,
          message: errorMessage,
        };
      }

      const data = await response.json();
      console.log(`[roomApi] Save room response:`, data);
      return data;
    } catch (error) {
      console.error(`Error adding room ${roomId} to favorites:`, error);
      return {
        success: false,
        message: 'Network error while adding room to favorites',
      };
    }
  },
  unfavoriteRoom: async (roomId: string) => {
    try {
      console.log(`[roomApi] Removing room ${roomId} from favorites`);
      const response = await fetchWithAuth(
        `/api/users/unsave-rooms/${roomId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[roomApi] unfavoriteRoom error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });

        // Try to parse error as JSON, fallback to text
        let errorMessage = `Failed to remove from favorites: ${response.status} ${response.statusText}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Use default message if parsing fails
        }

        return {
          success: false,
          message: errorMessage,
        };
      }

      const data = await response.json();
      console.log(`[roomApi] Unsave room response:`, data);
      return data;
    } catch (error) {
      console.error(`Error removing room ${roomId} from favorites:`, error);
      return {
        success: false,
        message: 'Network error while removing room from favorites',
      };
    }
  },
  getFavoriteRooms: async (params = {}) => {
    try {
      console.log('[roomApi] Fetching favorite rooms...');
      const queryString = new URLSearchParams(
        params as Record<string, string>
      ).toString();
      const response = await fetchWithAuth(
        `/api/users/saved-rooms?${queryString}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[roomApi] getFavoriteRooms error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });

        // Handle 401 specifically for authentication issues
        if (response.status === 401) {
          return {
            success: false,
            message: 'Authentication required to fetch favorites',
            data: [],
          };
        }

        // Try to parse error as JSON, fallback to text
        let errorMessage = `Failed to fetch favorites: ${response.status} ${response.statusText}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Use default message if parsing fails
        }

        return {
          success: false,
          message: errorMessage,
          data: [],
        };
      }

      const data = await response.json();
      console.log('[roomApi] getFavoriteRooms success:', data);
      return data;
    } catch (error) {
      console.error('Error fetching favorite rooms:', error);
      return {
        success: false,
        message: 'Network error while fetching favorite rooms',
        data: [],
      };
    }
  },

  getRoomReviews: async (roomId: string) => {
    try {
      const response = await fetchWithAuth(`/api/reviews/room/${roomId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching reviews for room ${roomId}:`, error);
      return {
        success: false,
        message: 'Network error while fetching reviews',
      };
    }
  },

  addRoomReview: async (roomId: string, reviewData: any) => {
    try {
      const response = await fetchWithAuth(`/api/reviews/room/${roomId}`, {
        method: 'POST',
        body: JSON.stringify(reviewData),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error adding review to room ${roomId}:`, error);
      return {
        success: false,
        message: 'Network error while adding review',
      };
    }
  },

  deleteRoomReview: async (reviewId: string) => {
    try {
      const response = await fetchWithAuth(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error deleting review ${reviewId}:`, error);
      return {
        success: false,
        message: 'Network error while deleting review',
      };
    }
  },

  editRoomReview: async (reviewId: string, reviewData: any) => {
    try {
      const response = await fetchWithAuth(`/api/reviews/${reviewId}`, {
        method: 'PUT',
        body: JSON.stringify(reviewData),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error updating review ${reviewId}:`, error);
      return {
        success: false,
        message: 'Network error while updating review',
      };
    }
  },
};
