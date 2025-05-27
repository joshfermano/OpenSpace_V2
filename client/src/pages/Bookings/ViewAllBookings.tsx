import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiLoader,
  FiCalendar,
  FiFilter,
  FiX,
  FiArrowUp,
  FiArrowDown,
  FiClock,
} from 'react-icons/fi';
import { GoSortAsc } from 'react-icons/go';
import { bookingApi } from '../../services/bookingApi';
import UserBookings from '../../components/User Dashboard/UserBookings';
import Pagination from '../../components/UI/Pagination';

interface Booking {
  id: string;
  roomId: string;
  roomTitle: string;
  roomImage: string | null;
  startDate: string;
  endDate: string;
  checkInTime: string;
  checkOutTime: string;
  totalPrice: number;
  paymentStatus: string;
  status: string;
  createdAt: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  count: number;
  total?: number;
}

type StatusFilter =
  | 'all'
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'rejected';

type SortOption = 'newest' | 'oldest' | 'newest-booked' | 'oldest-booked';

const ViewAllBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest-booked');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    count: 0,
  });

  // Fetch bookings with pagination and filters
  const fetchBookings = async (
    page = 1,
    status = activeFilter,
    sort = sortBy
  ) => {
    try {
      setBookingsLoading(true);
      console.log(
        `Fetching bookings for page ${page} with status: ${status}, sort: ${sort}`
      );

      const params: Record<string, string> = {
        page: page.toString(),
        limit: '12', // Show 12 bookings per page
      };

      // Add status filter if not 'all'
      if (status !== 'all') {
        params.status = status;
      }

      const response = await bookingApi.getUserBookings(params);
      console.log('Bookings API response:', response);

      if (response.success) {
        // Map the API response to match our Booking interface
        let formattedBookings = response.data.map((booking: any) => ({
          id: booking._id,
          roomId: booking.room?._id || 'Unavailable',
          roomTitle: booking.room?.title || 'Room',
          roomImage: booking.room?.images?.[0] || null,
          startDate: booking.checkIn,
          endDate: booking.checkOut,
          checkInTime: booking.checkInTime || '14:00',
          checkOutTime: booking.checkOutTime || '12:00',
          totalPrice: booking.totalPrice,
          paymentStatus: booking.paymentStatus,
          status: booking.bookingStatus,
          createdAt: booking.createdAt || new Date().toISOString(),
        }));

        // Apply client-side sorting since server doesn't handle all sort options
        formattedBookings = sortBookings(formattedBookings, sort);

        setBookings(formattedBookings);
        setPagination({
          currentPage: response.currentPage || page,
          totalPages: response.totalPages || 1,
          count: response.count || 0,
          total: response.total,
        });
      } else {
        console.error('Failed to fetch bookings:', response.message);
        setBookings([]);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchBookings(newPage, activeFilter, sortBy);
    }
  };

  // Sort bookings function
  const sortBookings = (
    bookingsToSort: Booking[],
    sortOption: SortOption
  ): Booking[] => {
    return [...bookingsToSort].sort((a, b) => {
      switch (sortOption) {
        case 'newest':
          // Sort by check-in date (newest first)
          return (
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
          );
        case 'oldest':
          // Sort by check-in date (oldest first)
          return (
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          );
        case 'newest-booked':
          // Sort by booking date (newest first)
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case 'oldest-booked':
          // Sort by booking date (oldest first)
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        default:
          return 0;
      }
    });
  };

  // Initial fetch
  useEffect(() => {
    fetchBookings(1);
    setLoading(false);
  }, []);

  // Handle filter change
  const handleFilterChange = (filter: StatusFilter) => {
    setActiveFilter(filter);
    setIsFilterOpen(false);
    fetchBookings(1, filter, sortBy); // Reset to page 1 when filtering
  };

  // Handle sort change
  const handleSortChange = (option: SortOption) => {
    setSortBy(option);
    setIsSortOpen(false);
    fetchBookings(pagination.currentPage, activeFilter, option);
  };

  // Get status count (for display only, actual counts come from server)
  const getStatusCount = (status: StatusFilter): string => {
    if (status === 'all') {
      return pagination.total ? pagination.total.toString() : '0';
    }
    return '—'; // We don't have individual status counts from server
  };

  const renderSortLabel = () => {
    switch (sortBy) {
      case 'newest':
        return (
          <>
            <FiArrowDown className="mr-1" />
            <span>Check-in Date: Newest First</span>
          </>
        );
      case 'oldest':
        return (
          <>
            <FiArrowUp className="mr-1" />
            <span>Check-in Date: Oldest First</span>
          </>
        );
      case 'newest-booked':
        return (
          <>
            <FiArrowDown className="mr-1" />
            <span>Booking Date: Newest First</span>
          </>
        );
      case 'oldest-booked':
        return (
          <>
            <FiArrowUp className="mr-1" />
            <span>Booking Date: Oldest First</span>
          </>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-darkBlue p-6 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <FiLoader
            size={40}
            className="text-darkBlue dark:text-light animate-spin mb-4"
          />
          <p className="text-gray-600 dark:text-gray-300">
            Loading your bookings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkBlue p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <Link
              to="/dashboard"
              className="inline-flex items-center text-blue-600 dark:text-blue-400 mb-4 md:mb-0 hover:underline">
              <FiArrowLeft className="mr-2" /> Back to Dashboard
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mt-2">
              Your Bookings
            </h1>
            {pagination.count > 0 && (
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Showing {pagination.count} of{' '}
                {pagination.total || pagination.count} bookings
              </p>
            )}
          </div>

          {/* Mobile Control Buttons */}
          <div className="md:hidden mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center justify-center py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <FiFilter className="mr-2" />
              {activeFilter !== 'all' ? `${activeFilter}` : 'Filter'}
            </button>

            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center justify-center py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <GoSortAsc className="mr-2" />
              {sortBy === 'newest-booked'
                ? 'Newest Booked'
                : sortBy === 'oldest-booked'
                ? 'Oldest Booked'
                : sortBy === 'newest'
                ? 'Newest Check-in'
                : 'Oldest Check-in'}
            </button>
          </div>
        </div>

        {/* Mobile Filter Dropdown */}
        {isFilterOpen && (
          <div className="md:hidden fixed inset-0 z-30 bg-black bg-opacity-50">
            <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-xl p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Filter Bookings
                </h3>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                  <FiX className="text-gray-500 dark:text-gray-400" size={24} />
                </button>
              </div>

              <div className="space-y-2">
                {(
                  [
                    'all',
                    'pending',
                    'confirmed',
                    'completed',
                    'cancelled',
                    'rejected',
                  ] as StatusFilter[]
                ).map((status) => (
                  <button
                    key={status}
                    onClick={() => handleFilterChange(status)}
                    className={`w-full flex items-center justify-between py-3 px-4 rounded-lg transition-colors ${
                      activeFilter === status
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                    <span className="capitalize">{status}</span>
                    <span className="bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-300 text-xs rounded-full py-1 px-2">
                      {getStatusCount(status)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Sort Options Dropdown */}
        {isSortOpen && (
          <div className="md:hidden fixed inset-0 z-30 bg-black bg-opacity-50">
            <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-xl p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Sort By
                </h3>
                <button
                  onClick={() => setIsSortOpen(false)}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                  <FiX className="text-gray-500 dark:text-gray-400" size={24} />
                </button>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => handleSortChange('newest-booked')}
                  className={`w-full flex items-center justify-between py-3 px-4 rounded-lg transition-colors ${
                    sortBy === 'newest-booked'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}>
                  <div className="flex items-center">
                    <FiArrowDown className="mr-2" />
                    <span>Booking Date: Newest First</span>
                  </div>
                </button>

                <button
                  onClick={() => handleSortChange('oldest-booked')}
                  className={`w-full flex items-center justify-between py-3 px-4 rounded-lg transition-colors ${
                    sortBy === 'oldest-booked'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}>
                  <div className="flex items-center">
                    <FiArrowUp className="mr-2" />
                    <span>Booking Date: Oldest First</span>
                  </div>
                </button>

                <button
                  onClick={() => handleSortChange('newest')}
                  className={`w-full flex items-center justify-between py-3 px-4 rounded-lg transition-colors ${
                    sortBy === 'newest'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}>
                  <div className="flex items-center">
                    <FiArrowDown className="mr-2" />
                    <span>Check-in Date: Newest First</span>
                  </div>
                </button>

                <button
                  onClick={() => handleSortChange('oldest')}
                  className={`w-full flex items-center justify-between py-3 px-4 rounded-lg transition-colors ${
                    sortBy === 'oldest'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}>
                  <div className="flex items-center">
                    <FiArrowUp className="mr-2" />
                    <span>Check-in Date: Oldest First</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          {/* Desktop Filter Tabs */}
          <div className="hidden md:flex border-b border-gray-200 dark:border-gray-700">
            {(
              [
                'all',
                'pending',
                'confirmed',
                'completed',
                'cancelled',
                'rejected',
              ] as StatusFilter[]
            ).map((status) => (
              <button
                key={status}
                onClick={() => handleFilterChange(status)}
                className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
                  activeFilter === status
                    ? 'border-darkBlue dark:border-light text-darkBlue dark:text-light'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}>
                <span className="capitalize">{status}</span>
                <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 text-xs rounded-full py-1 px-2">
                  {getStatusCount(status)}
                </span>
              </button>
            ))}
          </div>

          {/* Desktop Sort Dropdown */}
          <div className="hidden md:block relative">
            <div className="flex items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                Sort by:
              </span>
              <div className="relative">
                <button
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  className="flex items-center py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium">
                  <FiClock className="mr-2" />
                  {renderSortLabel()}
                </button>

                {isSortOpen && (
                  <div className="absolute right-0 mt-1 w-72 bg-white dark:bg-gray-800 shadow-lg rounded-md overflow-hidden z-20 border border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => handleSortChange('newest-booked')}
                      className={`w-full text-left px-4 py-2 text-sm ${
                        sortBy === 'newest-booked'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}>
                      <div className="flex items-center">
                        <FiArrowDown className="mr-2" />
                        <span>Booking Date: Newest First</span>
                      </div>
                    </button>
                    <button
                      onClick={() => handleSortChange('oldest-booked')}
                      className={`w-full text-left px-4 py-2 text-sm ${
                        sortBy === 'oldest-booked'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}>
                      <div className="flex items-center">
                        <FiArrowUp className="mr-2" />
                        <span>Booking Date: Oldest First</span>
                      </div>
                    </button>
                    <button
                      onClick={() => handleSortChange('newest')}
                      className={`w-full text-left px-4 py-2 text-sm ${
                        sortBy === 'newest'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}>
                      <div className="flex items-center">
                        <FiArrowDown className="mr-2" />
                        <span>Check-in Date: Newest First</span>
                      </div>
                    </button>
                    <button
                      onClick={() => handleSortChange('oldest')}
                      className={`w-full text-left px-4 py-2 text-sm ${
                        sortBy === 'oldest'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}>
                      <div className="flex items-center">
                        <FiArrowUp className="mr-2" />
                        <span>Check-in Date: Oldest First</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Booking Results */}
        {bookingsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="h-48 bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                <div className="p-5">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3 animate-pulse"></div>
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : bookings.length > 0 ? (
          <>
            <UserBookings bookings={bookings} showAll={true} />

            {/* Pagination */}
            <div className="mt-8">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          </>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 dark:bg-blue-900 flex items-center justify-center">
              <FiCalendar
                className="text-blue-600 dark:text-blue-400"
                size={24}
              />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No {activeFilter !== 'all' && activeFilter} bookings found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {activeFilter === 'all'
                ? "You don't have any bookings yet."
                : `You don't have any ${activeFilter} bookings.`}
            </p>
            {activeFilter !== 'all' && (
              <button
                onClick={() => setActiveFilter('all')}
                className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
                Show all bookings
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewAllBookings;
