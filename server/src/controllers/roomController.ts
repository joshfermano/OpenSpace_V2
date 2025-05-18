import { Request, Response } from 'express';
import fs from 'fs/promises';
import mongoose from 'mongoose';
import Room from '../models/Room';
import User from '../models/User';
import Booking from '../models/Booking';
import { uploadImage } from '../services/imageService';
import { deleteImage } from '../services/imageService';

// Define a custom Request type that includes the user property
type AuthRequest = Request;

// Create a new room listing
export const createRoom = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;

    // Check if user is a host
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (user.role !== 'host') {
      res.status(403).json({
        success: false,
        message: 'Only hosts can create room listings',
      });
      return;
    }

    // Check if host is verified
    if (user.verificationLevel !== 'verified') {
      res.status(403).json({
        success: false,
        message: 'You must be a verified host to create listings',
      });
      return;
    }

    // Create room with host ID
    const roomData = {
      ...req.body,
      host: userId,
      status: 'pending',
      isPublished: false,
    };

    const room = await Room.create(roomData);

    res.status(201).json({
      success: true,
      message: 'Room created successfully and pending approval',
      data: room,
    });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(
        (val: any) => val.message
      );

      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error creating room',
        error: error.message,
      });
    }
  }
};

// Get all rooms with filtering and pagination
export const getRooms = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      type,
      city,
      minPrice,
      maxPrice,
      maxGuests,
      startDate,
      endDate,
      amenities,
    } = req.query;

    // Build filter object
    const filter: Record<string, any> = {
      isPublished: true,
      status: 'approved',
    };

    // Add filters if provided
    if (type) filter.type = type;
    if (city) filter['location.city'] = new RegExp(city as string, 'i');

    if (minPrice)
      filter['price.basePrice'] = { $gte: parseInt(minPrice as string) };
    if (maxPrice) {
      filter['price.basePrice'] = {
        ...filter['price.basePrice'],
        $lte: parseInt(maxPrice as string),
      };
    }

    if (maxGuests)
      filter['capacity.maxGuests'] = { $gte: parseInt(maxGuests as string) };

    if (amenities) {
      const amenitiesList = (amenities as string).split(',');
      filter.amenities = { $all: amenitiesList };
    }

    // Date filtering logic
    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      // Check if dates are valid
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Invalid date format',
        });
        return;
      }

      filter.$and = [
        { 'availability.startDate': { $lte: end } },
        { 'availability.endDate': { $gte: start } },
        {
          'availability.unavailableDates': {
            $not: {
              $elemMatch: {
                $gte: start,
                $lte: end,
              },
            },
          },
        },
      ];
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Sorting
    const sort: Record<string, any> = {};
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) || 'desc';
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const rooms = await Room.find(filter)
      .populate('host', 'firstName lastName profileImage hostInfo')
      .skip(skip)
      .limit(limit)
      .sort(sort);

    const total = await Room.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: rooms.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: rooms,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching rooms',
      error: error.message,
    });
  }
};

// Get single room by ID
export const getRoomById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { roomId } = req.params;

    // Check if ID is valid
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid room ID',
      });
      return;
    }

    // Find room and populate host details
    const room = await Room.findById(roomId).populate(
      'host',
      'firstName lastName profileImage hostInfo'
    );

    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found',
      });
      return;
    }

    // Check if the user is authenticated
    const isAuthenticated = req.user && req.user.id;
    const isAdmin = isAuthenticated && req.user.role === 'admin';
    const isOwner = isAuthenticated && room.host._id.toString() === req.user.id;

    if (!room.isPublished || room.status !== 'approved') {
      if (!isAuthenticated || (!isAdmin && !isOwner)) {
        res.status(403).json({
          success: false,
          message: 'This room is not available for viewing',
        });
        return;
      }
    }

    res.status(200).json({
      success: true,
      data: room,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching room',
      error: error.message,
    });
  }
};

// Update room
export const updateRoom = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found',
      });
      return;
    }

    // Check if user is the host or admin
    if (room.host.toString() !== userId && req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to update this room',
      });
      return;
    }

    // Handle reset to pending status if certain fields are updated
    const criticalFields = [
      'type',
      'price.basePrice',
      'location',
      'images',
      'capacity',
      'description',
    ];

    const isEditingCriticalFields = criticalFields.some((field) => {
      const fieldPath = field.split('.');
      if (fieldPath.length === 1) {
        return req.body[fieldPath[0]] !== undefined;
      } else if (fieldPath.length === 2) {
        return (
          req.body[fieldPath[0]] &&
          req.body[fieldPath[0]][fieldPath[1]] !== undefined
        );
      }
      return false;
    });

    // If host (not admin) is editing critical fields, reset approval status
    if (isEditingCriticalFields && req.user.role !== 'admin') {
      req.body.status = 'pending';
      req.body.isPublished = false;
    }

    // Update room
    const updatedRoom = await Room.findByIdAndUpdate(
      roomId,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: isEditingCriticalFields
        ? 'Room updated successfully and needs re-approval'
        : 'Room updated successfully',
      data: updatedRoom,
    });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(
        (val: any) => val.message
      );

      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error updating room',
        error: error.message,
      });
    }
  }
};

// Delete room
export const deleteRoom = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found',
      });
      return;
    }

    // Check if user is the host or admin
    if (room.host.toString() !== userId && req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to delete this room',
      });
      return;
    }

    // Check if room has active bookings
    const activeBookings = await Booking.countDocuments({
      room: roomId,
      bookingStatus: { $in: ['pending', 'confirmed'] },
    });

    if (activeBookings > 0) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete room with active bookings',
      });
      return;
    }

    // Delete room
    await Room.findByIdAndDelete(roomId);

    res.status(200).json({
      success: true,
      message: 'Room deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error deleting room',
      error: error.message,
    });
  }
};

// Get rooms by host ID
export const getRoomsByHost = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { hostId } = req.params;

    // Check if user exists and is a host
    const host = await User.findById(hostId);
    if (!host || host.role !== 'host') {
      res.status(404).json({
        success: false,
        message: 'Host not found',
      });
      return;
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Filter for published and approved rooms only (for regular users)
    const filter: Record<string, any> = { host: hostId };

    // Check if user is authenticated
    const isAuthenticated = !!req.user;
    const isOwner = isAuthenticated && req.user.id === hostId;
    const isAdmin = isAuthenticated && req.user.role === 'admin';

    // For non-authenticated users or users who are not the owner/admin,
    // only show published and approved rooms
    if (!isOwner && !isAdmin) {
      filter.isPublished = true;
      filter.status = 'approved';
    }

    // Get rooms
    const rooms = await Room.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Room.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: rooms.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: rooms,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching host rooms',
      error: error.message,
    });
  }
};

// Get my rooms (for hosts)
export const getMyRooms = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;

    // Check if user is a host
    const user = await User.findById(userId);
    if (!user || user.role !== 'host') {
      res.status(403).json({
        success: false,
        message: 'Only hosts can access their rooms',
      });
      return;
    }

    // Get room status filter if provided
    const { status } = req.query;

    // Build filter
    const filter: Record<string, any> = { host: userId };
    if (status) filter.status = status;

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get rooms
    const rooms = await Room.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Room.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: rooms.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: rooms,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching your rooms',
      error: error.message,
    });
  }
};

// Search rooms by keyword
export const searchRooms = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { keyword } = req.query;

    if (!keyword) {
      res.status(400).json({
        success: false,
        message: 'Search keyword is required',
      });
      return;
    }

    // Create search pattern
    const searchPattern = new RegExp(keyword as string, 'i');

    // Search in relevant fields
    const rooms = await Room.find({
      $and: [
        { isPublished: true, status: 'approved' },
        {
          $or: [
            { title: searchPattern },
            { description: searchPattern },
            { 'location.city': searchPattern },
            { 'location.country': searchPattern },
            { type: searchPattern },
            { amenities: searchPattern },
          ],
        },
      ],
    })
      .populate('host', 'firstName lastName profileImage')
      .limit(20);

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error searching rooms',
      error: error.message,
    });
  }
};

// Get pending room approvals (admin only)
export const getPendingRoomApprovals = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to access this resource',
      });
      return;
    }

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

// Approve or reject room (admin only)
export const approveRejectRoom = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to approve or reject rooms',
      });
      return;
    }

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

export const getRoomAvailability = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { startDate, endDate } = req.query;

    console.log(
      `[Server] Fetching availability for room ${roomId} from ${startDate} to ${endDate}`
    );

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

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Invalid date format',
      });
      return;
    }

    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found',
      });
      return;
    }

    // Check if room is published and accessible
    if (!room.isPublished || room.status !== 'approved') {
      const isAuthenticated = req.user && req.user.id;
      const isAdmin = isAuthenticated && req.user.role === 'admin';
      const isOwner = isAuthenticated && room.host.toString() === req.user.id;

      if (!isAuthenticated || (!isAdmin && !isOwner)) {
        res.status(403).json({
          success: false,
          message: 'This room is not available for viewing',
        });
        return;
      }
    }

    const existingBookings = await Booking.find({
      room: roomId,
      bookingStatus: { $nin: ['cancelled', 'rejected'] },
      $or: [
        // Find all bookings that overlap with the requested date range
        { $and: [{ checkIn: { $lte: end } }, { checkOut: { $gte: start } }] },
      ],
    }).select(
      '_id checkIn checkOut checkInTime checkOutTime user bookingStatus paymentStatus'
    );

    console.log(
      `[Server] Found ${existingBookings.length} bookings for room ${roomId}`
    );

    // Log each booking for debugging
    existingBookings.forEach((booking, index) => {
      console.log(
        `[Server] Booking ${index + 1}: ID=${booking._id}, Status=${
          booking.bookingStatus
        }, Check-in=${booking.checkIn.toISOString().split('T')[0]}, Check-out=${
          booking.checkOut.toISOString().split('T')[0]
        }`
      );
    });

    const hostBlockedDates = room.availability.unavailableDates || [];

    // Normalize host-blocked dates to midnight
    const normalizedHostBlockedDates = hostBlockedDates.map((date) => {
      const normalizedDate = new Date(date);
      normalizedDate.setHours(0, 0, 0, 0);
      return normalizedDate;
    });

    // Combine all unavailable dates for THIS SPECIFIC ROOM ONLY
    let allUnavailableDates = [...normalizedHostBlockedDates];

    // Add dates from existing bookings for THIS ROOM ONLY
    existingBookings.forEach((booking) => {
      const bookingStart = new Date(booking.checkIn);
      const bookingEnd = new Date(booking.checkOut);

      // Set hours to midnight for date comparison
      bookingStart.setHours(0, 0, 0, 0);
      bookingEnd.setHours(0, 0, 0, 0);

      // Add all dates between start and end (inclusive)
      let currentDate = new Date(bookingStart);
      while (currentDate <= bookingEnd) {
        // Check for duplicate dates before adding
        const isDuplicate = allUnavailableDates.some(
          (date) =>
            date.getFullYear() === currentDate.getFullYear() &&
            date.getMonth() === currentDate.getMonth() &&
            date.getDate() === currentDate.getDate()
        );

        if (!isDuplicate) {
          allUnavailableDates.push(new Date(currentDate));
          console.log(
            `[Server] Added date ${
              currentDate.toISOString().split('T')[0]
            } as unavailable from booking ID=${booking._id}`
          );
        }

        // Move to next day
        const nextDate = new Date(currentDate);
        nextDate.setDate(nextDate.getDate() + 1);
        currentDate = nextDate;
      }
    });

    // Format times in 12-hour format for the client and ensure roomId is included
    const formattedBookings = existingBookings.map((booking) => {
      const formattedBooking = {
        _id: booking._id,
        roomId: roomId, // Explicitly add roomId to each booking
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        checkInTime: convertTo12HourFormat(booking.checkInTime || '14:00'),
        checkOutTime: convertTo12HourFormat(booking.checkOutTime || '12:00'),
        userId: booking.user, // Include the user ID for identity checking
        bookingStatus: booking.bookingStatus,
        paymentStatus: booking.paymentStatus,
      };
      return formattedBooking;
    });

    console.log(
      `[Server] Returning ${allUnavailableDates.length} unavailable dates for room ${roomId}`
    );

    res.status(200).json({
      success: true,
      data: {
        roomId: roomId,
        unavailableDates: allUnavailableDates,
        existingBookings: formattedBookings,
      },
    });
  } catch (error: any) {
    console.error(
      `[Server] Error in getRoomAvailability for room ${req.params.roomId}:`,
      error
    );
    res.status(500).json({
      success: false,
      message: 'Error checking room availability',
      error: error.message,
    });
  }
};

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

export const updateRoomAvailability = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { startDate, endDate, isAlwaysAvailable, unavailableDates } =
      req.body;

    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found',
      });
      return;
    }

    // Check if user is the host or admin
    if (room.host.toString() !== req.user.id && req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to update room availability',
      });
      return;
    }

    // Update availability
    if (startDate) room.availability.startDate = new Date(startDate);
    if (endDate) room.availability.endDate = new Date(endDate);
    if (isAlwaysAvailable !== undefined) {
      room.availability.isAlwaysAvailable = isAlwaysAvailable;
    }

    if (unavailableDates && Array.isArray(unavailableDates)) {
      // Convert string dates to Date objects
      room.availability.unavailableDates = unavailableDates.map(
        (date) => new Date(date)
      );
    }

    await room.save();

    res.status(200).json({
      success: true,
      message: 'Room availability updated successfully',
      data: room.availability,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating room availability',
      error: error.message,
    });
  }
};

export const uploadRoomImages = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { roomId } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No files uploaded',
      });
      return;
    }

    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found',
      });
      return;
    }

    // Verify ownership
    if (room.host.toString() !== req.user.id && req.user.role !== 'admin') {
      await Promise.all(
        files.map((file) =>
          fs
            .unlink(file.path)
            .catch((err) => console.error('Error deleting file:', err))
        )
      );

      res.status(403).json({
        success: false,
        message: 'Not authorized to upload images for this room',
      });
      return;
    }

    // Process uploaded files - upload to Supabase
    const uploadPromises = files.map((file) => uploadImage(file.path, 'rooms'));
    const imageUrls = await Promise.all(uploadPromises);

    // Filter out any failed uploads
    const validImageUrls = imageUrls.filter((url) => url !== null) as string[];

    if (validImageUrls.length === 0) {
      res.status(500).json({
        success: false,
        message: 'Failed to upload images',
      });
      return;
    }

    // Add new images to room
    room.images = [...room.images, ...validImageUrls];
    await room.save();

    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      data: {
        images: validImageUrls,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error uploading images',
      error: error.message,
    });
  }
};

// Delete room image
export const deleteRoomImage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { roomId, imageId } = req.params;

    // Find room
    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found',
      });
      return;
    }

    // Verify ownership
    if (room.host.toString() !== req.user.id && req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to delete images for this room',
      });
      return;
    }

    // Find image in the room's images array
    const imageIndex = room.images.findIndex((img) => img.includes(imageId));
    if (imageIndex === -1) {
      res.status(404).json({
        success: false,
        message: 'Image not found',
      });
      return;
    }

    // Delete from Supabase
    const imageUrl = room.images[imageIndex];
    await deleteImage(imageUrl);

    // Remove image from room's images array
    room.images.splice(imageIndex, 1);
    await room.save();

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error deleting image',
      error: error.message,
    });
  }
};
