import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiArrowLeft,
  FiCreditCard,
  FiClock,
  FiMapPin,
  FiCalendar,
  FiInfo,
  FiAlertCircle,
  FiUser,
  FiLoader,
} from 'react-icons/fi';
import { MdOutlinePayments } from 'react-icons/md';
import { FaWallet } from 'react-icons/fa';
import { FaCcVisa, FaCcMastercard, FaCcAmex } from 'react-icons/fa';
import { bookingApi } from '../../services/bookingApi';
import { useAuth } from '../../contexts/AuthContext';

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isVerified } = useAuth();
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<
    'gcash' | 'maya' | 'card' | 'property'
  >('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [, setBookingCreated] = useState<any>(null);
  const [formData, setFormData] = useState({
    cardNumber: '',
    cardHolder: '',
    expiryDate: '',
    cvv: '',
    accountNumber: '',
    saveForFuture: false,
    guestCount: 1,
    children: 0,
    infants: 0,
    specialRequests: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (location.state?.bookingDetails) {
      setBookingDetails(location.state.bookingDetails);
      if (location.state.bookingDetails.guestCount) {
        setFormData((prev) => ({
          ...prev,
          guestCount: location.state.bookingDetails.guestCount,
        }));
      }
      if (location.state.bookingDetails.children !== undefined) {
        setFormData((prev) => ({
          ...prev,
          children: location.state.bookingDetails.children,
        }));
      }
      if (location.state.bookingDetails.infants !== undefined) {
        setFormData((prev) => ({
          ...prev,
          infants: location.state.bookingDetails.infants,
        }));
      }
    } else {
      navigate('/');
    }
  }, [location, navigate]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });

    // Clear error when field is edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  const handleMobileNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');

    if (value.length > 0 && !value.startsWith('09')) {
      if (value.startsWith('9')) {
        value = '0' + value;
      } else {
        value = '09';
      }
    }

    // Limit to 11 digits
    if (value.length > 11) {
      value = value.slice(0, 11);
    }

    setFormData({
      ...formData,
      accountNumber: value,
    });

    if (errors.accountNumber) {
      setErrors({
        ...errors,
        accountNumber: '',
      });
    }
  };

  <input
    type="text"
    name="accountNumber"
    value={formData.accountNumber}
    onChange={handleMobileNumberChange}
    placeholder="09XXXXXXXXX"
    maxLength={11}
    className={`w-full p-3 border ${
      errors.accountNumber
        ? 'border-red-500'
        : 'border-gray-300 dark:border-gray-600'
    } rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors`}
  />;

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    switch (paymentMethod) {
      case 'card':
        // Card validation logic (unchanged)
        const cleanedCardNumber = formData.cardNumber.replace(/\s/g, '');
        if (!cleanedCardNumber) {
          newErrors.cardNumber = 'Card number is required';
        } else if (!/^\d{16}$/.test(cleanedCardNumber)) {
          newErrors.cardNumber = 'Card number must be 16 digits';
        }

        if (!formData.cardHolder.trim()) {
          newErrors.cardHolder = 'Cardholder name is required';
        }

        if (!formData.expiryDate.trim()) {
          newErrors.expiryDate = 'Expiry date is required';
        } else {
          const [month, year] = formData.expiryDate.split('/');
          const currentYear = new Date().getFullYear() % 100;
          const currentMonth = new Date().getMonth() + 1;

          if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(formData.expiryDate)) {
            newErrors.expiryDate = 'Invalid format (MM/YY)';
          } else if (
            parseInt(year) < currentYear ||
            (parseInt(year) === currentYear && parseInt(month) < currentMonth)
          ) {
            newErrors.expiryDate = 'Card has expired';
          }
        }

        if (!formData.cvv.trim()) {
          newErrors.cvv = 'CVV is required';
        } else if (!/^\d{3,4}$/.test(formData.cvv)) {
          newErrors.cvv = 'CVV must be 3 or 4 digits';
        }
        break;

      case 'gcash':
      case 'maya':
        // Mobile payment validation
        if (!formData.accountNumber) {
          newErrors.accountNumber = 'Mobile number is required';
        } else if (!/^09\d{9}$/.test(formData.accountNumber)) {
          newErrors.accountNumber =
            'Invalid mobile number format (must start with 09 and be 11 digits)';
        }
        break;

      case 'property':
        // Property payment validation
        if (!isVerified()) {
          newErrors.paymentMethod = 'Only verified users can pay at property';
        }
        break;
    }

    // Validate guest count
    if (formData.guestCount < 1) {
      newErrors.guestCount = 'At least one adult is required';
    }

    if (formData.children < 0) {
      newErrors.children = 'Children count cannot be negative';
    }

    if (formData.infants < 0) {
      newErrors.infants = 'Infants count cannot be negative';
    }

    // Check if total guests exceed max guests (if specified)
    const totalGuests = formData.guestCount + formData.children;
    if (bookingDetails.maxGuests && totalGuests > bookingDetails.maxGuests) {
      newErrors.guestCount = `Total guests (${totalGuests}) exceeds maximum allowed (${bookingDetails.maxGuests})`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createBooking = async () => {
    if (!bookingDetails) return null;

    // Format dates for API request
    const checkIn = new Date(bookingDetails.checkInDate);
    const checkOut = new Date(bookingDetails.checkOutDate);

    // Convert 12-hour format times to 24-hour format for the backend
    let checkInTime = null;
    let checkOutTime = null;

    if (bookingDetails.checkInTime) {
      // Parse and format the check-in time
      const timeMatch = bookingDetails.checkInTime.match(
        /(\d+):(\d+)\s*([APap][Mm])/
      );
      if (timeMatch) {
        const [, hours, minutes, period] = timeMatch;
        let hour = parseInt(hours);
        if (period.toUpperCase() === 'PM' && hour < 12) hour += 12;
        if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;

        // Format as 24-hour time string (HH:MM)
        checkInTime = `${hour.toString().padStart(2, '0')}:${minutes}`;
      }
    }

    if (bookingDetails.checkOutTime) {
      // Parse and format the check-out time
      const timeMatch = bookingDetails.checkOutTime.match(
        /(\d+):(\d+)\s*([APap][Mm])/
      );
      if (timeMatch) {
        const [, hours, minutes, period] = timeMatch;
        let hour = parseInt(hours);
        if (period.toUpperCase() === 'PM' && hour < 12) hour += 12;
        if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;

        // Format as 24-hour time string (HH:MM)
        checkOutTime = `${hour.toString().padStart(2, '0')}:${minutes}`;
      }
    }

    const bookingData = {
      roomId: bookingDetails.roomId,
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      checkInTime: checkInTime,
      checkOutTime: checkOutTime,
      guests: {
        adults: Number(formData.guestCount),
        children: Number(formData.children),
        infants: Number(formData.infants),
      },
      totalPrice: bookingDetails.total,
      priceBreakdown: {
        basePrice: bookingDetails.subtotal,
        serviceFee: bookingDetails.serviceFee,
      },
      specialRequests: formData.specialRequests,
      paymentMethod: paymentMethod,
    };

    console.log('Sending booking data with payment method:', paymentMethod);

    try {
      const response = await bookingApi.createBooking(bookingData);

      if (response.success) {
        console.log('Booking created successfully:', response.data);
        return response.data;
      } else {
        console.error('Server returned error:', response);
        toast.error(response.message || 'Failed to create booking');
        return null;
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Error creating booking. Please try again.');
      return null;
    }
  };

  const processCardPayment = async (bookingId: string) => {
    try {
      const cleanedCardNumber = formData.cardNumber.replace(/\s/g, '');
      const [month, year] = formData.expiryDate.split('/');
      const formattedExpiryDate = `${month.padStart(2, '0')}/${year}`;

      console.log('Processing card payment with details:', {
        cardNumber: `${cleanedCardNumber.slice(
          0,
          4
        )}...${cleanedCardNumber.slice(-4)}`,
        expiryDate: formattedExpiryDate,
        hasCardholderName: !!formData.cardHolder,
        hasCVV: !!formData.cvv,
      });

      const response = await bookingApi.processCardPayment(bookingId, {
        cardNumber: cleanedCardNumber,
        expiryDate: formattedExpiryDate,
        cvv: formData.cvv,
        cardholderName: formData.cardHolder,
      });

      return response;
    } catch (error) {
      console.error('Error processing card payment:', error);
      return { success: false, message: 'Error processing card payment' };
    }
  };

  const processMobilePayment = async (bookingId: string) => {
    try {
      if (!formData.accountNumber) {
        throw new Error('Mobile number is required');
      }

      console.log(
        `Processing ${paymentMethod} payment with number:`,
        formData.accountNumber
      );

      const response = await bookingApi.processMobilePayment(
        bookingId,
        paymentMethod as 'gcash' | 'maya',
        formData.accountNumber
      );

      if (!response.success) {
        throw new Error(response.message || `${paymentMethod} payment failed`);
      }

      return response;
    } catch (error) {
      console.error(`Error processing ${paymentMethod} payment:`, error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : `Error processing ${paymentMethod} payment`,
      };
    }
  };

  const processPayment = async (bookingId: string) => {
    try {
      let response;

      console.log(
        `Processing payment for method: ${paymentMethod}, bookingId: ${bookingId}`
      );

      switch (paymentMethod) {
        case 'card':
          response = await processCardPayment(bookingId);
          break;

        case 'gcash':
        case 'maya':
          response = await processMobilePayment(bookingId);
          break;

        case 'property':
          // Pay at property doesn't need payment processing
          return { success: true, message: 'Booking created successfully' };

        default:
          throw new Error('Unsupported payment method');
      }

      if (!response || !response.success) {
        throw new Error(response?.message || 'Payment processing failed');
      }

      return response;
    } catch (error) {
      console.error('Error processing payment:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Payment processing failed';
      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsProcessing(true);
    toast.info('Processing your booking...', {
      autoClose: false,
      toastId: 'booking-process',
    });

    try {
      // Step 1: Create booking
      console.log('Creating booking...');
      const booking = await createBooking();
      if (!booking) {
        toast.dismiss('booking-process');
        toast.error('Failed to create booking');
        setIsProcessing(false);
        return;
      }

      console.log('Booking created successfully:', booking);
      setBookingCreated(booking);
      toast.dismiss('booking-process');

      // Step 2: Process payment (not needed for pay at property)
      if (paymentMethod !== 'property') {
        toast.info('Processing payment...', {
          autoClose: false,
          toastId: 'payment-process',
        });

        console.log(
          `Processing ${paymentMethod} payment for booking:`,
          booking._id
        );
        const paymentResult = await processPayment(booking._id);

        toast.dismiss('payment-process');

        if (!paymentResult.success) {
          toast.error(paymentResult.message || 'Payment failed');
          setIsProcessing(false);
          return;
        }

        console.log('Payment processed successfully:', paymentResult);
      }

      // Step 3: Redirect to confirmation page
      toast.success('Booking successful!');
      setTimeout(() => {
        setIsProcessing(false);
        navigate('/payment/confirmation', {
          state: {
            bookingDetails: {
              ...bookingDetails,
              guestCount: formData.guestCount,
              children: formData.children,
              infants: formData.infants,
              specialRequests: formData.specialRequests,
            },
            bookingId: booking._id,
            paymentMethod,
            referenceNumber:
              booking.referenceNumber ||
              `REF-${Math.floor(100000 + Math.random() * 900000)}`,
          },
        });
      }, 1500);
    } catch (error) {
      toast.dismiss('booking-process');
      toast.dismiss('payment-process');
      console.error('Error during booking/payment process:', error);
      toast.error('Something went wrong. Please try again.');
      setIsProcessing(false);
    }
  };

  // Format card number with spaces
  const formatCardNumber = (value: string): string => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  // Handle card number input
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setFormData({
      ...formData,
      cardNumber: formatted,
    });

    if (errors.cardNumber) {
      setErrors({
        ...errors,
        cardNumber: '',
      });
    }
  };

  // Format expiry date with slash
  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');

    if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2, 4)}`;
    }

    setFormData({
      ...formData,
      expiryDate: value,
    });

    if (errors.expiryDate) {
      setErrors({
        ...errors,
        expiryDate: '',
      });
    }
  };

  if (!bookingDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkBlue">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkBlue text-gray-900 dark:text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <Link
          to={`/rooms/${bookingDetails.roomId}`}
          className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline mb-6">
          <FiArrowLeft /> Back to room
        </Link>

        <h1 className="text-2xl font-semibold mb-6">Complete Your Booking</h1>

        <div className="flex flex-col gap-2 md:grid md:grid-cols-1 lg:grid-cols-3 md:gap-6">
          {/* Payment form section */}
          <div className="col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
              {/* Guest Information */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <FiUser className="mr-2 text-blue-500" />
                  Guest Information
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Number of Adults
                    </label>
                    <input
                      type="number"
                      name="guestCount"
                      value={formData.guestCount}
                      onChange={handleInputChange}
                      min="1"
                      max={bookingDetails.maxGuests || 10}
                      className={`w-full p-3 border ${
                        errors.guestCount
                          ? 'border-red-500'
                          : 'border-gray-300 dark:border-gray-600'
                      } rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors`}
                    />
                    {errors.guestCount && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.guestCount}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Number of Children
                    </label>
                    <input
                      type="number"
                      name="children"
                      value={formData.children}
                      onChange={handleInputChange}
                      min="0"
                      max={
                        bookingDetails.maxGuests
                          ? bookingDetails.maxGuests - formData.guestCount
                          : 10
                      }
                      className={`w-full p-3 border ${
                        errors.children
                          ? 'border-red-500'
                          : 'border-gray-300 dark:border-gray-600'
                      } rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors`}
                    />
                    {errors.children && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.children}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Number of Infants
                    </label>
                    <input
                      type="number"
                      name="infants"
                      value={formData.infants}
                      onChange={handleInputChange}
                      min="0"
                      className={`w-full p-3 border ${
                        errors.infants
                          ? 'border-red-500'
                          : 'border-gray-300 dark:border-gray-600'
                      } rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors`}
                    />
                    {errors.infants && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.infants}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Special Requests (optional)
                    </label>
                    <textarea
                      name="specialRequests"
                      value={formData.specialRequests}
                      onChange={handleInputChange}
                      placeholder="Any special requirements or preferences..."
                      rows={3}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <MdOutlinePayments className="mr-2 text-blue-500" />
                Payment Method
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-colors ${
                    paymentMethod === 'card'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}>
                  <FiCreditCard className="text-2xl mb-2" />
                  <span className="text-sm font-medium">Credit Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('gcash')}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-colors ${
                    paymentMethod === 'gcash'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}>
                  <FaWallet className="text-2xl mb-2 text-[#0076ff]" />
                  <span className="text-sm font-medium">GCash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('maya')}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-colors ${
                    paymentMethod === 'maya'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}>
                  <span className="text-xl font-extrabold mb-1 text-green-600 dark:text-green-400">
                    Maya
                  </span>
                  <span className="text-sm font-medium">PayMaya</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('property')}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-colors ${
                    paymentMethod === 'property'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}>
                  <FiMapPin className="text-2xl mb-2" />
                  <span className="text-sm font-medium">Pay at Property</span>
                </button>
              </div>

              {/* Show error for non-verified users trying to pay at property */}
              {paymentMethod === 'property' && !isVerified() && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-start">
                  <FiAlertCircle className="text-red-600 dark:text-red-400 mt-1 mr-2 flex-shrink-0" />
                  <div>
                    <p className="text-red-600 dark:text-red-400 font-medium">
                      User verification required
                    </p>
                    <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
                      Your ID verification must be approved by an admin to use
                      Pay at Property. Please upload your ID in your profile and
                      wait for approval, or choose a different payment method.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Credit Card Form */}
                {paymentMethod === 'card' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Card Number
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="cardNumber"
                          value={formData.cardNumber}
                          onChange={handleCardNumberChange}
                          placeholder="1234 5678 9012 3456"
                          maxLength={19}
                          className={`w-full p-3 border ${
                            errors.cardNumber
                              ? 'border-red-500'
                              : 'border-gray-300 dark:border-gray-600'
                          } rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors`}
                        />
                        <div className="absolute top-1/2 right-3 transform -translate-y-1/2 flex space-x-1">
                          <FaCcVisa className="text-blue-600" size={24} />
                          <FaCcMastercard
                            className="text-orange-600"
                            size={24}
                          />
                          <FaCcAmex className="text-blue-400" size={24} />
                        </div>
                      </div>
                      {errors.cardNumber && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.cardNumber}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        name="cardHolder"
                        value={formData.cardHolder}
                        onChange={handleInputChange}
                        placeholder="John Doe"
                        className={`w-full p-3 border ${
                          errors.cardHolder
                            ? 'border-red-500'
                            : 'border-gray-300 dark:border-gray-600'
                        } rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors`}
                      />
                      {errors.cardHolder && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.cardHolder}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Expiry Date
                        </label>
                        <input
                          type="text"
                          name="expiryDate"
                          value={formData.expiryDate}
                          onChange={handleExpiryDateChange}
                          placeholder="MM/YY"
                          maxLength={5}
                          className={`w-full p-3 border ${
                            errors.expiryDate
                              ? 'border-red-500'
                              : 'border-gray-300 dark:border-gray-600'
                          } rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors`}
                        />
                        {errors.expiryDate && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.expiryDate}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          CVV
                        </label>
                        <input
                          type="password"
                          name="cvv"
                          value={formData.cvv}
                          onChange={handleInputChange}
                          placeholder="123"
                          maxLength={4}
                          className={`w-full p-3 border ${
                            errors.cvv
                              ? 'border-red-500'
                              : 'border-gray-300 dark:border-gray-600'
                          } rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors`}
                        />
                        {errors.cvv && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.cvv}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="saveForFuture"
                        id="saveForFuture"
                        checked={formData.saveForFuture}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="saveForFuture"
                        className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                        Save card for future bookings
                      </label>
                    </div>
                  </div>
                )}

                {/* GCash/Maya Form */}
                {(paymentMethod === 'gcash' || paymentMethod === 'maya') && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Mobile Number
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="accountNumber"
                          value={formData.accountNumber}
                          onChange={handleInputChange}
                          placeholder="09XXXXXXXXX"
                          maxLength={11}
                          className={`w-full p-3 border ${
                            errors.accountNumber
                              ? 'border-red-500'
                              : 'border-gray-300 dark:border-gray-600'
                          } rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors`}
                        />
                      </div>
                      {errors.accountNumber && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.accountNumber}
                        </p>
                      )}
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <div className="flex items-center">
                        <FiInfo className="text-blue-500 mr-2 flex-shrink-0" />
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          {paymentMethod === 'gcash'
                            ? 'After submitting, you will receive a GCash payment request to confirm your booking.'
                            : 'After submitting, you will receive a Maya payment request to confirm your booking.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pay at Property */}
                {paymentMethod === 'property' && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <div className="flex items-start">
                        <FiInfo className="text-blue-500 mt-1 mr-2 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                            Pay at Property Information
                          </p>
                          <ul className="text-sm text-blue-700 dark:text-blue-300 ml-4 mt-2 list-disc space-y-1">
                            <li>
                              Your booking request will be sent to the host
                            </li>
                            <li>
                              Once approved, you'll receive a confirmation
                            </li>
                            <li>Full payment is due upon arrival</li>
                            <li>
                              Be prepared with the exact amount or a payment
                              card
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {errors.paymentMethod && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.paymentMethod}
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    isProcessing ||
                    (paymentMethod === 'property' && !isVerified())
                  }
                  className={`w-full mt-6 py-3 px-4 bg-darkBlue text-white dark:bg-light dark:text-darkBlue hover:opacity-90 font-medium rounded-lg transition-colors flex items-center justify-center ${
                    paymentMethod === 'property' && !isVerified()
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}>
                  {isProcessing ? (
                    <>
                      <FiLoader className="animate-spin mr-2" />
                      Processing...
                    </>
                  ) : paymentMethod === 'property' ? (
                    'Request Booking'
                  ) : (
                    'Complete Booking'
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Booking summary section */}
          <div className="col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 sticky top-6">
              <h2 className="text-lg font-semibold mb-4">Booking Summary</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-800 dark:text-gray-200">
                    {bookingDetails.roomName}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center mt-1">
                    <FiMapPin className="mr-1" /> {bookingDetails.location}
                  </p>
                </div>

                {bookingDetails.roomImage && (
                  <div className="aspect-video rounded-lg overflow-hidden">
                    <img
                      src={bookingDetails.roomImage}
                      alt={bookingDetails.roomName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="border-t border-b border-gray-200 dark:border-gray-700 py-4 space-y-2">
                  <div className="flex items-center text-sm">
                    <FiCalendar className="mr-2 text-blue-500" />
                    <span className="font-medium">Check-in:</span>
                    <span className="ml-2">
                      {bookingDetails.checkInDate}, {bookingDetails.checkInTime}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <FiCalendar className="mr-2 text-blue-500" />
                    <span className="font-medium">Check-out:</span>
                    <span className="ml-2">
                      {bookingDetails.checkOutDate},{' '}
                      {bookingDetails.checkOutTime}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <FiClock className="mr-2 text-blue-500" />
                    <span className="font-medium">Duration:</span>
                    <span className="ml-2">
                      {bookingDetails.numberOfDays}{' '}
                      {bookingDetails.numberOfDays > 1 ? 'days' : 'day'}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <FiUser className="mr-2 text-blue-500" />
                    <span className="font-medium">Guests:</span>
                    <span className="ml-2">
                      {formData.guestCount}{' '}
                      {formData.guestCount === 1 ? 'adult' : 'adults'}
                      {formData.children > 0 &&
                        `, ${formData.children} ${
                          formData.children === 1 ? 'child' : 'children'
                        }`}
                      {formData.infants > 0 &&
                        `, ${formData.infants} ${
                          formData.infants === 1 ? 'infant' : 'infants'
                        }`}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Subtotal
                    </span>
                    <span>₱{bookingDetails.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Service fee
                    </span>
                    <span>₱{bookingDetails.serviceFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span>Total</span>
                    <span>₱{bookingDetails.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
