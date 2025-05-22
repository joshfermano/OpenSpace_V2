import {
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiCreditCard,
} from 'react-icons/fi';
import { Booking } from '../types/booking';

// Format date for display
export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

// Calculate booking duration in days/hours based on room type
export const calculateDuration = (booking: Booking) => {
  const checkIn = new Date(booking.checkIn);
  const checkOut = new Date(booking.checkOut);
  const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());

  if (booking.room.type === 'conference') {
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'}`;
  } else {
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} ${diffDays === 1 ? 'night' : 'nights'}`;
  }
};

// Get status display with appropriate icon and color
export const getStatusDisplay = (status: string) => {
  switch (status) {
    case 'confirmed':
      return {
        icon: <FiCheckCircle className="mr-1" />,
        text: 'Confirmed',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        textColor: 'text-green-700 dark:text-green-400',
      };
    case 'pending':
      return {
        icon: <FiAlertCircle className="mr-1" />,
        text: 'Pending',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
        textColor: 'text-yellow-700 dark:text-yellow-400',
      };
    case 'cancelled':
      return {
        icon: <FiXCircle className="mr-1" />,
        text: 'Cancelled',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        textColor: 'text-red-700 dark:text-red-400',
      };
    case 'rejected':
      return {
        icon: <FiXCircle className="mr-1" />,
        text: 'Rejected',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        textColor: 'text-red-700 dark:text-red-400',
      };
    case 'completed':
      return {
        icon: <FiCheckCircle className="mr-1" />,
        text: 'Completed',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        textColor: 'text-blue-700 dark:text-blue-400',
      };
    default:
      return {
        icon: <FiAlertCircle className="mr-1" />,
        text: status,
        bgColor: 'bg-gray-100 dark:bg-gray-800',
        textColor: 'text-gray-600 dark:text-gray-400',
      };
  }
};

// Get payment status display
export const getPaymentStatusDisplay = (
  paymentStatus: string,
  paymentMethod: string
) => {
  if (paymentStatus === 'paid') {
    return {
      icon: <FiCheckCircle className="mr-1" />,
      text: 'Paid',
      color: 'text-green-600 dark:text-green-400',
    };
  } else if (paymentStatus === 'refunded') {
    return {
      icon: <FiCreditCard className="mr-1" />,
      text: 'Refunded',
      color: 'text-blue-600 dark:text-blue-400',
    };
  } else if (paymentStatus === 'cancelled') {
    return {
      icon: <FiXCircle className="mr-1" />,
      text: 'Cancelled',
      color: 'text-red-600 dark:text-red-400',
    };
  } else if (paymentStatus === 'pending' && paymentMethod === 'property') {
    return {
      icon: <FiAlertCircle className="mr-1" />,
      text: 'Pay at Property',
      color: 'text-amber-600 dark:text-amber-400',
    };
  } else {
    return {
      icon: <FiAlertCircle className="mr-1" />,
      text: 'Pending',
      color: 'text-gray-600 dark:text-gray-400',
    };
  }
};

export const formatTimeTo12Hour = (
  timeString: string | undefined | null
): string => {
  if (!timeString) {
    return '';
  }

  if (timeString.includes('AM') || timeString.includes('PM')) {
    return timeString;
  }

  const parts = timeString.split(':');
  if (parts.length < 2) {
    return timeString;
  }

  let hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes)) {
    return timeString;
  }

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;

  const minutesStr = minutes < 10 ? '0' + minutes : minutes.toString();

  return `${hours}:${minutesStr} ${ampm}`;
};
