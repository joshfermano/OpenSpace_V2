import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { IoMdArrowBack } from 'react-icons/io';
import {
  FiCheck,
  FiMail,
  FiPhone,
  FiCreditCard,
  FiGlobe,
} from 'react-icons/fi';
import { userApi, roomApi } from '../../services/api';
import { API_URL } from '../../services/core';

interface HostInfo {
  bio?: string;
  languagesSpoken?: string[];
  responseRate?: number;
  responseTime?: number;
  acceptanceRate?: number;
  hostSince?: Date;
}

interface Host {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImage?: string;
  phoneNumber?: string;
  role: 'host' | 'user' | 'admin';
  dateJoined: string;
  createdAt?: string;
  hostInfo?: HostInfo;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  identificationDocument?: {
    verificationStatus: 'pending' | 'verified' | 'rejected';
  };
  verificationLevel?: string;
}

interface Room {
  _id: string;
  title: string;
  description: string;
  location: {
    street?: string;
    city: string;
    state?: string;
    zipCode?: string;
    country: string;
  };
  price: {
    basePrice: number;
    cleaningFee?: number;
    serviceFee?: number;
  };
  category: string;
  type: string;
  capacity: {
    maxGuests: number;
    bedrooms?: number;
    beds?: number;
    bathrooms?: number;
  };
  amenities: string[];
  images: string[];
  status: string;
  isPublished: boolean;
}

const HostProfile = () => {
  const { hostId } = useParams<{ hostId: string }>();
  const [host, setHost] = useState<Host | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Format date to prevent invalid date issues
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });
  };

  // Get profile image URL
  const getImageUrl = (imagePath?: string) => {
    if (!imagePath) return '';

    if (
      imagePath.startsWith('http://') ||
      imagePath.startsWith('https://') ||
      imagePath.startsWith('data:')
    ) {
      return imagePath;
    }

    return `${API_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
  };

  // Format response time
  const formatResponseTime = (hours?: number): string => {
    if (!hours) return 'N/A';

    if (hours === 1) return 'an hour';
    if (hours === 24) return 'a day';
    return `${hours} hours`;
  };

  useEffect(() => {
    const fetchHostData = async () => {
      if (!hostId) {
        setError('Host ID is missing');
        setLoading(false);
        return;
      }

      try {
        // Fetch host information
        const hostResponse = await userApi.getUserById(hostId);

        if (!hostResponse.success || !hostResponse.data) {
          throw new Error(hostResponse.message || 'Failed to fetch host data');
        }

        setHost(hostResponse.data);

        const roomsResponse = await roomApi.getRoomsByHost(hostId);

        if (!roomsResponse.success) {
          throw new Error(
            roomsResponse.message || 'Failed to fetch host rooms'
          );
        }

        setRooms(roomsResponse.data || []);
      } catch (err) {
        console.error('Error fetching host profile:', err);
        setError(
          err instanceof Error ? err.message : 'Error loading host profile'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchHostData();
  }, [hostId]);

  const roomsByCategory = rooms.reduce((acc, room) => {
    const category = room.type;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(room);
    return acc;
  }, {} as Record<string, Room[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-darkBlue text-darkBlue dark:text-light transition-all duration-300">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl mb-6"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !host) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-darkBlue text-darkBlue dark:text-light transition-all duration-300">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700/50 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg">
            <p>
              {error ||
                'Host not found. The host may have been removed or you entered an invalid URL.'}
            </p>
            <Link
              to="/"
              className="inline-flex items-center mt-2 text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200">
              <IoMdArrowBack className="mr-1" /> Back to homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Check if host is active with valid data
  const hostSince = formatDate(
    host.hostInfo?.hostSince?.toString() || host.dateJoined || host.createdAt
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkBlue text-darkBlue dark:text-light transition-all duration-300">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back navigation */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200">
            <IoMdArrowBack className="mr-1" /> Back to homepage
          </Link>
        </div>

        {/* Host information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-300">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Host Avatar */}
            <div className="w-32 h-32 rounded-full overflow-hidden flex-shrink-0 border-4 border-white dark:border-gray-700 shadow-lg">
              {host.profileImage ? (
                <img
                  src={getImageUrl(host.profileImage)}
                  alt={`${host.firstName} ${host.lastName}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://via.placeholder.com/200x200?text=Host';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                  <span className="text-2xl font-bold">
                    {host.firstName?.charAt(0)}
                    {host.lastName?.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Host Information */}
            <div className="flex-grow">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {host.firstName} {host.lastName}
              </h1>

              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-2">
                <span>Host since {hostSince}</span>
              </div>

              {/* Verification badges */}
              <div className="flex flex-wrap gap-2 mt-3">
                {host.isEmailVerified && (
                  <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <FiMail className="mr-1" />
                    Email Verified
                  </div>
                )}

                {host.isPhoneVerified && (
                  <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    <FiPhone className="mr-1" />
                    Phone Verified
                  </div>
                )}

                {host.identificationDocument?.verificationStatus ===
                  'verified' && (
                  <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    <FiCreditCard className="mr-1" />
                    ID Verified
                  </div>
                )}

                {host.verificationLevel === 'verified' && (
                  <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    <FiCheck className="mr-1" />
                    Verified Host
                  </div>
                )}
              </div>

              {host.hostInfo?.bio && (
                <div className="mt-4 text-gray-700 dark:text-gray-300">
                  <p>{host.hostInfo.bio}</p>
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Response Rate/Time if available */}
                {host.hostInfo?.responseRate && (
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2.5 py-1 rounded-full">
                      {host.hostInfo.responseRate}% Response Rate
                    </span>
                  </div>
                )}

                {host.hostInfo?.responseTime && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span>
                      Typically responds within{' '}
                      {formatResponseTime(host.hostInfo.responseTime)}
                    </span>
                  </div>
                )}

                {/* Languages if available */}
                {host.hostInfo?.languagesSpoken &&
                  host.hostInfo.languagesSpoken.length > 0 && (
                    <div className="col-span-1 md:col-span-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <FiGlobe size={16} className="flex-shrink-0" />
                        <span>
                          Speaks: {host.hostInfo.languagesSpoken.join(', ')}
                        </span>
                      </div>
                    </div>
                  )}
              </div>

              {/* Contact host section */}
              <div className="mt-6 flex flex-col md:flex-row gap-4">
                <a
                  href={`mailto:${host.email}`}
                  className="inline-flex items-center gap-2 text-sm text-white bg-blue-500 hover:bg-blue-600 transition-colors px-4 py-2 rounded-lg">
                  <FiMail size={16} />
                  Contact Host
                </a>

                {host.phoneNumber && (
                  <a
                    href={`tel:${host.phoneNumber}`}
                    className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
                    <FiPhone size={16} />
                    {host.phoneNumber}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Host listings */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            {host.firstName}'s Listings
          </h2>

          {Object.keys(roomsByCategory).length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <p className="text-gray-600 dark:text-gray-400">
                This host doesn't have any active listings at the moment.
              </p>
            </div>
          ) : (
            Object.entries(roomsByCategory).map(([category, categoryRooms]) => (
              <div key={category} className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 capitalize">
                  {category}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {categoryRooms.map((room) => (
                    <Link
                      to={`/rooms/${room._id}`}
                      key={room._id}
                      className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="h-48 overflow-hidden relative">
                        {room.images && room.images.length > 0 ? (
                          <img
                            src={getImageUrl(room.images[0])}
                            alt={room.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://via.placeholder.com/400x300?text=No+Image';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                            <span className="text-gray-500 dark:text-gray-400">
                              No image
                            </span>
                          </div>
                        )}
                        <div className="absolute bottom-2 right-2 bg-gray-800/70 text-white text-sm px-2 py-1 rounded">
                          ₱{room.price.basePrice.toLocaleString()}
                          {room.type === 'conference' ||
                          room.type === 'workspace'
                            ? '/hour'
                            : '/night'}
                        </div>
                      </div>
                      <div className="p-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-1 truncate">
                          {room.title}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          {room.location.city}, {room.location.country}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HostProfile;
