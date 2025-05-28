import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  FiCheckCircle,
  FiClock,
  FiCalendar,
  FiDownload,
  FiMail,
} from 'react-icons/fi';
import Receipt from '../../components/Receipt/Receipt';
import logo_black from '../../assets/logo_black.jpg';
import { bookingApi } from '../../services/bookingApi';
import { toast } from 'react-hot-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const PaymentConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [confirmation, setConfirmation] = useState<any>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (location.state?.bookingDetails && location.state?.paymentMethod) {
      setConfirmation({
        bookingDetails: location.state.bookingDetails,
        paymentMethod: location.state.paymentMethod,
        referenceNumber: location.state.referenceNumber,
        bookingId: location.state.bookingId,
        date: new Date().toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
        time: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
    } else {
      navigate('/');
    }
  }, [location, navigate]);

  const handleSendEmail = async (e: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!confirmation?.bookingId) {
      toast.error('Booking information is missing');
      return;
    }

    setSendingEmail(true);

    try {
      const email = showEmailInput && emailAddress ? emailAddress : undefined;

      const response = await bookingApi.sendReceiptEmail(
        confirmation.bookingId,
        email
      );

      if (response.success) {
        toast.success('Receipt has been sent to your email!');
        setShowEmailInput(false);
        setEmailAddress('');
      } else {
        toast.error(response.message || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending receipt:', error);
      toast.error('An error occurred while sending the receipt');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!receiptRef.current || !confirmation) {
      toast.error('Receipt not ready for download');
      return;
    }

    setIsDownloading(true);

    try {
      // Create a temporary clone of the receipt with clean styles
      const originalElement = receiptRef.current;
      const clonedElement = originalElement.cloneNode(true) as HTMLElement;

      // Apply clean styles to avoid oklch and other modern CSS issues
      clonedElement.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        background: white;
        color: black;
        font-family: Arial, sans-serif;
        width: ${originalElement.offsetWidth}px;
        padding: 20px;
        box-sizing: border-box;
      `;

      // Remove any problematic classes and apply simple styles
      const allElements = clonedElement.querySelectorAll('*');
      allElements.forEach((el: any) => {
        // Remove all classes that might contain oklch colors
        el.className = '';

        // Apply basic styling
        if (el.tagName === 'DIV') {
          el.style.backgroundColor = 'white';
          el.style.color = 'black';
        }

        // Fix any text colors
        const computedStyle = window.getComputedStyle(
          originalElement.querySelector(
            `[data-receipt-id="${el.dataset?.receiptId || ''}"]`
          ) || el
        );
        if (computedStyle.color && !computedStyle.color.includes('oklch')) {
          el.style.color = computedStyle.color.includes('rgb')
            ? computedStyle.color
            : 'black';
        } else {
          el.style.color = 'black';
        }
      });

      // Append to body temporarily
      document.body.appendChild(clonedElement);

      // Create canvas from the cleaned element
      const canvas = await html2canvas(clonedElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        removeContainer: true,
        foreignObjectRendering: false,
        ignoreElements: (element) => {
          // Ignore elements that might cause issues
          const computedStyle = window.getComputedStyle(element);
          return (
            computedStyle.getPropertyValue('color').includes('oklch') ||
            computedStyle.getPropertyValue('background-color').includes('oklch')
          );
        },
      });

      // Remove the temporary element
      document.body.removeChild(clonedElement);

      // Calculate dimensions for A4
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;

      // Add the image to PDF
      const imgData = canvas.toDataURL('image/png', 1.0);
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add new pages if content is longer than one page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Download the PDF
      const fileName = `OpenSpace_Receipt_${confirmation.referenceNumber}.pdf`;
      pdf.save(fileName);

      toast.success('Receipt downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);

      // Fallback: try a simpler approach
      try {
        await handleSimplePDFDownload();
      } catch (fallbackError) {
        console.error('Fallback PDF generation also failed:', fallbackError);
        toast.error(
          'Failed to download receipt. Please try again or contact support.'
        );
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // Fallback method with professional styling
  const handleSimplePDFDownload = async () => {
    if (!receiptRef.current || !confirmation) {
      throw new Error('Receipt not ready');
    }

    // Create a professional HTML structure for PDF
    const professionalHTML = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 0; background: white; color: #333; width: 800px; margin: 0 auto; box-sizing: border-box;">
        
        <!-- Header with branding -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 40px 40px 30px 40px; text-align: center; margin-bottom: 0;">
          <div style="background: rgba(255, 255, 255, 0.1); padding: 25px; border-radius: 15px; backdrop-filter: blur(10px);">
            <h1 style="margin: 0; font-size: 36px; font-weight: 700; letter-spacing: -1px;">🏢 OpenSpace Philippines</h1>
            <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Your Space, Your Way</p>
          </div>
        </div>

        <!-- Status Banner -->
        <div style="background: ${
          confirmation.paymentMethod === 'property' ? '#fef3c7' : '#d1fae5'
        }; border-left: 6px solid ${
      confirmation.paymentMethod === 'property' ? '#f59e0b' : '#10b981'
    }; padding: 25px 40px; margin: 0;">
          <div style="display: flex; align-items: center;">
            <span style="font-size: 28px; margin-right: 15px;">${
              confirmation.paymentMethod === 'property' ? '⏳' : '✅'
            }</span>
            <div>
              <h2 style="color: ${
                confirmation.paymentMethod === 'property'
                  ? '#92400e'
                  : '#065f46'
              }; margin: 0; font-size: 24px; font-weight: 700;">
                ${
                  confirmation.paymentMethod === 'property'
                    ? 'Pending Host Approval'
                    : 'Payment Confirmed'
                }
              </h2>
              <p style="color: ${
                confirmation.paymentMethod === 'property'
                  ? '#92400e'
                  : '#065f46'
              }; margin: 6px 0 0 0; font-size: 14px; opacity: 0.8;">
                Reference: <strong>${confirmation.referenceNumber}</strong> • ${
      confirmation.date
    } at ${confirmation.time}
              </p>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div style="padding: 40px;">
          
          <!-- Booking Information Card -->
          <div style="background: #f8fafc; border-radius: 15px; padding: 30px; margin-bottom: 30px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
            <h3 style="color: #1e293b; margin: 0 0 20px 0; font-size: 22px; font-weight: 600; display: flex; align-items: center;">
              <span style="margin-right: 10px; font-size: 24px;">🏠</span> Booking Details
            </h3>
            
            <div style="margin-bottom: 20px;">
              <h4 style="color: #3b82f6; margin: 0 0 8px 0; font-size: 20px; font-weight: 600;">
                ${confirmation.bookingDetails.roomName}
              </h4>
              <p style="color: #64748b; margin: 0; font-size: 16px; display: flex; align-items: center;">
                <span style="margin-right: 6px;">📍</span> ${
                  confirmation.bookingDetails.location
                }
              </p>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-top: 25px;">
              <div style="background: white; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0;">
                <p style="color: #64748b; margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Check-in</p>
                <p style="color: #1e293b; margin: 0; font-weight: 600; font-size: 16px;">
                  📅 ${confirmation.bookingDetails.checkInDate}<br>
                  <span style="font-size: 14px; color: #64748b; margin-top: 4px; display: inline-block;">🕒 ${
                    confirmation.bookingDetails.checkInTime
                  }</span>
                </p>
              </div>
              <div style="background: white; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0;">
                <p style="color: #64748b; margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Check-out</p>
                <p style="color: #1e293b; margin: 0; font-weight: 600; font-size: 16px;">
                  📅 ${confirmation.bookingDetails.checkOutDate}<br>
                  <span style="font-size: 14px; color: #64748b; margin-top: 4px; display: inline-block;">🕒 ${
                    confirmation.bookingDetails.checkOutTime
                  }</span>
                </p>
              </div>
            </div>

            <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
              <div style="text-align: center;">
                <p style="color: #64748b; margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Duration</p>
                <p style="color: #1e293b; margin: 0; font-weight: 700; font-size: 18px;">
                  ${confirmation.bookingDetails.numberOfDays} ${
      confirmation.bookingDetails.numberOfDays === 1 ? 'Day' : 'Days'
    }
                </p>
              </div>
              <div style="text-align: center;">
                <p style="color: #64748b; margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Guests</p>
                <p style="color: #1e293b; margin: 0; font-weight: 700; font-size: 18px;">
                  👥 ${confirmation.bookingDetails.guestCount || 1} ${
      (confirmation.bookingDetails.guestCount || 1) === 1 ? 'Person' : 'People'
    }
                </p>
              </div>
              <div style="text-align: center;">
                <p style="color: #64748b; margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Payment Method</p>
                <p style="color: #1e293b; margin: 0; font-weight: 700; font-size: 14px;">
                  ${
                    confirmation.paymentMethod === 'property'
                      ? '💰 Pay at Property'
                      : confirmation.paymentMethod === 'card'
                      ? '💳 Credit Card'
                      : confirmation.paymentMethod === 'gcash'
                      ? '📱 GCash'
                      : confirmation.paymentMethod === 'maya'
                      ? '📱 Maya'
                      : confirmation.paymentMethod
                  }
                </p>
              </div>
            </div>
          </div>

          <!-- Price Breakdown Card -->
          <div style="background: white; border-radius: 15px; padding: 30px; margin-bottom: 30px; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
            <h3 style="color: #1e293b; margin: 0 0 25px 0; font-size: 22px; font-weight: 600; display: flex; align-items: center;">
              <span style="margin-right: 10px; font-size: 24px;">💰</span> Price Breakdown
            </h3>
            
            <div style="space-y: 15px;">
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #f1f5f9;">
                <span style="color: #64748b; font-size: 16px;">Base Price (${
                  confirmation.bookingDetails.numberOfDays
                } ${
      confirmation.bookingDetails.numberOfDays === 1 ? 'day' : 'days'
    })</span>
                <span style="font-weight: 600; color: #1e293b; font-size: 16px;">₱${confirmation.bookingDetails.subtotal.toLocaleString(
                  'en-PH',
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                )}</span>
              </div>
              
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #f1f5f9;">
                <span style="color: #64748b; font-size: 16px;">Service Fee (10%)</span>
                <span style="font-weight: 600; color: #1e293b; font-size: 16px;">₱${confirmation.bookingDetails.serviceFee.toLocaleString(
                  'en-PH',
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                )}</span>
              </div>
              
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px 0; border-top: 3px solid #3b82f6; margin-top: 20px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); margin: 20px -15px -15px -15px; padding: 25px 15px;">
                <span style="font-size: 20px; font-weight: 700; color: #1e293b;">Total Amount</span>
                <span style="font-size: 24px; font-weight: 700; color: #3b82f6;">₱${confirmation.bookingDetails.total.toLocaleString(
                  'en-PH',
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                )}</span>
              </div>
            </div>
          </div>

          ${
            confirmation.paymentMethod === 'property'
              ? `
          <!-- Payment Instructions -->
          <div style="background: #fef3c7; border-radius: 15px; padding: 25px; margin-bottom: 30px; border-left: 6px solid #f59e0b;">
            <h4 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px; font-weight: 600; display: flex; align-items: center;">
              <span style="margin-right: 8px;">💡</span> Payment Instructions
            </h4>
            <div style="color: #92400e; font-size: 14px; line-height: 1.6;">
              <div style="display: flex; align-items: start; margin-bottom: 10px;">
                <span style="margin-right: 8px;">•</span>
                <span>Your booking is pending host approval</span>
              </div>
              <div style="display: flex; align-items: start; margin-bottom: 10px;">
                <span style="margin-right: 8px;">•</span>
                <span>Payment of <strong>₱${confirmation.bookingDetails.total.toLocaleString(
                  'en-PH',
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                )}</strong> is due upon arrival</span>
              </div>
              <div style="display: flex; align-items: start; margin-bottom: 10px;">
                <span style="margin-right: 8px;">•</span>
                <span>Please bring exact change or a payment card</span>
              </div>
              <div style="display: flex; align-items: start;">
                <span style="margin-right: 8px;">•</span>
                <span>You'll receive confirmation once the host approves your booking</span>
              </div>
            </div>
          </div>
          `
              : `
          <!-- Payment Confirmation -->
          <div style="background: #d1fae5; border-radius: 15px; padding: 25px; margin-bottom: 30px; border-left: 6px solid #10b981;">
            <h4 style="color: #065f46; margin: 0 0 10px 0; font-size: 18px; font-weight: 600; display: flex; align-items: center;">
              <span style="margin-right: 8px;">✅</span> Payment Confirmed
            </h4>
            <p style="color: #065f46; margin: 0; font-size: 14px;">
              Your payment of <strong>₱${confirmation.bookingDetails.total.toLocaleString(
                'en-PH',
                { minimumFractionDigits: 2, maximumFractionDigits: 2 }
              )}</strong> has been successfully processed. Your booking is confirmed!
            </p>
          </div>
          `
          }

          <!-- Important Notes -->
          <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
            <h4 style="color: #475569; margin: 0 0 15px 0; font-size: 16px; font-weight: 600; display: flex; align-items: center;">
              <span style="margin-right: 8px;">📋</span> Important Notes:
            </h4>
            <div style="color: #64748b; font-size: 13px; line-height: 1.6;">
              <div style="display: flex; align-items: start; margin-bottom: 8px;">
                <span style="margin-right: 8px;">•</span>
                <span>Please arrive on time for your check-in</span>
              </div>
              <div style="display: flex; align-items: start; margin-bottom: 8px;">
                <span style="margin-right: 8px;">•</span>
                <span>Contact your host directly for any special requests</span>
              </div>
              <div style="display: flex; align-items: start; margin-bottom: 8px;">
                <span style="margin-right: 8px;">•</span>
                <span>Review the house rules before your arrival</span>
              </div>
              <div style="display: flex; align-items: start;">
                <span style="margin-right: 8px;">•</span>
                <span>Keep this receipt for your records</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #1e293b; padding: 30px 40px; text-align: center; color: white;">
          <p style="color: #94a3b8; margin: 0 0 10px 0; font-size: 16px; font-weight: 500;">
            Thank you for choosing OpenSpace Philippines!
          </p>
          <p style="color: #64748b; margin: 0 0 15px 0; font-size: 12px;">
            For support, contact us at support@openspace.com | Call: +63 (02) 123-4567
          </p>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #334155;">
            <p style="color: #64748b; margin: 0; font-size: 11px;">
              © ${new Date().getFullYear()} OpenSpace Philippines. All rights reserved. | This is an electronic receipt.
            </p>
          </div>
        </div>

      </div>
    `;

    // Create a temporary div with better styling
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = professionalHTML;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.backgroundColor = 'white';
    tempDiv.style.fontFamily =
      "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

    document.body.appendChild(tempDiv);

    try {
      const canvas = await html2canvas(tempDiv, {
        scale: 3, // Higher quality for professional look
        backgroundColor: '#ffffff',
        logging: false,
        removeContainer: true,
        useCORS: true,
        allowTaint: true,
        width: 800,
        height: tempDiv.scrollHeight,
      });

      document.body.removeChild(tempDiv);

      // Create PDF with better margins and quality
      const imgWidth = 190; // Slightly smaller to allow margins
      const pageHeight = 277; // A4 height with margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF('p', 'mm', 'a4');

      // Add margins
      const marginX = 10;
      const marginY = 10;

      let position = marginY;
      let heightLeft = imgHeight;

      const imgData = canvas.toDataURL('image/png', 1.0);
      pdf.addImage(imgData, 'PNG', marginX, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Handle multiple pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + marginY;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', marginX, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `OpenSpace_Receipt_${confirmation.referenceNumber}_${
        new Date().toISOString().split('T')[0]
      }.pdf`;
      pdf.save(fileName);

      toast.success('Professional receipt downloaded successfully!');
    } catch (error) {
      document.body.removeChild(tempDiv);
      throw error;
    }
  };

  if (!confirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkBlue">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  const isPendingHostApproval = confirmation.paymentMethod === 'property';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkBlue text-gray-900 dark:text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div
            className={`w-20 h-20 ${
              isPendingHostApproval
                ? 'bg-yellow-100 dark:bg-yellow-900'
                : 'bg-green-100 dark:bg-green-900'
            } rounded-full mx-auto flex items-center justify-center`}>
            {isPendingHostApproval ? (
              <FiClock
                className="text-yellow-600 dark:text-yellow-400"
                size={40}
              />
            ) : (
              <FiCheckCircle
                className="text-green-600 dark:text-green-400"
                size={40}
              />
            )}
          </div>
          <h1 className="text-2xl font-bold mt-4">
            {isPendingHostApproval
              ? 'Booking Request Submitted!'
              : 'Booking Confirmed!'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {isPendingHostApproval
              ? 'Your booking request has been sent to the host for approval.'
              : 'Your reservation has been successfully confirmed.'}
          </p>
          <p className="text-blue-600 dark:text-blue-400 mt-1">
            Reference Number:{' '}
            <span className="font-semibold">
              {confirmation.referenceNumber}
            </span>
          </p>
        </div>

        {/* Status info for Property payment */}
        {isPendingHostApproval && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 mb-6">
            <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-300 mb-2">
              What happens next?
            </h3>
            <ul className="list-disc list-inside text-sm text-yellow-800 dark:text-yellow-300 space-y-2">
              <li>The host will review your booking request</li>
              <li>You'll receive an email when the host accepts or declines</li>
              <li>If accepted, you'll pay at the property upon arrival</li>
              <li>You can view your booking status on your bookings page</li>
            </ul>
          </div>
        )}

        {/* Booking details summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium flex items-center">
              <FiCalendar className="mr-2 text-blue-500" />
              Booking Details
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Check-in
                </p>
                <p className="font-medium">
                  {confirmation.bookingDetails.checkInDate} at{' '}
                  {confirmation.bookingDetails.checkInTime}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Check-out
                </p>
                <p className="font-medium">
                  {confirmation.bookingDetails.checkOutDate} at{' '}
                  {confirmation.bookingDetails.checkOutTime}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Guests
                </p>
                <p className="font-medium">
                  {confirmation.bookingDetails.guestCount || 1} person(s)
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Payment Method
                </p>
                <p className="font-medium capitalize">
                  {confirmation.paymentMethod === 'property'
                    ? 'Pay at Property'
                    : confirmation.paymentMethod === 'card'
                    ? 'Credit Card'
                    : confirmation.paymentMethod}
                </p>
              </div>
            </div>

            {confirmation.bookingDetails.specialRequests && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Special Requests
                </p>
                <p className="mt-1">
                  {confirmation.bookingDetails.specialRequests}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Use the Receipt component */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-medium">Receipt</h3>
            <div className="flex space-x-2">
              <button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed">
                <FiDownload className="mr-1" />
                {isDownloading ? 'Downloading...' : 'Download'}
              </button>
              <button
                onClick={() => setShowEmailInput(!showEmailInput)}
                className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline">
                <FiMail className="mr-1" /> Email Receipt
              </button>
            </div>
          </div>

          {showEmailInput && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20">
              <form onSubmit={handleSendEmail} className="flex items-center">
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="Enter email address (optional)"
                  className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-l-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
                  {sendingEmail ? 'Sending...' : 'Send'}
                </button>
              </form>
              <p className="text-xs mt-2 text-gray-500 dark:text-gray-400">
                Leave empty to send to your account email
              </p>
            </div>
          )}

          <div className="p-4" ref={receiptRef}>
            <Receipt
              referenceNumber={confirmation.referenceNumber}
              bookingDetails={confirmation.bookingDetails}
              paymentMethod={confirmation.paymentMethod}
              paymentStatus={
                isPendingHostApproval ? 'pending host approval' : 'confirmed'
              }
              date={confirmation.date}
              time={confirmation.time}
              companyLogo={logo_black}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            to="/bookings/all"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-darkBlue text-white dark:bg-light dark:text-darkBlue rounded-lg hover:opacity-90 transition-colors">
            View Your Bookings
          </Link>

          <Link
            to="/"
            className="inline-flex items-center justify-center px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmation;
