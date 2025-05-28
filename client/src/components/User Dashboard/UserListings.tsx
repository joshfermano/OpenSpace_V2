import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiHome,
  FiMap,
  FiEdit2,
  FiChevronRight,
  FiPlus,
  FiCreditCard,
} from 'react-icons/fi';
import { FaPesoSign } from 'react-icons/fa6';
import { roomApi } from '../../services/roomApi';
import { API_URL } from '../../services/core';
import { handleImageError } from '../../utils/imageUtils';

interface Room {
  _id: string;
  title: string;
  location: {
    city: string;
    country: string;
  };
  price: {
    basePrice: number;
  };
  type: string;
  status: string;
  isPublished: boolean;
  images?: string[];
}

interface HostInfo {
  bio?: string;
  languagesSpoken?: string[];
  responseRate?: number;
  responseTime?: number;
  acceptanceRate?: number;
  hostSince?: Date;
}

interface User {
  _id: string;
  role: 'user' | 'host' | 'admin';
  hostInfo?: HostInfo;
}

interface UserListingsProps {
  userData: User;
  showAll?: boolean;
}

const UserListings = ({ userData, showAll = false }: UserListingsProps) => {
  const [listings, setListings] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListings = async () => {
      if (userData.role === 'host') {
        try {
          // If showAll is true, fetch more rooms, otherwise just get the first few
          const params = showAll ? { limit: '50' } : { limit: '5' };
          const response = await roomApi.getMyRooms(params);
          if (response.success) {
            setListings(response.data || []);
          }
        } catch (error) {
          console.error('Error fetching listings:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchListings();
  }, [userData.role, showAll]);

  // Format image URL to ensure it includes the API base URL if it's a relative path
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return '';

    // If the image path already starts with http:// or https:// or data:, return as is
    if (
      imagePath.startsWith('http://') ||
      imagePath.startsWith('https://') ||
      imagePath.startsWith('data:')
    ) {
      return imagePath;
    }

    // If path starts with a slash, ensure we don't double-slash
    const normalizedPath = imagePath.startsWith('/')
      ? imagePath
      : `/${imagePath}`;

    return `${API_URL}${normalizedPath}`;
  };

  // Only show two listings on the dashboard, show all on dedicated page
  const displayedListings = showAll ? listings : listings.slice(0, 2);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-0">
          Your Listings
        </h2>

        {userData.role === 'host' && userData.hostInfo && (
          <div className="flex flex-wrap gap-3">
            {!showAll && listings.length > 2 && (
              <Link
                to="/listings/all"
                className="inline-flex items-center px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40 rounded-lg transition-colors text-sm font-medium">
                View All <FiChevronRight className="ml-1" />
              </Link>
            )}

            {!showAll && listings.length > 0 && (
              <Link
                to="/dashboard/earnings"
                className="inline-flex items-center px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/40 rounded-lg transition-colors text-sm font-medium">
                <FaPesoSign className="mr-1.5" /> View Earnings
              </Link>
            )}

            {!showAll && listings.length > 0 && (
              <Link
                to="/dashboard/platform-fees"
                className="inline-flex items-center px-3 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-800/40 rounded-lg transition-colors text-sm font-medium">
                <FiCreditCard className="mr-1.5" /> Platform Fees
              </Link>
            )}

            <Link
              to="/rooms/create"
              className="inline-flex items-center px-3 py-2 bg-darkBlue dark:bg-light text-white dark:text-darkBlue hover:bg-blue-700 dark:hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium">
              <FiPlus className="mr-1.5" /> New Listing
            </Link>
          </div>
        )}
      </div>

      {userData.role !== 'host' ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
            <FiHome
              className="text-purple-600 dark:text-purple-400"
              size={24}
            />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Become a host
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Share your space and start earning.
          </p>
          <Link
            to="/become-host"
            className="inline-flex items-center px-4 py-2 bg-darkBlue dark:bg-light hover:bg-blue-700 text-light dark:text-darkBlue dark:hover:text-light hover:opacity-90 rounded-lg transition-all duration-300">
            Learn More
          </Link>
        </div>
      ) : userData.hostInfo ? (
        listings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {displayedListings.map((room) => (
              <div
                key={room._id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
                <div className="h-48 bg-gray-200 dark:bg-gray-700 relative">
                  {room.images && room.images.length > 0 ? (
                    <img
                      src={getImageUrl(room.images[0])}
                      alt={room.title}
                      className="h-full w-full object-cover"
                      onError={(e) => handleImageError(e)}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <FiHome className="text-gray-400" size={32} />
                    </div>
                  )}
                  <div
                    className={`absolute top-3 left-3 px-2 py-1 rounded-lg text-xs font-medium
                      ${
                        room.isPublished && room.status === 'approved'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                          : room.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                      }`}>
                    {room.isPublished && room.status === 'approved'
                      ? 'Active'
                      : room.status.charAt(0).toUpperCase() +
                        room.status.slice(1)}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {room.title}
                  </h3>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                    <FiMap className="mr-1" /> {room.location.city},{' '}
                    {room.location.country}
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        Price
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        ₱{room.price.basePrice.toLocaleString()}{' '}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {room.type === 'conference' ? '/ hour' : '/ night'}
                        </span>
                      </p>
                    </div>
                    <Link
                      to={`/rooms/edit/${room._id}`}
                      className="inline-flex items-center px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm">
                      <FiEdit2 size={14} className="mr-1" /> Edit
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <FiHome className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No listings yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Start creating your first listing to share your space.
            </p>
            <Link
              to="/rooms/create"
              className="inline-flex items-center px-4 py-2 bg-darkBlue dark:bg-light hover:bg-blue-700 text-light dark:text-darkBlue dark:hover:text-light hover:opacity-90 rounded-lg transition-all duration-300">
              <FiPlus className="mr-1.5" /> Create Listing
            </Link>
          </div>
        )
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
            <FiHome
              className="text-purple-600 dark:text-purple-400"
              size={24}
            />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Complete your host profile
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            You need to complete your host profile before creating listings.
          </p>
          <Link
            to="/profile/edit"
            className="inline-flex items-center px-4 py-2 bg-darkBlue dark:bg-light hover:bg-blue-700 text-light dark:text-darkBlue dark:hover:text-light hover:opacity-90 rounded-lg transition-all duration-300">
            Complete Profile
          </Link>
        </div>
      )}
    </div>
  );
};

export default UserListings;
