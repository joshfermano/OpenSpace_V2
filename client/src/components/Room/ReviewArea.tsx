import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FaStar,
  FaRegStar,
  FaEdit,
  FaTrash,
  FaUserCircle,
  FaAngleRight,
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { reviewApi } from '../../services/reviewApi';
import { getImageUrl } from '../../utils/imageUtils';

interface Review {
  _id: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  rating: number;
  comment: string;
  createdAt: string;
  isAnonymous: boolean;
  photos?: string[];
  booking?: string;
}

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  bookingId?: string;
  reviewToEdit?: Review;
  onSubmitSuccess: () => void;
}

interface ReviewAreaProps {
  roomId: string;
  userHasBooking?: boolean;
  limitReviews?: boolean;
}

// Review Modal Component
const ReviewModal = ({
  isOpen,
  onClose,
  roomId,
  bookingId,
  reviewToEdit,
  onSubmitSuccess,
}: ReviewModalProps) => {
  // Existing code remains the same
  const [rating, setRating] = useState(reviewToEdit ? reviewToEdit.rating : 5);
  const [comment, setComment] = useState(
    reviewToEdit ? reviewToEdit.comment : ''
  );
  const [isAnonymous, setIsAnonymous] = useState(
    reviewToEdit ? reviewToEdit.isAnonymous : false
  );
  const [photos, setPhotos] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Reset form when opened/closed
    if (isOpen) {
      setRating(reviewToEdit ? reviewToEdit.rating : 5);
      setComment(reviewToEdit ? reviewToEdit.comment : '');
      setIsAnonymous(reviewToEdit ? reviewToEdit.isAnonymous : false);
      setPhotos([]);
      setError('');
    }
  }, [isOpen, reviewToEdit]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);
      // Limit to 3 photos
      if (fileArray.length > 3) {
        setError('You can upload a maximum of 3 photos');
        return;
      }
      setPhotos(fileArray);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (!bookingId && !reviewToEdit) {
      setError('Missing booking information');
      setIsSubmitting(false);
      return;
    }

    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('roomId', roomId);
      if (bookingId) formData.append('bookingId', bookingId);
      formData.append('rating', rating.toString());
      formData.append('comment', comment);
      formData.append('isAnonymous', isAnonymous.toString());

      // Log files before appending
      console.log(
        `Uploading ${photos.length} photos:`,
        photos.map((photo) => `${photo.name} (${photo.size} bytes)`)
      );

      // Important: append each photo with the same field name 'photos'
      if (photos.length > 0) {
        photos.forEach((photo) => {
          formData.append('photos', photo);
        });
      }

      let response;

      // Use the reviewApi service instead of direct fetch
      if (reviewToEdit) {
        response = await reviewApi.updateReview(reviewToEdit._id, formData);
      } else {
        response = await reviewApi.createReview(formData);
      }

      if (!response.success) {
        throw new Error(response.message || 'Failed to submit review');
      }

      onSubmitSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error submitting review:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6 shadow-xl">
        <h2 className="text-xl font-bold mb-4 text-darkBlue dark:text-light">
          {reviewToEdit ? 'Edit Your Review' : 'Write a Review'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Rating Stars */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-darkBlue dark:text-gray-300">
              Rating
            </label>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="text-2xl mr-1 focus:outline-none">
                  {star <= rating ? (
                    <FaStar className="text-yellow-400" />
                  ) : (
                    <FaRegStar className="text-gray-400" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="mb-4">
            <label
              htmlFor="comment"
              className="block text-sm font-medium mb-2 text-darkBlue dark:text-gray-300">
              Your Review
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-darkBlue dark:text-light"
              placeholder="Share your experience..."
              maxLength={500}
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 text-right mt-1">
              {comment.length}/500
            </div>
          </div>

          {/* Photo Upload */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-darkBlue dark:text-gray-300">
              Add Photos (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-darkBlue dark:text-light text-sm"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Maximum 3 photos (JPG, PNG)
            </p>
          </div>

          {/* Anonymous Option */}
          <div className="mb-5">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={() => setIsAnonymous(!isAnonymous)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Post anonymously
              </span>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none"
              disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={isSubmitting}>
              {isSubmitting
                ? 'Submitting...'
                : reviewToEdit
                ? 'Update'
                : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Profile Avatar Component
const ProfileAvatar = ({ review }: { review: Review }) => {
  const [imageError, setImageError] = useState(false);

  const displayName = review.isAnonymous
    ? 'Anonymous'
    : `${review.user.firstName} ${review.user.lastName}`;

  const nameInitial = review.isAnonymous
    ? 'A'
    : review.user.firstName.charAt(0).toUpperCase();

  if (review.isAnonymous) {
    return (
      <FaUserCircle className="h-10 w-10 text-gray-400 dark:text-gray-600" />
    );
  }

  if (review.user.profileImage && !imageError) {
    return (
      <img
        src={getImageUrl(review.user.profileImage)}
        alt={displayName}
        className="h-10 w-10 rounded-full object-cover"
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-medium">
      {nameInitial}
    </div>
  );
};

// Review Card Component
const ReviewCard = ({
  review,
  currentUserId,
  onEdit,
  onDelete,
}: {
  review: Review;
  currentUserId: string | null;
  onEdit: (review: Review) => void;
  onDelete: (reviewId: string) => void;
}) => {
  // Create display name from firstName and lastName
  const displayName = review.isAnonymous
    ? 'Anonymous'
    : `${review.user.firstName} ${review.user.lastName}`;

  const isCurrentUserReview =
    currentUserId && review.user._id === currentUserId;

  const formattedDate = new Date(review.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
      <div className="flex justify-between">
        <div className="flex items-center">
          <ProfileAvatar review={review} />
          <div className="ml-3">
            <p className="font-medium text-darkBlue dark:text-light">
              {displayName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formattedDate}
            </p>
          </div>
        </div>

        {/* Stars */}
        <div className="flex text-yellow-400">
          {[...Array(5)].map((_, i) => (
            <FaStar
              key={i}
              className={
                i < review.rating
                  ? 'text-yellow-400'
                  : 'text-gray-300 dark:text-gray-600'
              }
            />
          ))}
        </div>
      </div>

      {/* Review Comment */}
      <p className="mt-3 text-gray-700 dark:text-gray-300">{review.comment}</p>

      {/* Review Photos */}
      {review.photos && review.photos.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {review.photos.map((photo, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-20 h-20 rounded-md overflow-hidden">
              <img
                src={photo}
                alt={`Review photo ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Action buttons for user's own review */}
      {isCurrentUserReview && (
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={() => onEdit(review)}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm flex items-center"
            aria-label="Edit review">
            <FaEdit className="mr-1" /> Edit
          </button>
          <button
            onClick={() => onDelete(review._id)}
            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm flex items-center"
            aria-label="Delete review">
            <FaTrash className="mr-1" /> Delete
          </button>
        </div>
      )}
    </div>
  );
};

// Main ReviewArea Component
const ReviewArea = ({ roomId, limitReviews = true }: ReviewAreaProps) => {
  const { user, isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reviewToEdit, setReviewToEdit] = useState<Review | undefined>(
    undefined
  );
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [userCanReview, setUserCanReview] = useState(false);
  const [bookingId, setBookingId] = useState<string | undefined>(undefined);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null
  );

  // Fetch reviews for the room
  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const response = await reviewApi.getRoomReviews(roomId);

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch reviews');
      }

      setReviews(response.data || []);
      setAverageRating(response.averageRating || 0);
      setReviewCount(response.count || 0);

      // Check if user can review
      if (isAuthenticated && user) {
        checkEligibility();
      }
    } catch (err: any) {
      console.error('Error fetching reviews:', err);
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user can review this room
  const checkEligibility = async () => {
    try {
      const eligibilityResponse = await reviewApi.checkReviewEligibility(
        roomId
      );

      if (eligibilityResponse.success) {
        setUserCanReview(eligibilityResponse.canReview || false);
        setBookingId(eligibilityResponse.bookingId);
      } else {
        setUserCanReview(false);
      }
    } catch (err) {
      console.error('Error checking review eligibility:', err);
      setUserCanReview(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [roomId, isAuthenticated, user]);

  const handleWriteReview = () => {
    setReviewToEdit(undefined);
    setIsModalOpen(true);
  };

  const handleEditReview = (review: Review) => {
    setReviewToEdit(review);
    setIsModalOpen(true);
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (showDeleteConfirm === reviewId) {
      try {
        const response = await reviewApi.deleteReview(reviewId);

        if (!response.success) {
          throw new Error(response.message || 'Failed to delete review');
        }

        // Refresh reviews after deletion
        fetchReviews();
        setShowDeleteConfirm(null);
      } catch (err: any) {
        console.error('Error deleting review:', err);
        setError(err.message || 'Failed to delete review');
      }
    } else {
      setShowDeleteConfirm(reviewId);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(null);
  };

  // Determine which reviews to display (all or limited)
  const displayedReviews =
    limitReviews && reviews.length > 2 ? reviews.slice(0, 2) : reviews;

  // Whether to show the View All button
  const showViewAllButton = limitReviews && reviews.length > 2;

  return (
    <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-darkBlue dark:text-light">
          Reviews ({reviewCount})
        </h2>
        <div className="flex items-center">
          <div className="flex text-yellow-400 mr-2">
            {[...Array(5)].map((_, i) => (
              <FaStar
                key={i}
                className={
                  i < Math.round(averageRating)
                    ? 'text-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                }
              />
            ))}
          </div>
          <span className="text-darkBlue dark:text-light">
            {averageRating.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Show review button if user can review */}
      {isAuthenticated && userCanReview && (
        <div className="mb-6">
          <button
            onClick={handleWriteReview}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium shadow-sm focus:outline-none">
            Write a Review
          </button>
        </div>
      )}

      {/* Reviews List */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <div className="animate-pulse text-gray-500 dark:text-gray-400">
            Loading reviews...
          </div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md">
          {error}
        </div>
      ) : displayedReviews.length === 0 ? (
        <div className="py-6 text-center text-gray-500 dark:text-gray-400">
          No reviews yet for this room.
        </div>
      ) : (
        <div>
          {displayedReviews.map((review) => (
            <div key={review._id}>
              <ReviewCard
                review={review}
                currentUserId={user?._id ? String(user._id) : null}
                onEdit={handleEditReview}
                onDelete={handleDeleteReview}
              />

              {/* Delete Confirmation */}
              {showDeleteConfirm === review._id && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow-md border border-gray-200 dark:border-gray-700 mb-4">
                  <p className="text-darkBlue dark:text-light mb-3">
                    Are you sure you want to delete this review? This action
                    cannot be undone.
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={cancelDelete}
                      className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md text-sm">
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeleteReview(review._id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm">
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* View All Reviews Button */}
          {showViewAllButton && (
            <div className="mt-4 text-center">
              <Link
                to={`/rooms/${roomId}/reviews`}
                className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                View all {reviewCount} reviews <FaAngleRight className="ml-1" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      <ReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        roomId={roomId}
        bookingId={bookingId}
        reviewToEdit={reviewToEdit}
        onSubmitSuccess={fetchReviews}
      />
    </div>
  );
};

export default ReviewArea;
