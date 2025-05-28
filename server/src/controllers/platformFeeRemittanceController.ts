import { Response } from 'express';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import PlatformFeeRemittance from '../models/PlatformFeeRemittance';
import { Request } from 'express';

// Define AuthRequest interface extending Express Request
interface AuthRequest extends Request {
  user?: any; // Using any for now since we're importing the user from custom.d.ts
}

// Helper function to ensure user is authenticated
const ensureAuthenticated = (req: AuthRequest, res: Response): boolean => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'User not authenticated',
    });
    return false;
  }
  return true;
};

// Helper function to ensure user is admin
const ensureAdmin = (req: AuthRequest, res: Response): boolean => {
  if (!ensureAuthenticated(req, res)) return false;
  if (req.user!.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
    return false;
  }
  return true;
};

// Helper function to ensure user is host
const ensureHost = (req: AuthRequest, res: Response): boolean => {
  if (!ensureAuthenticated(req, res)) return false;
  if (req.user!.role !== 'host') {
    res.status(403).json({
      success: false,
      message: 'Host access required',
    });
    return false;
  }
  return true;
};

// Create platform fee remittance (called when booking is completed)
export const createPlatformFeeRemittance = async (
  hostId: string,
  earningId: string,
  bookingId: string,
  platformFeeAmount: number
): Promise<any> => {
  try {
    // Check if remittance already exists
    const existingRemittance = await PlatformFeeRemittance.findOne({
      earning: earningId,
    });

    if (existingRemittance) {
      console.log(`Remittance already exists for earning ${earningId}`);
      return existingRemittance;
    }

    // Set due date to 30 days from now
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const remittance = await PlatformFeeRemittance.create({
      host: hostId,
      earning: earningId,
      booking: bookingId,
      platformFeeAmount,
      dueDate,
      status: 'outstanding',
    });

    console.log(
      `Platform fee remittance created for host ${hostId} - Amount: ₱${platformFeeAmount}`
    );

    return remittance;
  } catch (error) {
    console.error('Error creating platform fee remittance:', error);
    throw error;
  }
};

// Get host's outstanding remittances
export const getHostRemittances = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!ensureHost(req, res)) return;

    const hostId = req.user!.id;
    const { status = 'all', page = 1, limit = 10 } = req.query;

    // Build query
    let query: any = { host: hostId };
    if (status !== 'all') {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const remittances = await PlatformFeeRemittance.find(query)
      .populate({
        path: 'booking',
        select: 'checkIn checkOut totalPrice room',
        populate: {
          path: 'room',
          select: 'title images',
        },
      })
      .populate({
        path: 'earning',
        select: 'amount platformFee hostPayout',
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await PlatformFeeRemittance.countDocuments(query);

    // Calculate summary
    const summaryPipeline = [
      { $match: { host: new mongoose.Types.ObjectId(hostId) } },
      {
        $group: {
          _id: '$status',
          total: { $sum: '$platformFeeAmount' },
          count: { $sum: 1 },
        },
      },
    ];

    const summary = await PlatformFeeRemittance.aggregate(summaryPipeline);
    const summaryData = {
      outstanding: { amount: 0, count: 0 },
      paid: { amount: 0, count: 0 },
      overdue: { amount: 0, count: 0 },
    };

    summary.forEach((item) => {
      if (item._id in summaryData) {
        summaryData[item._id as keyof typeof summaryData] = {
          amount: item.total,
          count: item.count,
        };
      }
    });

    res.status(200).json({
      success: true,
      data: {
        remittances,
        pagination: {
          current: Number(page),
          pages: Math.ceil(total / Number(limit)),
          total,
        },
        summary: summaryData,
      },
    });
  } catch (error: any) {
    console.error('Error fetching host remittances:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching remittances',
      error: error.message,
    });
  }
};

// Process platform fee payment
export const processPlatformFeePayment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!ensureHost(req, res)) return;

    const { remittanceId } = req.params;
    const { paymentMethod, paymentDetails } = req.body;

    if (!paymentMethod || !['card', 'gcash', 'maya'].includes(paymentMethod)) {
      res.status(400).json({
        success: false,
        message: 'Valid payment method is required (card, gcash, maya)',
      });
      return;
    }

    // Find the remittance
    const remittance = await PlatformFeeRemittance.findById(remittanceId);
    if (!remittance) {
      res.status(404).json({
        success: false,
        message: 'Remittance not found',
      });
      return;
    }

    // Verify ownership
    if (remittance.host.toString() !== req.user!.id) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to pay this remittance',
      });
      return;
    }

    // Check if already paid
    if (remittance.status === 'paid') {
      res.status(400).json({
        success: false,
        message: 'This remittance has already been paid',
      });
      return;
    }

    // Validate payment details based on method
    let processedPaymentDetails: any = {
      paymentDate: new Date(),
    };

    if (paymentMethod === 'card') {
      if (!paymentDetails?.cardNumber || !paymentDetails?.cardholderName) {
        res.status(400).json({
          success: false,
          message: 'Card number and cardholder name are required',
        });
        return;
      }
      processedPaymentDetails.cardLastFour =
        paymentDetails.cardNumber.slice(-4);
      processedPaymentDetails.cardholderName = paymentDetails.cardholderName;
    } else {
      // GCash or Maya
      if (!paymentDetails?.mobileNumber) {
        res.status(400).json({
          success: false,
          message: 'Mobile number is required for mobile payments',
        });
        return;
      }

      // Validate Philippine mobile number format
      const mobilePattern = /^09\d{9}$/;
      if (!mobilePattern.test(paymentDetails.mobileNumber)) {
        res.status(400).json({
          success: false,
          message: 'Invalid mobile number format. Must be 09XXXXXXXXX',
        });
        return;
      }
      processedPaymentDetails.mobileNumber = paymentDetails.mobileNumber;
    }

    // Generate transaction ID
    const transactionId = `PFR-${Date.now()
      .toString(36)
      .toUpperCase()}-${uuidv4().substring(0, 8).toUpperCase()}`;
    processedPaymentDetails.transactionId = transactionId;

    // Update remittance
    remittance.status = 'paid';
    remittance.paymentMethod = paymentMethod;
    remittance.paymentDetails = processedPaymentDetails;
    remittance.remittanceId = transactionId;

    await remittance.save();

    res.status(200).json({
      success: true,
      message: 'Platform fee payment processed successfully',
      data: {
        remittanceId: remittance._id,
        transactionId,
        amount: remittance.platformFeeAmount,
        paymentMethod,
        paymentDate: processedPaymentDetails.paymentDate,
      },
    });
  } catch (error: any) {
    console.error('Error processing platform fee payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing payment',
      error: error.message,
    });
  }
};

// Admin: Get all platform fee remittances
export const getAllPlatformFeeRemittances = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { status = 'all', page = 1, limit = 20, hostId } = req.query;

    // Build query
    let query: any = {};
    if (status !== 'all') {
      query.status = status;
    }
    if (hostId) {
      query.host = hostId;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const remittances = await PlatformFeeRemittance.find(query)
      .populate({
        path: 'host',
        select: 'firstName lastName email',
      })
      .populate({
        path: 'booking',
        select: 'checkIn checkOut totalPrice room',
        populate: {
          path: 'room',
          select: 'title',
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await PlatformFeeRemittance.countDocuments(query);

    // Calculate summary statistics
    const summaryPipeline = [
      { $match: query },
      {
        $group: {
          _id: '$status',
          total: { $sum: '$platformFeeAmount' },
          count: { $sum: 1 },
        },
      },
    ];

    const summary = await PlatformFeeRemittance.aggregate(summaryPipeline);
    const summaryData = {
      outstanding: { amount: 0, count: 0 },
      paid: { amount: 0, count: 0 },
      overdue: { amount: 0, count: 0 },
    };

    summary.forEach((item) => {
      if (item._id in summaryData) {
        summaryData[item._id as keyof typeof summaryData] = {
          amount: item.total,
          count: item.count,
        };
      }
    });

    res.status(200).json({
      success: true,
      data: {
        remittances,
        pagination: {
          current: Number(page),
          pages: Math.ceil(total / Number(limit)),
          total,
        },
        summary: summaryData,
      },
    });
  } catch (error: any) {
    console.error('Error fetching platform fee remittances:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching remittances',
      error: error.message,
    });
  }
};

// Admin: Mark overdue remittances
export const markOverdueRemittances = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return;

    const now = new Date();

    // Find outstanding remittances that are past due
    const overdueRemittances = await PlatformFeeRemittance.updateMany(
      {
        status: 'outstanding',
        dueDate: { $lt: now },
      },
      {
        status: 'overdue',
        overdueDate: now,
      }
    );

    res.status(200).json({
      success: true,
      message: `Marked ${overdueRemittances.modifiedCount} remittances as overdue`,
      data: {
        updated: overdueRemittances.modifiedCount,
      },
    });
  } catch (error: any) {
    console.error('Error marking overdue remittances:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking overdue remittances',
      error: error.message,
    });
  }
};

// Admin: Get platform fee statistics
export const getPlatformFeeStatistics = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { period = 'month' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(2020, 0, 1); // All time
    }

    // Aggregate statistics
    const statistics = await PlatformFeeRemittance.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$platformFeeAmount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$platformFeeAmount' },
        },
      },
    ]);

    // Get monthly trend for charts
    const monthlyTrend = await PlatformFeeRemittance.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: 'paid',
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          totalCollected: { $sum: '$platformFeeAmount' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
    ]);

    // Format statistics
    const formattedStats = {
      outstanding: { amount: 0, count: 0, avgAmount: 0 },
      paid: { amount: 0, count: 0, avgAmount: 0 },
      overdue: { amount: 0, count: 0, avgAmount: 0 },
    };

    statistics.forEach((stat) => {
      if (stat._id in formattedStats) {
        formattedStats[stat._id as keyof typeof formattedStats] = {
          amount: stat.totalAmount,
          count: stat.count,
          avgAmount: stat.avgAmount,
        };
      }
    });

    res.status(200).json({
      success: true,
      data: {
        period,
        statistics: formattedStats,
        monthlyTrend,
        totalCollected: formattedStats.paid.amount,
        totalOutstanding:
          formattedStats.outstanding.amount + formattedStats.overdue.amount,
        collectionRate:
          (formattedStats.paid.count /
            (formattedStats.outstanding.count +
              formattedStats.paid.count +
              formattedStats.overdue.count)) *
            100 || 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching platform fee statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message,
    });
  }
};
