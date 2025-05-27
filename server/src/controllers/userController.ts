import { Request, Response } from 'express';
import User from '../models/User';
import mongoose from 'mongoose';
import Room from '../models/Room';
import Booking from '../models/Booking';
import { IUser } from '../models/User';
import { uploadImage } from '../services/imageService';
import { deleteImage } from '../services/imageService';

type AuthRequest = Request & { user?: any };

function getUserFromRequest(req: AuthRequest, res: Response): IUser | null {
  console.log('[getUserFromRequest] Checking user in request...');
  if (!req.user) {
    console.log('[getUserFromRequest] No req.user found');
    res.status(401).json({
      success: false,
      message: 'Not authenticated',
    });
    return null;
  }

  console.log('[getUserFromRequest] User data:', {
    _id: req.user._id,
    id: req.user.id,
    email: req.user.email,
    keys: Object.keys(req.user),
  });

  // Ensure we have a valid user ID
  if (!req.user._id && !req.user.id) {
    console.log('[getUserFromRequest] No valid user ID found');
    res.status(401).json({
      success: false,
      message: 'Invalid user session',
    });
    return null;
  }

  console.log('[getUserFromRequest] User found successfully');
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

// Save a room to favorites - FIXED VERSION
export const saveRoom = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    console.log('[saveRoom] Starting to save room...');
    const currentUser = getUserFromRequest(req, res);
    if (!currentUser) {
      console.log('[saveRoom] No current user found');
      return;
    }

    const userId = currentUser._id;
    const { roomId } = req.body;
    console.log('[saveRoom] User ID:', userId, 'Room ID:', roomId);

    if (!roomId) {
      console.log('[saveRoom] No room ID provided');
      res.status(400).json({
        success: false,
        message: 'Room ID is required',
      });
      return;
    }

    // Validate room ID format
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      console.log('[saveRoom] Invalid room ID format');
      res.status(400).json({
        success: false,
        message: 'Invalid room ID format',
      });
      return;
    }

    // Validate user ID format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log('[saveRoom] Invalid user ID format');
      res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
      return;
    }

    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
      console.log('[saveRoom] Room not found');
      res.status(404).json({
        success: false,
        message: 'Room not found',
      });
      return;
    }

    // Add room to saved rooms if not already saved
    const user = await User.findById(userId);
    if (!user) {
      console.log('[saveRoom] User not found in database');
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    console.log('[saveRoom] Current saved rooms:', user.savedRooms);

    // Convert roomId to ObjectId for comparison
    const roomObjectId = new mongoose.Types.ObjectId(roomId);

    // Check if room is already saved using proper ObjectId comparison
    const isAlreadySaved = user.savedRooms.some((savedRoomId) =>
      savedRoomId.equals(roomObjectId)
    );

    if (!isAlreadySaved) {
      user.savedRooms.push(roomObjectId);
      await user.save();
      console.log('[saveRoom] Room added to favorites');
    } else {
      console.log('[saveRoom] Room already in favorites');
    }

    res.status(200).json({
      success: true,
      message: 'Room saved to favorites',
    });
  } catch (error: any) {
    console.error('[saveRoom] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving room to favorites',
      error: error.message,
    });
  }
};

// Remove a room from favorites - FIXED VERSION
export const unsaveRoom = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    console.log('[unsaveRoom] Starting to remove room from favorites...');
    const currentUser = getUserFromRequest(req, res);
    if (!currentUser) return;

    // Extract user ID from the user object
    const userId = currentUser._id;
    const { roomId } = req.params;
    console.log('[unsaveRoom] User ID:', userId, 'Room ID:', roomId);

    if (!roomId) {
      res.status(400).json({
        success: false,
        message: 'Room ID is required',
      });
      return;
    }

    // Validate room ID format
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      console.log('[unsaveRoom] Invalid room ID format');
      res.status(400).json({
        success: false,
        message: 'Invalid room ID format',
      });
      return;
    }

    // Validate user ID format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log('[unsaveRoom] Invalid user ID format');
      res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
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

    console.log(
      '[unsaveRoom] Current saved rooms before removal:',
      user.savedRooms
    );

    // Convert roomId to ObjectId for proper comparison
    const roomObjectId = new mongoose.Types.ObjectId(roomId);

    // Filter out the room using proper ObjectId comparison
    const initialLength = user.savedRooms.length;
    user.savedRooms = user.savedRooms.filter(
      (savedRoomId) => !savedRoomId.equals(roomObjectId)
    );

    const wasRemoved = user.savedRooms.length < initialLength;

    if (wasRemoved) {
      await user.save();
      console.log('[unsaveRoom] Room removed from favorites');
    } else {
      console.log('[unsaveRoom] Room was not in favorites');
    }

    console.log('[unsaveRoom] Saved rooms after removal:', user.savedRooms);

    res.status(200).json({
      success: true,
      message: 'Room removed from favorites',
    });
  } catch (error: any) {
    console.error('[unsaveRoom] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing room from favorites',
      error: error.message,
    });
  }
};

// Get saved rooms - FIXED VERSION
export const getSavedRooms = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    console.log('[getSavedRooms] Starting to fetch saved rooms...');
    const currentUser = getUserFromRequest(req, res);
    if (!currentUser) {
      console.log('[getSavedRooms] No current user found');
      return;
    }

    // Extract user ID from the user object
    const userId = currentUser._id;
    console.log('[getSavedRooms] User ID:', userId);

    // Validate user ID format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log('[getSavedRooms] Invalid user ID format');
      res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      console.log('[getSavedRooms] User not found in database');
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    console.log('[getSavedRooms] User found, saved rooms:', user.savedRooms);

    // Get saved rooms with details and populate host information
    const savedRooms = await Room.find({
      _id: { $in: user.savedRooms },
      isPublished: true,
      status: 'approved',
    }).populate('host', 'firstName lastName profileImage hostInfo');

    console.log('[getSavedRooms] Found saved rooms:', savedRooms.length);

    res.status(200).json({
      success: true,
      count: savedRooms.length,
      data: savedRooms,
    });
  } catch (error: any) {
    console.error('[getSavedRooms] Error:', error);
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
    console.log('[getDashboardData] Starting to fetch dashboard data...');
    const currentUser = getUserFromRequest(req, res);
    if (!currentUser) {
      console.log('[getDashboardData] No current user found');
      return;
    }

    // Extract user ID from the user object (try _id first, then id)
    const userId = currentUser._id || currentUser.id;
    console.log('[getDashboardData] User ID:', userId);
    console.log(
      '[getDashboardData] Current user object keys:',
      Object.keys(currentUser)
    );

    // Validate user ID exists
    if (!userId) {
      console.log('[getDashboardData] No user ID found in user object');
      res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
      return;
    }

    // Validate user ID format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log('[getDashboardData] Invalid user ID format:', userId);
      res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      console.log('[getDashboardData] User not found in database');
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    console.log('[getDashboardData] User found, role:', user.role);

    let dashboardData: any = {
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        profileImage: user.profileImage,
        role: user.role,
        verificationLevel: user.verificationLevel,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        createdAt: user.createdAt,
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

    console.log('[getDashboardData] Dashboard data prepared successfully');
    res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error: any) {
    console.error('[getDashboardData] Error:', error);
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
