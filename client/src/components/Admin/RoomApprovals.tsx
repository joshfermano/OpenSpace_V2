import React from 'react';
import {
  FiEye,
  FiCheckCircle,
  FiXCircle,
  FiUser,
  FiHome,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import { API_URL } from '../../services/core';

interface Room {
  _id: string; // Changed from id to _id to match the server response
  title: string; // Changed from name to title to match the server response
  location: {
    city: string;
    state: string;
    country: string;
  };
  type: string; // Changed from category
  price: {
    basePrice: number;
  };
  capacity: {
    maxGuests: number;
  };
  description: string;
  amenities: string[];
  images: string[];
  host: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    profileImage?: string;
  };
  createdAt: string;
  status: string;
}

interface RoomApprovalsProps {
  rooms: Room[];
  onViewRoom: (room: Room) => void;
  onApproveRoom: (roomId: string) => void;
  onRejectRoom: (roomId: string) => void;
  onImageError: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  // Pagination props
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

const RoomApprovals: React.FC<RoomApprovalsProps> = ({
  rooms,
  onViewRoom,
  onApproveRoom,
  onRejectRoom,
  onImageError,
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
  loading,
}) => {
  // Format image URL properly
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

  const formatLocation = (location: any) => {
    if (!location) return 'Unknown location';
    return `${location.city || ''}, ${location.state || ''}, ${
      location.country || ''
    }`.replace(/^, |, $/, '');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
      {/* Mobile Cards View */}
      <div className="block sm:hidden">
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Loading rooms...
              </p>
            </div>
          ) : rooms && rooms.length > 0 ? (
            rooms.map((room) => (
              <div
                key={room._id}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 h-12 w-12 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      {room.images && room.images.length > 0 ? (
                        <img
                          className="h-12 w-12 rounded-lg object-cover"
                          src={getImageUrl(room.images[0])}
                          alt={room.title}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              const iconDiv = document.createElement('div');
                              iconDiv.className =
                                'h-12 w-12 flex items-center justify-center text-gray-500';
                              parent.appendChild(iconDiv);
                              iconDiv.innerHTML =
                                '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>';
                            }
                          }}
                        />
                      ) : (
                        <div className="h-12 w-12 flex items-center justify-center text-gray-500">
                          <FiHome size={20} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {room.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {formatLocation(room.location)}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {room.type === 'conference'
                          ? 'Conference Room'
                          : room.type === 'event'
                          ? 'Events Place'
                          : room.type === 'stay'
                          ? 'Room Stay'
                          : room.type}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
                  <div className="flex justify-between">
                    <span>Price:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ₱
                      {room.price?.basePrice
                        ? Number(room.price.basePrice).toLocaleString()
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Host:</span>
                    <span className="font-medium text-gray-900 dark:text-white truncate ml-2">
                      {room.host
                        ? `${room.host.firstName} ${room.host.lastName}`
                        : 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Submitted:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(room.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => onViewRoom(room)}
                    className="flex-1 flex items-center justify-center py-2 px-3 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors text-sm">
                    <FiEye className="mr-1" size={16} />
                    View
                  </button>
                  {room.status === 'pending' && (
                    <>
                      <button
                        onClick={() => onApproveRoom(room._id)}
                        className="flex-1 flex items-center justify-center py-2 px-3 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors text-sm">
                        <FiCheckCircle className="mr-1" size={16} />
                        Approve
                      </button>
                      <button
                        onClick={() => onRejectRoom(room._id)}
                        className="flex-1 flex items-center justify-center py-2 px-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors text-sm">
                        <FiXCircle className="mr-1" size={16} />
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
              No pending room approvals
            </div>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Space Details
              </th>
              <th className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Host
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Price
              </th>
              <th className="hidden md:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Submitted
              </th>
              <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 sm:px-6 py-8 sm:py-10 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Loading rooms...
                  </p>
                </td>
              </tr>
            ) : rooms && rooms.length > 0 ? (
              rooms.map((room) => (
                <tr
                  key={room._id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-300">
                  <td className="px-4 sm:px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 sm:h-16 w-12 sm:w-16 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        {room.images && room.images.length > 0 ? (
                          <img
                            className="h-12 sm:h-16 w-12 sm:w-16 rounded-lg object-cover"
                            src={getImageUrl(room.images[0])}
                            alt={room.title}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                const iconDiv = document.createElement('div');
                                iconDiv.className =
                                  'h-12 sm:h-16 w-12 sm:w-16 flex items-center justify-center text-gray-500';
                                parent.appendChild(iconDiv);
                                iconDiv.innerHTML =
                                  '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>';
                              }
                            }}
                          />
                        ) : (
                          <div className="h-12 sm:h-16 w-12 sm:w-16 flex items-center justify-center text-gray-500">
                            <FiHome size={20} />
                          </div>
                        )}
                      </div>
                      <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {room.title}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                          {formatLocation(room.location)}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {room.type === 'conference'
                            ? 'Conference Room'
                            : room.type === 'event'
                            ? 'Events Place'
                            : room.type === 'stay'
                            ? 'Room Stay'
                            : room.type}
                        </div>
                        {/* Show host info on small screens */}
                        <div className="lg:hidden text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Host:{' '}
                          {room.host
                            ? `${room.host.firstName} ${room.host.lastName}`
                            : 'Unknown'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden lg:table-cell px-4 sm:px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-8 w-8 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        {room.host && room.host.profileImage ? (
                          <img
                            className="h-8 w-8 rounded-full object-cover"
                            src={getImageUrl(room.host.profileImage)}
                            alt={`${room.host.firstName} ${room.host.lastName}`}
                            onError={onImageError}
                          />
                        ) : (
                          <div className="h-8 w-8 flex items-center justify-center text-gray-500">
                            <FiUser size={16} />
                          </div>
                        )}
                      </div>
                      <span className="ml-2 text-sm text-gray-900 dark:text-white truncate">
                        {room.host
                          ? `${room.host.firstName} ${room.host.lastName}`
                          : 'Unknown'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      ₱
                      {room.price?.basePrice
                        ? Number(room.price.basePrice).toLocaleString()
                        : 'N/A'}
                    </div>
                    {/* Show submission date on small screens */}
                    <div className="md:hidden text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(room.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-4 sm:px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {new Date(room.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-right">
                    <div className="flex justify-end space-x-1 sm:space-x-2">
                      <button
                        onClick={() => onViewRoom(room)}
                        className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        title="View Details">
                        <FiEye size={16} />
                      </button>
                      {room.status === 'pending' && (
                        <>
                          <button
                            onClick={() => onApproveRoom(room._id)}
                            className="p-1.5 rounded-lg text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                            title="Approve">
                            <FiCheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => onRejectRoom(room._id)}
                            className="p-1.5 rounded-lg text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                            title="Reject">
                            <FiXCircle size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 sm:px-6 py-8 sm:py-10 text-center text-gray-500 dark:text-gray-400 text-sm">
                  No pending room approvals
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing{' '}
              <span className="font-medium">{(currentPage - 1) * 10 + 1}</span>{' '}
              to{' '}
              <span className="font-medium">
                {Math.min(currentPage * 10, totalCount)}
              </span>{' '}
              of <span className="font-medium">{totalCount}</span> rooms
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="relative inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <FiChevronLeft className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">Previous</span>
              </button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={`relative inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}>
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="relative inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <span className="mr-1 hidden sm:inline">Next</span>
                <FiChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomApprovals;
