import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Earning from '../models/Earnings';
import User from '../models/User';
import Booking from '../models/Booking';
import { v4 as uuidv4 } from 'uuid';
import { createPlatformFeeRemittance } from './platformFeeRemittanceController';

type AuthRequest = Request;

export const getHostEarnings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user || user.role !== 'host') {
      res.status(403).json({
        success: false,
        message: 'Only hosts can access earnings',
      });
      return;
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Filter by status if provided
    const filter: Record<string, any> = { host: userId };
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Get earnings
    const earnings = await Earning.find(filter)
      .populate({
        path: 'booking',
        select: 'checkIn checkOut totalPrice bookingStatus paymentMethod',
        populate: {
          path: 'room',
          select: 'title images',
        },
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Earning.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: earnings.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: earnings,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching earnings',
      error: error.message,
    });
  }
};

// Get earnings summary
export const getEarningsSummary = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }
    const userId = req.user.id;

    // Check if user is a host
    const user = await User.findById(userId);
    if (!user || user.role !== 'host') {
      res.status(403).json({
        success: false,
        message: 'Only hosts can access earnings summary',
      });
      return;
    }

    // Calculate total earnings
    const totalEarnings = await Earning.aggregate([
      { $match: { host: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: '$hostPayout' } } },
    ]);

    // Calculate available earnings (not yet paid out)
    const availableEarnings = await Earning.aggregate([
      {
        $match: {
          host: new mongoose.Types.ObjectId(userId),
          status: 'available',
        },
      },
      { $group: { _id: null, total: { $sum: '$hostPayout' } } },
    ]);

    // Calculate pending earnings
    const pendingEarnings = await Earning.aggregate([
      {
        $match: {
          host: new mongoose.Types.ObjectId(userId),
          status: 'pending',
        },
      },
      { $group: { _id: null, total: { $sum: '$hostPayout' } } },
    ]);

    // Calculate paid out earnings
    const paidOutEarnings = await Earning.aggregate([
      {
        $match: {
          host: new mongoose.Types.ObjectId(userId),
          status: 'paid_out',
        },
      },
      { $group: { _id: null, total: { $sum: '$hostPayout' } } },
    ]);

    // Get latest payout information
    const latestPayout = await Earning.findOne({
      host: userId,
      status: 'paid_out',
      paidOutAt: { $exists: true },
    })
      .sort({ paidOutAt: -1 })
      .limit(1);

    // Get earnings by month (for chart data)
    const monthlyEarnings = await Earning.aggregate([
      { $match: { host: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          total: { $sum: '$hostPayout' },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }, // Last 12 months
    ]);

    // Format monthly data for easier consumption by frontend
    const formattedMonthlyEarnings = monthlyEarnings.map((item) => ({
      year: item._id.year,
      month: item._id.month,
      total: item.total,
    }));

    res.status(200).json({
      success: true,
      data: {
        total: totalEarnings.length > 0 ? totalEarnings[0].total : 0,
        available:
          availableEarnings.length > 0 ? availableEarnings[0].total : 0,
        pending: pendingEarnings.length > 0 ? pendingEarnings[0].total : 0,
        paidOut: paidOutEarnings.length > 0 ? paidOutEarnings[0].total : 0,
        lastPayout: latestPayout ? latestPayout.hostPayout : 0,
        lastPayoutDate: latestPayout ? latestPayout.paidOutAt : null,
        monthly: formattedMonthlyEarnings,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching earnings summary',
      error: error.message,
    });
  }
};

// Mark booking as completed and convert pending earnings to available
export const markBookingCompleted = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }
    const userId = req.user.id;
    const { bookingId } = req.params;

    // Check if user is a host
    const user = await User.findById(userId);
    if (!user || user.role !== 'host') {
      res.status(403).json({
        success: false,
        message: 'Only hosts can mark bookings as completed',
      });
      return;
    }

    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
      return;
    }

    // Verify ownership
    if (booking.host.toString() !== userId) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to manage this booking',
      });
      return;
    }

    // Check if booking is in confirmed status
    if (booking.bookingStatus !== 'confirmed') {
      res.status(400).json({
        success: false,
        message: `Cannot mark a booking with status '${booking.bookingStatus}' as completed`,
      });
      return;
    }

    // Update booking status
    booking.bookingStatus = 'completed';
    await booking.save();

    // Find related earnings record
    const earnings = await Earning.findOne({
      booking: bookingId,
      host: userId,
    });

    if (earnings) {
      if (booking.paymentMethod === 'property') {
        earnings.status = 'available';
        earnings.availableDate = new Date();
        await earnings.save();

        try {
          await createPlatformFeeRemittance(
            booking.host.toString(),
            String(earnings._id),
            String(booking._id),
            earnings.platformFee
          );
          console.log(
            `Platform fee remittance created for completed booking ${booking._id}`
          );
        } catch (error) {
          console.error('Error creating platform fee remittance:', error);
          // Don't fail the whole operation if remittance creation fails
        }
      }

      res.status(200).json({
        success: true,
        message: 'Booking marked as completed successfully',
        data: {
          booking,
          earnings,
        },
      });
    } else {
      // If no earning record exists (unusual), create one
      const hostEarningPercentage = 0.8;
      const platformFeePercentage = 0.2;
      const amount = booking.totalPrice;
      const platformFee = amount * platformFeePercentage;
      const hostPayout = amount * hostEarningPercentage;

      const newEarnings = await Earning.create({
        host: booking.host,
        booking: booking._id,
        amount,
        platformFee,
        hostPayout,
        status: 'available',
        paymentMethod: booking.paymentMethod,
        availableDate: new Date(),
      });

      // Create platform fee remittance for pay-at-property bookings
      if (booking.paymentMethod === 'property') {
        try {
          await createPlatformFeeRemittance(
            booking.host.toString(),
            String(newEarnings._id),
            String(booking._id),
            newEarnings.platformFee
          );
          console.log(
            `Platform fee remittance created for completed booking ${booking._id}`
          );
        } catch (error) {
          console.error('Error creating platform fee remittance:', error);
          // Don't fail the whole operation if remittance creation fails
        }
      }

      res.status(200).json({
        success: true,
        message: 'Booking marked as completed and earnings created',
        data: {
          booking,
          earnings: newEarnings,
        },
      });
    }
  } catch (error: any) {
    console.error('Error marking booking as completed:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking booking as completed',
      error: error.message,
    });
  }
};

// Process withdrawal request
export const processWithdrawal = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }
    const userId = req.user.id;
    const { amount, method, accountDetails } = req.body;

    // Check if user is a host
    const user = await User.findById(userId);
    if (!user || user.role !== 'host') {
      res.status(403).json({
        success: false,
        message: 'Only hosts can withdraw earnings',
      });
      return;
    }

    // Validate request data
    if (!amount || amount <= 0) {
      res.status(400).json({
        success: false,
        message: 'Valid withdrawal amount is required',
      });
      return;
    }

    if (!method || !['card', 'gcash', 'maya'].includes(method)) {
      res.status(400).json({
        success: false,
        message: 'Valid withdrawal method is required (card, gcash, maya)',
      });
      return;
    }

    if (!accountDetails) {
      res.status(400).json({
        success: false,
        message: 'Account details are required for withdrawal',
      });
      return;
    }

    // Validate method-specific details
    if (method === 'card') {
      const { cardNumber, expiryDate, cvv, cardholderName } = accountDetails;

      if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
        res.status(400).json({
          success: false,
          message: 'All card details are required',
        });
        return;
      }

      // Validate card number (simple 16-digit check)
      const cleanedCardNumber = cardNumber.replace(/\s|-/g, '');
      if (!/^\d{16}$/.test(cleanedCardNumber)) {
        res.status(400).json({
          success: false,
          message: 'Invalid card number format',
        });
        return;
      }

      // Validate expiry date (MM/YY format)
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiryDate)) {
        res.status(400).json({
          success: false,
          message: 'Invalid expiry date format (MM/YY required)',
        });
        return;
      }

      // Validate CVV (3-4 digits)
      if (!/^\d{3,4}$/.test(cvv)) {
        res.status(400).json({
          success: false,
          message: 'Invalid CVV format',
        });
        return;
      }
    } else if (['gcash', 'maya'].includes(method)) {
      const { mobileNumber } = accountDetails;

      if (!mobileNumber) {
        res.status(400).json({
          success: false,
          message: 'Mobile number is required',
        });
        return;
      }

      // Validate Philippine mobile number format (09XXXXXXXXX)
      if (!/^09\d{9}$/.test(mobileNumber)) {
        res.status(400).json({
          success: false,
          message: 'Invalid mobile number format. Must be 09XXXXXXXXX',
        });
        return;
      }
    }

    // Check if user has enough available balance
    const availableEarnings = await Earning.aggregate([
      {
        $match: {
          host: new mongoose.Types.ObjectId(userId),
          status: 'available',
        },
      },
      { $group: { _id: null, total: { $sum: '$hostPayout' } } },
    ]);

    const availableBalance =
      availableEarnings.length > 0 ? availableEarnings[0].total : 0;

    if (amount > availableBalance) {
      res.status(400).json({
        success: false,
        message: `Insufficient funds. Available balance: ₱${availableBalance.toFixed(
          2
        )}`,
      });
      return;
    }

    // Process the withdrawal
    // Find earnings to process, starting from the oldest
    const earningsToProcess = await Earning.find({
      host: userId,
      status: 'available',
    }).sort({ availableDate: 1 });

    let remainingAmount = amount;
    const processedEarningIds: mongoose.Types.ObjectId[] = [];
    let partialEarningId: mongoose.Types.ObjectId | null = null;
    let partialAmount = 0;

    // Process full earnings
    for (const earning of earningsToProcess) {
      if (remainingAmount <= 0) break;

      if (earning.hostPayout <= remainingAmount) {
        // This earning can be fully processed
        processedEarningIds.push(earning._id as mongoose.Types.ObjectId);
        remainingAmount -= earning.hostPayout;
      } else {
        // Need to partially process this earning
        partialEarningId = earning._id as mongoose.Types.ObjectId;
        partialAmount = remainingAmount;
        remainingAmount = 0;
        break;
      }
    }

    // Generate withdrawal ID
    const withdrawalId = `W-${uuidv4().substring(0, 8).toUpperCase()}`;
    const now = new Date();

    if (processedEarningIds.length > 0) {
      await Earning.updateMany(
        { _id: { $in: processedEarningIds } },
        {
          status: 'paid_out',
          paidOutAt: now,
          payoutId: withdrawalId,
        }
      );
    }

    if (partialEarningId && partialAmount > 0) {
      const originalEarning = await Earning.findById(partialEarningId);

      if (originalEarning) {
        // Calculate proportions
        const proportion = partialAmount / originalEarning.hostPayout;
        const partialTotalAmount = originalEarning.amount * proportion;
        const partialPlatformFee = originalEarning.platformFee * proportion;

        await Earning.create({
          host: originalEarning.host,
          booking: originalEarning.booking,
          amount: partialTotalAmount,
          platformFee: partialPlatformFee,
          hostPayout: partialAmount,
          status: 'paid_out',
          paymentMethod: originalEarning.paymentMethod,
          availableDate: originalEarning.availableDate,
          paidOutAt: now,
          payoutId: withdrawalId,
        });

        // Reduce the amount in the original earning
        originalEarning.amount -= partialTotalAmount;
        originalEarning.platformFee -= partialPlatformFee;
        originalEarning.hostPayout -= partialAmount;
        await originalEarning.save();
      }
    }

    let paymentDetails;

    if (method === 'card') {
      paymentDetails = {
        method: 'card',
        cardholderName: accountDetails.cardholderName,
        cardLastFour: accountDetails.cardNumber.slice(-4),
      };
    } else {
      paymentDetails = {
        method,
        mobileNumber: accountDetails.mobileNumber,
      };
    }

    res.status(200).json({
      success: true,
      message: `Successfully processed withdrawal of ₱${amount.toFixed(2)}`,
      data: {
        withdrawalId,
        amount,
        date: now,
        paymentDetails,
        remainingBalance: availableBalance - amount,
      },
    });
  } catch (error: any) {
    console.error('Error processing withdrawal:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing withdrawal',
      error: error.message,
    });
  }
};

// Get withdrawal history
export const getWithdrawalHistory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }
    const userId = req.user.id;

    // Check if user is a host
    const user = await User.findById(userId);
    if (!user || user.role !== 'host') {
      res.status(403).json({
        success: false,
        message: 'Only hosts can access withdrawal history',
      });
      return;
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get all withdrawals (paid_out earnings grouped by payoutId)
    const withdrawals = await Earning.aggregate([
      {
        $match: {
          host: new mongoose.Types.ObjectId(userId),
          status: 'paid_out',
          payoutId: { $exists: true, $ne: null },
        },
      },
      {
        $sort: { paidOutAt: -1 },
      },
      {
        $group: {
          _id: '$payoutId',
          amount: { $sum: '$hostPayout' },
          date: { $first: '$paidOutAt' },
          paymentMethod: { $first: '$paymentMethod' },
          count: { $sum: 1 },
        },
      },
      { $skip: skip },
      { $limit: limit },
    ]);

    // Get total count
    const totalCount = await Earning.aggregate([
      {
        $match: {
          host: new mongoose.Types.ObjectId(userId),
          status: 'paid_out',
          payoutId: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$payoutId',
        },
      },
      {
        $count: 'total',
      },
    ]);

    const total = totalCount.length > 0 ? totalCount[0].total : 0;

    res.status(200).json({
      success: true,
      count: withdrawals.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: withdrawals.map((w) => ({
        id: w._id,
        amount: w.amount,
        date: w.date,
        paymentMethod: w.paymentMethod,
        earningsCount: w.count,
      })),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching withdrawal history',
      error: error.message,
    });
  }
};

// Get earnings by date range
export const getEarningsByDateRange = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    // Check if user is a host
    const user = await User.findById(userId);
    if (!user || user.role !== 'host') {
      res.status(403).json({
        success: false,
        message: 'Only hosts can access earnings',
      });
      return;
    }

    // Validate dates
    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
      return;
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Invalid date format',
      });
      return;
    }

    // Set end date to end of day
    end.setHours(23, 59, 59, 999);

    // Get earnings within date range
    const earnings = await Earning.find({
      host: userId,
      createdAt: { $gte: start, $lte: end },
    })
      .populate({
        path: 'booking',
        select: 'checkIn checkOut totalPrice bookingStatus room',
        populate: {
          path: 'room',
          select: 'title images',
        },
      })
      .sort({ createdAt: -1 });

    // Calculate totals
    const totalAmount = earnings.reduce(
      (sum, earning) => sum + earning.amount,
      0
    );
    const totalPlatformFee = earnings.reduce(
      (sum, earning) => sum + earning.platformFee,
      0
    );
    const totalHostPayout = earnings.reduce(
      (sum, earning) => sum + earning.hostPayout,
      0
    );

    res.status(200).json({
      success: true,
      data: {
        earnings,
        summary: {
          count: earnings.length,
          totalAmount,
          totalPlatformFee,
          totalHostPayout,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching earnings by date range',
      error: error.message,
    });
  }
};

// Generate earnings statement (for tax purposes)
export const generateEarningsStatement = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }
    const userId = req.user.id;
    const { year } = req.params;

    // Check if user is a host
    const user = await User.findById(userId);
    if (!user || user.role !== 'host') {
      res.status(403).json({
        success: false,
        message: 'Only hosts can access earnings statements',
      });
      return;
    }

    // Validate year
    const yearNum = parseInt(year);
    if (
      isNaN(yearNum) ||
      yearNum < 2000 ||
      yearNum > new Date().getFullYear()
    ) {
      res.status(400).json({
        success: false,
        message: 'Invalid year',
      });
      return;
    }

    // Get start and end date for the year
    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

    // Get all earnings for the year
    const earnings = await Earning.find({
      host: userId,
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .populate({
        path: 'booking',
        select: 'checkIn checkOut room',
        populate: {
          path: 'room',
          select: 'title location',
        },
      })
      .sort({ createdAt: 1 });

    // Group earnings by month
    const monthlyEarnings: Record<string, any> = {};
    for (let i = 0; i < 12; i++) {
      monthlyEarnings[i + 1] = {
        month: i + 1,
        earnings: [],
        totalAmount: 0,
        totalPlatformFee: 0,
        totalHostPayout: 0,
      };
    }

    // Populate monthly earnings
    earnings.forEach((earning) => {
      const month = earning.createdAt.getMonth() + 1;
      monthlyEarnings[month].earnings.push(earning);
      monthlyEarnings[month].totalAmount += earning.amount;
      monthlyEarnings[month].totalPlatformFee += earning.platformFee;
      monthlyEarnings[month].totalHostPayout += earning.hostPayout;
    });

    // Calculate yearly totals
    const yearlyTotals = {
      totalAmount: earnings.reduce((sum, earning) => sum + earning.amount, 0),
      totalPlatformFee: earnings.reduce(
        (sum, earning) => sum + earning.platformFee,
        0
      ),
      totalHostPayout: earnings.reduce(
        (sum, earning) => sum + earning.hostPayout,
        0
      ),
      totalBookings: earnings.length,
    };

    res.status(200).json({
      success: true,
      data: {
        year: yearNum,
        hostDetails: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
        },
        monthlyEarnings: Object.values(monthlyEarnings),
        yearlyTotals,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error generating earnings statement',
      error: error.message,
    });
  }
};

// Get earnings for a specific booking
export const getBookingEarnings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }
    const userId = req.user.id;
    const { bookingId } = req.params;

    // Check if user is a host
    const user = await User.findById(userId);
    if (!user || user.role !== 'host') {
      res.status(403).json({
        success: false,
        message: 'Only hosts can access booking earnings',
      });
      return;
    }

    // Get the booking to verify ownership
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
      return;
    }

    // Check if the booking belongs to this host
    if (booking.host.toString() !== userId) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to access earnings for this booking',
      });
      return;
    }

    // Get earnings for this booking
    const earnings = await Earning.findOne({
      booking: bookingId,
      host: userId,
    }).populate({
      path: 'booking',
      select: 'checkIn checkOut totalPrice bookingStatus paymentMethod',
      populate: {
        path: 'room',
        select: 'title images location',
      },
    });

    if (!earnings) {
      res.status(404).json({
        success: false,
        message: 'No earnings found for this booking',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: earnings,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching booking earnings',
      error: error.message,
    });
  }
};

// For admin: Process host payout
export const processHostPayout = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }
    if (req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Only admins can process host payouts',
      });
      return;
    }

    const { hostId, earningIds, payoutId } = req.body;

    if (!hostId || !earningIds || !Array.isArray(earningIds) || !payoutId) {
      res.status(400).json({
        success: false,
        message: 'Host ID, earning IDs array, and payout ID are required',
      });
      return;
    }

    // Check if host exists
    const host = await User.findById(hostId);
    if (!host || host.role !== 'host') {
      res.status(404).json({
        success: false,
        message: 'Host not found',
      });
      return;
    }

    // Update the specified earnings to paid_out status
    const updateResult = await Earning.updateMany(
      {
        _id: { $in: earningIds },
        host: hostId,
        status: 'available', // Only process available earnings
      },
      {
        status: 'paid_out',
        paidOutAt: new Date(),
        payoutId,
      }
    );

    // Check how many documents were updated
    if (updateResult.matchedCount === 0) {
      res.status(400).json({
        success: false,
        message: 'No eligible earnings found for payout',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Successfully processed payout for ${updateResult.modifiedCount} earnings`,
      data: {
        host: hostId,
        updated: updateResult.modifiedCount,
        payoutId,
        paidOutAt: new Date(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error processing host payout',
      error: error.message,
    });
  }
};

// Update pending earnings to available (scheduled job)
export const updateEarningsStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }
    if (req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Only admins can update earnings status',
      });
      return;
    }

    const now = new Date();

    // Find pending earnings that have reached their available date
    const updateResult = await Earning.updateMany(
      {
        status: 'pending',
        availableDate: { $lte: now },
      },
      {
        status: 'available',
      }
    );

    res.status(200).json({
      success: true,
      message: `Updated ${updateResult.modifiedCount} earnings to 'available' status`,
      data: {
        updated: updateResult.modifiedCount,
        timestamp: now,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating earnings status',
      error: error.message,
    });
  }
};
