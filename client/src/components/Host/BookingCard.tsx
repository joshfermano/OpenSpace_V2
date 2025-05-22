import {
  FiCalendar,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
  FiCreditCard,
  FiUser,
} from 'react-icons/fi';
import { FaPesoSign, FaReceipt } from 'react-icons/fa6';
import { Booking } from '../../types/booking';
import {
  formatDate,
  calculateDuration,
  getStatusDisplay,
  getPaymentStatusDisplay,
  formatTimeTo12Hour,
} from '../../utils/bookingHelpers';

interface BookingCardProps {
  booking: Booking;
  processingAction: {
    id: string;
    action: string;
  } | null;
  onConfirmBooking: (id: string) => void;
  onRejectBooking: (id: string) => void;
  onCompleteBooking: (id: string) => void;
  onMarkPaymentReceived: (id: string) => void;
  onViewReceipt: (booking: Booking) => void;
}

const BookingCard = ({
  booking,
  processingAction,
  onConfirmBooking,
  onRejectBooking,
  onCompleteBooking,
  onMarkPaymentReceived,
  onViewReceipt,
}: BookingCardProps) => {
  // We no longer need to handle null booking here as we'll filter these out in BookingsList
  // This component will only receive valid bookings with valid room data

  // Safely access room type with fallback
  const roomType = booking.room.type || 'stay';

  // Use the actual booking time values first, and only fall back to defaults if they don't exist
  const checkInTime = booking.checkInTime
    ? formatTimeTo12Hour(booking.checkInTime)
    : roomType === 'stay'
    ? '2:00 PM'
    : roomType === 'conference'
    ? '8:00 AM'
    : '10:00 AM';

  const checkOutTime = booking.checkOutTime
    ? formatTimeTo12Hour(booking.checkOutTime)
    : roomType === 'stay'
    ? '12:00 PM'
    : roomType === 'conference'
    ? '5:00 PM'
    : '10:00 PM';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-md">
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {booking.room.title || 'Untitled Room'}
              </h3>
              <div
                className={`px-3 py-1 rounded-full text-sm font-medium flex items-center
                ${getStatusDisplay(booking.bookingStatus || 'pending').bgColor} 
                ${
                  getStatusDisplay(booking.bookingStatus || 'pending').textColor
                }`}>
                {getStatusDisplay(booking.bookingStatus || 'pending').icon}
                {getStatusDisplay(booking.bookingStatus || 'pending').text}
              </div>
            </div>

            <div className="text-sm text-gray-700 dark:text-gray-300 mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center">
                <FiUser className="mr-1.5 text-gray-500" />
                {booking.user?.firstName || 'Guest'}{' '}
                {booking.user?.lastName || ''}
              </span>
              <span className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400">
                Booking ID: {(booking._id || 'N/A').substring(0, 8)}...
              </span>
              <span className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400">
                Booked on:{' '}
                {booking.createdAt ? formatDate(booking.createdAt) : 'Unknown'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-start">
                <FiCalendar className="mt-0.5 mr-2 text-gray-400" />
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Dates
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatDate(booking.checkIn)} -{' '}
                    {formatDate(booking.checkOut)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {calculateDuration(booking)}
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <FiClock className="mt-0.5 mr-2 text-gray-400" />
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Time
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {checkInTime} - {checkOutTime}
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <FaPesoSign className="mt-0.5 mr-2 text-gray-400" />
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Payment
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    ₱{(booking.totalPrice || 0).toLocaleString()}
                  </p>
                  <div
                    className={`text-sm flex items-center ${
                      getPaymentStatusDisplay(
                        booking.paymentStatus || 'pending',
                        booking.paymentMethod || 'card'
                      ).color
                    }`}>
                    {
                      getPaymentStatusDisplay(
                        booking.paymentStatus || 'pending',
                        booking.paymentMethod || 'card'
                      ).icon
                    }
                    {
                      getPaymentStatusDisplay(
                        booking.paymentStatus || 'pending',
                        booking.paymentMethod || 'card'
                      ).text
                    }
                  </div>
                </div>
              </div>
            </div>

            {booking.specialRequests && (
              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Special Requests:
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  {booking.specialRequests}
                </p>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 flex md:flex-col gap-2 justify-end">
            {booking.room.images && booking.room.images.length > 0 && (
              <div className="w-24 h-24 rounded-lg overflow-hidden hidden md:block">
                <img
                  src={booking.room.images[0]}
                  alt={booking.room.title || 'Room'}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>

        <BookingActions
          booking={booking}
          processingAction={processingAction}
          onConfirmBooking={onConfirmBooking}
          onRejectBooking={onRejectBooking}
          onCompleteBooking={onCompleteBooking}
          onMarkPaymentReceived={onMarkPaymentReceived}
          onViewReceipt={() => onViewReceipt(booking)}
        />
      </div>
    </div>
  );
};

interface BookingActionsProps {
  booking: Booking;
  processingAction: {
    id: string;
    action: string;
  } | null;
  onConfirmBooking: (id: string) => void;
  onRejectBooking: (id: string) => void;
  onCompleteBooking: (id: string) => void;
  onMarkPaymentReceived: (id: string) => void;
  onViewReceipt: () => void;
}

const BookingActions = ({
  booking,
  processingAction,
  onConfirmBooking,
  onRejectBooking,
  onCompleteBooking,
  onMarkPaymentReceived,
  onViewReceipt,
}: BookingActionsProps) => {
  const isProcessing = processingAction?.id === booking._id;

  return (
    <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
      <button
        onClick={onViewReceipt}
        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center transition-colors">
        <FaReceipt className="mr-2" /> View Receipt
      </button>

      {booking.bookingStatus === 'pending' && (
        <>
          <button
            onClick={() => onConfirmBooking(booking._id)}
            disabled={isProcessing}
            className={`px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center transition-colors
              ${
                isProcessing && processingAction?.action === 'confirm'
                  ? 'opacity-75'
                  : ''
              }`}>
            {isProcessing && processingAction?.action === 'confirm' ? (
              <>
                <FiRefreshCw className="mr-2 animate-spin" /> Confirming...
              </>
            ) : (
              <>
                <FiCheckCircle className="mr-2" /> Confirm Booking
              </>
            )}
          </button>

          <button
            onClick={() => onRejectBooking(booking._id)}
            disabled={isProcessing}
            className={`px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center transition-colors
              ${
                isProcessing && processingAction?.action === 'reject'
                  ? 'opacity-75'
                  : ''
              }`}>
            {isProcessing && processingAction?.action === 'reject' ? (
              <>
                <FiRefreshCw className="mr-2 animate-spin" /> Rejecting...
              </>
            ) : (
              <>
                <FiXCircle className="mr-2" /> Reject Booking
              </>
            )}
          </button>
        </>
      )}

      {booking.bookingStatus === 'confirmed' && (
        <button
          onClick={() => onCompleteBooking(booking._id)}
          disabled={isProcessing}
          className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center transition-colors
            ${
              isProcessing && processingAction?.action === 'complete'
                ? 'opacity-75'
                : ''
            }`}>
          {isProcessing && processingAction?.action === 'complete' ? (
            <>
              <FiRefreshCw className="mr-2 animate-spin" /> Completing...
            </>
          ) : (
            <>
              <FiCheckCircle className="mr-2" /> Mark as Completed
            </>
          )}
        </button>
      )}

      {booking.paymentMethod === 'property' &&
        booking.paymentStatus === 'pending' &&
        booking.bookingStatus === 'confirmed' && (
          <button
            onClick={() => onMarkPaymentReceived(booking._id)}
            disabled={isProcessing}
            className={`px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center transition-colors
            ${
              isProcessing && processingAction?.action === 'mark-paid'
                ? 'opacity-75'
                : ''
            }`}>
            {isProcessing && processingAction?.action === 'mark-paid' ? (
              <>
                <FiRefreshCw className="mr-2 animate-spin" /> Processing...
              </>
            ) : (
              <>
                <FiCreditCard className="mr-2" /> Receive Payment
              </>
            )}
          </button>
        )}
    </div>
  );
};

export default BookingCard;
