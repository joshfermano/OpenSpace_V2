import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { CiSearch } from 'react-icons/ci';
import {
  MdOutlineFilterList,
  MdClose,
  MdWifi,
  MdAir,
  MdVideocam,
  MdCoffee,
  MdLocalParking,
  MdAccessible,
  MdOutdoorGrill,
  MdMic,
  MdSpeaker,
  MdRestaurant,
  MdWc,
  MdLightbulb,
  MdDraw,
} from 'react-icons/md';
import { FiHome, FiBriefcase, FiCalendar, FiCheck } from 'react-icons/fi';
import RoomCards from '../../components/Room/RoomCards';
import { roomApi } from '../../services/roomApi';
import '../../css/infinite-scroll.css';

// Custom hook for debounced values with longer delay
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Define proper type mapping for room categories
const categoryToType: Record<string, string> = {
  'Room Stay': 'stay',
  'Conference Room': 'conference',
  'Events Place': 'event',
};

// Modern amenities with icons and categories
const AMENITIES_CONFIG = {
  'Wi-Fi': { icon: MdWifi, category: 'tech', color: 'blue' },
  'Air Conditioning': { icon: MdAir, category: 'comfort', color: 'cyan' },
  Projector: { icon: MdVideocam, category: 'tech', color: 'blue' },
  Whiteboard: { icon: MdDraw, category: 'work', color: 'green' },
  'Coffee/Tea': { icon: MdCoffee, category: 'comfort', color: 'amber' },
  Microphone: { icon: MdMic, category: 'tech', color: 'red' },
  'Speaker System': { icon: MdSpeaker, category: 'tech', color: 'indigo' },
  'Catering Available': {
    icon: MdRestaurant,
    category: 'service',
    color: 'orange',
  },
  Restrooms: { icon: MdWc, category: 'basic', color: 'gray' },
  Parking: { icon: MdLocalParking, category: 'basic', color: 'slate' },
  'Accessible Entry': {
    icon: MdAccessible,
    category: 'basic',
    color: 'emerald',
  },
  'Natural Lighting': {
    icon: MdLightbulb,
    category: 'comfort',
    color: 'yellow',
  },
  'Outdoor Space': { icon: MdOutdoorGrill, category: 'comfort', color: 'teal' },
};

const CATEGORIES_CONFIG = {
  'Room Stay': {
    icon: FiHome,
    color: 'rose',
    description: 'Cozy stays & accommodations',
  },
  'Conference Room': {
    icon: FiBriefcase,
    color: 'blue',
    description: 'Professional meeting spaces',
  },
  'Events Place': {
    icon: FiCalendar,
    color: 'indigo',
    description: 'Venues for special occasions',
  },
};

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  REQUEST_DELAY: 2000, // 2 seconds between requests
  RETRY_DELAY: 5000, // 5 seconds before retry
  MAX_RETRIES: 3,
  DEBOUNCE_DELAY: 800, // 800ms debounce for search
  THROTTLE_DELAY: 1000, // 1 second throttle for infinite scroll
};

interface Price {
  basePrice: number;
  cleaningFee?: number;
  serviceFee?: number;
}

interface Capacity {
  maxGuests: number;
}

interface Room {
  _id: string;
  title: string;
  type: 'stay' | 'conference' | 'event';
  location: {
    city: string;
    state: string;
    country: string;
  };
  description: string;
  amenities: string[];
  price: Price;
  capacity: Capacity;
  images: string[];
}

interface PaginationState {
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
}

const HomepageOptimized = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    totalPages: 1,
    hasMore: true,
    loading: true,
    loadingMore: false,
  });
  const [categoryFilters, setCategoryFilters] = useState({
    'Room Stay': false,
    'Conference Room': false,
    'Events Place': false,
  });
  const [amenityFilters, setAmenityFilters] = useState<Record<string, boolean>>(
    Object.keys(AMENITIES_CONFIG).reduce((acc, amenity) => {
      acc[amenity] = false;
      return acc;
    }, {} as Record<string, boolean>)
  );
  const [activeFilterTab, setActiveFilterTab] = useState<
    'categories' | 'amenities'
  >('categories');

  // Debounce search input with longer delay to reduce API calls
  const debouncedSearch = useDebounce(search, RATE_LIMIT_CONFIG.DEBOUNCE_DELAY);

  // Refs for optimization and rate limiting
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingElementRef = useRef<HTMLDivElement>(null);
  const lastFetchTime = useRef<number>(0);
  const retryCount = useRef<number>(0);
  const isInitialLoad = useRef<boolean>(true);
  const requestInProgress = useRef<boolean>(false);

  const activeFilters = useMemo(
    () => Object.entries(categoryFilters).filter(([_, isActive]) => isActive),
    [categoryFilters]
  );

  const activeAmenityFilters = useMemo(
    () => Object.entries(amenityFilters).filter(([_, isActive]) => isActive),
    [amenityFilters]
  );

  const totalActiveFilters = activeFilters.length + activeAmenityFilters.length;

  // Rate-limited fetch function with comprehensive error handling
  const fetchRooms = useCallback(
    async (page = 1, resetRooms = false): Promise<void> => {
      // Prevent multiple simultaneous requests
      if (requestInProgress.current) {
        console.log('Request already in progress, skipping');
        return;
      }

      // Rate limiting: enforce minimum delay between requests
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTime.current;
      if (
        timeSinceLastFetch < RATE_LIMIT_CONFIG.REQUEST_DELAY &&
        !isInitialLoad.current
      ) {
        const remainingDelay =
          RATE_LIMIT_CONFIG.REQUEST_DELAY - timeSinceLastFetch;
        console.log(
          `Rate limiting: waiting ${remainingDelay}ms before next request`
        );
        await new Promise((resolve) => setTimeout(resolve, remainingDelay));
      }

      requestInProgress.current = true;
      lastFetchTime.current = Date.now();

      try {
        // Set loading states
        if (page === 1 || resetRooms) {
          setPagination((prev) => ({ ...prev, loading: true }));
          setError(null);
        } else {
          setPagination((prev) => ({ ...prev, loadingMore: true }));
        }

        const params: Record<string, string> = {
          page: page.toString(),
          limit: '12', // Increased limit to reduce number of requests
        };

        // Add search parameter
        if (debouncedSearch.trim()) {
          params.search = debouncedSearch.trim();
        }

        // Add single category filter to backend
        if (activeFilters.length === 1) {
          const backendType = categoryToType[activeFilters[0][0]];
          params.type = backendType;
        }

        // Add amenity filters to backend
        if (activeAmenityFilters.length > 0) {
          const selectedAmenities = activeAmenityFilters.map(
            ([amenity]) => amenity
          );
          params.amenities = selectedAmenities.join(',');
        }

        console.log(`Fetching rooms - Page: ${page}, Params:`, params);

        const response = await roomApi.getRooms(params);

        if (response.success) {
          let newRooms = response.data || [];

          // Apply client-side filtering for multiple categories only
          if (activeFilters.length > 1) {
            const backendTypes = activeFilters.map(
              ([category]) => categoryToType[category]
            );
            newRooms = newRooms.filter((room: Room) =>
              backendTypes.includes(room.type)
            );
          }

          if (resetRooms || page === 1) {
            setRooms(newRooms);
          } else {
            setRooms((prevRooms) => [...prevRooms, ...newRooms]);
          }

          setPagination((prev) => ({
            ...prev,
            currentPage: response.currentPage || page,
            totalPages: response.totalPages || 1,
            hasMore: page < (response.totalPages || 1),
            loading: false,
            loadingMore: false,
          }));

          // Reset retry count on successful fetch
          retryCount.current = 0;
          setError(null);
          isInitialLoad.current = false;

          console.log(
            `Successfully loaded page ${page}: ${newRooms.length} rooms`
          );
        } else {
          throw new Error(response.message || 'Failed to fetch rooms');
        }
      } catch (error: any) {
        console.error('Error fetching rooms:', error);

        // Handle rate limiting errors specifically
        if (error.statusCode === 429 || error.message?.includes('rate limit')) {
          if (retryCount.current < RATE_LIMIT_CONFIG.MAX_RETRIES) {
            retryCount.current++;
            const retryDelay =
              RATE_LIMIT_CONFIG.RETRY_DELAY * retryCount.current;
            console.log(
              `Rate limited, retrying in ${retryDelay}ms (attempt ${retryCount.current}/${RATE_LIMIT_CONFIG.MAX_RETRIES})`
            );

            setTimeout(() => {
              fetchRooms(page, resetRooms);
            }, retryDelay);
            return;
          } else {
            setError('Server is busy. Please wait a moment and try again.');
          }
        } else {
          // Handle other errors
          if (retryCount.current < RATE_LIMIT_CONFIG.MAX_RETRIES) {
            retryCount.current++;
            console.log(
              `Retrying... Attempt ${retryCount.current}/${RATE_LIMIT_CONFIG.MAX_RETRIES}`
            );
            setTimeout(() => {
              fetchRooms(page, resetRooms);
            }, 2000 * retryCount.current);
          } else {
            setError(
              'Failed to load rooms. Please check your connection and try again.'
            );
          }
        }

        setPagination((prev) => ({
          ...prev,
          loading: false,
          loadingMore: false,
        }));
      } finally {
        requestInProgress.current = false;
      }
    },
    [debouncedSearch, activeFilters, activeAmenityFilters]
  );

  // Throttled load more function
  const loadMore = useCallback(() => {
    const now = Date.now();
    if (
      !pagination.loadingMore &&
      !pagination.loading &&
      pagination.hasMore &&
      pagination.currentPage < pagination.totalPages &&
      now - lastFetchTime.current > RATE_LIMIT_CONFIG.THROTTLE_DELAY &&
      !requestInProgress.current
    ) {
      console.log('Loading more rooms...');
      fetchRooms(pagination.currentPage + 1, false);
    }
  }, [
    fetchRooms,
    pagination.loadingMore,
    pagination.loading,
    pagination.hasMore,
    pagination.currentPage,
    pagination.totalPages,
  ]);

  const toggleFilter = () => {
    setFilter(!filter);
  };

  const handleCategoryChange = (category: string) => {
    setCategoryFilters((prev) => ({
      ...prev,
      [category]: !prev[category as keyof typeof prev],
    }));
  };

  const handleAmenityChange = (amenity: string) => {
    setAmenityFilters((prev) => ({
      ...prev,
      [amenity]: !prev[amenity],
    }));
  };

  const clearAllFilters = () => {
    setCategoryFilters({
      'Room Stay': false,
      'Conference Room': false,
      'Events Place': false,
    });
    setAmenityFilters(
      Object.keys(AMENITIES_CONFIG).reduce((acc, amenity) => {
        acc[amenity] = false;
        return acc;
      }, {} as Record<string, boolean>)
    );
  };

  const retryFetch = useCallback(() => {
    retryCount.current = 0;
    setError(null);
    fetchRooms(1, true);
  }, [fetchRooms]);

  // Initial fetch - only once
  useEffect(() => {
    if (isInitialLoad.current) {
      console.log('Initial load of rooms');
      fetchRooms(1, true);
    }
  }, []); // Empty dependency array - only run once

  // Reset and fetch when search or filters change
  useEffect(() => {
    if (!isInitialLoad.current) {
      console.log('Search or filters changed, resetting rooms');
      retryCount.current = 0;
      setPagination((prev) => ({
        ...prev,
        currentPage: 1,
        totalPages: 1,
        hasMore: true,
      }));
      fetchRooms(1, true);
    }
  }, [debouncedSearch, activeFilters, activeAmenityFilters, fetchRooms]);

  // Setup optimized intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (
          target.isIntersecting &&
          !pagination.loading &&
          !pagination.loadingMore &&
          pagination.hasMore &&
          !error &&
          !requestInProgress.current
        ) {
          loadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '200px', // Start loading 200px before the element is visible
      }
    );

    if (loadingElementRef.current) {
      observerRef.current.observe(loadingElementRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [
    pagination.loading,
    pagination.loadingMore,
    pagination.hasMore,
    loadMore,
    error,
  ]);

  return (
    <section className="font-poppins min-h-screen bg-gradient-to-br from-light via-blue-50/30 to-slate-100/50 dark:bg-gradient-to-br dark:from-darkBlue dark:via-slate-900/90 dark:to-gray-900/80 text-darkBlue dark:text-light transition-all duration-300 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-cyan-400/15 to-blue-500/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 w-64 h-64 bg-gradient-to-r from-blue-400/10 to-teal-400/10 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 p-4">
        <header className="max-w-7xl mx-auto">
          <div className="w-full flex items-center justify-between gap-3">
            <div className="relative w-full md:w-[70%]">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 p-3 pl-10 rounded-xl 
                focus:outline-none focus:ring-0 focus:border-blue-400 dark:focus:border-blue-500 
                dark:bg-gray-800/50 backdrop-blur-sm placeholder:text-gray-400 dark:placeholder:text-gray-500
                transition-all duration-300 text-gray-900 dark:text-light shadow-sm hover:shadow-md text-sm"
                placeholder="Search spaces, vibes, amenities..."
              />
              <CiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
            </div>

            <button
              onClick={toggleFilter}
              className={`relative flex items-center gap-2 px-3 py-3 rounded-xl font-medium transition-all duration-300 text-sm
              ${
                filter
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
              }`}>
              {filter ? (
                <MdClose className="text-lg" />
              ) : (
                <MdOutlineFilterList className="text-lg" />
              )}
              <span className="hidden sm:inline">
                {filter ? 'Close' : 'Filters'}
              </span>
              {totalActiveFilters > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                  {totalActiveFilters}
                </span>
              )}
            </button>
          </div>

          {/* Compact Filter Panel */}
          {filter && (
            <div className="mt-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-xl shadow-blue-500/5 dark:shadow-blue-500/10 transition-all duration-300 overflow-hidden">
              {/* Compact Header */}
              <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                      Find Your Vibe ✨
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {totalActiveFilters > 0
                        ? `${totalActiveFilters} active`
                        : 'No filters'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {totalActiveFilters > 0 && (
                      <button
                        onClick={clearAllFilters}
                        className="text-xs text-red-500 hover:text-red-600 font-medium transition-colors px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                        Clear
                      </button>
                    )}
                    <button
                      onClick={toggleFilter}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                      <MdClose className="text-lg text-gray-500" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Compact Tabs */}
              <div className="px-4 pt-3">
                <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl p-0.5">
                  <button
                    onClick={() => setActiveFilterTab('categories')}
                    className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all duration-300 text-sm ${
                      activeFilterTab === 'categories'
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}>
                    Spaces
                    {activeFilters.length > 0 && (
                      <span className="ml-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs px-1.5 py-0.5 rounded-full">
                        {activeFilters.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveFilterTab('amenities')}
                    className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all duration-300 text-sm ${
                      activeFilterTab === 'amenities'
                        ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}>
                    Amenities
                    {activeAmenityFilters.length > 0 && (
                      <span className="ml-1 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 text-xs px-1.5 py-0.5 rounded-full">
                        {activeAmenityFilters.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Compact Content */}
              <div className="p-4">
                {activeFilterTab === 'categories' && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      What's your vibe? 🎯
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {Object.entries(CATEGORIES_CONFIG).map(
                        ([category, config]) => {
                          const IconComponent = config.icon;
                          const isActive =
                            categoryFilters[
                              category as keyof typeof categoryFilters
                            ];
                          return (
                            <button
                              key={category}
                              onClick={() => handleCategoryChange(category)}
                              className={`group relative p-4 rounded-xl border transition-all duration-300 text-left hover:scale-[1.02]
                            ${
                              isActive
                                ? `border-${config.color}-400 bg-${config.color}-50 dark:bg-${config.color}-900/20 shadow-md`
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
                            }`}>
                              <div className="flex items-center space-x-3">
                                <div
                                  className={`p-2 rounded-lg ${
                                    isActive
                                      ? `bg-${config.color}-100 dark:bg-${config.color}-800`
                                      : 'bg-gray-100 dark:bg-gray-700'
                                  } transition-colors`}>
                                  <IconComponent
                                    className={`text-lg ${
                                      isActive
                                        ? `text-${config.color}-600 dark:text-${config.color}-400`
                                        : 'text-gray-600 dark:text-gray-400'
                                    }`}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4
                                    className={`font-semibold text-sm ${
                                      isActive
                                        ? `text-${config.color}-700 dark:text-${config.color}-300`
                                        : 'text-gray-800 dark:text-gray-200'
                                    }`}>
                                    {category}
                                  </h4>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {config.description}
                                  </p>
                                </div>
                                {isActive && (
                                  <div
                                    className={`p-0.5 rounded-full bg-${config.color}-500`}>
                                    <FiCheck className="text-white text-xs" />
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}

                {activeFilterTab === 'amenities' && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      What do you need? 🛠️
                    </h3>

                    {/* Compact Amenities */}
                    {['tech', 'comfort', 'basic', 'service', 'work'].map(
                      (category) => {
                        const categoryAmenities = Object.entries(
                          AMENITIES_CONFIG
                        ).filter(([_, config]) => config.category === category);

                        if (categoryAmenities.length === 0) return null;

                        const categoryNames = {
                          tech: '🔌 Tech',
                          comfort: '✨ Comfort',
                          basic: '🏢 Basics',
                          service: '🍽️ Service',
                          work: '💼 Work',
                        };

                        return (
                          <div key={category} className="space-y-2">
                            <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                              {
                                categoryNames[
                                  category as keyof typeof categoryNames
                                ]
                              }
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {categoryAmenities.map(([amenity, config]) => {
                                const IconComponent = config.icon;
                                const isActive = amenityFilters[amenity];
                                return (
                                  <button
                                    key={amenity}
                                    onClick={() => handleAmenityChange(amenity)}
                                    className={`group flex items-center space-x-2 p-2.5 rounded-lg border transition-all duration-300 hover:scale-[1.02]
                                  ${
                                    isActive
                                      ? `border-${config.color}-400 bg-${config.color}-50 dark:bg-${config.color}-900/20 shadow-sm`
                                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                  }`}>
                                    <IconComponent
                                      className={`text-sm ${
                                        isActive
                                          ? `text-${config.color}-600 dark:text-${config.color}-400`
                                          : 'text-gray-500 dark:text-gray-400'
                                      }`}
                                    />
                                    <span
                                      className={`text-xs font-medium truncate ${
                                        isActive
                                          ? `text-${config.color}-700 dark:text-${config.color}-300`
                                          : 'text-gray-700 dark:text-gray-300'
                                      }`}>
                                      {amenity}
                                    </span>
                                    {isActive && (
                                      <FiCheck
                                        className={`text-${config.color}-600 dark:text-${config.color}-400 text-xs ml-auto flex-shrink-0`}
                                      />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </header>

        <main className="mt-10 max-w-7xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 dark:from-blue-400 dark:via-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
              Discover unique spaces
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto leading-relaxed">
              Find and book accommodations, conference rooms, and event venues
              across the Philippines
            </p>
          </div>

          {error ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center py-12 text-center">
              <div className="text-red-400 dark:text-red-500 text-6xl mb-4">
                ⚠️
              </div>
              <h2 className="text-xl font-semibold mb-2 text-red-600 dark:text-red-400">
                {error}
              </h2>
              <button
                onClick={retryFetch}
                className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                Try Again
              </button>
            </div>
          ) : pagination.loading ? (
            <div className="flex justify-center items-center min-h-[400px]">
              <div className="loading-spinner">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">
                  Loading spaces...
                </p>
              </div>
            </div>
          ) : rooms.length > 0 ? (
            <>
              <RoomCards rooms={rooms} />

              {/* Infinite scroll loading indicator */}
              {pagination.hasMore && (
                <div
                  ref={loadingElementRef}
                  className="infinite-scroll-trigger flex justify-center items-center py-8">
                  {pagination.loadingMore ? (
                    <div className="loading-more-indicator">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Loading more spaces...
                      </p>
                    </div>
                  ) : (
                    <div className="load-more-placeholder">
                      <div className="h-4 w-4 rounded-full bg-gray-300 dark:bg-gray-600 animate-pulse"></div>
                    </div>
                  )}
                </div>
              )}
            </>
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
      </div>
    </section>
  );
};

export default HomepageOptimized;
