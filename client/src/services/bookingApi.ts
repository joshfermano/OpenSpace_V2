import { fetchWithAuth } from './core';

export const bookingApi = {
  createBooking: async (bookingData: any) => {
    try {
      console.log('Sending booking data:', bookingData);

      const response = await fetchWithAuth('/api/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        // Log the actual response for debugging
        const errorData = await response.text();
        console.error(`Server returned ${response.status}:`, errorData);

        return {
          success: false,
          message: `Failed to create booking: ${response.statusText}`,
          error: errorData,
        };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating booking:', error);
      return {
        success: false,
        message: 'Network error while creating booking',
      };
    }
  },

  getUserBookings: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(
        params as Record<string, string>
      ).toString();
      console.log('Fetching user bookings with params:', params);
      const response = await fetchWithAuth(
        `/api/bookings/my/bookings?${queryString}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error fetching user bookings:', errorData);
        return {
          success: false,
          message: errorData.message || 'Failed to fetch bookings',
        };
      }

      const data = await response.json();
      console.log('User bookings API response:', data);
      return data;
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      return {
        success: false,
        message: 'Network error while fetching bookings',
      };
    }
  },

  getBookingById: async (bookingId: string) => {
    try {
      const response = await fetchWithAuth(`/api/bookings/${bookingId}`);

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          message: errorData.message || `Failed to fetch booking details`,
        };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching booking ${bookingId}:`, error);
      return {
        success: false,
        message: 'Network error while fetching booking details',
      };
    }
  },

  processCardPayment: async (bookingId: string, cardDetails: any) => {
    try {
      console.log('Processing card payment with data:', {
        bookingId,
        paymentMethod: 'card',
      });

      const response = await fetchWithAuth('/api/bookings/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          paymentMethod: 'card',
          cardDetails,
        }),
      });

      if (!response.ok) {
        const errorDetail = await response.json();
        console.error('Card payment error:', errorDetail);
        return {
          success: false,
          message: errorDetail.message || 'Card payment failed',
        };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Network error processing card payment:', error);
      return {
        success: false,
        message: 'Network error while processing payment',
      };
    }
  },

  processMobilePayment: async (
    bookingId: string,
    paymentMethod: 'gcash' | 'maya',
    mobileNumber: string
  ) => {
    try {
      if (!mobileNumber.match(/^09\d{9}$/)) {
        return {
          success: false,
          message: 'Invalid mobile number format',
        };
      }

      const response = await fetchWithAuth('/api/bookings/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          paymentMethod,
          mobilePaymentDetails: {
            mobileNumber,
          },
        }),
      });

      if (!response.ok) {
        const errorDetail = await response.json();
        console.error('Mobile payment error:', errorDetail);
        return {
          success: false,
          message: errorDetail.message || `${paymentMethod} payment failed`,
        };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error processing ${paymentMethod} payment:`, error);
      return {
        success: false,
        message: `Network error while processing ${paymentMethod} payment`,
      };
    }
  },

  createPropertyPayBooking: async (bookingData: any) => {
    try {
      // Set payment method to property
      bookingData.paymentMethod = 'property';

      const response = await fetchWithAuth('/api/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating pay-at-property booking:', error);
      return {
        success: false,
        message: 'Network error while creating booking',
      };
    }
  },

  cancelBooking: async (bookingId: string, reason: string) => {
    try {
      const response = await fetchWithAuth(
        `/api/bookings/${bookingId}/cancel`,
        {
          method: 'PATCH',
          body: JSON.stringify({ reason }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          message: errorData.message || 'Failed to cancel booking',
        };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error cancelling booking ${bookingId}:`, error);
      return {
        success: false,
        message: 'Network error while cancelling booking',
      };
    }
  },

  canCancelBooking: async (bookingId: string) => {
    try {
      const response = await fetchWithAuth(
        `/api/bookings/${bookingId}/can-cancel`
      );

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          message:
            errorData.message || 'Unable to check cancellation eligibility',
          canCancel: false,
        };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(
        `Error checking if booking ${bookingId} can be cancelled:`,
        error
      );
      return {
        success: false,
        message: 'Network error while checking cancellation eligibility',
        canCancel: false,
      };
    }
  },

  canReviewRoom: async (roomId: string) => {
    try {
      const response = await fetchWithAuth(
        `/api/bookings/room/${roomId}/can-review`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error checking if can review room ${roomId}:`, error);
      return {
        success: false,
        message: 'Network error while checking review eligibility',
      };
    }
  },

  // Host booking management
  getHostBookings: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(
        params as Record<string, string>
      ).toString();
      console.log('Fetching host bookings with params:', params);
      const response = await fetchWithAuth(
        `/api/bookings/host/bookings?${queryString}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error fetching host bookings:', errorData);
        return {
          success: false,
          message: errorData.message || 'Failed to fetch host bookings',
        };
      }

      const data = await response.json();
      console.log('Host bookings API response:', data);
      return data;
    } catch (error) {
      console.error('Error fetching host bookings:', error);
      return {
        success: false,
        message: 'Network error while fetching host bookings',
      };
    }
  },

  confirmBooking: async (bookingId: string) => {
    try {
      const response = await fetchWithAuth(
        `/api/bookings/${bookingId}/confirm`,
        {
          method: 'PATCH',
        }
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error confirming booking ${bookingId}:`, error);
      return {
        success: false,
        message: 'Network error while confirming booking',
      };
    }
  },

  rejectBooking: async (bookingId: string, reason: string) => {
    try {
      const response = await fetchWithAuth(
        `/api/bookings/${bookingId}/reject`,
        {
          method: 'PATCH',
          body: JSON.stringify({ reason }),
        }
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error rejecting booking ${bookingId}:`, error);
      return {
        success: false,
        message: 'Network error while rejecting booking',
      };
    }
  },

  completeBooking: async (bookingId: string) => {
    try {
      const response = await fetchWithAuth(
        `/api/bookings/${bookingId}/complete`,
        {
          method: 'PATCH',
        }
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error completing booking ${bookingId}:`, error);
      return {
        success: false,
        message: 'Network error while completing booking',
      };
    }
  },

  markPaymentReceived: async (bookingId: string) => {
    try {
      const response = await fetchWithAuth(
        `/api/bookings/${bookingId}/mark-paid`,
        {
          method: 'PATCH',
        }
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(
        `Error marking payment received for booking ${bookingId}:`,
        error
      );
      return {
        success: false,
        message: 'Network error while processing payment receipt',
      };
    }
  },

  sendReceiptEmail: async (bookingId: string, email?: string) => {
    try {
      const response = await fetchWithAuth(
        `/api/bookings/${bookingId}/send-receipt`,
        {
          method: 'POST',
          body: JSON.stringify({ email }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          message: errorData.message || 'Failed to send receipt',
        };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error sending receipt for booking ${bookingId}:`, error);
      return {
        success: false,
        message: 'Network error while sending receipt',
      };
    }
  },
};
