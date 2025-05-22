import { Request, Response, CookieOptions } from 'express';
import jwt from 'jsonwebtoken';
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '../services/emailService';
import crypto from 'crypto';
import User, { IUser } from '../models/User';
import OtpVerification from '../models/OtpVerification';
import mongoose from 'mongoose';
import {
  sanitizeInput,
  isValidEmail,
  isStrongPassword,
  addDelay,
} from '../utils/securityUtils';
import 'dotenv/config';
import { uploadBase64Image } from '../services/imageService';

type AuthRequest = Request;

// Define SafeUserResponse interface
interface SafeUserResponse {
  password?: string;
  [key: string]: any;
}

function ensureAuthenticated(req: AuthRequest, res: Response): IUser | null {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Not authenticated',
    });
    return null;
  }
  return req.user;
}

const generateToken = (user: IUser): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  const payload = {
    userId: user._id.toHexString(),
    email: user.email,
    role: user.role,
  };

  return (jwt.sign as any)(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    algorithm: 'HS256',
  });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Request body:', req.body);

    const email = req.body.email?.toLowerCase().trim();
    const password = req.body.password;
    const firstName = sanitizeInput(req.body.firstName);
    const lastName = sanitizeInput(req.body.lastName);
    const phoneNumber = sanitizeInput(req.body.phoneNumber || '');
    const verifyPhone = req.body.verifyPhone === true;

    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({
        success: false,
        message:
          'Please provide all required fields: email, password, firstName, lastName',
      });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
      return;
    }

    const passwordCheck = isStrongPassword(password);
    if (!passwordCheck.valid) {
      res.status(400).json({
        success: false,
        message: passwordCheck.message,
      });
      return;
    }

    const existingUser = await User.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') },
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
      return;
    }

    const userData = {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      role: 'user',
      active: true,
      verificationLevel: 'basic',
      isEmailVerified: false,
      isPhoneVerified: verifyPhone,
      isHostVerified: false,
      savedRooms: [] as mongoose.Types.ObjectId[],
    };

    const user = await User.create(userData);

    const token = generateToken(user);

    const cookieOptions: CookieOptions = {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    };

    const userResponse: SafeUserResponse = user.toObject();
    userResponse.password = undefined;

    await sendInitialVerificationEmail(user._id, user.email, user.firstName);

    res.status(201).cookie('token', token, cookieOptions).json({
      success: true,
      message: 'Registration successful',
      data: userResponse,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during registration',
      error: error.message,
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    console.log(`Login attempt for email: ${email}`);
    console.log(`Request headers:`, req.headers);
    console.log(`Origin: ${req.headers.origin}`);

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
      return;
    }

    const user = await User.findOne({
      email: {
        $regex: new RegExp(
          `^${email.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`,
          'i'
        ),
      },
    }).select('+password');

    console.log('User lookup result:', user ? 'User found' : 'User not found');

    if (!user) {
      await addDelay();
      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
      return;
    }

    if (user.active === false) {
      res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.',
      });
      return;
    }

    const isMatch = await user.comparePassword(password);
    console.log('Password match result:', isMatch);

    if (!isMatch) {
      await addDelay();
      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
      return;
    }

    const token = generateToken(user);

    const cookieOptions: CookieOptions = {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    };

    console.log(`Setting auth cookie for ${user.email}`, {
      maxAge: cookieOptions.maxAge,
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
    });

    const userResponse: SafeUserResponse = user.toObject();
    userResponse.password = undefined;

    res.status(200).cookie('token', token, cookieOptions).json({
      success: true,
      message: 'Login successful',
      data: userResponse,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message,
    });
  }
};

export const logout = (_req: Request, res: Response): void => {
  try {
    const cookieOptions: CookieOptions = {
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    };

    res.cookie('token', '', cookieOptions).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
    });
  }
};

export const getCurrentUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    console.log('Getting current user...');

    if (!req.user) {
      console.log('No user found in request');
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    // Refresh the token to extend the session
    const token = generateToken(req.user);

    const cookieOptions: CookieOptions = {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    };

    // Return the user with a refreshed token
    res.cookie('token', token, cookieOptions).json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// Export a function to trigger email verification after registration
export const sendInitialVerificationEmail = async (
  userId: mongoose.Types.ObjectId,
  email: string,
  firstName: string
): Promise<boolean> => {
  try {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiry time (10 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Delete any existing OTPs for this user and type
    await OtpVerification.deleteMany({ user: userId, type: 'email' });

    // Create new OTP verification record
    await OtpVerification.create({
      user: userId,
      otp,
      type: 'email',
      expiresAt,
    });

    // Send verification email
    await sendVerificationEmail(email, firstName, otp);

    return true;
  } catch (error) {
    console.error('Error sending initial email verification OTP:', error);
    return false;
  }
};

// Send phone verification OTP
export const sendPhoneVerificationOTP = async (
  userId: mongoose.Types.ObjectId,
  phoneNumber: string
): Promise<boolean> => {
  try {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiry time (10 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Delete any existing OTPs for this user and type
    await OtpVerification.deleteMany({ user: userId, type: 'phone' });

    // Create new OTP verification record
    await OtpVerification.create({
      user: userId,
      otp,
      type: 'phone',
      expiresAt,
    });

    // In a real application, you would send an SMS here
    console.log(`[SMS SIMULATION] Sending OTP ${otp} to ${phoneNumber}`);

    return true;
  } catch (error) {
    console.error('Error sending phone verification OTP:', error);
    return false;
  }
};

export const initiatePhoneVerification = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUser = ensureAuthenticated(req, res);
    if (!currentUser) return;

    const userId = new mongoose.Types.ObjectId(currentUser._id);
    const phoneNumber = sanitizeInput(req.body.phoneNumber);

    if (!phoneNumber) {
      res.status(400).json({
        success: false,
        message: 'Phone number is required',
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

    if (phoneNumber !== user.phoneNumber) {
      user.phoneNumber = phoneNumber;
      user.isPhoneVerified = false;
      await user.save();
    }

    // Send OTP
    const result = await sendPhoneVerificationOTP(userId, phoneNumber);

    if (result) {
      res.status(200).json({
        success: true,
        message: 'Verification OTP sent to phone',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send verification OTP',
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error initiating phone verification',
      error: error.message,
    });
  }
};

// Verify phone with OTP
export const verifyPhoneWithOTP = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = ensureAuthenticated(req, res);
    if (!user) return;

    const userId = user._id;
    const otp = sanitizeInput(req.body.otp);

    if (!otp) {
      res.status(400).json({
        success: false,
        message: 'OTP is required',
      });
      return;
    }

    const otpRecord = await OtpVerification.findOne({
      user: userId,
      type: 'phone',
      otp,
    });

    if (!otpRecord) {
      await addDelay();
      res.status(400).json({
        success: false,
        message: 'Invalid OTP',
      });
      return;
    }

    if (otpRecord.expiresAt < new Date()) {
      await OtpVerification.deleteOne({ _id: otpRecord._id });
      res.status(400).json({
        success: false,
        message: 'OTP has expired, please request a new one',
      });
      return;
    }

    await User.findByIdAndUpdate(userId, { isPhoneVerified: true });

    await OtpVerification.deleteOne({ _id: otpRecord._id });

    res.status(200).json({
      success: true,
      message: 'Phone verified successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error verifying phone',
      error: error.message,
    });
  }
};

export const uploadIdVerification = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = ensureAuthenticated(req, res);
    if (!user) return;

    const userId = user._id;
    const { idType, idNumber, idImage, businessDocument } = req.body;

    if (!idType || !idNumber || !idImage) {
      res.status(400).json({
        success: false,
        message: 'ID type, number, and image (base64) are required',
      });
      return;
    }

    const userDoc = await User.findById(userId);
    if (!userDoc) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Upload ID image
    const idImageUrl = await uploadBase64Image(
      idImage,
      'verifications',
      `user-${userId}-id`
    );
    if (!idImageUrl) {
      res.status(500).json({
        success: false,
        message: 'Failed to upload ID image',
      });
      return;
    }

    userDoc.identificationDocument = {
      idType: sanitizeInput(idType),
      idNumber: sanitizeInput(idNumber),
      idImage: idImageUrl,
      uploadDate: new Date(),
      verificationStatus: 'pending',
    };

    // Handle business document if provided
    if (businessDocument) {
      const { certificateType, certificateNumber, certificateImage } =
        businessDocument;
      if (certificateType && certificateNumber && certificateImage) {
        const certificateImageUrl = await uploadBase64Image(
          certificateImage,
          'verifications',
          `user-${userId}-business-cert`
        );
        if (!certificateImageUrl) {
          res.status(500).json({
            success: false,
            message: 'Failed to upload business certificate image',
          });
          return;
        }
        if (userDoc.identificationDocument) {
          // Ensure identificationDocument exists
          userDoc.identificationDocument.businessDocument = {
            certificateType: sanitizeInput(certificateType),
            certificateNumber: sanitizeInput(certificateNumber),
            certificateImage: certificateImageUrl,
            uploadDate: new Date(),
          };
        }
      } else if (certificateType || certificateNumber || certificateImage) {
        // If some business doc fields are present but not all, it's an error
        res.status(400).json({
          success: false,
          message:
            'All business document fields (certificateType, certificateNumber, certificateImage) are required if businessDocument is provided',
        });
        return;
      }
    }

    await userDoc.save();

    res.status(200).json({
      success: true,
      message:
        'ID verification document uploaded successfully, pending approval',
      data: userDoc.identificationDocument, // Return the updated document info
    });
  } catch (error: any) {
    console.error('Error uploading ID verification:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading ID verification',
      error: error.message,
    });
  }
};

export const becomeHost = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { bio, languagesSpoken } = req.body;

    if (req.user.verificationLevel !== 'verified') {
      res.status(400).json({
        success: false,
        message: 'User must be fully verified to become a host',
      });
      return;
    }

    req.user.role = 'host';
    req.user.hostInfo = {
      bio: bio || '',
      languagesSpoken: languagesSpoken || [],
      hostSince: new Date(),
    };

    await req.user.save();

    res.status(200).json({
      success: true,
      message: 'Successfully upgraded to host',
      user: {
        ...req.user.toObject(),
        password: undefined,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error becoming a host',
      error: error.message,
    });
  }
};

export const requestPasswordReset = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const email = sanitizeInput(req.body.email?.toLowerCase());

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email is required',
      });
      return;
    }

    const user = await User.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') },
    });

    if (!user) {
      await addDelay();

      res.status(200).json({
        success: true,
        message:
          'If your email is registered, you will receive a password reset link',
      });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');

    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set token and expiry
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
      await sendPasswordResetEmail(user.email, resetUrl);

      res.status(200).json({
        success: true,
        message: 'Password reset email sent',
      });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      res.status(500).json({
        success: false,
        message: 'Email could not be sent',
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error requesting password reset',
      error: error.message,
    });
  }
};

export const validateResetToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token } = req.params;

    // Hash the token from the URL
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      await addDelay();
      res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: {
        email: user.email,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error validating reset token',
      error: error.message,
    });
  }
};

export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token } = req.body;
    const password = req.body.password;

    if (!token || !password) {
      res.status(400).json({
        success: false,
        message: 'Token and password are required',
      });
      return;
    }

    // Validate password strength
    const passwordCheck = isStrongPassword(password);
    if (!passwordCheck.valid) {
      res.status(400).json({
        success: false,
        message: passwordCheck.message,
      });
      return;
    }

    // Hash the token from the request
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with matching token and valid expiry
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      await addDelay();
      res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
      return;
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error resetting password',
      error: error.message,
    });
  }
};

export const updatePassword = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Since this is now in the protected routes section, req.user should be available
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const user = req.user as IUser; // Cast to your User interface type
    const { currentPassword, newPassword } = req.body;

    // Validate required fields
    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
      return;
    }

    // Validate password strength
    const passwordCheck = isStrongPassword(newPassword);
    if (!passwordCheck.valid) {
      res.status(400).json({
        success: false,
        message: passwordCheck.message,
      });
      return;
    }

    // Check if new password is same as current
    if (currentPassword === newPassword) {
      res.status(400).json({
        success: false,
        message: 'New password cannot be the same as current password',
      });
      return;
    }

    // Find the user with password
    const userWithPassword = await User.findById(user._id).select('+password');
    if (!userWithPassword) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Verify current password
    const isMatch = await userWithPassword.comparePassword(currentPassword);
    if (!isMatch) {
      // Add delay to prevent timing attacks
      await addDelay();
      res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
      return;
    }

    // Update password
    userWithPassword.password = newPassword;
    await userWithPassword.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error: any) {
    console.error('Password update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating password',
      error: error.message,
    });
  }
};
