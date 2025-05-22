import { Link } from 'react-router-dom';
import {
  FiCalendar,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiChevronRight,
} from 'react-icons/fi';
import { FaPesoSign } from 'react-icons/fa6';
import { formatTimeTo12Hour } from '../../utils/bookingHelpers';

interface Booking {
  id: string;
  roomId: string;
  startDate: string;
  endDate: string;
  checkInTime: string;
  checkOutTime: string;
  totalPrice: number;
  paymentStatus: string;
  status: string;
}

interface UserBookingsProps {
  bookings: Booking[] | undefined;
  showAll?: boolean;
}

const UserBookings = ({ bookings, showAll = false }: UserBookingsProps) => {
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="flex items-center text-green-600 dark:text-green-400">
            <FiCheckCircle className="mr-1" /> Confirmed
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center text-yellow-600 dark:text-yellow-400">
            <FiAlertCircle className="mr-1" /> Pending
          </span>
        );
      case 'cancelled':
        return (
          <span className="flex items-center text-red-600 dark:text-red-400">
            <FiXCircle className="mr-1" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="flex items-center text-blue-600 dark:text-blue-400">
            <FiCheckCircle className="mr-1" /> {status}
          </span>
        );
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const startFormatted = start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    if (
      start.getMonth() === end.getMonth() &&
      start.getFullYear() === end.getFullYear()
    ) {
      const endDay = `${end.getDate()}`;
      const endYear = `${end.getFullYear()}`;
      return `${startFormatted} - ${endDay}, ${endYear}`;
    }

    const endFormatted = end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return `${startFormatted} - ${endFormatted}`;
  };

  const displayedBookings = showAll ? bookings : bookings?.slice(0, 2);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Your Bookings
        </h2>
        {!showAll && bookings && bookings.length > 2 && (
          <Link
            to="/bookings/all"
            className="text-blue-600 dark:text-blue-400 text-sm font-medium flex items-center hover:underline">
            View All <FiChevronRight className="ml-1" />
          </Link>
        )}
      </div>

      {bookings && bookings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedBookings?.map((booking: Booking) => (
            <div
              key={booking.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Room #{booking.roomId}
                  </h3>
                  {getStatusDisplay(booking.status)}
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-start">
                    <FiCalendar className="mt-0.5 mr-2 text-gray-400" />
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Date</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatDateRange(booking.startDate, booking.endDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <FiClock className="mt-0.5 mr-2 text-gray-400" />
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Time</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatTimeTo12Hour(booking.checkInTime)} -{' '}
                        {formatTimeTo12Hour(booking.checkOutTime)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <FaPesoSign className="mt-0.5 mr-2 text-gray-400" />
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">
                        Payment
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        ₱{booking.totalPrice.toLocaleString()} ·{' '}
                        <span className="text-gray-500 dark:text-gray-400 capitalize">
                          {booking.paymentStatus}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                  <Link
                    to={`/bookings/view/${booking.id}`}
                    className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:text-blue-800 dark:hover:text-blue-300">
                    View Details →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 dark:bg-blue-900 flex items-center justify-center">
            <FiCalendar
              className="text-blue-600 dark:text-blue-400"
              size={24}
            />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No bookings yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            You haven't booked any spaces yet.
          </p>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 bg-darkBlue dark:bg-light hover:bg-blue-600 text-light dark:text-darkBlue dark:hover:text-light hover:scale-105 rounded-lg transition-all duration-500">
            Explore Spaces
          </Link>
        </div>
      )}
    </div>
  );
};

export default UserBookings;
