import { FC, useState, useEffect, memo } from 'react';
import { Link } from 'react-router-dom';
import { FiMapPin, FiUsers } from 'react-icons/fi';
import { BsStars } from 'react-icons/bs';
import placeholder from '../../assets/logo_black.jpg';
import { handleImageError } from '../../utils/imageUtils';

interface Host {
  _id: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
}

interface Price {
  basePrice: number;
  cleaningFee?: number;
  serviceFee?: number;
}

interface Capacity {
  maxGuests: number;
}

interface Location {
  city: string;
  state: string;
  country: string;
}

interface Room {
  _id: string;
  title: string;
  description: string;
  type: 'stay' | 'conference' | 'event';
  price: Price;
  capacity: Capacity;
  location: Location;
  images: string[];
  rating?: number;
  reviews?: number;
  host?: Host;
}

const RoomCard: FC<{ room: Room }> = memo(({ room }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>(placeholder);

  useEffect(() => {
    if (room.images && room.images.length > 0) {
      console.log('Image URL from API:', room.images[0]);

      // Use the first image from the room's images array
      const rawImageUrl = room.images[0];

      if (typeof rawImageUrl === 'string' && rawImageUrl.trim() !== '') {
        // Directly use Supabase URL without modification
        console.log('Setting image URL to:', rawImageUrl);
        setImageUrl(rawImageUrl);

        // Reset error state in case it was set previously
        setImageError(false);
      } else {
        console.error('Invalid image URL received:', rawImageUrl);
        setImageError(true);
      }
    } else {
      console.log('No images available for room:', room._id);
      setImageError(true);
    }
  }, [room._id, room.images]);

  // Format location display
  const locationDisplay = room.location
    ? `${room.location.city}, ${room.location.country}`
    : 'Location not specified';

  // Format host name
  const hostName = room.host
    ? `${room.host.firstName} ${room.host.lastName}`
    : 'Unknown Host';

  // Room type display
  const displayRoomType =
    room.type === 'stay'
      ? 'Room Stay'
      : room.type === 'conference'
      ? 'Conference Room'
      : room.type === 'event'
      ? 'Events Place'
      : 'Space';

  // Price label
  const priceLabel =
    room.type === 'stay'
      ? ' / night'
      : room.type === 'conference'
      ? ' / hour'
      : room.type === 'event'
      ? ' / day'
      : '';

  return (
    <Link
      to={`/rooms/${room._id}`}
      className="block bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/20 dark:border-gray-700/30 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl hover:shadow-blue-500/20 dark:hover:shadow-blue-500/20 hover:bg-white/90 dark:hover:bg-gray-800/90 hover:border-blue-200/50 dark:hover:border-blue-400/30 transition-all duration-500 group hover:-translate-y-1">
      {' '}
      {/* Image with optimized loading */}
      <div className="relative h-48 overflow-hidden bg-gray-200 dark:bg-gray-700">
        <img
          src={imageError ? placeholder : imageUrl}
          alt={room.title}
          className={`w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => {
            console.log('Image loaded successfully:', imageUrl);
            setImageLoaded(true);
          }}
          onError={(e) => {
            console.error('Image failed to load:', imageUrl);
            setImageError(true);
            handleImageError(e);
          }}
          loading="lazy"
          decoding="async"
        />

        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 w-full h-full" />
          </div>
        )}

        {/* Category badge */}
        <div className="absolute top-3 right-3 bg-gradient-to-r from-blue-500/90 to-cyan-500/90 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/20 shadow-lg group-hover:from-blue-600/95 group-hover:to-cyan-600/95 transition-all duration-300">
          {displayRoomType}
        </div>
      </div>
      {/* Content */}
      <div className="p-4 flex-grow flex flex-col">
        {/* Location */}
        <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm mb-1">
          <FiMapPin className="mr-1" size={14} />
          <span>{locationDisplay}</span>
        </div>

        {/* Name */}
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2 line-clamp-1">
          {room.title}
        </h3>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
          {room.description}
        </p>

        {/* Host info */}
        {room.host && (
          <Link
            to={`/hosts/${room.host._id}`}
            className="flex items-center mt-auto mb-3 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            onClick={(e) => e.stopPropagation()}>
            <div className="w-6 h-6 rounded-full overflow-hidden mr-2 border border-gray-200">
              {room.host.profileImage ? (
                <img
                  src={room.host.profileImage}
                  alt={hostName}
                  className="w-full h-full object-cover"
                  onError={(e) => handleImageError(e)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs font-bold bg-gray-200">
                  {room.host.firstName[0]}
                  {room.host.lastName[0]}
                </div>
              )}
            </div>
            <span>Host: {hostName}</span>
          </Link>
        )}

        {/* Rating */}
        {room.rating && (
          <div className="flex items-center text-sm text-gray-700 dark:text-gray-300 mb-3">
            <BsStars className="text-yellow-400 mr-1" />
            <span>
              {room.rating.toFixed(1)} ({room.reviews || 0} reviews)
            </span>
          </div>
        )}

        {/* Capacity */}
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mb-3">
          <FiUsers className="mr-1" />
          <span>Up to {room.capacity.maxGuests} guests</span>
        </div>

        {/* Price and view button */}
        <div className="flex justify-between items-center mt-auto">
          <div className="font-semibold text-gray-900 dark:text-white">
            ₱{room.price.basePrice.toLocaleString()}
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
              {priceLabel}
            </span>
          </div>

          <button className="text-sm bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-400/50 dark:border-blue-400/30 text-blue-600 dark:text-blue-400 hover:from-blue-500 hover:to-cyan-500 hover:text-white hover:border-transparent hover:shadow-lg hover:shadow-blue-500/30 px-4 py-2 rounded-xl backdrop-blur-sm transition-all duration-300 font-medium">
            View
          </button>
        </div>
      </div>
    </Link>
  );
});

// Add display name for debugging
RoomCard.displayName = 'RoomCard';

const RoomCards: FC<{ rooms: Room[] }> = memo(({ rooms }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 transition-all duration-300">
      {rooms.map((room) => (
        <div
          key={room._id}
          className="transform transition-all duration-500 hover:scale-[1.02] hover:z-10">
          <RoomCard room={room} />
        </div>
      ))}
    </div>
  );
});

// Add display name for debugging
RoomCards.displayName = 'RoomCards';

export default RoomCards;
