import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { CiSearch } from 'react-icons/ci';
import { MdOutlineFilterList, MdOutlineFilterListOff } from 'react-icons/md';
import RoomCards from '../../components/Room/RoomCards';
import { roomApi } from '../../services/roomApi';
import '../../css/infinite-scroll.css';

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

const categoryToType: Record<string, string> = {
  'Room Stay': 'stay',
  'Conference Room': 'conference',
  'Events Place': 'event',
};

const RATE_LIMIT_CONFIG = {
  REQUEST_DELAY: 2000,
  RETRY_DELAY: 5000,
  MAX_RETRIES: 3,
  DEBOUNCE_DELAY: 800,
  THROTTLE_DELAY: 1000,
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

const Homepage = () => {
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

  const debouncedSearch = useDebounce(search, RATE_LIMIT_CONFIG.DEBOUNCE_DELAY);

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
    [debouncedSearch, activeFilters]
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
  }, [debouncedSearch, activeFilters, fetchRooms]);

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
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-cyan-400/15 to-blue-500/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 w-64 h-64 bg-gradient-to-r from-violet-400/10 to-pink-400/10 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 p-4">
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
            <div className="mt-4 p-5 bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl shadow-xl shadow-blue-500/10 dark:shadow-purple-500/10 transition-all duration-300">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium">Filter by category</h2>
                <button
                  onClick={toggleFilter}
                  className="text-gray-500 dark:text-gray-400 hover:text-darkBlue dark:hover:text-light">
                  <MdOutlineFilterListOff className="text-xl" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.keys(categoryFilters).map((category) => (
                  <div
                    key={category}
                    className={`flex items-center gap-3 p-3 border ${
                      categoryFilters[category as keyof typeof categoryFilters]
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400'
                        : 'border-gray-200 dark:border-gray-700'
                    } rounded-lg hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer group`}
                    onClick={() => handleCategoryChange(category)}>
                    <input
                      type="checkbox"
                      id={category.toLowerCase().replace(' ', '-')}
                      checked={
                        categoryFilters[
                          category as keyof typeof categoryFilters
                        ]
                      }
                      onChange={() => {}}
                      className="w-5 h-5 text-blue-500 rounded border-gray-300 focus:ring-blue-400 cursor-pointer"
                    />
                    <label
                      htmlFor={category.toLowerCase().replace(' ', '-')}
                      className="flex-1 cursor-pointer font-medium group-hover:text-blue-500 transition-colors">
                      {category}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </header>

        <main className="mt-10 max-w-7xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-blue-600 to-cyan-600 dark:from-blue-400 dark:via-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
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

export default Homepage;
