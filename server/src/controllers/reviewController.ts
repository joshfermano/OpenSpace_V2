import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Review from '../models/Review';
import Room from '../models/Room';
import Booking from '../models/Booking';
import {} from '../models/User';
import { uploadImage } from '../services/imageService';

// Define a custom Request type that includes the user property
type AuthRequest = Request;

// Add interfaces for handling anonymous user reviews
interface AnonymousUser {
  firstName: string;
  lastName: string;
  profileImage: string | null;
  _id?: mongoose.Types.ObjectId;
  [key: string]: any;
}

interface ReviewWithAnonymousUser {
  user: AnonymousUser;
  [key: string]: any;
}

// Create a new review
export const createReview = async (
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
    const { roomId, bookingId, rating, comment, isAnonymous } = req.body;

    // Validate required fields
    if (!roomId || !bookingId || !rating || !comment) {
      res.status(400).json({
        success: false,
        message: 'Room ID, booking ID, rating, and comment are required',
      });
      return;
    }

    // Check if the rating is valid (1-5)
    if (parseInt(rating) < 1 || parseInt(rating) > 5) {
      res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
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

    if (booking.user.toString() !== userId) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to review this booking',
      });
      return;
    }

    // Check if booking is completed
    if (booking.bookingStatus !== 'completed') {
      res.status(400).json({
        success: false,
        message: 'Cannot review a booking that is not completed',
      });
      return;
    }

    // Check if booking is for the specified room
    if (booking.room.toString() !== roomId) {
      res.status(400).json({
        success: false,
        message: 'Booking is not for the specified room',
      });
      return;
    }

    // Check if a review already exists for this booking
    if (booking.reviewId) {
      res.status(400).json({
        success: false,
        message: 'A review already exists for this booking',
      });
      return;
    }

    // Handle file uploads
    const photoFiles = req.files as Express.Multer.File[];
    let photosPaths: string[] = [];

    if (photoFiles && photoFiles.length > 0) {
      // Upload each file to Supabase instead of just storing local paths
      const uploadPromises = photoFiles.map((file) =>
        uploadImage(file.path, 'reviews')
      );

      // Wait for all uploads to complete
      const uploadedUrls = await Promise.all(uploadPromises);

      // Filter out any null results (failed uploads)
      photosPaths = uploadedUrls.filter((url) => url !== null) as string[];

      console.log('Uploaded review photos:', photosPaths);
    }

    // Create the review
    const review = await Review.create({
      room: roomId,
      user: userId,
      booking: bookingId,
      rating: parseInt(rating),
      comment,
      photos: photosPaths,
      isAnonymous: isAnonymous === 'true',
    });

    // Update the booking with the review ID
    booking.reviewId = review._id as unknown as mongoose.Types.ObjectId;
    await booking.save();

    // Update room rating
    await updateRoomRating(roomId);

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: review,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error creating review',
      error: error.message,
    });
  }
};

export const checkReviewEligibility = async (
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

    // Check if user has completed a booking for this room
    const completedBooking = await Booking.findOne({
      user: userId,
      room: roomId,
      bookingStatus: 'completed',
    });

    if (!completedBooking) {
      res.status(200).json({
        success: true,
        canReview: false,
        message: 'You must complete a stay before reviewing',
      });
      return;
    }

    // Check if user already has a review for this booking
    const existingReview = await Review.findOne({
      user: userId,
      room: roomId,
      booking: completedBooking._id,
    });

    res.status(200).json({
      success: true,
      canReview: !existingReview,
      message: existingReview
        ? 'You have already reviewed this stay'
        : 'You can review this room',
      bookingId: completedBooking._id,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error checking review eligibility',
      error: error.message,
    });
  }
};

// Helper function to update room rating
const updateRoomRating = async (roomId: string): Promise<void> => {
  try {
    // Get all reviews for the room
    const reviews = await Review.find({ room: roomId });

    if (reviews.length === 0) {
      // No reviews, set rating to 0
      await Room.findByIdAndUpdate(roomId, {
        'ratings.average': 0,
        'ratings.count': 0,
      });
      return;
    }

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    // Update room with new rating
    await Room.findByIdAndUpdate(roomId, {
      'ratings.average': parseFloat(averageRating.toFixed(1)),
      'ratings.count': reviews.length,
    });
  } catch (error) {
    console.error('Error updating room rating:', error);
  }
};

// Get reviews for a room
export const getRoomReviews = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
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

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get reviews
    const reviews = await Review.find({ room: roomId })
      .populate({
        path: 'user',
        select: 'firstName lastName profileImage',
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Process reviews to handle anonymous ones
    const processedReviews = reviews.map((review) => {
      if (review.isAnonymous) {
        const anonymousReview =
          review.toObject() as unknown as ReviewWithAnonymousUser;
        anonymousReview.user = {
          _id: anonymousReview.user._id, // Keep the ID for permission checks
          firstName: 'Anonymous',
          lastName: 'User',
          profileImage: null,
        };
        return anonymousReview;
      }
      return review;
    });

    const total = await Review.countDocuments({ room: roomId });

    // Calculate average rating
    const allReviews = await Review.find({ room: roomId });
    const totalRating = allReviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );
    const averageRating =
      allReviews.length > 0 ? totalRating / allReviews.length : 0;

    res.status(200).json({
      success: true,
      count: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: processedReviews,
      averageRating,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reviews',
      error: error.message,
    });
  }
};

// Get user's reviews
export const getUserReviews = async (
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

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get reviews
    const reviews = await Review.find({ user: userId })
      .populate({
        path: 'room',
        select: 'title images location',
      })
      .populate({
        path: 'booking',
        select: 'checkIn checkOut',
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Review.countDocuments({ user: userId });

    res.status(200).json({
      success: true,
      count: reviews.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: reviews,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user reviews',
      error: error.message,
    });
  }
};

// Get host's received reviews
export const getHostReviews = async (
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

    // Get rooms owned by the host
    const rooms = await Room.find({ host: userId }).select('_id');
    const roomIds = rooms.map((room) => room._id);

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get reviews for host's rooms
    const reviews = await Review.find({ room: { $in: roomIds } })
      .populate({
        path: 'user',
        select: 'firstName lastName profileImage',
      })
      .populate({
        path: 'room',
        select: 'title images location',
      })
      .populate({
        path: 'booking',
        select: 'checkIn checkOut',
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Process reviews to handle anonymous ones
    const processedReviews = reviews.map((review) => {
      if (review.isAnonymous) {
        const anonymousReview =
          review.toObject() as unknown as ReviewWithAnonymousUser;
        anonymousReview.user = {
          firstName: 'Anonymous',
          lastName: 'User',
          profileImage: null,
        };
        return anonymousReview;
      }
      return review;
    });

    const total = await Review.countDocuments({ room: { $in: roomIds } });

    res.status(200).json({
      success: true,
      count: processedReviews.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: processedReviews,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching host reviews',
      error: error.message,
    });
  }
};

// Get a single review by ID
export const getReviewById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { reviewId } = req.params;
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    // Check if ID is valid
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid review ID',
      });
      return;
    }

    // Find review
    const review = await Review.findById(reviewId)
      .populate({
        path: 'user',
        select: 'firstName lastName profileImage',
      })
      .populate({
        path: 'room',
        select: 'title images location host',
      })
      .populate({
        path: 'booking',
        select: 'checkIn checkOut',
      });

    if (!review) {
      res.status(404).json({
        success: false,
        message: 'Review not found',
      });
      return;
    }

    // Check if the user is authorized to view this review
    const user = review.user as any;
    const room = review.room as any;

    const isReviewer = user._id.toString() === req.user.id;
    const isRoomHost = room.host.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    // If anonymous and not authorized, hide user details
    let responseReview;
    if (review.isAnonymous && !isReviewer && !isRoomHost && !isAdmin) {
      const anonymousReview =
        review.toObject() as unknown as ReviewWithAnonymousUser;
      anonymousReview.user = {
        firstName: 'Anonymous',
        lastName: 'User',
        profileImage: null,
      };
      responseReview = anonymousReview;
    } else {
      responseReview = review;
    }

    res.status(200).json({
      success: true,
      data: responseReview,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching review',
      error: error.message,
    });
  }
};

// Update a review
export const updateReview = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { reviewId } = req.params;
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }
    const userId = req.user.id;
    const { rating, comment, isAnonymous } = req.body;

    // Find review
    const review = await Review.findById(reviewId);
    if (!review) {
      res.status(404).json({
        success: false,
        message: 'Review not found',
      });
      return;
    }

    // Check if user is the reviewer
    if (review.user.toString() !== userId) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to update this review',
      });
      return;
    }

    // Check if the rating is valid (1-5)
    if (rating && (rating < 1 || rating > 5)) {
      res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
      return;
    }

    // Handle photo uploads
    const photoFiles = req.files as Express.Multer.File[];
    let photosPaths: string[] = [];

    if (photoFiles && photoFiles.length > 0) {
      // Upload each file to Supabase
      const uploadPromises = photoFiles.map((file) =>
        uploadImage(file.path, 'reviews')
      );

      // Wait for all uploads to complete
      const uploadedUrls = await Promise.all(uploadPromises);

      // Filter out any null results (failed uploads)
      photosPaths = uploadedUrls.filter((url) => url !== null) as string[];

      console.log('Updated review photos:', photosPaths);

      // Update photos field
      review.photos = photosPaths;
    }

    // Update review fields
    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) review.comment = comment;
    if (isAnonymous !== undefined) review.isAnonymous = isAnonymous;

    // Save updated review
    await review.save();

    // Update room rating if the rating changed
    if (rating !== undefined) {
      await updateRoomRating(review.room.toString());
    }

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: review,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating review',
      error: error.message,
    });
  }
};

// Delete a review
export const deleteReview = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { reviewId } = req.params;
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }
    const userId = req.user.id;

    // Find review
    const review = await Review.findById(reviewId);
    if (!review) {
      res.status(404).json({
        success: false,
        message: 'Review not found',
      });
      return;
    }

    // Check if user is the reviewer or admin
    if (review.user.toString() !== userId && req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review',
      });
      return;
    }

    // Get room ID before deleting for rating update
    const roomId = review.room.toString();

    // Find and update the booking to remove review reference
    await Booking.findByIdAndUpdate(review.booking, {
      $unset: { reviewId: 1 },
    });

    // Delete the review
    await Review.findByIdAndDelete(reviewId);

    // Update room rating
    await updateRoomRating(roomId);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error deleting review',
      error: error.message,
    });
  }
};
