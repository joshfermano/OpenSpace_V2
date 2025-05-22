import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCalendar, FiClock, FiAlertCircle } from 'react-icons/fi';
import Calendar from 'react-calendar';
import TimeSelector from './TimeSelector';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { formatTimeTo12Hour } from '../../utils/bookingHelpers';

interface BookingPanelProps {
  room: any;
  roomId: string;
  isAuthenticated: boolean;
  unavailableDates: Date[];
  existingBookings: any[];
  userBookings?: any[];
}

const BookingPanel = ({
  room,
  roomId,
  isAuthenticated,
  unavailableDates,
  existingBookings,
  userBookings = [],
}: BookingPanelProps) => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    null,
    null,
  ]);
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [showTimeSelector, setShowTimeSelector] = useState<
    'checkin' | 'checkout' | null
  >(null);
  const [bookingDetails, setBookingDetails] = useState({
    numberOfDays: 0,
    subtotal: 0,
    serviceFee: 0,
    total: 0,
  });
  const [allUnavailableDates, setAllUnavailableDates] = useState<Date[]>([]);
  const [isDateRangeConflicting, setIsDateRangeConflicting] = useState(false);
  const [isPastDateTimeError, setIsPastDateTimeError] = useState(false);

  // Ref to track if dates have been processed to prevent disappearing on re-renders
  const datesProcessedRef = useRef(false);
  const calendarKey = useRef(`calendar-${roomId}-${Date.now()}`);

  // Time options for checkin/checkout
  const timeOptions = [
    '7:00 AM',
    '8:00 AM',
    '9:00 AM',
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '1:00 PM',
    '2:00 PM',
    '3:00 PM',
    '4:00 PM',
    '5:00 PM',
    '6:00 PM',
    '7:00 PM',
    '8:00 PM',
    '9:00 PM',
    '10:00 PM',
  ];

  // Helper to normalize dates for comparison - using only year, month, and day
  const normalizeDate = (date: Date): string => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.error('Invalid date provided to normalizeDate', date);
      return '';
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Helper function to convert 12-hour time string to 24-hour HH:MM format
  const convert12HourTo24Hour = (time12h: string): string | null => {
    if (!time12h) return null;
    const [time, modifier] = time12h.split(' ');
    if (!time || !modifier) return null; // Invalid format

    let [hours, minutes] = time.split(':').map(Number);

    if (isNaN(hours) || isNaN(minutes)) return null; // Invalid numbers

    if (modifier.toUpperCase() === 'PM' && hours < 12) {
      hours += 12;
    }
    if (modifier.toUpperCase() === 'AM' && hours === 12) {
      // Midnight case
      hours = 0;
    }
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
      2,
      '0'
    )}`;
  };

  // Function to check if selected date/time is in the past
  const validateDateTime = () => {
    if (!dateRange[0] || !checkInTime) {
      setIsPastDateTimeError(false); // Not enough info yet
      return;
    }

    const selectedDate = dateRange[0];
    const time24h = convert12HourTo24Hour(checkInTime);

    if (!time24h) {
      setIsPastDateTimeError(false); // Invalid time format, handle elsewhere or default to no error
      return;
    }

    const [hours, minutes] = time24h.split(':').map(Number);

    // Create a date object for the selected check-in date and time
    // Ensure we use the year, month, and day from selectedDate correctly
    const selectedDateTime = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      hours,
      minutes
    );

    const now = new Date();

    if (selectedDateTime < now) {
      setIsPastDateTimeError(true);
    } else {
      setIsPastDateTimeError(false);
    }
  };

  // Call validateDateTime whenever dateRange or checkInTime changes
  useEffect(() => {
    validateDateTime();
  }, [dateRange[0], checkInTime]);

  // Process existing bookings and unavailable dates - run with a stable dependency array
  useEffect(() => {
    // Don't process if we've already done it and have unavailable dates,
    // UNLESS the unavailableDates or existingBookings props have changed
    const existingBookingsCount = existingBookings?.length || 0;
    const unavailableDatesCount = unavailableDates?.length || 0;

    // Check if the data has changed since the last processing
    const dataChanged =
      existingBookingsCount !== 0 ||
      unavailableDatesCount !== 0 ||
      allUnavailableDates.length === 0;

    if (
      datesProcessedRef.current &&
      allUnavailableDates.length > 0 &&
      !dataChanged
    ) {
      console.log('[BookingPanel] Dates already processed, skipping');
      return;
    }

    console.log('[BookingPanel] Processing availability data');
    const combinedUnavailableDates: Date[] = [];

    // First add host-blocked dates from unavailableDates prop
    if (unavailableDates && unavailableDates.length > 0) {
      console.log(`Processing ${unavailableDates.length} host-blocked dates`);
      unavailableDates.forEach((date) => {
        if (date instanceof Date && !isNaN(date.getTime())) {
          const normalizedDate = new Date(date);
          normalizedDate.setHours(0, 0, 0, 0);
          combinedUnavailableDates.push(normalizedDate);
        } else if (typeof date === 'string') {
          // Handle string dates too
          const parsedDate = new Date(date);
          if (!isNaN(parsedDate.getTime())) {
            parsedDate.setHours(0, 0, 0, 0);
            combinedUnavailableDates.push(parsedDate);
          }
        }
      });
      console.log(
        `Added ${combinedUnavailableDates.length} host-blocked dates to unavailable dates`
      );
    }

    // Process ALL existing bookings to mark them as unavailable
    console.log('Processing existing bookings:', existingBookings);
    if (existingBookings && existingBookings.length > 0) {
      let bookingDatesCount = 0;
      existingBookings.forEach((booking) => {
        // Skip if booking doesn't have required data
        if (!booking || !booking.checkIn || !booking.checkOut) {
          console.warn('Skipping invalid booking:', booking);
          return;
        }

        // Skip if booking has a roomId that doesn't match current room
        if (booking.roomId && booking.roomId !== roomId) {
          console.log(`Skipping booking for different room: ${booking.roomId}`);
          return;
        }

        let startDate, endDate;

        // Parse check-in date
        if (booking.checkIn instanceof Date) {
          startDate = new Date(booking.checkIn);
        } else if (typeof booking.checkIn === 'string') {
          startDate = new Date(booking.checkIn);
        }

        // Parse check-out date
        if (booking.checkOut instanceof Date) {
          endDate = new Date(booking.checkOut);
        } else if (typeof booking.checkOut === 'string') {
          endDate = new Date(booking.checkOut);
        }

        // Make sure dates are valid
        if (
          !startDate ||
          !endDate ||
          isNaN(startDate.getTime()) ||
          isNaN(endDate.getTime())
        ) {
          console.error('Invalid booking dates', booking);
          return;
        }

        // Normalize dates for comparison (midnight)
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        console.log(
          `Processing booking ID=${booking._id}: ${normalizeDate(
            startDate
          )} to ${normalizeDate(endDate)}, Status=${
            booking.bookingStatus || 'unknown'
          }`
        );

        // Add each day in the date range to unavailable dates
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const dateStr = normalizeDate(currentDate);
          bookingDatesCount++;

          // Check if this date is already in our unavailable dates
          const alreadyExists = combinedUnavailableDates.some(
            (d) => normalizeDate(d) === dateStr
          );

          if (!alreadyExists) {
            // Mark this date as unavailable for all users
            const unavailableDate = new Date(currentDate);
            unavailableDate.setHours(0, 0, 0, 0);
            combinedUnavailableDates.push(unavailableDate);
            console.log(
              `Added date ${dateStr} as unavailable from booking ID=${booking._id}`
            );
          } else {
            console.log(
              `Date ${dateStr} already marked as unavailable, skipping`
            );
          }

          // Move to next day - create a new Date object to avoid reference issues
          const nextDate = new Date(currentDate);
          nextDate.setDate(nextDate.getDate() + 1);
          currentDate.setTime(nextDate.getTime());
        }
      });
      console.log(
        `Processed ${existingBookings.length} bookings with ${bookingDatesCount} total booking dates`
      );
    }

    // Process user's own bookings for UI distinction
    if (userBookings && userBookings.length > 0) {
      userBookings.forEach((booking) => {
        // Skip if booking doesn't have required data
        if (!booking || !booking.checkIn || !booking.checkOut) {
          return;
        }

        // Skip if booking has a roomId that doesn't match current room
        if (booking.roomId && booking.roomId !== roomId) {
          return;
        }

        let startDate, endDate;

        // Parse check-in date
        if (booking.checkIn instanceof Date) {
          startDate = new Date(booking.checkIn);
        } else if (typeof booking.checkIn === 'string') {
          startDate = new Date(booking.checkIn);
        }

        // Parse check-out date
        if (booking.checkOut instanceof Date) {
          endDate = new Date(booking.checkOut);
        } else if (typeof booking.checkOut === 'string') {
          endDate = new Date(booking.checkOut);
        }

        // Make sure dates are valid
        if (
          !startDate ||
          !endDate ||
          isNaN(startDate.getTime()) ||
          isNaN(endDate.getTime())
        ) {
          console.error('Invalid user booking dates', booking);
          return;
        }

        // Normalize dates for comparison (midnight)
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        console.log(
          `Processing user booking: ${normalizeDate(
            startDate
          )} to ${normalizeDate(endDate)}`
        );
      });
    }

    // Debug output all dates
    console.log(
      `Room ${roomId} - All unavailable dates (${combinedUnavailableDates.length}):`,
      combinedUnavailableDates.map((d) => normalizeDate(d))
    );

    // Update state with combined dates
    if (combinedUnavailableDates.length > 0) {
      setAllUnavailableDates([...combinedUnavailableDates]);
      // Mark dates as processed to prevent re-processing on refresh
      datesProcessedRef.current = true;
    }
  }, [unavailableDates, existingBookings, roomId, userBookings]);

  // Set initial times based on room type
  useEffect(() => {
    if (room) {
      if (room.type === 'stay') {
        const checkInTimeValue = room.houseRules?.checkInTime || '14:00';
        const checkOutTimeValue = room.houseRules?.checkOutTime || '12:00';

        setCheckInTime(formatTimeTo12Hour(checkInTimeValue));
        setCheckOutTime(formatTimeTo12Hour(checkOutTimeValue));
      } else if (room.type === 'conference') {
        setCheckInTime('8:00 AM');
        setCheckOutTime('5:00 PM');
      } else if (room.type === 'event') {
        setCheckInTime('10:00 AM');
        setCheckOutTime('10:00 PM');
      }
    }
  }, [room]);

  // Check if selected date range conflicts with unavailable dates
  useEffect(() => {
    if (dateRange[0] && dateRange[1]) {
      const startDate = new Date(dateRange[0]);
      const endDate = new Date(dateRange[1]);

      let hasConflict = false;
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        if (isDateUnavailable(currentDate)) {
          hasConflict = true;
          break;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      setIsDateRangeConflicting(hasConflict);

      if (hasConflict) {
        toast.warning(
          'Your selected dates include unavailable days. Please choose different dates.',
          {
            autoClose: 5000,
            position: 'top-center',
          }
        );
      }
    }
  }, [dateRange, allUnavailableDates]);

  // Calculate booking details when date range changes
  useEffect(() => {
    if (dateRange[0] && dateRange[1] && room && !isDateRangeConflicting) {
      const startDate = dateRange[0];
      const endDate = dateRange[1];
      const differenceInTime = endDate.getTime() - startDate.getTime();
      const differenceInDays = Math.ceil(differenceInTime / (1000 * 3600 * 24));

      let subtotal = room.price?.basePrice || 0;

      if (room.type === 'stay') {
        subtotal = subtotal * differenceInDays;
      } else if (room.type === 'conference') {
        subtotal = subtotal * differenceInDays;
      } else if (room.type === 'event') {
        subtotal = subtotal;
      }

      const serviceFee = subtotal * 0.1; // 10% service fee
      const total = subtotal + serviceFee;

      setBookingDetails({
        numberOfDays: differenceInDays,
        subtotal,
        serviceFee,
        total,
      });
    }
  }, [dateRange, room, isDateRangeConflicting]);

  useEffect(() => {
    console.log(
      'Bookings or availability updated, recalculating unavailable dates'
    );

    if (dateRange[0] && dateRange[1]) {
      const hasNewConflict = checkDateRangeForConflicts(
        dateRange[0],
        dateRange[1]
      );

      if (hasNewConflict) {
        setIsDateRangeConflicting(true);
        toast.warning(
          'Your selected dates now include unavailable days. Please choose different dates.',
          {
            autoClose: 5000,
            position: 'top-center',
          }
        );
      }
    }
  }, [existingBookings, unavailableDates]);

  useEffect(() => {
    if (dateRange[0] && dateRange[1]) {
      const recheckedConflict = checkDateRangeForConflicts(
        dateRange[0],
        dateRange[1]
      );

      if (recheckedConflict) {
        toast.warning(
          'These dates are no longer available, please select different dates.',
          { autoClose: 5000, position: 'top-center' }
        );
        setDateRange([null, null]);
      }
    }
  }, [allUnavailableDates, dateRange]);

  // Reset date selection if new bookings are received that conflict with current selection
  useEffect(() => {
    if (dateRange[0] && dateRange[1]) {
      // Check if the updated unavailable dates create conflicts with current selection
      const hasConflict = checkDateRangeForConflicts(
        dateRange[0],
        dateRange[1]
      );

      if (hasConflict) {
        console.log(
          'Date selection reset due to conflicts with new unavailable dates'
        );
        toast.warning(
          'Your selected dates are no longer available. Please choose different dates.',
          {
            autoClose: 5000,
            position: 'top-center',
          }
        );
        setDateRange([null, null]);
        setIsDateRangeConflicting(false);
      }
    }
  }, [allUnavailableDates]); // Only run this effect when allUnavailableDates changes

  const checkDateRangeForConflicts = (
    startDate: Date,
    endDate: Date
  ): boolean => {
    if (!startDate || !endDate) return false;

    // Normalize the dates
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    // Check each date in the range against allUnavailableDates
    const currentDate = new Date(start);
    while (currentDate <= end) {
      // Create a normalized string representation for comparison
      const currentDateStr = normalizeDate(currentDate);

      // Check if the current date exists in allUnavailableDates
      const isUnavailable = allUnavailableDates.some((unavailableDate) => {
        // Skip invalid dates
        if (
          !unavailableDate ||
          !(unavailableDate instanceof Date) ||
          isNaN(unavailableDate.getTime())
        ) {
          return false;
        }

        return normalizeDate(unavailableDate) === currentDateStr;
      });

      if (isUnavailable) {
        console.log(`Date conflict found: ${currentDateStr} is unavailable`);
        return true; // Conflict found
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return false; // No conflicts found
  };

  // Check if room type allows time selection
  const allowsTimeSelection = () => {
    if (!room) return false;
    return room.type === 'conference' || room.type === 'event';
  };

  // Check if a specific date is unavailable
  const isDateUnavailable = (date: Date): boolean => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return false;
    }

    // Create a copy of the date and set to midnight for comparison
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    // Convert to consistent string format for comparison
    const normalizeDateStr = normalizeDate(compareDate);

    // Check if the date is in the unavailable dates list
    return allUnavailableDates.some((unavailableDate) => {
      if (
        !unavailableDate ||
        !(unavailableDate instanceof Date) ||
        isNaN(unavailableDate.getTime())
      ) {
        return false;
      }

      const unavailableDateStr = normalizeDate(unavailableDate);
      return unavailableDateStr === normalizeDateStr;
    });
  };

  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return '';

    const classes = [];

    // Use the same approach as isDateUnavailable to check unavailable dates
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    const normalizeDateStr = normalizeDate(compareDate);

    // Check if the date is unavailable using the normalized date string
    const isUnavailable = allUnavailableDates.some((unavailableDate) => {
      if (
        !unavailableDate ||
        !(unavailableDate instanceof Date) ||
        isNaN(unavailableDate.getTime())
      ) {
        return false;
      }
      return normalizeDate(unavailableDate) === normalizeDateStr;
    });

    if (isUnavailable) {
      classes.push('unavailable-date');
    }

    // Set additional class for past dates
    if (date < new Date(new Date().setHours(0, 0, 0, 0))) {
      classes.push('past-date');
    }

    // Add class for user-booked dates if it's booked by the current user
    if (isDateBookedByUser(date)) {
      classes.push('user-booked-date');
    }

    return classes.join(' ');
  };

  const isDateBookedByUser = (date: Date): boolean => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return false;
    }
    if (!userBookings || userBookings.length === 0 || !isAuthenticated) {
      return false;
    }

    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    const normalizeDateStr = normalizeDate(compareDate);

    // Check if the date exists in any of the user's bookings for this room
    return userBookings.some((booking) => {
      if (!booking.checkIn || !booking.checkOut || booking.roomId !== roomId) {
        return false;
      }

      const startDate = new Date(booking.checkIn);
      const endDate = new Date(booking.checkOut);

      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      // Check if date is within booking range
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        if (normalizeDate(currentDate) === normalizeDateStr) {
          return true;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return false;
    });
  };

  const tileDisabled = ({
    date,
    view,
  }: {
    date: Date;
    view: string;
  }): boolean => {
    if (view !== 'month') return false;

    // Disable past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;

    // Disable dates that are unavailable (either host blocked or already booked)
    return isDateUnavailable(date);
  };

  const handleDateChange = (value: any) => {
    setDateRange(value);
  };

  // Handle booking button click
  const handleBookingClick = () => {
    if (!isAuthenticated) {
      navigate(`/auth/login?redirect=/rooms/${roomId}`);
      return;
    }

    if (isDateRangeConflicting) {
      toast.error(
        'Cannot book on unavailable dates. Please select different dates.'
      );
      return;
    }

    if (isPastDateTimeError) {
      toast.error('Cannot book a date or time that has already passed.');
      return;
    }

    if (dateRange[0] && dateRange[1]) {
      const formattedCheckInDate = formatDate(dateRange[0]);
      const formattedCheckOutDate = formatDate(dateRange[1]);

      const finalCheckInTime =
        checkInTime ||
        (room.type === 'stay'
          ? formatTimeTo12Hour(room.houseRules?.checkInTime || '14:00')
          : room.type === 'conference'
          ? '8:00 AM'
          : '10:00 AM');

      const finalCheckOutTime =
        checkOutTime ||
        (room.type === 'stay'
          ? formatTimeTo12Hour(room.houseRules?.checkOutTime || '12:00')
          : room.type === 'conference'
          ? '5:00 PM'
          : '10:00 PM');

      navigate('/payment', {
        state: {
          bookingDetails: {
            roomId,
            roomName: room.title,
            roomType: room.type,
            location: `${room.location.city}, ${room.location.country}`,
            checkInDate: formattedCheckInDate,
            checkOutDate: formattedCheckOutDate,
            checkInTime: finalCheckInTime,
            checkOutTime: finalCheckOutTime,
            numberOfDays: bookingDetails.numberOfDays,
            subtotal: bookingDetails.subtotal,
            serviceFee: bookingDetails.serviceFee,
            total: bookingDetails.total,
            roomImage:
              room.images && room.images.length > 0 ? room.images[0] : null,
            hostId: room.host._id,
            hostName: `${room.host.firstName} ${room.host.lastName}`,
          },
        },
      });
    }
  };

  // Format date for display
  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Handle time selection
  const handleTimeSelection = (
    timeType: 'checkin' | 'checkout',
    time: string
  ) => {
    if (timeType === 'checkin') {
      setCheckInTime(time);
    } else {
      setCheckOutTime(time);
    }
    setShowTimeSelector(null);
  };

  // Force a UI refresh after mounting to ensure unavailable dates are displayed properly
  useEffect(() => {
    console.log('[BookingPanel] Component mounted, initializing calendar');

    // Force a refresh after a short delay to ensure the calendar displays unavailable dates
    const timer = setTimeout(() => {
      console.log(
        '[BookingPanel] Refreshing unavailable dates display',
        allUnavailableDates.length
      );

      // If we have unavailable dates, log them for debugging
      if (allUnavailableDates.length > 0) {
        console.log(
          '[BookingPanel] Current unavailable dates:',
          allUnavailableDates.map((d) => d.toISOString().split('T')[0])
        );
      }

      // If we have existing bookings, log them for debugging
      if (existingBookings.length > 0) {
        console.log(
          '[BookingPanel] Current existing bookings:',
          existingBookings.map((b) => ({
            id: b._id,
            status: b.bookingStatus,
            checkIn: new Date(b.checkIn).toISOString().split('T')[0],
            checkOut: new Date(b.checkOut).toISOString().split('T')[0],
          }))
        );
      }

      // Only force a re-render if no unavailable dates exist yet
      // This prevents overwriting the dates that were already processed
      if (
        allUnavailableDates.length === 0 &&
        (unavailableDates.length > 0 || existingBookings.length > 0)
      ) {
        console.log(
          '[BookingPanel] No dates in state yet but have source data, reprocessing'
        );
        datesProcessedRef.current = false; // Force reprocessing
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="sticky top-6 bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
      {/* Price display */}
      <div className="flex items-baseline mb-6">
        <span className="text-2xl font-bold">
          ₱{room.price?.basePrice.toLocaleString()}
        </span>
        <span className="text-gray-600 dark:text-gray-400 ml-1">
          {room.type === 'stay'
            ? '/night'
            : room.type === 'conference'
            ? '/day'
            : '/event'}
        </span>
      </div>

      {/* Availability notice - always show this section */}
      <div className="mb-4 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
        <div className="flex items-start">
          <FiAlertCircle className="mt-0.5 mr-2 text-blue-500" />
          <p className="text-blue-700 dark:text-blue-400">
            This calendar shows real-time availability.
            {allUnavailableDates.length > 0 ? (
              <span>
                {' '}
                There are {allUnavailableDates.length} dates unavailable (marked
                in red).
              </span>
            ) : (
              <span> All dates are currently available for booking.</span>
            )}
          </p>
        </div>
      </div>

      {/* Booking conflicts warning */}
      {existingBookings.length > 0 && (
        <div className="mb-4 px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm">
          <div className="flex items-start">
            <FiAlertCircle className="mt-0.5 mr-2 text-yellow-500" />
            <p className="text-yellow-700 dark:text-yellow-400">
              This room has {existingBookings.length} existing{' '}
              {existingBookings.length === 1 ? 'booking' : 'bookings'}. Dates
              marked in red are already booked and cannot be selected.
              {!isAuthenticated && (
                <span className="font-medium">
                  {' '}
                  Log in to make a reservation.
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Calendar for date selection */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3 flex items-center">
          <FiCalendar className="mr-2" />
          Select Dates
        </h3>
        <div className="calendar-container dark:text-darkBlue flex justify-center">
          <Calendar
            key={calendarKey.current}
            onChange={handleDateChange}
            value={dateRange}
            selectRange={true}
            tileDisabled={tileDisabled}
            tileClassName={tileClassName}
            className="w-full border-0 rounded-lg overflow-hidden"
          />
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 space-y-1">
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-red-400 dark:bg-red-500 rounded-full mr-1"></span>
            <span>Unavailable dates ({allUnavailableDates.length})</span>
          </div>
          {userBookings && userBookings.length > 0 && (
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 bg-indigo-400 dark:bg-indigo-500 rounded-full mr-1"></span>
              <span>Your bookings for this room</span>
            </div>
          )}
        </div>
      </div>

      {/* Warning for conflicting dates */}
      {isDateRangeConflicting && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="flex items-start">
            <FiAlertCircle className="mt-0.5 mr-2 text-red-500" />
            <p className="text-red-700 dark:text-red-400 text-sm">
              Some of your selected dates are unavailable. Please choose
              different dates.
            </p>
          </div>
        </div>
      )}

      {/* Rest of the component remains unchanged */}
      {/* Time selection section - Only show for conference rooms and events spaces */}
      {allowsTimeSelection() && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3 flex items-center">
            <FiClock className="mr-2" />
            Select Times
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <TimeSelector
              label="Check-in"
              selectedTime={checkInTime}
              timeOptions={timeOptions}
              isOpen={showTimeSelector === 'checkin'}
              onToggle={() =>
                setShowTimeSelector(
                  showTimeSelector === 'checkin' ? null : 'checkin'
                )
              }
              onSelect={(time) => handleTimeSelection('checkin', time)}
            />

            <TimeSelector
              label="Check-out"
              selectedTime={checkOutTime}
              timeOptions={timeOptions}
              isOpen={showTimeSelector === 'checkout'}
              onToggle={() =>
                setShowTimeSelector(
                  showTimeSelector === 'checkout' ? null : 'checkout'
                )
              }
              onSelect={(time) => handleTimeSelection('checkout', time)}
            />
          </div>
        </div>
      )}

      {/* Room Stay info - Show fixed check-in/check-out times */}
      {!allowsTimeSelection() && room.type === 'stay' && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3 flex items-center">
            <FiClock className="mr-2" />
            Check-in/Check-out Times
          </h3>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-700 dark:text-gray-300 font-medium">
                Check-in:
              </span>
              <span className="text-gray-700 dark:text-gray-300">
                {formatTimeTo12Hour(room.houseRules?.checkInTime || '14:00')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300 font-medium">
                Check-out:
              </span>
              <span className="text-gray-700 dark:text-gray-300">
                {formatTimeTo12Hour(room.houseRules?.checkOutTime || '12:00')}
              </span>
            </div>
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Host's check-in and check-out times must be followed for Room
              Stays.
            </div>
          </div>
        </div>
      )}

      {/* Booking details */}
      {dateRange[0] && dateRange[1] && !isDateRangeConflicting ? (
        <div className="mb-6 space-y-3">
          <h3 className="text-lg font-medium">Booking Details</h3>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Check-in:</span>
            <span>
              {formatDate(dateRange[0])}{' '}
              {allowsTimeSelection() ? `at ${checkInTime}` : ''}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Check-out:</span>
            <span>
              {formatDate(dateRange[1])}{' '}
              {allowsTimeSelection() ? `at ${checkOutTime}` : ''}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Duration:</span>
            <span>
              {bookingDetails.numberOfDays}{' '}
              {bookingDetails.numberOfDays > 1 ? 'days' : 'day'}
            </span>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 my-3 pt-3">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600 dark:text-gray-400">
                {room.type === 'event' ? 'Venue fee' : 'Subtotal'}
              </span>
              <span>₱{bookingDetails.subtotal.toLocaleString()}</span>
            </div>

            <div className="flex justify-between mb-2">
              <span className="text-gray-600 dark:text-gray-400">
                Service fee (10%)
              </span>
              <span>₱{bookingDetails.serviceFee.toLocaleString()}</span>
            </div>

            <div className="flex justify-between font-bold border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
              <span>Total</span>
              <span>₱{bookingDetails.total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
          {isDateRangeConflicting
            ? 'Please select available dates'
            : 'Select dates to see booking details'}
        </div>
      )}

      {/* Book button */}
      <button
        onClick={handleBookingClick}
        className={`w-full py-3 px-4 rounded-lg font-medium transition ${
          dateRange[0] &&
          dateRange[1] &&
          !isDateRangeConflicting &&
          !isPastDateTimeError
            ? 'bg-darkBlue text-light dark:bg-light dark:text-darkBlue hover:opacity-90'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
        }`}
        disabled={
          !dateRange[0] ||
          !dateRange[1] ||
          isDateRangeConflicting ||
          isPastDateTimeError
        }>
        {!isAuthenticated
          ? 'Log in to Book'
          : isDateRangeConflicting
          ? 'Selected Dates Unavailable'
          : isPastDateTimeError
          ? 'Time Has Passed'
          : dateRange[0] && dateRange[1]
          ? 'Book Now'
          : 'Select Dates to Book'}
      </button>

      {/* Reservation note - modified to show login message if not authenticated */}
      {dateRange[0] &&
        dateRange[1] &&
        !isDateRangeConflicting &&
        !isPastDateTimeError && (
          <p className="text-center mt-2 text-xs text-gray-500 dark:text-gray-400">
            {isAuthenticated
              ? "You won't be charged until confirmation"
              : 'Please log in or create an account to book this space'}
          </p>
        )}

      {/* Show login prompt if not authenticated */}
      {!isAuthenticated && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
          <p className="text-sm text-center text-blue-600 dark:text-blue-300">
            <Link
              to={`/auth/login?redirect=/rooms/${roomId}`}
              className="font-medium hover:underline">
              Log in
            </Link>{' '}
            or{' '}
            <Link to="/auth/register" className="font-medium hover:underline">
              Sign up
            </Link>{' '}
            to book this space
          </p>
        </div>
      )}

      {/* Background overlay for when time selector is open */}
      {showTimeSelector && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => setShowTimeSelector(null)}
        />
      )}
    </div>
  );
};

export default BookingPanel;
