import { Request, Response } from 'express';
import User from '../models/User';
import mongoose from 'mongoose';
import Room from '../models/Room';
import Booking from '../models/Booking';
import { IUser } from '../models/User';
import { uploadImage } from '../services/imageService';
import { deleteImage } from '../services/imageService';

// Define a custom Request type that includes the user property
type AuthRequest = Request;

// Helper function to safely access req.user
function getUserFromRequest(req: AuthRequest, res: Response): IUser | null {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Not authenticated',
    });
    return null;
  }

  // Handle both possible structures
  const user = req.user;
  if (!user._id && !user.id) {
    res.status(401).json({
      success: false,
      message: 'Invalid user data in request',
    });
    return null;
  }

  return req.user;
}

interface SafeUserResponse {
  password?: string;
  [key: string]: any;
}

export interface HostInfo {
  bio: string;
  languagesSpoken: string[];
  responseRate?: number;
  responseTime?: number;
  acceptanceRate?: number;
  hostSince: Date;
}

// Get user by ID
export const getUserById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
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

    const isAuthenticated = !!req.user;
    const isAdmin = isAuthenticated && req.user && req.user.role === 'admin';
    const isOwnProfile = isAuthenticated && req.user && req.user.id === userId;

    if (!isAdmin && !isOwnProfile) {
      const publicUser = {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImage: user.profileImage,
        role: user.role,
        hostInfo: user.hostInfo,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        identificationDocument: user.identificationDocument,
        verificationLevel: user.verificationLevel,
        createdAt: user.createdAt,
      };

      res.status(200).json({
        success: true,
        data: publicUser,
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

export const updateProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Get user ID from authenticated user
    const currentUser = getUserFromRequest(req, res);
    if (!currentUser) return;

    const userId = currentUser._id;

    const { firstName, lastName, phoneNumber, profileImage, hostInfo } =
      req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Update basic user information
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (profileImage) user.profileImage = profileImage;

    // Update host info if provided
    if (hostInfo && (user.role === 'host' || user.role === 'admin')) {
      user.hostInfo = {
        ...user.hostInfo,
        bio: hostInfo.bio || user.hostInfo?.bio || '',
        languagesSpoken:
          hostInfo.languagesSpoken || user.hostInfo?.languagesSpoken || [],
        responseTime: hostInfo.responseTime || user.hostInfo?.responseTime,
        hostSince: user.hostInfo?.hostSince || new Date(),
      };
    }

    // Save updated user
    await user.save();

    // Remove password from response
    const userResponse = user.toObject() as SafeUserResponse;
    userResponse.password = undefined;

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: userResponse,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message,
    });
  }
};

// Change password
export const changePassword = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const currentUser = getUserFromRequest(req, res);
    if (!currentUser) return;
    const userId = currentUser._id;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
      return;
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Check if current password is correct
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
      return;
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message,
    });
  }
};

// Save a room to favorites
export const saveRoom = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUser = getUserFromRequest(req, res);
    if (!currentUser) return;
    const userId = currentUser._id;
    const { roomId } = req.body;

    if (!roomId) {
      res.status(400).json({
        success: false,
        message: 'Room ID is required',
      });
      return;
    }

    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found',
      });
      return;
    }

    // Add room to saved rooms if not already saved
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (!user.savedRooms.includes(roomId)) {
      user.savedRooms.push(roomId);
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Room saved to favorites',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error saving room to favorites',
      error: error.message,
    });
  }
};

// Remove a room from favorites
export const unsaveRoom = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUser = getUserFromRequest(req, res);
    if (!currentUser) return;
    const userId = currentUser._id;
    const { roomId } = req.params;

    if (!roomId) {
      res.status(400).json({
        success: false,
        message: 'Room ID is required',
      });
      return;
    }

    // Remove room from saved rooms
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    user.savedRooms = user.savedRooms.filter((id) => id.toString() !== roomId);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Room removed from favorites',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error removing room from favorites',
      error: error.message,
    });
  }
};

// Get saved rooms
export const getSavedRooms = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUser = getUserFromRequest(req, res);
    if (!currentUser) return;
    const userId = currentUser._id;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Get saved rooms with details
    const savedRooms = await Room.find({
      _id: { $in: user.savedRooms },
      isPublished: true,
      status: 'approved',
    });

    res.status(200).json({
      success: true,
      count: savedRooms.length,
      data: savedRooms,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching saved rooms',
      error: error.message,
    });
  }
};

// Get user dashboard data
export const getDashboardData = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUser = getUserFromRequest(req, res);
    if (!currentUser) return;
    const userId = currentUser._id;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Different dashboard data based on user role
    let dashboardData: any = {
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        profileImage: user.profileImage,
        role: user.role,
        verificationLevel: user.verificationLevel,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
      },
    };

    if (user.role === 'host') {
      // Get host rooms
      const rooms = await Room.find({ host: userId });

      // Get recent bookings
      const recentBookings = await Booking.find({ host: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('room', 'title images')
        .populate('user', 'firstName lastName profileImage');

      // Calculate stats
      const pendingBookings = await Booking.countDocuments({
        host: userId,
        bookingStatus: 'pending',
      });

      const confirmedBookings = await Booking.countDocuments({
        host: userId,
        bookingStatus: 'confirmed',
      });

      dashboardData = {
        ...dashboardData,
        hostData: {
          rooms: {
            total: rooms.length,
            published: rooms.filter((room) => room.isPublished).length,
            pending: rooms.filter((room) => room.status === 'pending').length,
          },
          bookings: {
            recent: recentBookings,
            pending: pendingBookings,
            confirmed: confirmedBookings,
          },
        },
      };
    } else {
      // Regular user dashboard
      // Get recent bookings
      const recentBookings = await Booking.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('room', 'title images')
        .populate('host', 'firstName lastName');

      // Get count of saved rooms
      const savedRoomsCount = user.savedRooms.length;

      dashboardData = {
        ...dashboardData,
        userData: {
          bookings: {
            recent: recentBookings,
            upcoming: await Booking.countDocuments({
              user: userId,
              bookingStatus: 'confirmed',
              checkIn: { $gte: new Date() },
            }),
            completed: await Booking.countDocuments({
              user: userId,
              bookingStatus: 'completed',
            }),
          },
          savedRooms: savedRoomsCount,
        },
      };
    }

    res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message,
    });
  }
};

export const getNotifications = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    // Placeholder for notifications implementation
    res.status(200).json({
      success: true,
      data: [],
      message: 'Notifications feature coming soon',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message,
    });
  }
};

export const markNotificationAsRead = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read',
      error: error.message,
    });
  }
};

export const uploadProfileImage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({
        success: false,
        message: 'No image uploaded',
      });
      return;
    }

    const currentUser = getUserFromRequest(req, res);
    if (!currentUser) return;
    const userId = currentUser._id;
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // If user already has a profile image, delete the old one
    if (user.profileImage && user.profileImage.includes('supabase')) {
      await deleteImage(user.profileImage);
    }

    // Upload to Supabase
    const imageUrl = await uploadImage(file.path, 'profiles');

    if (!imageUrl) {
      res.status(500).json({
        success: false,
        message: 'Failed to upload profile image',
      });
      return;
    }

    // Update user with new profile image URL
    user.profileImage = imageUrl;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: {
        profileImage: imageUrl,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error uploading profile image',
      error: error.message,
    });
  }
};

export const getUserProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUser = getUserFromRequest(req, res);
    if (!currentUser) return;

    const userId = currentUser._id;

    // Get fresh user data with populated fields if needed
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
      message: 'Error fetching user profile',
      error: error.message,
    });
  }
};
