import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FiMapPin,
  FiUsers,
  FiTag,
  FiTrash2,
  FiPlus,
  FiAlertTriangle,
  FiInfo,
} from 'react-icons/fi';
import { FaPesoSign } from 'react-icons/fa6';
import { MdOutlineRule } from 'react-icons/md';
import { roomApi } from '../../services/roomApi';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../services/core';
import placeholder from '../../assets/logo_black.jpg';
import { getImageUrl, handleImageError } from '../../utils/imageUtils';

// Common amenities options
const AMENITIES_OPTIONS = [
  'Wi-Fi',
  'Air Conditioning',
  'Projector',
  'Whiteboard',
  'Coffee/Tea',
  'Microphone',
  'Speaker System',
  'Catering Available',
  'Restrooms',
  'Parking',
  'Accessible Entry',
  'Natural Lighting',
  'Outdoor Space',
];

// Room categories
const CATEGORIES = ['Conference Room', 'Events Place', 'Room Stay'];

// Map frontend categories to backend types
const categoryToType: Record<string, string> = {
  'Conference Room': 'conference',
  'Events Place': 'event',
  'Room Stay': 'stay',
};

// Map backend types to frontend categories
const typeToCategory: Record<string, string> = {
  conference: 'Conference Room',
  event: 'Events Place',
  stay: 'Room Stay',
};

const EditRoom = () => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated, user } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>('');

  // Check if user can edit rooms (must be a host)
  useEffect(() => {
    if (isAuthenticated && user && user.role !== 'host') {
      navigate('/dashboard');
    } else if (!isAuthenticated) {
      navigate('/auth/login?redirect=/rooms/edit/' + roomId);
    }
  }, [isAuthenticated, user, navigate, roomId]);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: {
      address: '',
      city: '',
      state: '',
      country: 'Philippines',
      zipCode: '',
    },
    type: '',
    price: {
      basePrice: '',
      cleaningFee: '0',
      serviceFee: '0',
    },
    capacity: {
      maxGuests: '',
    },
    amenities: [] as string[],
    houseRules: {
      checkInTime: '14:00',
      checkOutTime: '12:00',
      instantBooking: false,
      cancellationPolicy: 'Standard 48-hour cancellation policy',
      additionalRules: [] as string[],
    },
    images: [] as string[],
  });

  // Rules state
  const [rules, setRules] = useState<string[]>([]);
  const [newRule, setNewRule] = useState('');

  // Image files state
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);

  // Error state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [submitSuccess, setSubmitSuccess] = useState<boolean | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string>('');

  // Fetch room data on component mount
  useEffect(() => {
    const fetchRoomData = async () => {
      if (!roomId) return;

      setIsLoading(true);
      try {
        // Fetch room details
        const response = await roomApi.getRoomById(roomId);

        if (response.success) {
          const roomData = response.data;
          setCurrentStatus(roomData.status || 'pending');

          // Set form data from fetched room data
          setFormData({
            title: roomData.title || '',
            description: roomData.description || '',
            location: {
              address: roomData.location?.address || '',
              city: roomData.location?.city || '',
              state: roomData.location?.state || '',
              country: roomData.location?.country || 'Philippines',
              zipCode: roomData.location?.zipCode || '',
            },
            type: roomData.type || '',
            price: {
              basePrice: roomData.price?.basePrice?.toString() || '',
              cleaningFee: roomData.price?.cleaningFee?.toString() || '0',
              serviceFee: roomData.price?.serviceFee?.toString() || '0',
            },
            capacity: {
              maxGuests: roomData.capacity?.maxGuests?.toString() || '',
            },
            amenities: roomData.amenities || [],
            houseRules: {
              checkInTime: roomData.houseRules?.checkInTime || '14:00',
              checkOutTime: roomData.houseRules?.checkOutTime || '12:00',
              instantBooking: roomData.houseRules?.instantBooking || false,
              cancellationPolicy:
                roomData.houseRules?.cancellationPolicy ||
                'Standard 48-hour cancellation policy',
              additionalRules: roomData.houseRules?.additionalRules || [],
            },
            images: roomData.images || [],
          });

          // Set rules state
          setRules(roomData.houseRules?.additionalRules || []);

          // Create image preview URLs for existing images
          if (roomData.images && roomData.images.length > 0) {
            setImagePreviewUrls(
              roomData.images.map((img: string) => getImageUrl(img))
            );
          }
        } else {
          setErrors({
            form: 'Failed to load room data: ' + response.message,
          });
        }
      } catch (error: any) {
        console.error('Error fetching room data:', error);
        setErrors({
          form: 'Failed to load room data. Please try again later.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomData();
  }, [roomId]);

  // Update formData.houseRules.additionalRules whenever rules change
  useEffect(() => {
    setFormData((prevData) => ({
      ...prevData,
      houseRules: {
        ...prevData.houseRules,
        additionalRules: rules,
      },
    }));
  }, [rules]);

  // Helper function to get the full image URL
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return placeholder;
    if (imagePath.startsWith('http')) return imagePath;
    return `${API_URL}${imagePath}`;
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData((prevData) => {
        // Safely access the parent property
        const parentObj = prevData[parent as keyof typeof prevData];

        // Make sure it's an object before spreading
        if (
          parentObj &&
          typeof parentObj === 'object' &&
          !Array.isArray(parentObj)
        ) {
          return {
            ...prevData,
            [parent]: {
              ...parentObj,
              [child]: value,
            },
          };
        }

        // If it's not a valid object, return unchanged state
        return prevData;
      });
    } else {
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }

    // Clear error when field is edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  // For handling type selection (mapping to backend types)
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const category = e.target.value;
    const type = categoryToType[category] || '';

    setFormData({
      ...formData,
      type: type,
    });

    if (errors.type) {
      setErrors({
        ...errors,
        type: '',
      });
    }
  };

  // Handle amenity selection
  const handleAmenityToggle = (amenity: string) => {
    if (formData.amenities.includes(amenity)) {
      setFormData({
        ...formData,
        amenities: formData.amenities.filter((a) => a !== amenity),
      });
    } else {
      setFormData({
        ...formData,
        amenities: [...formData.amenities, amenity],
      });
    }

    // Clear amenities error if it exists and we now have amenities
    if (errors.amenities && formData.amenities.length > 0) {
      setErrors({
        ...errors,
        amenities: '',
      });
    }
  };

  // Handle adding a new rule
  const handleAddRule = () => {
    if (newRule.trim()) {
      const updatedRules = [...rules, newRule.trim()];
      setRules(updatedRules);
      setNewRule('');

      // Also clear rules error if it exists
      if (errors.rules) {
        setErrors({
          ...errors,
          rules: '',
        });
      }
    }
  };

  // Handle removing a rule
  const handleRemoveRule = (index: number) => {
    const updatedRules = [...rules];
    updatedRules.splice(index, 1);
    setRules(updatedRules);
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);

    // Check file size and type
    const validFiles = newFiles.filter((file) => {
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      const isValidType = file.type.startsWith('image/');

      if (!isValidSize) {
        setErrors({
          ...errors,
          images: 'One or more images exceed the 10MB limit',
        });
      } else if (!isValidType) {
        setErrors({
          ...errors,
          images: 'Only image files are allowed',
        });
      }

      return isValidSize && isValidType;
    });

    const updatedFiles = [...imageFiles, ...validFiles];
    setImageFiles(updatedFiles);

    // Generate preview URLs
    const newPreviewUrls = validFiles.map((file) => URL.createObjectURL(file));

    // Add these to the existing preview URLs
    const currentPreviews = [...imagePreviewUrls];
    setImagePreviewUrls([...currentPreviews, ...newPreviewUrls]);

    // Clear error if it exists and we now have images
    if (
      errors.images &&
      (updatedFiles.length > 0 || formData.images.length > 0)
    ) {
      setErrors({
        ...errors,
        images: '',
      });
    }
  };

  // Trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Remove existing image
  const removeExistingImage = (index: number) => {
    // Create a new array without the removed image
    const updatedImages = [...formData.images];
    updatedImages.splice(index, 1);

    // Remove from preview URLs as well
    const updatedPreviewUrls = [...imagePreviewUrls];
    updatedPreviewUrls.splice(index, 1);

    setFormData({
      ...formData,
      images: updatedImages,
    });

    setImagePreviewUrls(updatedPreviewUrls);

    // Add error if no images left
    if (updatedImages.length === 0 && imageFiles.length === 0) {
      setErrors({
        ...errors,
        images: 'At least one image is required',
      });
    }
  };

  // Remove new image
  const removeNewImage = (index: number) => {
    // Find the actual index in the imageFiles array
    const newImageIndex = index - formData.images.length;
    if (newImageIndex < 0) return;

    // Revoke the URL to prevent memory leaks
    URL.revokeObjectURL(imagePreviewUrls[index]);

    const updatedFiles = [...imageFiles];
    updatedFiles.splice(newImageIndex, 1);

    const updatedPreviewUrls = [...imagePreviewUrls];
    updatedPreviewUrls.splice(index, 1);

    setImageFiles(updatedFiles);
    setImagePreviewUrls(updatedPreviewUrls);

    // Add error if no images left
    if (formData.images.length === 0 && updatedFiles.length === 0) {
      setErrors({
        ...errors,
        images: 'At least one image is required',
      });
    }
  };

  // For numeric inputs only
  const handleNumericInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (value === '' || /^\d+$/.test(value)) {
      if (name.includes('.')) {
        const [parent, child] = name.split('.');
        setFormData((prevData) => {
          // Safely access the parent property
          const parentObj = prevData[parent as keyof typeof prevData];

          // Make sure it's an object before spreading
          if (
            parentObj &&
            typeof parentObj === 'object' &&
            !Array.isArray(parentObj)
          ) {
            return {
              ...prevData,
              [parent]: {
                ...parentObj,
                [child]: value,
              },
            };
          }

          return prevData;
        });
      } else {
        setFormData({
          ...formData,
          [name]: value,
        });
      }

      if (errors[name]) {
        setErrors({
          ...errors,
          [name]: '',
        });
      }
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    if (!formData.title.trim()) newErrors['title'] = 'Name is required';
    if (!formData.type) newErrors['type'] = 'Category is required';
    if (!formData.description.trim())
      newErrors['description'] = 'Description is required';

    // Location validation
    if (!formData.location.address.trim())
      newErrors['location.address'] = 'Address is required';
    if (!formData.location.city.trim())
      newErrors['location.city'] = 'City is required';
    if (!formData.location.state.trim())
      newErrors['location.state'] = 'State/Province is required';
    if (!formData.location.zipCode.trim())
      newErrors['location.zipCode'] = 'Zip code is required';

    // Price validation
    if (!formData.price.basePrice.trim())
      newErrors['price.basePrice'] = 'Price is required';
    else if (
      isNaN(Number(formData.price.basePrice)) ||
      Number(formData.price.basePrice) <= 0
    ) {
      newErrors['price.basePrice'] = 'Price must be a positive number';
    }

    // Capacity validation
    if (!formData.capacity.maxGuests.trim())
      newErrors['capacity.maxGuests'] = 'Capacity is required';
    else if (
      isNaN(Number(formData.capacity.maxGuests)) ||
      Number(formData.capacity.maxGuests) <= 0
    ) {
      newErrors['capacity.maxGuests'] = 'Capacity must be a positive number';
    }

    // Amenities validation
    if (formData.amenities.length === 0)
      newErrors['amenities'] = 'Select at least one amenity';

    // Rules validation
    if (rules.length === 0) newErrors['rules'] = 'Add at least one house rule';

    // Images validation
    if (formData.images.length === 0 && imageFiles.length === 0)
      newErrors['images'] = 'At least one image is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitSuccess(null);
    setSubmitMessage('');

    try {
      // Prepare data for API
      const updateData = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        type: formData.type,
        price: {
          basePrice: parseInt(formData.price.basePrice),
          cleaningFee: parseInt(formData.price.cleaningFee || '0'),
          serviceFee: parseInt(formData.price.serviceFee || '0'),
        },
        capacity: {
          maxGuests: parseInt(formData.capacity.maxGuests),
        },
        amenities: formData.amenities,
        houseRules: formData.houseRules,
      };

      // Update room info
      const roomResponse = await roomApi.updateRoom(roomId || '', updateData);

      if (!roomResponse.success) {
        throw new Error(roomResponse.message || 'Failed to update room');
      }

      // Then, if we have new images, upload them
      if (imageFiles.length > 0) {
        const formDataObj = new FormData();
        imageFiles.forEach((file) => {
          formDataObj.append('images', file);
        });

        // Use fetch directly for file uploads with full URL
        const imageResponse = await fetch(
          `${API_URL}/api/rooms/${roomId}/images`,
          {
            method: 'POST',
            credentials: 'include',
            body: formDataObj,
          }
        );

        if (!imageResponse.ok) {
          const errorData = await imageResponse.json();
          throw new Error(errorData.message || 'Failed to upload images');
        }
      }

      setCurrentStatus(roomResponse.data.status || 'pending');

      // Check if the room needs re-approval
      const needsReapproval =
        roomResponse.message.includes('needs re-approval');

      setSubmitSuccess(true);
      setSubmitMessage(
        needsReapproval
          ? 'Space updated successfully! It will need to be re-approved before appearing on the homepage again.'
          : 'Space updated successfully!'
      );

      // Redirect after short delay only if not needing re-approval
      if (!needsReapproval) {
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error updating room:', error);
      setSubmitSuccess(false);
      setSubmitMessage(
        error.message || 'Failed to update space. Please try again.'
      );
      setErrors({
        ...errors,
        form: error.message || 'Failed to update space. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle room deletion
  const handleDeleteRoom = async () => {
    if (!roomId) return;

    setDeleteLoading(true);
    try {
      // Use API helper function instead of raw fetch
      const response = await fetch(`${API_URL}/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete room');
      }

      setSubmitSuccess(true);
      setSubmitMessage(
        'Room deleted successfully! Redirecting to dashboard...'
      );

      // Close the modal and redirect after delay
      setShowDeleteModal(false);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error: any) {
      console.error('Error deleting room:', error);
      setSubmitSuccess(false);
      setSubmitMessage(
        error.message || 'Failed to delete room. Please try again.'
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  if (isLoading) {
    return (
      <section className="min-h-screen bg-light dark:bg-darkBlue flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">
            Loading room data...
          </p>
        </div>
      </section>
    );
  }

  const getStatusBadge = () => {
    switch (currentStatus) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
            Approved
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
            Pending Approval
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <section className="min-h-screen bg-light dark:bg-darkBlue">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              Edit Space
            </h1>
            <div className="flex items-center mt-1">
              <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">
                Status:
              </span>
              {getStatusBadge()}
            </div>
          </div>
        </div>

        {/* Status notice for pending/rejected */}
        {(currentStatus === 'pending' || currentStatus === 'rejected') && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 p-4 rounded-lg mb-6 flex items-start">
            <FiInfo className="mr-3 mt-0.5 flex-shrink-0" size={20} />
            <div>
              {currentStatus === 'pending' ? (
                <p>
                  This space is pending approval and is not visible to guests
                  yet. You can still make changes.
                </p>
              ) : (
                <p>
                  This space was rejected and needs revisions before it can be
                  approved.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Warning about critical edits */}
        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-4 rounded-lg mb-6 flex items-start">
          <FiInfo className="mr-3 mt-0.5 flex-shrink-0" size={20} />
          <p>
            Editing key details like price, category, location, or images will
            require admin re-approval before your space appears on the homepage
            again.
          </p>
        </div>

        {submitSuccess === false && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6">
            {submitMessage || errors.form}
          </div>
        )}

        {submitSuccess === true && (
          <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-4 rounded-lg mb-6">
            {submitMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Details Section */}
          <div className="bg-light dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-light">
              Basic Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Space Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.title
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-300 dark:border-gray-700'
                    } 
                  bg-light dark:bg-gray-900 text-gray-900 dark:text-light focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors`}
                    placeholder="e.g., Creative Studio Space"
                  />
                </div>
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.title}
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <label
                  htmlFor="category"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiTag className="text-gray-400" />
                  </div>
                  <select
                    id="category"
                    name="category"
                    value={typeToCategory[formData.type] || ''}
                    onChange={handleTypeChange}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                      errors.type
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-300 dark:border-gray-700'
                    } 
                  bg-light dark:bg-gray-900 text-gray-900 dark:text-light focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors`}>
                    <option value="">Select a category</option>
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.type && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.type}
                  </p>
                )}
              </div>

              {/* Address */}
              <div>
                <label
                  htmlFor="location.address"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMapPin className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="location.address"
                    name="location.address"
                    value={formData.location.address}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                      errors['location.address']
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-300 dark:border-gray-700'
                    } 
                  bg-light dark:bg-gray-900 text-gray-900 dark:text-light focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors`}
                    placeholder="e.g., 123 Main Street"
                  />
                </div>
                {errors['location.address'] && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors['location.address']}
                  </p>
                )}
              </div>

              {/* City */}
              <div>
                <label
                  htmlFor="location.city"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  City
                </label>
                <input
                  type="text"
                  id="location.city"
                  name="location.city"
                  value={formData.location.city}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    errors['location.city']
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-700'
                  } 
                bg-light dark:bg-gray-900 text-gray-900 dark:text-light focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors`}
                  placeholder="e.g., Manila"
                />
                {errors['location.city'] && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors['location.city']}
                  </p>
                )}
              </div>

              {/* State */}
              <div>
                <label
                  htmlFor="location.state"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  State/Province
                </label>
                <input
                  type="text"
                  id="location.state"
                  name="location.state"
                  value={formData.location.state}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    errors['location.state']
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-700'
                  } 
                bg-light dark:bg-gray-900 text-gray-900 dark:text-light focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors`}
                  placeholder="e.g., Metro Manila"
                />
                {errors['location.state'] && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors['location.state']}
                  </p>
                )}
              </div>

              {/* Zip Code */}
              <div>
                <label
                  htmlFor="location.zipCode"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Postal/Zip Code
                </label>
                <input
                  type="text"
                  id="location.zipCode"
                  name="location.zipCode"
                  value={formData.location.zipCode}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    errors['location.zipCode']
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-700'
                  } 
                bg-light dark:bg-gray-900 text-gray-900 dark:text-light focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors`}
                  placeholder="e.g., 1000"
                />
                {errors['location.zipCode'] && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors['location.zipCode']}
                  </p>
                )}
              </div>

              {/* Price */}
              <div>
                <label
                  htmlFor="price.basePrice"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Price (₱)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaPesoSign className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="price.basePrice"
                    name="price.basePrice"
                    value={formData.price.basePrice}
                    onChange={handleNumericInput}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                      errors['price.basePrice']
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-300 dark:border-gray-700'
                    } 
                  bg-light dark:bg-gray-900 text-gray-900 dark:text-light focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors`}
                    placeholder="e.g., 5000"
                  />
                </div>
                {errors['price.basePrice'] && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors['price.basePrice']}
                  </p>
                )}
              </div>

              {/* Capacity */}
              <div>
                <label
                  htmlFor="capacity.maxGuests"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Capacity
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiUsers className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="capacity.maxGuests"
                    name="capacity.maxGuests"
                    value={formData.capacity.maxGuests}
                    onChange={handleNumericInput}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                      errors['capacity.maxGuests']
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-300 dark:border-gray-700'
                    } 
                  bg-light dark:bg-gray-900 text-gray-900 dark:text-light focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors`}
                    placeholder="e.g., 25"
                  />
                </div>
                {errors['capacity.maxGuests'] && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors['capacity.maxGuests']}
                  </p>
                )}
              </div>

              {/* Description - Full width */}
              <div className="md:col-span-2">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    errors.description
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-700'
                  } 
                bg-light dark:bg-gray-900 text-gray-900 dark:text-light focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors`}
                  placeholder="Describe your space - what makes it special, features, ambiance, etc."
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Amenities Section */}
          <div className="bg-light dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-light">
                Amenities
              </h2>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {formData.amenities.length} selected
              </div>
            </div>

            {errors.amenities && (
              <p className="mb-3 text-sm text-red-600 dark:text-red-400">
                {errors.amenities}
              </p>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {AMENITIES_OPTIONS.map((amenity) => (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => handleAmenityToggle(amenity)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${
                    formData.amenities.includes(amenity)
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-2 border-blue-500'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                  }`}>
                  {amenity}
                </button>
              ))}
            </div>
          </div>

          {/* Images Section */}
          <div className="bg-light dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-light">
              Space Images
            </h2>

            {errors.images && (
              <p className="mb-3 text-sm text-red-600 dark:text-red-400">
                {errors.images}
              </p>
            )}

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              multiple
              className="hidden"
            />

            {/* Image upload button */}
            <button
              type="button"
              onClick={triggerFileInput}
              className="mb-4 flex items-center justify-center w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
              <div className="flex flex-col items-center text-center">
                <FiPlus
                  size={24}
                  className="text-gray-400 dark:text-gray-500 mb-2"
                />
                <div className="text-gray-600 dark:text-gray-400 font-medium">
                  Click to upload images
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  PNG, JPG, WEBP up to 10MB
                </p>
              </div>
            </button>

            {/* Image previews */}
            {imagePreviewUrls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                {imagePreviewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        index < formData.images.length
                          ? removeExistingImage(index)
                          : removeNewImage(index)
                      }
                      className="absolute top-2 right-2 bg-black/50 text-light p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove image">
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Booking Details Section */}
          <div className="bg-light dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-light">
              Booking Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Check-in Time */}
              <div>
                <label
                  htmlFor="houseRules.checkInTime"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Check-in Time
                </label>
                <input
                  type="time"
                  id="houseRules.checkInTime"
                  name="houseRules.checkInTime"
                  value={formData.houseRules.checkInTime}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 
                  bg-light dark:bg-gray-900 text-gray-900 dark:text-light focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                />
              </div>

              {/* Check-out Time */}
              <div>
                <label
                  htmlFor="houseRules.checkOutTime"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Check-out Time
                </label>
                <input
                  type="time"
                  id="houseRules.checkOutTime"
                  name="houseRules.checkOutTime"
                  value={formData.houseRules.checkOutTime}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 
                  bg-light dark:bg-gray-900 text-gray-900 dark:text-light focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                />
              </div>

              {/* Cancellation Policy */}
              <div className="md:col-span-2">
                <label
                  htmlFor="houseRules.cancellationPolicy"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cancellation Policy
                </label>
                <textarea
                  id="houseRules.cancellationPolicy"
                  name="houseRules.cancellationPolicy"
                  value={formData.houseRules.cancellationPolicy}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 
                  bg-light dark:bg-gray-900 text-gray-900 dark:text-light focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                  placeholder="Describe your cancellation policy..."
                />
              </div>
            </div>
          </div>

          {/* Rules Section */}
          <div className="bg-light dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-light flex items-center">
                <MdOutlineRule className="mr-2 text-blue-500" size={20} />
                Rules & Policies
              </h2>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {rules.length} rules
              </div>
            </div>

            {errors.rules && (
              <p className="mb-3 text-sm text-red-600 dark:text-red-400">
                {errors.rules}
              </p>
            )}

            {/* Rules List */}
            <div className="mb-6">
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg mb-4">
                <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                  {rules.length > 0 ? (
                    rules.map((rule, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between">
                        <span>{rule}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRule(index)}
                          className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
                          aria-label="Remove rule">
                          <FiTrash2 size={16} />
                        </button>
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-500 dark:text-gray-400">
                      No rules added yet. Please add some rules for your space.
                    </li>
                  )}
                </ul>
              </div>

              {/* Add New Rule */}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newRule}
                  onChange={(e) => setNewRule(e.target.value)}
                  placeholder="Add a new rule..."
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 
                  bg-light dark:bg-gray-900 text-gray-900 dark:text-light focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={handleAddRule}
                  disabled={!newRule.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600 transition-colors">
                  Add Rule
                </button>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
              <FiTrash2 />
              Delete Space
            </button>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                disabled={isSubmitting}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-darkBlue dark:bg-light hover:bg-blue-600 text-light dark:text-darkBlue dark:hover:text-light hover:scale-105 rounded-lg transition-all duration-500">
                {isSubmitting ? (
                  <div className="h-5 w-5 border-2 border-light border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-center text-red-500 mb-4">
              <FiAlertTriangle size={48} />
            </div>
            <h3 className="text-xl font-semibold text-center mb-2 text-gray-900 dark:text-white">
              Delete Space
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
              Are you sure you want to delete this space? This action cannot be
              undone.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                disabled={deleteLoading}>
                Cancel
              </button>
              <button
                onClick={handleDeleteRoom}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                disabled={deleteLoading}>
                {deleteLoading ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default EditRoom;
