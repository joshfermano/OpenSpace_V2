import { Request, Response } from 'express';
import User, { IUser } from '../models/User';
import mongoose from 'mongoose';
import Room from '../models/Room';
import Booking from '../models/Booking';

// Define a custom Request type that includes the user property
type AuthRequest = Request;

// Helper function to ensure admin authentication
function ensureAdmin(req: AuthRequest, res: Response): IUser | null {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Not authenticated',
    });
    return null;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Not authorized, admin access required',
    });
    return null;
  }

  return req.user;
}

interface SafeUserResponse {
  password?: string;
  [key: string]: any;
}

interface IUserWithBan extends IUser {
  active: boolean;
  banReason?: string;
}

// Get dashboard summary stats
export const getDashboardSummary = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const admin = ensureAdmin(req, res);
    if (!admin) return;

    console.log('Processing dashboard summary request...');

    // Get user verification counts using the static method
    const userCounts = await User.getUserVerificationCounts();
    console.log('User counts:', userCounts);

    const pendingVerifications = await User.countDocuments({
      'identificationDocument.verificationStatus': 'pending',
    });

    // Get space and host statistics
    const totalSpaces = await Room.countDocuments();
    const hostCount = await User.countDocuments({ role: 'host' });

    // Prepare the response data
    const summaryData = {
      totalUsers: userCounts.total,
      verifiedUsers: userCounts.verified,
      unverifiedUsers: userCounts.unverified,
      bannedUsers: userCounts.banned,
      pendingVerifications,
      totalSpaces,
      hostCount,
    };

    console.log('Dashboard Summary Data:', summaryData);

    res.status(200).json({
      success: true,
      data: summaryData,
    });
  } catch (error: any) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard summary',
      error: error.message,
    });
  }
};

// Get all users (admin only)
export const getAllUsers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const admin = ensureAdmin(req, res);
    if (!admin) return;

    // Handle pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Handle filtering
    const filter: Record<string, any> = {};

    if (req.query.role) {
      filter.role = req.query.role;
    }

    if (req.query.verificationLevel) {
      filter.verificationLevel = req.query.verificationLevel;
    }

    if (req.query.isEmailVerified) {
      filter.isEmailVerified = req.query.isEmailVerified === 'true';
    }

    // Get users
    const users = await User.find(filter)
      .select('-password')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalUsers = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: users.length,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page,
      data: users,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message,
    });
  }
};

// Get user by ID (admin view)
export const getUserById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const admin = ensureAdmin(req, res);
    if (!admin) return;

    const { userId } = req.params;

    // Check if ID is valid
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
      return;
    }

    // Find user
    const user = await User.findById(userId).select('-password');

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message,
    });
  }
};

// Update user by ID (admin only)
export const updateUserById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const admin = ensureAdmin(req, res);
    if (!admin) return;

    const { userId } = req.params;
    const {
      firstName,
      lastName,
      role,
      verificationLevel,
      isEmailVerified,
      isPhoneVerified,
      profileImage,
      active,
    } = req.body;

    // Check if ID is valid
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Create an object with the fields to update
    const updateFields: Record<string, any> = {};

    if (firstName !== undefined) updateFields.firstName = firstName;
    if (lastName !== undefined) updateFields.lastName = lastName;
    if (role !== undefined) updateFields.role = role;
    if (verificationLevel !== undefined)
      updateFields.verificationLevel = verificationLevel;
    if (isEmailVerified !== undefined)
      updateFields.isEmailVerified = isEmailVerified;
    if (isPhoneVerified !== undefined)
      updateFields.isPhoneVerified = isPhoneVerified;
    if (profileImage !== undefined) updateFields.profileImage = profileImage;
    if (active !== undefined) updateFields.active = active;

    // Update user with new data
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message,
    });
  }
};

// Get pending ID verifications
export const getPendingIdVerifications = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const admin = ensureAdmin(req, res);
    if (!admin) return;

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find({
      'identificationDocument.verificationStatus': 'pending',
    })
      .select(
        '_id firstName lastName email identificationDocument profileImage'
      )
      .skip(skip)
      .limit(limit)
      .sort({ 'identificationDocument.uploadDate': 1 }); // Oldest first

    const total = await User.countDocuments({
      'identificationDocument.verificationStatus': 'pending',
    });

    res.status(200).json({
      success: true,
      count: users.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: users,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error getting pending ID verifications',
      error: error.message,
    });
  }
};

// Verify user ID document
export const verifyUserIdDocument = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const admin = ensureAdmin(req, res);
    if (!admin) return;

    const { userId } = req.params;
    const { isApproved, rejectionReason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (!user.identificationDocument) {
      res.status(400).json({
        success: false,
        message: 'User has not uploaded an ID document',
      });
      return;
    }

    if (isApproved) {
      // Approve the ID verification
      user.identificationDocument.verificationStatus = 'approved';
      user.identificationDocument.verificationDate = new Date();

      // If email and phone are also verified, upgrade verification level
      if (user.isEmailVerified && user.isPhoneVerified) {
        user.verificationLevel = 'verified';
      }
    } else {
      // Reject the ID verification
      user.identificationDocument.verificationStatus = 'rejected';
      user.identificationDocument.verificationDate = new Date();
      user.identificationDocument.rejectionReason =
        rejectionReason || 'Document verification failed';
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: `User ID document ${
        isApproved ? 'approved' : 'rejected'
      } successfully`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error verifying user ID document',
      error: error.message,
    });
  }
};

// Create admin user
export const createAdmin = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // First ensure the requester is authenticated and is an admin
    const requestingUser = ensureAdmin(req, res);

    if (!requestingUser) return;

    const { email, password, firstName, lastName, phoneNumber, profileImage } =
      req.body;

    // Check if admin already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
      return;
    }

    // Create new admin user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      profileImage: profileImage || '',
      role: 'admin',
      verificationLevel: 'admin',
      isEmailVerified: true,
      isPhoneVerified: true,
    });

    // Change delete operation
    const userResponse = user.toObject() as SafeUserResponse;
    userResponse.password = undefined;

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      user: userResponse,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error creating admin user',
      error: error.message,
    });
  }
};

// Ban user
export const banUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const admin = ensureAdmin(req, res);
    if (!admin) return;

    const { userId } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (user.role === 'admin') {
      res.status(400).json({
        success: false,
        message: 'Cannot ban an admin user',
      });
      return;
    }

    const userWithBan = user as unknown as IUserWithBan;
    userWithBan.active = false;
    userWithBan.banReason = reason || 'Banned by admin';
    await userWithBan.save();

    res.status(200).json({
      success: true,
      message: 'User banned successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error banning user',
      error: error.message,
    });
  }
};

// Unban user
export const unbanUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const admin = ensureAdmin(req, res);
    if (!admin) return;

    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    const userWithBan = user as unknown as IUserWithBan;
    userWithBan.active = true;
    userWithBan.banReason = undefined;
    await userWithBan.save();

    res.status(200).json({
      success: true,
      message: 'User unbanned successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error unbanning user',
      error: error.message,
    });
  }
};

// Delete user
export const deleteUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const admin = ensureAdmin(req, res);
    if (!admin) return;

    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (user.role === 'admin') {
      res.status(400).json({
        success: false,
        message: 'Cannot delete an admin user',
      });
      return;
    }

    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message,
    });
  }
};

// Check if admin exists (for initial setup)
export const checkAdminExists = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });

    res.status(200).json({
      success: true,
      adminExists: adminCount > 0,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error checking admin existence',
      error: error.message,
    });
  }
};

// Initial admin setup (first admin account)
export const initialAdminSetup = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { email, password, firstName, lastName, phoneNumber, setupCode } =
      req.body;

    const validSetupCode = process.env.ADMIN_SETUP_CODE;
    if (!validSetupCode || setupCode !== validSetupCode) {
      res.status(401).json({
        success: false,
        message: 'Invalid setup code',
      });
      return;
    }

    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount > 0) {
      res.status(400).json({
        success: false,
        message:
          'Admin account already exists. This setup can only be used once.',
      });
      return;
    }

    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      phoneNumber: phoneNumber || '',
      profileImage: '',
      role: 'admin',
      verificationLevel: 'admin',
      isEmailVerified: true,
      isPhoneVerified: true,
    });

    const userResponse: SafeUserResponse = user.toObject();
    userResponse.password = undefined;

    res.status(201).json({
      success: true,
      message: 'Initial admin user created successfully',
      user: userResponse,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error creating initial admin user',
      error: error.message,
    });
  }
};

// Get pending room approvals
export const getPendingRoomApprovals = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const admin = ensureAdmin(req, res);
    if (!admin) return;

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get pending rooms
    const pendingRooms = await Room.find({ status: 'pending' })
      .populate('host', 'firstName lastName email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: 1 }); // Oldest first

    const total = await Room.countDocuments({ status: 'pending' });

    res.status(200).json({
      success: true,
      count: pendingRooms.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: pendingRooms,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching pending room approvals',
      error: error.message,
    });
  }
};

// Approve or reject room
export const approveRejectRoom = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const admin = ensureAdmin(req, res);
    if (!admin) return;

    const { roomId } = req.params;
    const { approved, rejectionReason } = req.body;

    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found',
      });
      return;
    }

    // Update room status
    if (approved) {
      room.status = 'approved';
      room.isPublished = true;
      room.rejectionReason = undefined;
    } else {
      room.status = 'rejected';
      room.isPublished = false;
      room.rejectionReason =
        rejectionReason || 'Room does not meet our standards';
    }

    await room.save();

    res.status(200).json({
      success: true,
      message: `Room ${approved ? 'approved' : 'rejected'} successfully`,
      data: room,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error approving/rejecting room',
      error: error.message,
    });
  }
};

// Get all bookings (admin view)
export const getAllBookings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const admin = ensureAdmin(req, res);
    if (!admin) return;

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

// Update booking status (admin only)
export const updateBookingStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const admin = ensureAdmin(req, res);
    if (!admin) return;

    const { bookingId } = req.params;
    const { status, reason } = req.body;

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

// Delete booking (admin only)
export const deleteBooking = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const admin = ensureAdmin(req, res);
    if (!admin) return;

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

// Get banned users
export const getBannedUsers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const admin = ensureAdmin(req, res);
    if (!admin) return;

    // Handle pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get banned users (those with active = false)
    const bannedUsers = await User.find({ active: false })
      .select('-password')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalBannedUsers = await User.countDocuments({ active: false });

    res.status(200).json({
      success: true,
      count: bannedUsers.length,
      totalPages: Math.ceil(totalBannedUsers / limit),
      currentPage: page,
      data: bannedUsers,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching banned users',
      error: error.message,
    });
  }
};
