import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FiMapPin, FiHeart } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import { IoMdArrowBack } from 'react-icons/io';
import { useAuth } from '../../contexts/AuthContext';
import { roomApi } from '../../services/roomApi';
import { bookingApi } from '../../services/bookingApi';
import ReviewArea from '../../components/Room/ReviewArea';
import ImageGallery from '../../components/Room/ImageGallery';
import RoomDetails from '../../components/Room/RoomDetails';
import RoomPolicies from '../../components/Room/RoomPolicies';
import BookingPanel from '../../components/Room/BookingPanel';
import ImageModal from '../../components/Modal/ImageModel';
import placeholder from '../../assets/logo_black.jpg';
import { API_URL } from '../../services/core';
import { handleImageError } from '../../utils/imageUtils';
import '../../css/calendar.css';
import { toast } from 'react-toastify';

const ViewRoom = () => {
  const { roomId } = useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'policies'>('details');
  const [isFavorite, setIsFavorite] = useState(false);
  const [toggleFavoriteLoading, setToggleFavoriteLoading] = useState(false);
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [userBookings, setUserBookings] = useState<any[]>([]);

  // Image Modal State
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);

  const availabilityFetchedRef = useRef(false);
  const componentMountedRef = useRef(true);

  // Function to handle opening the image modal with a specific image index
  const handleOpenImageModal = (index: number) => {
    setModalImageIndex(index);
    setIsImageModalOpen(true);
  };

  // Function to close the image modal
  const handleCloseImageModal = () => {
    setIsImageModalOpen(false);
  };

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return placeholder;
    if (imagePath.startsWith('http')) return imagePath;
    return `${API_URL}${imagePath}`;
  };

  const fetchRoomAvailability = async (roomId: string) => {
    if (availabilityFetchedRef.current && unavailableDates.length > 0) {
      console.log(
        '[ViewRoom] Availability data already fetched, using cached data'
      );
      return;
    }

    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);

      console.log(`[ViewRoom] Fetching availability for room ${roomId}`);

      const availabilityResponse = await roomApi.getAvailabilityForDateRange(
        roomId,
        startDate,
        endDate
      );

      if (!componentMountedRef.current) return;

      if (availabilityResponse.success) {
        const {
          unavailableDates,
          existingBookings,
          roomId: responseRoomId,
        } = availabilityResponse.data;

        // Verify that the response is for the current room
        if (responseRoomId && responseRoomId !== roomId) {
          console.error('[ViewRoom] Room ID mismatch in availability response');
          return;
        }

        // Log raw data for debugging
        console.log(
          '[ViewRoom] Raw unavailable dates from API:',
          unavailableDates
        );
        console.log(
          '[ViewRoom] Raw existing bookings from API:',
          existingBookings
        );

        // Convert all unavailable dates to Date objects with consistent time (midnight)
        const formattedUnavailableDates = (unavailableDates || [])
          .map((dateString: string | Date) => {
            const date = new Date(dateString);
            date.setHours(0, 0, 0, 0);
            return date;
          })
          .filter((date: Date) => !isNaN(date.getTime()));

        let allExistingBookings = [...(existingBookings || [])];

        // Make sure all existing bookings have roomId set
        allExistingBookings = allExistingBookings.map((booking) => {
          // If booking doesn't have roomId, add the current roomId
          const updatedBooking = {
            ...booking,
            roomId: booking.roomId || roomId,
          };

          // Ensure checkIn and checkOut are proper Date objects
          if (booking.checkIn) {
            updatedBooking.checkIn = new Date(booking.checkIn);
            updatedBooking.checkIn.setHours(0, 0, 0, 0);
          }

          if (booking.checkOut) {
            updatedBooking.checkOut = new Date(booking.checkOut);
            updatedBooking.checkOut.setHours(0, 0, 0, 0);
          }

          return updatedBooking;
        });

        console.log(
          `[ViewRoom] Room ${roomId} - Received ${allExistingBookings.length} bookings from server`
        );

        allExistingBookings.forEach((booking, index) => {
          const checkIn = new Date(booking.checkIn);
          const checkOut = new Date(booking.checkOut);

          console.log(
            `[ViewRoom] Booking ${index + 1}: ID=${booking._id}, Status=${
              booking.bookingStatus
            }, Check-in=${checkIn.toISOString().split('T')[0]}, Check-out=${
              checkOut.toISOString().split('T')[0]
            }`
          );
        });

        if (
          formattedUnavailableDates.length > 0 ||
          allExistingBookings.length > 0
        ) {
          setUnavailableDates(formattedUnavailableDates);
          setExistingBookings(allExistingBookings);
          availabilityFetchedRef.current = true;

          console.log(
            `[ViewRoom] Room ${roomId} - Setting ${allExistingBookings.length} existing bookings and ${formattedUnavailableDates.length} unavailable dates`
          );
        }
      } else {
        toast.error('Failed to load room availability');
        console.error(
          '[ViewRoom] Error fetching room availability:',
          availabilityResponse.message
        );
      }
    } catch (error) {
      console.error('[ViewRoom] Error in fetchRoomAvailability:', error);
    }
  };

  useEffect(() => {
    componentMountedRef.current = true;

    return () => {
      componentMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchRoomData = async () => {
      if (!roomId) return;

      setLoading(true);
      try {
        const response = await roomApi.getRoomById(roomId);

        if (response.success) {
          setRoom(response.data);

          if (
            response.data.availability &&
            response.data.availability.unavailableDates
          ) {
            const convertedDates =
              response.data.availability.unavailableDates.map(
                (dateString: string) => {
                  const date = new Date(dateString);
                  date.setHours(0, 0, 0, 0); // Normalize time
                  return date;
                }
              );
            // Set initial unavailable dates if not already set
            if (unavailableDates.length === 0) {
              setUnavailableDates(convertedDates);
            }
          }

          // Always fetch room availability regardless of authentication status
          await fetchRoomAvailability(roomId);

          if (isAuthenticated) {
            try {
              // Check favorite status
              const favoritesResponse = await roomApi.getFavoriteRooms();
              if (favoritesResponse.success) {
                const isSaved = favoritesResponse.data.some(
                  (savedRoom: any) => savedRoom._id === roomId
                );
                setIsFavorite(isSaved);
              }

              // Fetch user's bookings
              const userBookingsResponse = await bookingApi.getUserBookings();
              if (userBookingsResponse.success && userBookingsResponse.data) {
                console.log(
                  'User bookings fetched:',
                  userBookingsResponse.data
                );

                // Filter bookings for the current room
                const filteredBookings = userBookingsResponse.data.filter(
                  (booking: any) => booking.room && booking.room._id === roomId
                );

                // Format user bookings for calendar
                const formattedUserBookings = filteredBookings.map(
                  (booking: any) => ({
                    _id: booking._id,
                    roomId: booking.room._id,
                    checkIn: booking.checkIn,
                    checkOut: booking.checkOut,
                    checkInTime: booking.checkInTime,
                    checkOutTime: booking.checkOutTime,
                    bookingStatus: booking.bookingStatus,
                  })
                );

                setUserBookings(formattedUserBookings);
              }
            } catch (error) {
              console.error('Error fetching user data:', error);
            }
          }
        } else {
          console.error('Error fetching room:', response.message);
          toast.error('Failed to load room details');
        }
      } catch (error) {
        console.error('Error:', error);
        toast.error('An error occurred while loading the room');
      } finally {
        setLoading(false);
      }
    };

    fetchRoomData();
  }, [roomId, isAuthenticated]);

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      navigate(`/auth/login?redirect=/rooms/${roomId}`);
      return;
    }

    if (!roomId) return;

    setToggleFavoriteLoading(true);
    try {
      if (isFavorite) {
        // Remove from favorites
        const response = await roomApi.unfavoriteRoom(roomId);
        if (response.success) {
          setIsFavorite(false);
        } else {
          console.error('Failed to remove from favorites:', response.message);
        }
      } else {
        // Add to favorites
        const response = await roomApi.favoriteRoom(roomId);
        if (response.success) {
          setIsFavorite(true);
        } else {
          console.error('Failed to add to favorites:', response.message);
        }
      }
    } catch (error) {
      console.error('Error toggling favorite status:', error);
    } finally {
      setToggleFavoriteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light dark:bg-darkBlue">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-light dark:bg-darkBlue p-4">
        <div className="text-darkBlue dark:text-light text-2xl mb-4">
          Room not found
        </div>
        <Link
          to="/"
          className="flex items-center gap-2 px-4 py-2 bg-darkBlue text-light dark:bg-light dark:text-darkBlue rounded-lg hover:opacity-90 transition">
          <IoMdArrowBack /> Back to Home
        </Link>
      </div>
    );
  }

  const displayRoomType =
    room.type === 'stay'
      ? 'Room Stay'
      : room.type === 'conference'
      ? 'Conference Room'
      : room.type === 'event'
      ? 'Events Place'
      : room.type;

  // Generate array of image URLs for the modal
  const imageUrlsForModal =
    room.images?.map((img: string) => getImageUrl(img)) || [];

  return (
    <div className="min-h-screen bg-light dark:bg-darkBlue text-darkBlue dark:text-light p-4 md:p-6 font-poppins">
      <div className="max-w-7xl mx-auto">
        {/* Back button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-darkBlue dark:text-light hover:underline mb-6">
          <IoMdArrowBack /> Back to listings
        </Link>

        {/* Title and favorite button */}
        <div className="flex justify-between items-start mb-2">
          <h1 className="text-3xl font-bold">{room.title}</h1>
          <button
            onClick={handleToggleFavorite}
            disabled={toggleFavoriteLoading}
            aria-label={
              isFavorite ? 'Remove from favorites' : 'Add to favorites'
            }
            className={`p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isFavorite
                ? 'text-red-500 bg-red-50 dark:bg-red-900/20'
                : 'text-gray-400 hover:text-red-500 bg-gray-100 dark:bg-gray-800'
            }`}>
            {toggleFavoriteLoading ? (
              <span className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
            ) : isFavorite ? (
              <FaHeart className="text-xl" />
            ) : (
              <FiHeart className="text-xl" />
            )}
          </button>
        </div>

        {/* Location and category */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6">
          <div className="flex items-center text-gray-600 dark:text-gray-300">
            <FiMapPin className="mr-1" />
            <span>
              {room.location
                ? `${room.location.city}, ${room.location.country}`
                : 'Location not specified'}
            </span>
          </div>
          <div className="flex items-center">
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded-full text-xs font-medium">
              {displayRoomType}
            </span>
          </div>
        </div>

        {/* Main content grid */}
        <div className="flex flex-col md:grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Room details */}
          <div className="col-span-2">
            {/* Image gallery with click handler to open modal */}
            <ImageGallery
              images={room.images}
              title={room.title}
              getImageUrl={getImageUrl}
              handleImageError={handleImageError}
              onImageClick={handleOpenImageModal}
            />

            {/* Tabs for Details and Policies */}
            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`py-2 px-1 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === 'details'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}>
                  Details
                </button>
                <button
                  onClick={() => setActiveTab('policies')}
                  className={`py-2 px-1 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === 'policies'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}>
                  Policies
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'details' ? (
              <RoomDetails room={room} />
            ) : (
              <RoomPolicies room={room} />
            )}

            {/* Host section */}
            {room.host && (
              <div className="mt-8 border-t pt-8">
                <h3 className="text-xl font-semibold mb-4">
                  Hosted by {`${room.host.firstName} ${room.host.lastName}`}
                </h3>
                <div className="flex items-start gap-4">
                  <Link
                    to={`/hosts/${room.host._id}`}
                    className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                      {room.host.profileImage ? (
                        <img
                          src={getImageUrl(room.host.profileImage)}
                          alt={`${room.host.firstName} ${room.host.lastName}`}
                          className="w-full h-full object-cover"
                          onError={(e) => handleImageError(e)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xl font-bold">
                          {room.host.firstName.charAt(0)}
                          {room.host.lastName.charAt(0)}
                        </div>
                      )}
                    </div>
                  </Link>
                  <div>
                    <p className="text-gray-700 dark:text-gray-300 mb-2">
                      {room.host.hostInfo?.description ||
                        'No host description available'}
                    </p>
                    <Link
                      to={`/hosts/${room.host._id}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline">
                      View host profile
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Reviews section */}
            {room && <ReviewArea roomId={roomId || ''} userHasBooking={true} />}
          </div>

          {/* Right column - Booking details */}
          <div className="col-span-1">
            <BookingPanel
              room={room}
              roomId={roomId || ''}
              isAuthenticated={isAuthenticated}
              unavailableDates={unavailableDates}
              existingBookings={existingBookings}
              userBookings={userBookings}
            />
          </div>
        </div>
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={isImageModalOpen}
        onClose={handleCloseImageModal}
        images={imageUrlsForModal}
        currentIndex={modalImageIndex}
        title={`${room.title} - Images`}
      />
    </div>
  );
};

export default ViewRoom;
