import { useState, useEffect } from 'react';
import { CiSearch } from 'react-icons/ci';
import { MdOutlineFilterList } from 'react-icons/md';
import { MdOutlineFilterListOff } from 'react-icons/md';
import RoomCards from '../../components/Room/RoomCards';
import { roomApi } from '../../services/roomApi';

// Define proper type mapping for room categories
const categoryToType: Record<string, string> = {
  'Room Stay': 'stay',
  'Conference Room': 'conference',
  'Events Place': 'event',
};

const Homepage = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [rooms, setRooms] = useState<any[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<any[]>([]);
  const [categoryFilters, setCategoryFilters] = useState({
    'Room Stay': false,
    'Conference Room': false,
    'Events Place': false,
  });

  // Fetch rooms from API
  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      try {
        const response = await roomApi.getRooms();
        if (response.success) {
          setRooms(response.data);
          setFilteredRooms(response.data);
        } else {
          console.error('Failed to fetch rooms:', response.message);
        }
      } catch (error) {
        console.error('Error fetching rooms:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  const toggleFilter = () => {
    setFilter(!filter);
  };

  // Handle category filter changes
  const handleCategoryChange = (category: string) => {
    setCategoryFilters({
      ...categoryFilters,
      [category]: !categoryFilters[category as keyof typeof categoryFilters],
    });
  };

  // Filter rooms based on search and category filters
  useEffect(() => {
    let result = [...rooms];

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (room) =>
          room.title?.toLowerCase().includes(searchLower) ||
          room.location?.city?.toLowerCase().includes(searchLower) ||
          room.location?.country?.toLowerCase().includes(searchLower) ||
          room.description?.toLowerCase().includes(searchLower) ||
          // Add search through amenities
          room.amenities?.some((amenity: string) =>
            amenity.toLowerCase().includes(searchLower)
          )
      );
    }

    // Apply category filters if any are selected
    const activeFilters = Object.entries(categoryFilters).filter(
      ([_, isActive]) => isActive
    );

    if (activeFilters.length > 0) {
      result = result.filter((room) =>
        activeFilters.some(([category]) => {
          // Map frontend category name to backend type
          const backendType = categoryToType[category];
          return room.type === backendType;
        })
      );
    }

    setFilteredRooms(result);
  }, [search, categoryFilters, rooms]);

  return (
    <section className="font-poppins p-4 bg-light text-darkBlue dark:bg-darkBlue dark:text-light transition-all duration-300">
      <header className="max-w-7xl mx-auto">
        <div className="w-full flex items-center justify-between gap-4">
          <div className="relative w-full md:w-[60%]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-darkBlue p-2 pl-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-gray-800 dark:border-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-400"
              placeholder="Search for places, events, conferences, or amenities..."
            />
            <CiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-xl" />
          </div>

          <button
            onClick={toggleFilter}
            className="flex items-center gap-2 px-3 py-1 border border-darkBlue dark:border-light hover:bg-darkBlue hover:text-light dark:hover:bg-light dark:hover:text-darkBlue rounded-lg hover:scale-105 transition duration-300 cursor-pointer">
            {filter ? (
              <span className="flex items-center gap-2">
                <MdOutlineFilterListOff className="text-xl" />
                <span className="hidden sm:inline">Filter</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <MdOutlineFilterList className="text-xl" />
                <span className="hidden sm:inline">Filter</span>
              </span>
            )}
          </button>
        </div>

        {/* Filter options */}
        {filter && (
          <div className="mt-4 p-5 bg-white/80 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg transition-all duration-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Filter by category</h2>
              <button
                onClick={toggleFilter}
                className="text-gray-500 dark:text-gray-400 hover:text-darkBlue dark:hover:text-light">
                <MdOutlineFilterListOff className="text-xl" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div
                className={`flex items-center gap-3 p-3 border ${
                  categoryFilters['Room Stay']
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400'
                    : 'border-gray-200 dark:border-gray-700'
                } rounded-lg hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer group`}
                onClick={() => handleCategoryChange('Room Stay')}>
                <input
                  type="checkbox"
                  id="room-stays"
                  checked={categoryFilters['Room Stay']}
                  onChange={() => {}}
                  className="w-5 h-5 text-blue-500 rounded border-gray-300 focus:ring-blue-400 cursor-pointer"
                />
                <label
                  htmlFor="room-stays"
                  className="flex-1 cursor-pointer font-medium group-hover:text-blue-500 transition-colors">
                  Room Stays
                </label>
              </div>

              <div
                className={`flex items-center gap-3 p-3 border ${
                  categoryFilters['Conference Room']
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400'
                    : 'border-gray-200 dark:border-gray-700'
                } rounded-lg hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer group`}
                onClick={() => handleCategoryChange('Conference Room')}>
                <input
                  type="checkbox"
                  id="conference-rooms"
                  checked={categoryFilters['Conference Room']}
                  onChange={() => {}}
                  className="w-5 h-5 text-blue-500 rounded border-gray-300 focus:ring-blue-400 cursor-pointer"
                />
                <label
                  htmlFor="conference-rooms"
                  className="flex-1 cursor-pointer font-medium group-hover:text-blue-500 transition-colors">
                  Conference Rooms
                </label>
              </div>

              <div
                className={`flex items-center gap-3 p-3 border ${
                  categoryFilters['Events Place']
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400'
                    : 'border-gray-200 dark:border-gray-700'
                } rounded-lg hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer group`}
                onClick={() => handleCategoryChange('Events Place')}>
                <input
                  type="checkbox"
                  id="events-place"
                  checked={categoryFilters['Events Place']}
                  onChange={() => {}}
                  className="w-5 h-5 text-blue-500 rounded border-gray-300 focus:ring-blue-400 cursor-pointer"
                />
                <label
                  htmlFor="events-place"
                  className="flex-1 cursor-pointer font-medium group-hover:text-blue-500 transition-colors">
                  Events Place
                </label>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="mt-10 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Discover unique spaces</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Find and book accommodations, conference rooms, and event venues
            across the Philippines
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredRooms.length > 0 ? (
          <RoomCards rooms={filteredRooms} />
        ) : (
          <div className="min-h-[400px] flex flex-col items-center justify-center py-12 text-center">
            <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">
              🔍
            </div>
            <h2 className="text-xl font-semibold mb-2">No spaces found</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              We couldn't find any spaces matching your search criteria. Try
              adjusting your filters or search terms.
            </p>
          </div>
        )}
      </main>
    </section>
  );
};

export default Homepage;
