import { FC, useState, useEffect } from 'react';
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

const RoomCard: FC<{ room: Room }> = ({ room }) => {
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
      className="block bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
      {/* Image */}
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
        />

        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse bg-gray-300 dark:bg-gray-600 w-full h-full" />
          </div>
        )}

        {/* Category badge */}
        <div className="absolute top-3 right-3 bg-blue-500 text-white text-xs font-medium px-2 py-1 rounded-full">
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

          <button className="text-sm bg-transparent border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white px-3 py-1 rounded-lg transition-colors duration-300">
            View
          </button>
        </div>
      </div>
    </Link>
  );
};

const RoomCards: FC<{ rooms: Room[] }> = ({ rooms }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {rooms.map((room) => (
        <RoomCard key={room._id} room={room} />
      ))}
    </div>
  );
};

export default RoomCards;
