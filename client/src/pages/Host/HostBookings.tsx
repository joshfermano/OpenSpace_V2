import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiCalendar,
  FiHome,
  FiFilter,
  FiRefreshCw,
  FiAlertCircle,
} from 'react-icons/fi';
import { bookingApi } from '../../services/bookingApi';
import { Booking } from '../../types/booking';
import BookingsFilter from '../../components/Host/BookingsFilter';
import BookingsList from '../../components/Host/BookingsList';
import ReceiptModal from '../../components/Host/ReceiptModal';
import { toast } from 'react-toastify';

const HostBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [processingAction, setProcessingAction] = useState<{
    id: string;
    action: string;
  } | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    fetchBookings();
  }, [statusFilter]);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await bookingApi.getHostBookings(params);
      if (response.success) {
        setBookings(response.data || []);
      } else {
        setError(response.message || 'Failed to fetch bookings');
        console.error('Failed to fetch bookings:', response.message);
      }
    } catch (error) {
      setError('Network error while loading bookings');
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBooking = async (bookingId: string) => {
    setProcessingAction({ id: bookingId, action: 'confirm' });
    try {
      const response = await bookingApi.confirmBooking(bookingId);
      if (response.success) {
        toast.success('Booking confirmed successfully');
        fetchBookings();
      } else {
        toast.error(response.message || 'Failed to confirm booking');
        console.error('Failed to confirm booking:', response.message);
      }
    } catch (error) {
      toast.error('Network error while confirming booking');
      console.error('Error confirming booking:', error);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    setProcessingAction({ id: bookingId, action: 'reject' });
    try {
      const response = await bookingApi.rejectBooking(
        bookingId,
        'Rejected by host'
      );
      if (response.success) {
        toast.success('Booking rejected successfully');
        fetchBookings();
      } else {
        toast.error(response.message || 'Failed to reject booking');
        console.error('Failed to reject booking:', response.message);
      }
    } catch (error) {
      toast.error('Network error while rejecting booking');
      console.error('Error rejecting booking:', error);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleCompleteBooking = async (bookingId: string) => {
    setProcessingAction({ id: bookingId, action: 'complete' });
    try {
      const response = await bookingApi.completeBooking(bookingId);
      if (response.success) {
        toast.success('Booking marked as completed');
        fetchBookings();
      } else {
        toast.error(response.message || 'Failed to complete booking');
        console.error('Failed to complete booking:', response.message);
      }
    } catch (error) {
      toast.error('Network error while completing booking');
      console.error('Error completing booking:', error);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleMarkPaymentReceived = async (bookingId: string) => {
    setProcessingAction({ id: bookingId, action: 'mark-paid' });
    try {
      const response = await bookingApi.markPaymentReceived(bookingId);
      if (response.success) {
        toast.success('Payment marked as received');
        fetchBookings();
      } else {
        toast.error(response.message || 'Failed to mark payment as received');
        console.error('Failed to mark payment as received:', response.message);
      }
    } catch (error) {
      toast.error('Network error while marking payment as received');
      console.error('Error marking payment as received:', error);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleViewReceipt = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowReceiptModal(true);
  };

  const closeReceiptModal = () => {
    setShowReceiptModal(false);
    setSelectedBooking(null);
  };

  if (error) {
    return <ErrorState error={error} onRetry={fetchBookings} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkBlue p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header with title and action buttons */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6 gap-4">
          <div>
            <Link
              to="/dashboard"
              className="text-blue-600 dark:text-blue-400 flex items-center hover:underline mb-2">
              <FiHome className="mr-2" /> Back to Dashboard
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Manage Your Bookings
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Review, confirm, and manage all your property bookings
            </p>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <Link
              to="/dashboard/earnings"
              className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/40 rounded-lg transition-colors text-sm font-medium flex items-center">
              View Earnings
            </Link>
            <Link
              to="/rooms/create"
              className="px-4 py-2 bg-darkBlue dark:bg-light text-light dark:text-darkBlue hover:bg-blue-700 dark:hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium flex items-center">
              <FiHome className="mr-2" /> Add New Listing
            </Link>
          </div>
        </div>

        {/* Status filters */}
        <BookingsFilter
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />

        {/* Bookings list or empty state */}
        <div className="mt-6">
          {loading ? (
            <LoadingState />
          ) : bookings.length === 0 ? (
            <EmptyState statusFilter={statusFilter} />
          ) : (
            <BookingsList
              bookings={bookings}
              processingAction={processingAction}
              onConfirmBooking={handleConfirmBooking}
              onRejectBooking={handleRejectBooking}
              onCompleteBooking={handleCompleteBooking}
              onMarkPaymentReceived={handleMarkPaymentReceived}
              onViewReceipt={handleViewReceipt}
            />
          )}
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && selectedBooking && (
        <ReceiptModal booking={selectedBooking} onClose={closeReceiptModal} />
      )}
    </div>
  );
};

const LoadingState = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8">
    <div className="flex flex-col items-center justify-center">
      <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
        <FiRefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Loading Bookings
      </h3>
      <p className="text-gray-600 dark:text-gray-400 max-w-md text-center">
        Please wait while we fetch your bookings...
      </p>
    </div>

    <div className="mt-12 space-y-6 animate-pulse">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="border border-gray-100 dark:border-gray-700 rounded-xl p-6">
          <div className="flex justify-between mb-4">
            <div className="w-1/3 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="w-24 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="space-y-2 mb-6">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((j) => (
              <div
                key={j}
                className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="w-28 h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="w-28 h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

const ErrorState = ({ error, onRetry }: ErrorStateProps) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
    <div className="flex flex-col items-center justify-center">
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
        <FiAlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Error Loading Bookings
      </h3>
      <p className="text-gray-600 dark:text-gray-400 max-w-md mb-6">{error}</p>
      <button
        onClick={onRetry}
        className="px-6 py-2 bg-darkBlue dark:bg-light text-light dark:text-darkBlue rounded-lg hover:bg-blue-700 dark:hover:bg-gray-200 transition-colors">
        <FiRefreshCw className="inline mr-2" /> Try Again
      </button>
    </div>
  </div>
);

interface EmptyStateProps {
  statusFilter: string;
}

const EmptyState = ({ statusFilter }: EmptyStateProps) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <div className="p-8 md:p-12 flex flex-col items-center text-center">
        <div className="w-24 h-24 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-6">
          <FiCalendar className="w-12 h-12 text-blue-500 dark:text-blue-400" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          No {statusFilter !== 'all' ? statusFilter : ''} Bookings Found
        </h2>

        <p className="text-gray-600 dark:text-gray-400 max-w-lg mx-auto mb-8">
          {statusFilter === 'all'
            ? "You don't have any bookings yet. When guests book your spaces, they will appear here."
            : `You don't have any ${statusFilter} bookings at the moment. Check back later or view a different status category.`}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/rooms/my"
            className="px-6 py-3 bg-darkBlue dark:bg-light text-white dark:text-darkBlue rounded-lg hover:bg-blue-700 dark:hover:bg-gray-200 transition-all inline-flex items-center justify-center">
            <FiHome className="mr-2" /> View Your Listings
          </Link>

          {statusFilter !== 'all' && (
            <Link
              to="/host/bookings"
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all inline-flex items-center justify-center text-gray-700 dark:text-gray-300">
              <FiFilter className="mr-2" /> View All Bookings
            </Link>
          )}
        </div>
      </div>

      {/* Decorative illustration */}
      <div className="bg-blue-50 dark:bg-blue-900/10 px-8 py-6 border-t border-blue-100 dark:border-blue-900/20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-1">
              Looking for more bookings?
            </h3>
            <p className="text-blue-700 dark:text-blue-400 text-sm">
              Complete your listings with high-quality photos and detailed
              descriptions to attract more guests.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="whitespace-nowrap text-sm bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors">
            Go to Host Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HostBookings;
