import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiChevronLeft,
  FiCalendar,
  FiMapPin,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiDownload,
  FiMessageSquare,
  FiPhone,
  FiInfo,
  FiWifi,
  FiMonitor,
  FiCoffee,
  FiCheck,
  FiSlack,
  FiLoader,
  FiClock,
} from 'react-icons/fi';
import { GiSnowflake1, GiRoundTable } from 'react-icons/gi';
import { MdOutlineMeetingRoom, MdOutlineChair } from 'react-icons/md';
import { FaCar, FaRestroom, FaAccessibleIcon } from 'react-icons/fa';
import { bookingApi } from '../../services/bookingApi';
import logo_black from '../../assets/logo_black.jpg';
import CancelBookingModal from '../../components/Bookings/CancelBookingModal';
import { formatTimeTo12Hour } from '../../utils/bookingHelpers';

const ViewBooking = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);
  const [cancelDetails, setCancelDetails] = useState<any>(null);
  const [isCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    fetchBookingData();
  }, [bookingId]);

  const fetchBookingData = async () => {
    try {
      setLoading(true);
      if (!bookingId) {
        toast.error('Booking ID is missing');
        navigate('/dashboard');
        return;
      }

      const response = await bookingApi.getBookingById(bookingId);
      if (response.success && response.data) {
        setBooking(response.data);

        // Check cancellation eligibility
        const cancelResponse = await bookingApi.canCancelBooking(bookingId);
        if (cancelResponse.success) {
          setCancelDetails(cancelResponse.data);
        }
      } else {
        toast.error('Failed to fetch booking details');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching booking data:', error);
      toast.error('Something went wrong loading your booking');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReceiptEmail = async () => {
    try {
      toast.info('Sending receipt to your email...');

      const response = await bookingApi.sendReceiptEmail(bookingId as string);

      if (response.success) {
        toast.success('Receipt has been sent to your email');
      } else {
        toast.error(response.message || 'Failed to send receipt');
      }
    } catch (error) {
      console.error('Error sending receipt email:', error);
      toast.error('An error occurred while sending the receipt');
    }
  };

  // Format date to readable format
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate duration between two dates
  const calculateDuration = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return '';

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays === 1 ? '1 day' : `${diffDays} days`;
  };

  // Get status display with appropriate icon and color
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'confirmed':
        return {
          icon: <FiCheckCircle className="mr-2" size={20} />,
          text: 'Confirmed',
          color:
            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        };
      case 'pending':
        return {
          icon: <FiAlertCircle className="mr-2" size={20} />,
          text: 'Pending',
          color:
            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        };
      case 'cancelled':
        return {
          icon: <FiXCircle className="mr-2" size={20} />,
          text: 'Cancelled',
          color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        };
      case 'completed':
        return {
          icon: <FiCheckCircle className="mr-2" size={20} />,
          text: 'Completed',
          color:
            'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        };
      case 'rejected':
        return {
          icon: <FiXCircle className="mr-2" size={20} />,
          text: 'Rejected',
          color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        };
      default:
        return {
          icon: <FiInfo className="mr-2" size={20} />,
          text: status || 'Unknown',
          color:
            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        };
    }
  };

  // Function to get the appropriate icon for an amenity
  const getAmenityIcon = (amenity: string) => {
    if (!amenity) return <FiCheckCircle />;

    const lowercaseAmenity = amenity.toLowerCase();

    if (lowercaseAmenity.includes('wifi')) return <FiWifi />;
    if (
      lowercaseAmenity.includes('projector') ||
      lowercaseAmenity.includes('screen') ||
      lowercaseAmenity.includes('tv')
    )
      return <FiMonitor />;
    if (lowercaseAmenity.includes('coffee') || lowercaseAmenity.includes('tea'))
      return <FiCoffee />;
    if (lowercaseAmenity.includes('whiteboard')) return <FiSlack />;
    if (lowercaseAmenity.includes('air') || lowercaseAmenity.includes('ac'))
      return <GiSnowflake1 />;
    if (lowercaseAmenity.includes('restroom')) return <FaRestroom />;
    if (lowercaseAmenity.includes('parking')) return <FaCar />;
    if (
      lowercaseAmenity.includes('wheelchair') ||
      lowercaseAmenity.includes('accessible')
    )
      return <FaAccessibleIcon />;
    if (
      lowercaseAmenity.includes('phone') ||
      lowercaseAmenity.includes('conference')
    )
      return <FiPhone />;
    if (lowercaseAmenity.includes('table')) return <GiRoundTable />;
    if (lowercaseAmenity.includes('chair')) return <MdOutlineChair />;
    if (lowercaseAmenity.includes('room')) return <MdOutlineMeetingRoom />;

    return <FiCheckCircle />;
  };

  const handleCancelBooking = async () => {
    if (!cancelDetails?.canCancel) {
      toast.error(cancelDetails?.reason || 'This booking cannot be cancelled');
      return;
    }

    setShowCancelModal(true);
  };

  const handleConfirmCancellation = async (reason: string) => {
    try {
      const response = await bookingApi.cancelBooking(
        bookingId as string,
        reason
      );

      if (response.success) {
        toast.success('Booking cancelled successfully');
        setShowCancelModal(false);
        fetchBookingData(); // Refresh booking data
      } else {
        toast.error(response.message || 'Failed to cancel booking');
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('An error occurred while cancelling your booking');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-darkBlue flex items-center justify-center">
        <div className="flex flex-col items-center">
          <FiLoader
            size={40}
            className="text-darkBlue dark:text-light animate-spin mb-4"
          />
          <p className="text-gray-600 dark:text-gray-300">
            Loading booking details...
          </p>
        </div>
      </div>
    );
  }

  // Error state - booking not found
  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-darkBlue p-6">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
          <FiInfo className="text-red-500 w-16 h-16 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Booking Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            We couldn't find this booking in your account.
          </p>
          <Link
            to="/dashboard"
            className="px-4 py-2 bg-darkBlue text-white dark:bg-light dark:text-darkBlue font-medium rounded-lg hover:opacity-90 transition-colors">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const room = booking.room || {};
  const host = booking.host || {};
  const status = getStatusDisplay(booking.bookingStatus);

  // Extract price breakdown from booking
  const priceBreakdown = booking.priceBreakdown || {};
  const basePrice = priceBreakdown.basePrice || 0;
  const serviceFee = priceBreakdown.serviceFee || booking.totalPrice * 0.1; // Fallback to 10% if not specified
  const cleaningFee = priceBreakdown.cleaningFee || 0;
  const tax = priceBreakdown.tax || 0;

  // Handle missing values and build amenities list
  const amenities = [];

  if (room.amenities && Array.isArray(room.amenities)) {
    amenities.push(...room.amenities);
  } else if (room.facilities && Array.isArray(room.facilities)) {
    amenities.push(...room.facilities);
  } else {
    // Default amenities if none available
    if (room.type === 'conference') {
      amenities.push('WiFi', 'Projector', 'Tables and Chairs');
    } else {
      amenities.push('WiFi', 'Air Conditioning', 'Basic Facilities');
    }
  }

  const receiptData = {
    referenceNumber: booking._id?.toString().slice(-8).toUpperCase() || 'N/A',
    bookingDetails: {
      roomName: room.title || 'Room',
      location: room.location?.city
        ? `${room.location.city}, ${room.location.country || ''}`
        : 'N/A',
      checkInDate: formatDate(booking.checkIn),
      checkOutDate: formatDate(booking.checkOut),
      checkInTime: booking.checkInTime
        ? formatTimeTo12Hour(booking.checkInTime)
        : room.type === 'stay'
        ? '2:00 PM'
        : room.type === 'conference'
        ? '8:00 AM'
        : '10:00 AM',
      checkOutTime: booking.checkOutTime
        ? formatTimeTo12Hour(booking.checkOutTime)
        : room.type === 'stay'
        ? '12:00 PM'
        : room.type === 'conference'
        ? '5:00 PM'
        : '10:00 PM',
      numberOfDays: calculateDuration(booking.checkIn, booking.checkOut),
      subtotal: basePrice,
      serviceFee,
      cleaningFee,
      tax,
      total: booking.totalPrice,
    },
    paymentMethod: booking.paymentMethod || 'card',
    paymentStatus: booking.paymentStatus || 'pending',
    date: new Date(booking.createdAt || Date.now()).toLocaleDateString(
      'en-US',
      {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }
    ),
    time: new Date(booking.createdAt || Date.now()).toLocaleTimeString(
      'en-US',
      {
        hour: '2-digit',
        minute: '2-digit',
      }
    ),
    companyLogo: logo_black,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkBlue p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <Link
          to="/dashboard"
          className="inline-flex items-center text-blue-600 dark:text-blue-400 mb-6 hover:underline">
          <FiChevronLeft className="mr-2" /> Back to Dashboard
        </Link>

        {/* Page Title with Status */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4 md:mb-0">
            Booking Details
          </h1>
          <div
            className={`flex items-center px-4 py-2 rounded-full ${status.color}`}>
            {status.icon}
            <span className="font-medium">{status.text}</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Room Details */}
          <div className="lg:col-span-2">
            {/* Room Images */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden mb-6">
              <div className="relative h-64 md:h-72 bg-gray-200 dark:bg-gray-700">
                {room.images && room.images.length > 0 ? (
                  <img
                    src={room.images[0]}
                    alt={room.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No image available
                  </div>
                )}
              </div>

              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {room.title || 'Room'}
                </h2>
                <div className="flex items-center text-gray-600 dark:text-gray-300 mb-4">
                  <FiMapPin className="mr-2" />
                  {room.location?.city
                    ? `${room.location.city}, ${room.location.country || ''}`
                    : 'Location not specified'}
                </div>

                <p className="text-gray-700 dark:text-gray-300 mb-6">
                  {room.description ||
                    'No description available for this room.'}
                </p>

                {/* Booking Dates & Times */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <FiCalendar className="text-blue-500 mr-2" />
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        Check-in
                      </h3>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">
                      {formatDate(booking.checkIn)}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 font-medium mt-1">
                      {booking.checkInTime
                        ? formatTimeTo12Hour(booking.checkInTime)
                        : room.type === 'stay'
                        ? '2:00 PM'
                        : room.type === 'conference'
                        ? '8:00 AM'
                        : '10:00 AM'}
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <FiCalendar className="text-blue-500 mr-2" />
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        Check-out
                      </h3>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">
                      {formatDate(booking.checkOut)}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 font-medium mt-1">
                      {booking.checkOutTime
                        ? formatTimeTo12Hour(booking.checkOutTime)
                        : room.type === 'stay'
                        ? '12:00 PM'
                        : room.type === 'conference'
                        ? '5:00 PM'
                        : '10:00 PM'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center mb-4">
                  <FiClock className="text-blue-500 mr-2" />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      Duration:{' '}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {calculateDuration(booking.checkIn, booking.checkOut)}
                    </span>
                  </div>
                </div>

                {/* Amenities */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                    Amenities
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {amenities.map((amenity: string, index: number) => (
                      <div
                        key={index}
                        className="flex items-center text-gray-700 dark:text-gray-300">
                        <span className="mr-2 text-blue-500">
                          {getAmenityIcon(amenity)}
                        </span>
                        {amenity}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Special Requests */}
                {booking.specialRequests && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                      Your Special Requests
                    </h3>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-gray-700 dark:text-gray-300">
                        {booking.specialRequests}
                      </p>
                    </div>
                  </div>
                )}

                {/* Cancellation Policy */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                    <FiInfo className="mr-2 text-blue-500" />
                    Cancellation Policy
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    {room.cancellationPolicy ||
                      'Free cancellation up to 48 hours before check-in. After that, the cancellation policy may result in a partial or no refund.'}
                  </p>

                  {cancelDetails &&
                    !cancelDetails.canCancel &&
                    cancelDetails.reason && (
                      <p className="mt-2 text-red-600 dark:text-red-400 font-medium">
                        {cancelDetails.reason}
                      </p>
                    )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Booking Summary & Actions */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6 sticky top-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Booking Summary
              </h3>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Reference number
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {booking._id?.toString().slice(-8).toUpperCase() || 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Booking date
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(
                      booking.createdAt || Date.now()
                    ).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Space type
                  </span>
                  <span className="text-gray-900 dark:text-white capitalize">
                    {room.type || 'Space'}
                  </span>
                </div>

                <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600 dark:text-gray-400">
                      Payment status
                    </span>
                    <span className="capitalize text-gray-900 dark:text-white">
                      {booking.paymentStatus || 'Pending'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Payment method
                    </span>
                    <span className="capitalize text-gray-900 dark:text-white">
                      {booking.paymentMethod === 'property'
                        ? 'Pay at Property'
                        : booking.paymentMethod || 'Not specified'}
                    </span>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="pt-2">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600 dark:text-gray-400">
                      Base price
                    </span>
                    <span className="text-gray-900 dark:text-white">
                      ₱{basePrice.toLocaleString()}
                    </span>
                  </div>

                  {serviceFee > 0 && (
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600 dark:text-gray-400">
                        Service fee
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        ₱{serviceFee.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {cleaningFee > 0 && (
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600 dark:text-gray-400">
                        Cleaning fee
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        ₱{cleaningFee.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {tax > 0 && (
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600 dark:text-gray-400">
                        Tax
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        ₱{tax.toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-lg font-medium pt-2 border-t dark:text-light border-gray-200 dark:border-gray-700">
                    <span>Total</span>
                    <span>₱{booking.totalPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => setShowReceipt(true)}
                  className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-darkBlue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-light dark:text-darkBlue dark:hover:bg-gray-200 transition-colors">
                  <FiDownload className="mr-2" />
                  View & Download Receipt
                </button>

                {/* Only show cancel button if booking is not already cancelled, completed or rejected */}
                {!['cancelled', 'completed', 'rejected'].includes(
                  booking.bookingStatus
                ) && (
                  <button
                    onClick={handleCancelBooking}
                    disabled={isCancelling || !cancelDetails?.canCancel}
                    className={`w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium 
                      ${
                        cancelDetails?.canCancel
                          ? 'text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
                          : 'text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed'
                      }
                      transition-colors`}>
                    {isCancelling ? (
                      <>
                        <FiLoader className="animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FiXCircle className="mr-2" />
                        Cancel Booking
                      </>
                    )}
                  </button>
                )}

                {/* Contact Host */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    Host Information
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">
                    {host.firstName
                      ? `${host.firstName} ${host.lastName || ''}`
                      : 'Host information not available'}
                  </p>

                  {host.email && host.phoneNumber && (
                    <div className="flex space-x-2">
                      <a
                        href={`mailto:${host.email}`}
                        className="flex items-center justify-center py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors">
                        <FiMessageSquare className="mr-2" />
                        Message
                      </a>
                      <a
                        href={`tel:${host.phoneNumber}`}
                        className="flex items-center justify-center py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors">
                        <FiPhone className="mr-2" />
                        Call
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Information - Show if cancelled */}
      {booking.bookingStatus === 'cancelled' && booking.cancellationDetails && (
        <div className="max-w-5xl mx-auto mt-6">
          <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl">
            <h3 className="text-lg font-medium text-red-800 dark:text-red-400 mb-3 flex items-center">
              <FiXCircle className="mr-2" />
              Cancellation Details
            </h3>
            <div className="space-y-2 text-red-700 dark:text-red-300">
              <p>
                <span className="font-medium">Cancelled on:</span>{' '}
                {new Date(
                  booking.cancellationDetails.cancelledAt
                ).toLocaleString()}
              </p>
              <p>
                <span className="font-medium">Cancelled by:</span>{' '}
                {booking.cancellationDetails.cancelledBy === 'user'
                  ? 'You'
                  : booking.cancellationDetails.cancelledBy === 'host'
                  ? 'Host'
                  : 'Admin'}
              </p>
              {booking.cancellationDetails.reason && (
                <p>
                  <span className="font-medium">Reason:</span>{' '}
                  {booking.cancellationDetails.reason}
                </p>
              )}
              {booking.cancellationDetails.refundAmount > 0 && (
                <p>
                  <span className="font-medium">Refund amount:</span> ₱
                  {booking.cancellationDetails.refundAmount.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="max-w-3xl w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Booking Receipt
              </h3>
              <button
                onClick={() => setShowReceipt(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <FiXCircle size={24} />
              </button>
            </div>
            <div className="p-4">
              {/* Inline Receipt */}
              <div className="bg-white print:bg-white text-gray-900 print:p-0 font-sans">
                {/* Receipt Header */}
                <div className="mb-6 flex flex-col items-center print:mb-4">
                  {receiptData.companyLogo ? (
                    <img
                      src={receiptData.companyLogo}
                      alt="OpenSpace Logo"
                      className="h-12 mb-2 print:h-10"
                    />
                  ) : (
                    <h2 className="text-xl font-bold mb-1">OpenSpace</h2>
                  )}
                  <h1 className="text-2xl font-bold mb-1 print:text-xl">
                    Booking Receipt
                  </h1>
                  <p className="text-sm text-gray-600">
                    Reference Number: {receiptData.referenceNumber}
                  </p>
                </div>

                {/* Payment Information */}
                <div className="mb-6 border-b border-gray-300 pb-4 print:mb-4 print:pb-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Date:</span>
                    <span>{receiptData.date}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Time:</span>
                    <span>{receiptData.time}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="capitalize">
                      {receiptData.paymentMethod === 'property'
                        ? 'Pay at Property'
                        : receiptData.paymentMethod}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Status:</span>
                    <span className="capitalize">
                      {receiptData.paymentStatus === 'paid' ? (
                        <span className="text-green-600 flex items-center">
                          <FiCheck className="mr-1" />{' '}
                          {receiptData.paymentStatus}
                        </span>
                      ) : (
                        receiptData.paymentStatus
                      )}
                    </span>
                  </div>
                </div>

                {/* Booking Details */}
                <div className="mb-6 border-b border-gray-300 pb-4 print:mb-4 print:pb-3">
                  <h3 className="font-bold mb-3 text-lg">Booking Details</h3>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Space:</span>
                    <span className="font-medium">
                      {receiptData.bookingDetails.roomName}
                    </span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Location:</span>
                    <span>{receiptData.bookingDetails.location}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Check-in:</span>
                    <span>
                      {receiptData.bookingDetails.checkInDate} at{' '}
                      {receiptData.bookingDetails.checkInTime}
                    </span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Check-out:</span>
                    <span>
                      {receiptData.bookingDetails.checkOutDate} at{' '}
                      {receiptData.bookingDetails.checkOutTime}
                    </span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Duration:</span>
                    <span>{receiptData.bookingDetails.numberOfDays}</span>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="mb-6 print:mb-4">
                  <h3 className="font-bold mb-3 text-lg">Price Details</h3>

                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Base Price:</span>
                    <span>
                      ₱{receiptData.bookingDetails.subtotal.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Service Fee:</span>
                    <span>
                      ₱{receiptData.bookingDetails.serviceFee.toLocaleString()}
                    </span>
                  </div>

                  {receiptData.bookingDetails.cleaningFee &&
                    receiptData.bookingDetails.cleaningFee > 0 && (
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-600">Cleaning Fee:</span>
                        <span>
                          ₱
                          {receiptData.bookingDetails.cleaningFee.toLocaleString()}
                        </span>
                      </div>
                    )}

                  {receiptData.bookingDetails.tax &&
                    receiptData.bookingDetails.tax > 0 && (
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-600">Tax:</span>
                        <span>
                          ₱{receiptData.bookingDetails.tax.toLocaleString()}
                        </span>
                      </div>
                    )}

                  <div className="flex justify-between mt-3 font-bold text-lg border-t border-gray-300 pt-2 print:mt-2 print:pt-2">
                    <span>Total:</span>
                    <span>
                      ₱{receiptData.bookingDetails.total.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center text-sm text-gray-600 mt-8 print:mt-6">
                  <p>Thank you for choosing OpenSpace!</p>
                  <p className="print:hidden">
                    For any inquiries, please contact support@openspace.com
                  </p>
                  <p className="mt-2 print:mt-1">
                    This is an electronic receipt. No signature required.
                  </p>
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
              <button
                onClick={handleSendReceiptEmail}
                className="px-4 py-2 border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium flex items-center">
                <FiMessageSquare className="mr-2" />
                Email Receipt
              </button>

              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-darkBlue text-white dark:bg-light dark:text-darkBlue rounded-lg hover:opacity-90 transition-colors text-sm font-medium flex items-center">
                <FiDownload className="mr-2" />
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && (
        <CancelBookingModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleConfirmCancellation}
          bookingDetails={{
            roomName: booking.room?.title || 'Room',
            checkInDate: booking.checkIn,
            checkOutDate: booking.checkOut,
            refundAmount: cancelDetails?.refundAmount || 0,
            refundPercentage: cancelDetails?.refundPercentage || 0,
            totalAmount: booking.totalPrice || 0,
          }}
        />
      )}
    </div>
  );
};

export default ViewBooking;
