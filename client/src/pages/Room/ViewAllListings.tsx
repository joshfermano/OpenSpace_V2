import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiHome, FiMap, FiEdit2, FiPlus } from 'react-icons/fi';
import { FaPesoSign } from 'react-icons/fa6';
import { useAuth } from '../../contexts/AuthContext';
import { roomApi } from '../../services/roomApi';
import { API_URL } from '../../services/core';
import { handleImageError } from '../../utils/imageUtils';
import Pagination from '../../components/UI/Pagination';

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

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  count: number;
  total?: number;
}

const ViewAllListings = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    count: 0,
  });

  const fetchRooms = async (page = 1) => {
    if (!user || user.role !== 'host') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log(`Fetching rooms for page ${page}...`);

      const response = await roomApi.getMyRooms({
        page: page.toString(),
        limit: '12', // Show 12 rooms per page
      });

      console.log('API Response:', response);

      if (response.success) {
        setRooms(response.data || []);
        setPagination({
          currentPage: response.currentPage || page,
          totalPages: response.totalPages || 1,
          count: response.count || 0,
          total: response.total,
        });
      } else {
        console.error('Failed to fetch rooms:', response.message);
        setRooms([]);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms(1);
  }, [user]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchRooms(newPage);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-darkBlue p-6">
        <div className="max-w-6xl mx-auto">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-blue-600 dark:text-blue-400 mb-6 hover:underline">
            <FiArrowLeft className="mr-2" /> Back to Dashboard
          </Link>

          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">
            All Your Listings
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <div
                key={index}
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
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-darkBlue p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Please log in to view your listings
            </h1>
            <Link
              to="/login"
              className="text-blue-600 dark:text-blue-400 hover:underline">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (user.role !== 'host') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-darkBlue p-6">
        <div className="max-w-6xl mx-auto">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-blue-600 dark:text-blue-400 mb-6 hover:underline">
            <FiArrowLeft className="mr-2" /> Back to Dashboard
          </Link>

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
              You need to be a host to view listings.
            </p>
            <Link
              to="/become-host"
              className="inline-flex items-center px-4 py-2 bg-darkBlue dark:bg-light hover:bg-blue-700 text-light dark:text-darkBlue dark:hover:text-light hover:opacity-90 rounded-lg transition-all duration-300">
              Become a Host
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkBlue p-6">
      <div className="max-w-6xl mx-auto">
        <Link
          to="/dashboard"
          className="inline-flex items-center text-blue-600 dark:text-blue-400 mb-6 hover:underline">
          <FiArrowLeft className="mr-2" /> Back to Dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              All Your Listings
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {pagination.count > 0
                ? `Showing ${pagination.count} of ${
                    pagination.total || pagination.count
                  } listings`
                : 'No listings found'}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 mt-4 sm:mt-0">
            <Link
              to="/dashboard/earnings"
              className="inline-flex items-center px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/40 rounded-lg transition-colors text-sm font-medium">
              <FaPesoSign className="mr-1.5" /> View Earnings
            </Link>

            <Link
              to="/rooms/create"
              className="inline-flex items-center px-3 py-2 bg-darkBlue dark:bg-light text-white dark:text-darkBlue hover:bg-blue-700 dark:hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium">
              <FiPlus className="mr-1.5" /> New Listing
            </Link>
          </div>
        </div>

        {rooms.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {rooms.map((room) => (
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

            {/* Pagination */}
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </>
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
        )}
      </div>
    </div>
  );
};

export default ViewAllListings;
