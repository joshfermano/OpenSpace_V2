import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Booking from '../models/Booking';
import Room from '../models/Room';
import User from '../models/User';
import Earning from '../models/Earnings';

type AuthRequest = Request;

export const getAllBookings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (req.query.status) {
      filter.bookingStatus = req.query.status;
    }

    const bookings = await Booking.find(filter)
      .populate('room', 'title images location type')
      .populate('user', 'firstName lastName email')
      .populate('host', 'firstName lastName email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Booking.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: bookings.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: bookings,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
      error: error.message,
    });
  }
};

export const updateBookingStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const { status, reason } = req.body;

    // Validate status
    const validStatuses = [
      'pending',
      'confirmed',
      'completed',
      'cancelled',
      'rejected',
    ];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: 'Invalid booking status',
      });
      return;
    }

    // Find booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
      return;
    }

    // Update status
    booking.bookingStatus = status;

    // Handle cancellation details if status is cancelled or rejected
    if (['cancelled', 'rejected'].includes(status)) {
      booking.cancellationDetails = {
        cancelledAt: new Date(),
        cancelledBy: 'admin',
        reason: reason || 'Administrative action',
      };
    }

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking status updated successfully',
      data: booking,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating booking status',
      error: error.message,
    });
  }
};

export const deleteBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { bookingId } = req.params;

    // Check if booking exists
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
      return;
    }

    // Check if booking can be safely deleted
    if (booking.bookingStatus === 'confirmed') {
      res.status(400).json({
        success: false,
        message: 'Cannot delete a confirmed booking',
      });
      return;
    }

    // Delete booking
    await Booking.findByIdAndDelete(bookingId);

    res.status(200).json({
      success: true,
      message: 'Booking deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error deleting booking',
      error: error.message,
    });
  }
};

export const createBooking = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;
    const {
      roomId,
      checkIn,
      checkOut,
      checkInTime,
      checkOutTime,
      guests,
      totalPrice,
      priceBreakdown,
      specialRequests,
      paymentMethod,
    } = req.body;

    // Convert times to 24-hour format for storage
    const normalizedCheckInTime = convertTo24HourFormat(
      checkInTime || '2:00 PM'
    );
    const normalizedCheckOutTime = convertTo24HourFormat(
      checkOutTime || '12:00 PM'
    );

    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found',
      });
      return;
    }

    // Check if dates are available
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // Normalize dates for comparison by setting time to midnight
    checkInDate.setHours(0, 0, 0, 0);
    checkOutDate.setHours(0, 0, 0, 0);

    // Check if dates are valid
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Invalid date format',
      });
      return;
    }

    if (checkInDate > checkOutDate) {
      res.status(400).json({
        success: false,
        message: 'Check-in date must be before check-out date',
      });
      return;
    }

    // Check for overlapping bookings
    const existingBookings = await Booking.find({
      room: roomId,
      bookingStatus: { $in: ['pending', 'confirmed'] },
      $or: [
        {
          $and: [
            { checkIn: { $lte: checkOutDate } },
            { checkOut: { $gte: checkInDate } },
          ],
        },
      ],
    });

    if (existingBookings.length > 0) {
      res.status(409).json({
        success: false,
        message: 'Selected dates are not available',
        overlappingBookings: existingBookings.map((booking) => ({
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
        })),
      });
      return;
    }

    // Check if the dates are blocked by the host
    let currentDate = new Date(checkInDate);
    while (currentDate <= checkOutDate) {
      const isBlocked = room.availability.unavailableDates.some(
        (blockedDate) => {
          const date = new Date(blockedDate);
          date.setHours(0, 0, 0, 0);
          return (
            date.getFullYear() === currentDate.getFullYear() &&
            date.getMonth() === currentDate.getMonth() &&
            date.getDate() === currentDate.getDate()
          );
        }
      );

      if (isBlocked) {
        res.status(409).json({
          success: false,
          message: `Date ${
            currentDate.toISOString().split('T')[0]
          } is not available`,
        });
        return;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate cancellation deadline (24 hours before check-in)
    const cancellationDeadline = new Date(checkInDate);
    cancellationDeadline.setHours(cancellationDeadline.getHours() - 24);

    const bookingData = {
      room: roomId,
      user: userId,
      host: room.host,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      checkInTime: normalizedCheckInTime,
      checkOutTime: normalizedCheckOutTime,
      guests,
      totalPrice,
      priceBreakdown,
      specialRequests,
      paymentMethod: paymentMethod || 'property',
      paymentStatus: 'pending',
      bookingStatus: 'pending',
      cancellationDeadline,
      isCancellable: new Date() < cancellationDeadline,
    };

    const newBooking = await Booking.create(bookingData);

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: {
        ...newBooking.toObject(),
        checkInTime: convertTo12HourFormat(normalizedCheckInTime),
        checkOutTime: convertTo12HourFormat(normalizedCheckOutTime),
      },
    });
  } catch (error: any) {
    console.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating booking',
      error: error.message,
    });
  }
};

// Helper function to convert 12-hour time format to 24-hour format
function convertTo24HourFormat(time: string): string {
  // If already in 24-hour format (no AM/PM), return as is
  if (!time.includes('AM') && !time.includes('PM')) {
    return time;
  }

  try {
    const isPM = time.toUpperCase().includes('PM');
    const timeWithoutAmPm = time.replace(/am|pm/i, '').trim();
    const [hoursStr, minutes] = timeWithoutAmPm.split(':');
    let hours = parseInt(hoursStr, 10);

    if (isPM && hours !== 12) {
      hours += 12;
    } else if (!isPM && hours === 12) {
      hours = 0;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  } catch (error) {
    console.error('Error converting time format:', error);
    return time; // Return original if conversion fails
  }
}

// Helper function to convert 24-hour time format to 12-hour format
function convertTo12HourFormat(time: string): string {
  // If already in 12-hour format (contains AM/PM), return as is
  if (time.includes('AM') || time.includes('PM')) {
    return time;
  }

  try {
    // Convert from 24h to 12h format
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);

    if (hour === 0) {
      return `12:${minutes} AM`;
    } else if (hour < 12) {
      return `${hour}:${minutes} AM`;
    } else if (hour === 12) {
      return `12:${minutes} PM`;
    } else {
      return `${hour - 12}:${minutes} PM`;
    }
  } catch (error) {
    console.error('Error converting time format:', error);
    return time; // Return original if conversion fails
  }
}

export const processPayment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    console.log('Payment request received:', req.body);
    const { bookingId, paymentMethod, cardDetails, mobilePaymentDetails } =
      req.body;

    const userId = req.user.id;

    // Validate booking ID
    if (!bookingId) {
      res.status(400).json({
        success: false,
        message: 'Booking ID is required',
      });
      return;
    }

    // Check if payment method is provided
    if (!paymentMethod) {
      res.status(400).json({
        success: false,
        message: 'Payment method is required',
      });
      return;
    }

    // Check if booking exists and belongs to the user
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
      return;
    }

    // Verify booking belongs to the user
    if (booking.user.toString() !== userId) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to process payment for this booking',
      });
      return;
    }

    // Check if booking is pending payment
    if (booking.paymentStatus !== 'pending') {
      res.status(400).json({
        success: false,
        message: `Payment already ${booking.paymentStatus}`,
      });
      return;
    }

    // Payment details object to store in the database
    const paymentDetails: any = {
      paymentDate: new Date(),
      amount: booking.totalPrice,
    };

    switch (paymentMethod) {
      case 'card':
        if (!cardDetails) {
          res.status(400).json({
            success: false,
            message: 'Card details are required for card payment',
          });
          return;
        }

        const { cardNumber, expiryDate, cvv, cardholderName } = cardDetails;

        // Validate card details
        if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
          res.status(400).json({
            success: false,
            message: 'All card details are required',
          });
          return;
        }

        // Validate card number
        const isValidCard = simpleCardValidation(cardNumber);
        if (!isValidCard) {
          res.status(400).json({
            success: false,
            message: 'Invalid card number',
          });
          return;
        }

        const [month, year] = expiryDate.split('/');
        const currentYear = new Date().getFullYear() % 100;
        const currentMonth = new Date().getMonth() + 1;

        if (
          !/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiryDate) ||
          parseInt(year) < currentYear ||
          (parseInt(year) === currentYear && parseInt(month) < currentMonth)
        ) {
          res.status(400).json({
            success: false,
            message: 'Invalid or expired card',
          });
          return;
        }

        // Validate CVV
        if (!/^\d{3,4}$/.test(cvv)) {
          res.status(400).json({
            success: false,
            message: 'Invalid CVV',
          });
          return;
        }

        paymentDetails.cardLast4 = cardNumber.slice(-4);
        paymentDetails.cardholderName = cardholderName;
        break;

      case 'gcash':
      case 'maya':
        if (!mobilePaymentDetails || !mobilePaymentDetails.mobileNumber) {
          res.status(400).json({
            success: false,
            message: 'Mobile number is required for mobile payment methods',
          });
          return;
        }

        // Validate mobile number for Philippine mobile services
        const mobileNumberPattern = /^09\d{9}$/;
        if (!mobileNumberPattern.test(mobilePaymentDetails.mobileNumber)) {
          res.status(400).json({
            success: false,
            message: 'Invalid mobile number format. Must be 09XXXXXXXXX',
          });
          return;
        }

        paymentDetails.phoneNumber = mobilePaymentDetails.mobileNumber;
        paymentDetails.provider = paymentMethod;
        break;

      case 'property':
        paymentDetails.paymentLocation = 'property';
        break;

      default:
        res.status(400).json({
          success: false,
          message: 'Unsupported payment method',
        });
        return;
    }

    // Update booking
    booking.paymentMethod = paymentMethod;
    booking.paymentStatus = paymentMethod === 'property' ? 'pending' : 'paid';
    booking.bookingStatus =
      paymentMethod === 'property' ? 'pending' : 'confirmed';
    booking.paymentDetails = paymentDetails;

    await booking.save();

    if (booking.paymentStatus === 'paid') {
      await createEarningRecord(booking);
    }

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        bookingId: booking._id,
        paymentMethod: booking.paymentMethod,
        paymentStatus: booking.paymentStatus,
        bookingStatus: booking.bookingStatus,
      },
    });
  } catch (error: any) {
    console.error('Payment processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing payment',
      error: error.message,
    });
  }
};

const simpleCardValidation = (cardNumber: string): boolean => {
  // Remove spaces and dashes
  const cleanedNumber = cardNumber.replace(/[\s-]/g, '');

  if (!/^\d{16}$/.test(cleanedNumber)) {
    return false;
  }

  // Luhn algorithm (mod 10)
  let sum = 0;
  let isEven = false;

  for (let i = cleanedNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanedNumber.charAt(i));

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
};

const createEarningRecord = async (booking: any): Promise<any> => {
  try {
    const hostEarningPercentage = 0.8; // Host gets 80%
    const platformFeePercentage = 0.2; // Platform fee is 20%

    const amount = booking.totalPrice;
    const platformFee = amount * platformFeePercentage;
    const hostPayout = amount * hostEarningPercentage;

    // Set the status and date based on payment method
    let status = 'pending';
    let availableDate = new Date();

    if (['card', 'gcash', 'maya'].includes(booking.paymentMethod)) {
      status = 'available';
      availableDate = new Date(); // Available immediately
    } else if (booking.paymentMethod === 'property') {
      status = 'pending';
      availableDate = new Date();
      availableDate.setFullYear(availableDate.getFullYear() + 1);
    }

    // Check if an earnings record already exists (avoid duplicates)
    const existingEarning = await Earning.findOne({ booking: booking._id });

    if (existingEarning) {
      console.log(`Earnings record already exists for booking ${booking._id}`);
      return existingEarning;
    }

    // Create the earnings record
    const earningRecord = await Earning.create({
      host: booking.host,
      booking: booking._id,
      amount,
      platformFee,
      hostPayout,
      status,
      paymentMethod: booking.paymentMethod,
      availableDate,
    });

    console.log(
      `Earnings record created for host ${booking.host} - Amount: ${hostPayout}, Status: ${status}`
    );

    return earningRecord;
  } catch (error) {
    console.error('Error creating earnings record:', error);
  }
};

// Cancel booking
export const cancelBooking = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    // Check if booking exists
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
      return;
    }

    // Check if user is authorized (user who booked, host, or admin)
    const isGuest = booking.user.toString() === userId;
    const isHost = booking.host.toString() === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isGuest && !isHost && !isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking',
      });
      return;
    }

    // Check if booking can be cancelled
    if (!booking.isCancellable && !isAdmin) {
      res.status(400).json({
        success: false,
        message: 'This booking cannot be cancelled',
      });
      return;
    }

    // Check if booking is already cancelled or completed
    if (['cancelled', 'completed'].includes(booking.bookingStatus)) {
      res.status(400).json({
        success: false,
        message: `Booking is already ${booking.bookingStatus}`,
      });
      return;
    }

    // Determine the canceller role
    let cancelledBy: 'user' | 'host' | 'admin' = 'user';
    if (isHost) cancelledBy = 'host';
    if (isAdmin) cancelledBy = 'admin';

    // Calculate refund amount based on cancellation policy
    let refundAmount = 0;
    const now = new Date();
    const checkIn = new Date(booking.checkIn);
    const timeDifference = checkIn.getTime() - now.getTime();
    const daysBeforeCheckIn = timeDifference / (1000 * 60 * 60 * 24);

    // Example cancellation policy
    if (booking.paymentStatus === 'paid') {
      if (cancelledBy === 'host' || cancelledBy === 'admin') {
        // Full refund if cancelled by host or admin
        refundAmount = booking.totalPrice;
      } else if (daysBeforeCheckIn >= 7) {
        // Full refund if cancelled 7+ days before check-in
        refundAmount = booking.totalPrice;
      } else if (daysBeforeCheckIn >= 3) {
        // 50% refund if cancelled 3-7 days before check-in
        refundAmount = booking.totalPrice * 0.5;
      }
      // No refund if cancelled less than 3 days before check-in
    }

    // Update booking
    booking.bookingStatus = 'cancelled';
    booking.cancellationDetails = {
      cancelledAt: new Date(),
      cancelledBy,
      reason: reason || 'No reason provided',
      refundAmount,
    };

    // If there was a payment and refund is due, update payment status
    if (booking.paymentStatus === 'paid' && refundAmount > 0) {
      booking.paymentStatus = 'refunded';
      booking.refunds = [
        {
          amount: refundAmount,
          date: new Date(),
          reason: 'Booking cancellation',
          processedBy: isAdmin
            ? new mongoose.Types.ObjectId(userId)
            : undefined,
        },
      ];
    }

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: {
        bookingId: booking._id,
        bookingStatus: booking.bookingStatus,
        cancellationDetails: booking.cancellationDetails,
        refundAmount,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error cancelling booking',
      error: error.message,
    });
  }
};

// Get booking by ID
export const getBookingById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    const booking = await Booking.findById(bookingId)
      .populate('room', 'title images location type price houseRules')
      .populate('user', 'firstName lastName email phoneNumber profileImage')
      .populate('host', 'firstName lastName email phoneNumber profileImage');

    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
      return;
    }

    // Check if user is authorized (user who booked, host, or admin)
    const isGuest = booking.user._id.toString() === userId;
    const isHost = booking.host._id.toString() === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isGuest && !isHost && !isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching booking',
      error: error.message,
    });
  }
};

// Get user bookings
export const getUserBookings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: Record<string, any> = { user: userId };
    if (status) filter.bookingStatus = status;

    // Get bookings
    const bookings = await Booking.find(filter)
      .populate('room', 'title images location type')
      .populate('host', 'firstName lastName profileImage')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Booking.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: bookings.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: bookings,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user bookings',
      error: error.message,
    });
  }
};

// Get host bookings
export const getHostBookings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    // Check if user is a host
    const user = await User.findById(userId);
    if (!user || user.role !== 'host') {
      res.status(403).json({
        success: false,
        message: 'Only hosts can access their bookings',
      });
      return;
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: Record<string, any> = { host: userId };
    if (status) filter.bookingStatus = status;

    // Get bookings
    const bookings = await Booking.find(filter)
      .populate('room', 'title images location type')
      .populate('user', 'firstName lastName profileImage')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Booking.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: bookings.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: bookings,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching host bookings',
      error: error.message,
    });
  }
};

// Check if user can review a room
export const canReviewRoom = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;
    const { roomId } = req.params;

    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found',
      });
      return;
    }

    // Find completed bookings for this room and user
    const bookings = await Booking.find({
      room: roomId,
      user: userId,
      bookingStatus: 'completed',
    });

    // User can review if they have at least one completed booking
    const canReview = bookings.length > 0;

    // Check if user has already reviewed this room
    const alreadyReviewed = bookings.some((booking) => booking.reviewId);

    res.status(200).json({
      success: true,
      data: {
        canReview,
        alreadyReviewed,
        completedBookings: bookings.map((booking) => booking._id),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error checking review eligibility',
      error: error.message,
    });
  }
};

export const confirmBooking = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
      return;
    }

    // Check if user is the host of this booking
    if (booking.host.toString() !== userId && req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to confirm this booking',
      });
      return;
    }

    // Check if booking can be confirmed
    if (booking.bookingStatus !== 'pending') {
      res.status(400).json({
        success: false,
        message: `Cannot confirm a booking with status: ${booking.bookingStatus}`,
      });
      return;
    }

    // Update booking status
    booking.bookingStatus = 'confirmed';
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking confirmed successfully',
      data: booking,
    });
  } catch (error: any) {
    console.error('Error confirming booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error confirming booking',
      error: error.message,
    });
  }
};

export const completeBooking = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
      return;
    }

    // Check if user is the host of this booking
    if (booking.host.toString() !== userId && req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to complete this booking',
      });
      return;
    }

    // Check if booking can be completed
    if (booking.bookingStatus !== 'confirmed') {
      res.status(400).json({
        success: false,
        message: `Cannot complete a booking with status: ${booking.bookingStatus}`,
      });
      return;
    }

    // Check if checkout date has passed
    const checkOutDate = new Date(booking.checkOut);
    const currentDate = new Date();

    // Allow completion on checkout day or after
    if (currentDate < checkOutDate) {
      // If we're not on checkout day yet, don't allow completion unless admin
      if (req.user.role !== 'admin') {
        res.status(400).json({
          success: false,
          message: 'Cannot complete booking before checkout date',
        });
        return;
      }
    }

    // Update booking status
    booking.bookingStatus = 'completed';
    await booking.save();

    // Update earning record if exists
    await Earning.updateOne({ booking: bookingId }, { status: 'ready' });

    res.status(200).json({
      success: true,
      message: 'Booking marked as completed',
      data: booking,
    });
  } catch (error: any) {
    console.error('Error completing booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing booking',
      error: error.message,
    });
  }
};

export const rejectBooking = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    // Check if booking exists
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
      return;
    }

    // Check if user is authorized (host or admin)
    const isHost = booking.host.toString() === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isHost && !isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to reject this booking',
      });
      return;
    }

    // Check if booking can be rejected (must be in pending status)
    if (booking.bookingStatus !== 'pending') {
      res.status(400).json({
        success: false,
        message: `Cannot reject a booking with status: ${booking.bookingStatus}`,
      });
      return;
    }

    // Update booking status
    booking.bookingStatus = 'rejected';
    booking.cancellationDetails = {
      cancelledAt: new Date(),
      cancelledBy: isAdmin ? 'admin' : 'host',
      reason: reason || 'Booking rejected by host',
    };

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking rejected successfully',
      data: booking,
    });
  } catch (error: any) {
    console.error('Error rejecting booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting booking',
      error: error.message,
    });
  }
};

export const markPaymentReceived = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
      return;
    }

    // Check if user is the host of this booking or an admin
    if (booking.host.toString() !== userId && req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to mark payment as received for this booking',
      });
      return;
    }

    // Check if booking payment can be marked as received
    if (
      booking.paymentStatus !== 'pending' ||
      booking.paymentMethod !== 'property'
    ) {
      res.status(400).json({
        success: false,
        message: `Cannot mark payment as received for a booking with status: ${booking.paymentStatus} and method: ${booking.paymentMethod}`,
      });
      return;
    }

    // Update booking payment status
    booking.paymentStatus = 'paid';
    booking.bookingStatus = 'confirmed';
    booking.paymentDetails = {
      ...booking.paymentDetails,
      paymentDate: new Date(),
      amount: booking.totalPrice,
      recordedBy: new mongoose.Types.ObjectId(userId),
    };

    await booking.save();

    // Create earning record for the host
    await createEarningRecord(booking);

    res.status(200).json({
      success: true,
      message: 'Payment marked as received successfully',
      data: booking,
    });
  } catch (error: any) {
    console.error('Error marking payment as received:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking payment as received',
      error: error.message,
    });
  }
};

export const canCancelBooking = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
      return;
    }

    // Check if user is authorized to view this booking
    const isGuest = booking.user.toString() === userId;
    const isHost = booking.host.toString() === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isGuest && !isHost && !isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking',
      });
      return;
    }

    // Check cancellation conditions
    const canCancel =
      // Not already cancelled or completed
      !['cancelled', 'completed', 'rejected'].includes(booking.bookingStatus) &&
      // Admin can always cancel
      (isAdmin ||
        // Host can cancel pending bookings
        (isHost && booking.bookingStatus === 'pending') ||
        // Guest can cancel based on booking policy
        (isGuest && booking.isCancellable));

    // Calculate potential refund amount
    let refundAmount = 0;
    if (booking.paymentStatus === 'paid' && canCancel) {
      const now = new Date();
      const checkIn = new Date(booking.checkIn);
      const timeDifference = checkIn.getTime() - now.getTime();
      const daysBeforeCheckIn = timeDifference / (1000 * 60 * 60 * 24);

      if (isHost || isAdmin) {
        // Full refund if cancelled by host or admin
        refundAmount = booking.totalPrice;
      } else if (daysBeforeCheckIn >= 7) {
        // Full refund if cancelled 7+ days before check-in
        refundAmount = booking.totalPrice;
      } else if (daysBeforeCheckIn >= 3) {
        // 50% refund if cancelled 3-7 days before check-in
        refundAmount = booking.totalPrice * 0.5;
      }
      // No refund if cancelled less than 3 days before check-in
    }

    res.status(200).json({
      success: true,
      data: {
        canCancel,
        refundAmount,
        refundPercentage:
          refundAmount > 0
            ? Math.round((refundAmount / booking.totalPrice) * 100)
            : 0,
        reason: !canCancel
          ? ['cancelled', 'completed', 'rejected'].includes(
              booking.bookingStatus
            )
            ? `Booking is already ${booking.bookingStatus}`
            : 'This booking cannot be cancelled according to the cancellation policy'
          : undefined,
      },
    });
  } catch (error: any) {
    console.error('Error checking cancellation eligibility:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking if booking can be cancelled',
      error: error.message,
    });
  }
};

export const sendReceiptEmail = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;
    const { recipientEmail, receiptDetails } = req.body;

    // Check if booking exists
    const booking = await Booking.findById(bookingId)
      .populate('room', 'title images location')
      .populate('user', 'firstName lastName email');

    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
      return;
    }

    // Verify the user is authorized to access this booking
    if (booking.user._id.toString() !== userId && req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to send receipt for this booking',
      });
      return;
    }

    const user = booking.user as any; // Cast to any to access populated fields
    const email = recipientEmail || user.email;

    let receipt;
    if (receiptDetails) {
      receipt = receiptDetails;
    } else {
      // Format check-in and check-out dates
      const checkInDate = new Date(booking.checkIn);
      const checkOutDate = new Date(booking.checkOut);

      // Calculate number of nights
      const nightsCount = Math.ceil(
        (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const user = booking.user as any; // Cast to 'any' to access firstName and lastName

      receipt = {
        referenceNumber: booking._id.toString().slice(-8).toUpperCase(),
        bookingDetails: {
          bookingId: booking._id,
          propertyName: (booking.room as any).title,
          checkInDate: checkInDate.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }),
          checkOutDate: checkOutDate.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }),
          checkInTime: '3:00 PM', // Default time or from room.checkInTime
          checkOutTime: '12:00 PM', // Default time or from room.checkOutTime
          guestCount: booking.guests,
          guestName: `${user.firstName} ${user.lastName}`,
          totalPrice: booking.totalPrice,
          priceBreakdown: booking.priceBreakdown,
          nightsCount,
          specialRequests: booking.specialRequests,
        },
        paymentMethod: booking.paymentMethod,
        paymentStatus: booking.paymentStatus,
        date: new Date().toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
        time: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
    }

    // Import at the top of the file
    const { sendBookingReceiptEmail } = await import(
      '../services/emailService'
    );

    // Send the receipt email
    await sendBookingReceiptEmail(email, receipt);

    res.status(200).json({
      success: true,
      message: `Receipt sent to ${email} successfully`,
    });
  } catch (error: any) {
    console.error('Error sending receipt email:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending receipt email',
      error: error.message,
    });
  }
};
