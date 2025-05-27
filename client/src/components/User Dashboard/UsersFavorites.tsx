import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiHeart, FiMap, FiChevronRight } from 'react-icons/fi';
import { roomApi } from '../../services/roomApi'; // Added roomApi import

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
  category: string;
  images?: string[];
}

interface UserFavoritesProps {
  showAll?: boolean;
}

const UserFavorites = ({ showAll = false }: UserFavoritesProps) => {
  const [favoriteRooms, setFavoriteRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingIds, setRemovingIds] = useState<string[]>([]);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      console.log('[UserFavorites] Fetching favorites...');
      const response = await roomApi.getFavoriteRooms();
      console.log('[UserFavorites] Response:', response);

      if (response.success && response.data) {
        setFavoriteRooms(response.data);
        console.log(
          '[UserFavorites] Set favorite rooms:',
          response.data.length
        );
      } else {
        console.warn(
          '[UserFavorites] Failed to fetch favorites:',
          response.message
        );
        setFavoriteRooms([]); // Set empty array if fetch fails
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
      setFavoriteRooms([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Handle removing a room from favorites
  const handleRemoveFavorite = async (roomId: string) => {
    setRemovingIds((prev) => [...prev, roomId]);

    try {
      console.log('[UserFavorites] Removing favorite:', roomId);
      const response = await roomApi.unfavoriteRoom(roomId);
      if (response.success) {
        setFavoriteRooms((prev) => prev.filter((room) => room._id !== roomId));
        console.log('[UserFavorites] Successfully removed favorite');
        // Show success message if desired
        // toast.success('Removed from favorites');
      } else {
        console.error('Failed to remove favorite:', response.message);
        // Show error message if desired
        // toast.error(response.message || 'Failed to remove from favorites');
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
      // Show error message if desired
      // toast.error('An error occurred while removing from favorites');
    } finally {
      setRemovingIds((prev) => prev.filter((id) => id !== roomId));
    }
  };

  // Only show two favorites on the dashboard, show all on dedicated page
  const displayedFavorites = showAll
    ? favoriteRooms
    : favoriteRooms.slice(0, 2);

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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Your Favorite Spaces
        </h2>
        {!showAll && favoriteRooms.length > 2 && (
          <Link
            to="/favorites/all"
            className="text-blue-600 dark:text-blue-400 text-sm font-medium flex items-center hover:underline">
            View All <FiChevronRight className="ml-1" />
          </Link>
        )}
      </div>

      {favoriteRooms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedFavorites.map((room) => (
            <div
              key={room._id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
              <div className="relative">
                <div className="h-48 bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  {room.images && room.images.length > 0 ? (
                    <img
                      src={room.images[0]}
                      alt={room.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Handle broken images
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="w-full h-full flex items-center justify-center text-gray-400">
                              No image available
                            </div>
                          `;
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No image available
                    </div>
                  )}
                </div>
                <button
                  className="absolute top-3 right-3 p-2 bg-white/80 dark:bg-gray-800/80 rounded-full text-red-500 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                  onClick={() => handleRemoveFavorite(room._id)}
                  disabled={removingIds.includes(room._id)}
                  title="Remove from favorites">
                  {removingIds.includes(room._id) ? (
                    <span className="block w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <FiHeart className="fill-current" size={18} />
                  )}
                </button>
              </div>

              <div className="p-5">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {room.title}
                </h3>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                  <FiMap className="mr-1" /> {room.location?.city || 'Unknown'},{' '}
                  {room.location?.country || 'Unknown'}
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      Price
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      ₱{room.price?.basePrice?.toLocaleString() || 'N/A'}
                      {room.type === 'stay' ? ' / night' : ' / hour'}
                    </p>
                  </div>
                  <Link
                    to={`/rooms/${room._id}`}
                    className="px-3 py-1 bg-darkBlue text-light dark:bg-light dark:text-darkBlue rounded-lg hover:opacity-90 transition-colors text-sm font-medium">
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
            <FiHeart className="text-red-500 dark:text-red-400" size={24} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No favorites yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Start adding spaces to your favorites while browsing.
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

export default UserFavorites;
