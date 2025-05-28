import { fetchWithAuth } from './core';

export interface PlatformFeeRemittance {
  _id: string;
  host: string;
  earning: {
    _id: string;
    amount: number;
    platformFee: number;
    hostPayout: number;
  };
  booking: {
    _id: string;
    checkIn: string;
    checkOut: string;
    totalPrice: number;
    room: {
      title: string;
      images?: string[];
    };
  };
  platformFeeAmount: number;
  status: 'outstanding' | 'paid' | 'overdue';
  dueDate: string;
  paymentMethod?: 'card' | 'gcash' | 'maya';
  paymentDetails?: {
    transactionId?: string;
    paymentDate?: string;
    mobileNumber?: string;
    cardLastFour?: string;
    cardholderName?: string;
  };
  remittanceId?: string;
  overdueDate?: string;
  penalties?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RemittanceSummary {
  outstanding: { amount: number; count: number };
  paid: { amount: number; count: number };
  overdue: { amount: number; count: number };
}

export interface PaymentDetails {
  cardNumber?: string;
  cardholderName?: string;
  mobileNumber?: string;
}

export const platformFeeRemittanceApi = {
  // Host: Get remittances
  getHostRemittances: async (
    params: {
      status?: string;
      page?: number;
      limit?: number;
    } = {}
  ) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.append('status', params.status);
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());

      const response = await fetchWithAuth(
        `/api/platform-fee-remittance/host/remittances?${queryParams}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          message: errorData.message || 'Failed to fetch remittances',
        };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching host remittances:', error);
      return {
        success: false,
        message: 'Network error while fetching remittances',
      };
    }
  },

  // Host: Process payment for a remittance
  processRemittancePayment: async (
    remittanceId: string,
    paymentMethod: 'card' | 'gcash' | 'maya',
    paymentDetails: PaymentDetails
  ) => {
    try {
      const response = await fetchWithAuth(
        `/api/platform-fee-remittance/host/remittances/${remittanceId}/pay`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentMethod,
            paymentDetails,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          message: errorData.message || 'Failed to process payment',
        };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error processing remittance payment:', error);
      return {
        success: false,
        message: 'Network error while processing payment',
      };
    }
  },

  // Admin: Get all remittances
  getAllRemittances: async (
    params: {
      status?: string;
      page?: number;
      limit?: number;
      hostId?: string;
    } = {}
  ) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.append('status', params.status);
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.hostId) queryParams.append('hostId', params.hostId);

      const response = await fetchWithAuth(
        `/api/platform-fee-remittance/admin/remittances?${queryParams}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          message: errorData.message || 'Failed to fetch remittances',
        };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching all remittances:', error);
      return {
        success: false,
        message: 'Network error while fetching remittances',
      };
    }
  },

  // Admin: Mark overdue remittances
  markOverdueRemittances: async () => {
    try {
      const response = await fetchWithAuth(
        '/api/platform-fee-remittance/admin/remittances/mark-overdue',
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          message: errorData.message || 'Failed to mark overdue remittances',
        };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error marking overdue remittances:', error);
      return {
        success: false,
        message: 'Network error while marking overdue remittances',
      };
    }
  },

  // Admin: Get platform fee statistics
  getPlatformFeeStatistics: async (period: string = 'month') => {
    try {
      const response = await fetchWithAuth(
        `/api/platform-fee-remittance/admin/statistics?period=${period}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          message: errorData.message || 'Failed to fetch statistics',
        };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching platform fee statistics:', error);
      return {
        success: false,
        message: 'Network error while fetching statistics',
      };
    }
  },
};
