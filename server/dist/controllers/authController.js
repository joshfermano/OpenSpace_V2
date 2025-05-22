"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePassword = exports.resetPassword = exports.validateResetToken = exports.requestPasswordReset = exports.becomeHost = exports.uploadIdVerification = exports.verifyPhoneWithOTP = exports.initiatePhoneVerification = exports.sendPhoneVerificationOTP = exports.sendInitialVerificationEmail = exports.getCurrentUser = exports.logout = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const emailService_1 = require("../services/emailService");
const crypto_1 = __importDefault(require("crypto"));
const User_1 = __importDefault(require("../models/User"));
const OtpVerification_1 = __importDefault(require("../models/OtpVerification"));
const mongoose_1 = __importDefault(require("mongoose"));
const securityUtils_1 = require("../utils/securityUtils");
require("dotenv/config");
const imageService_1 = require("../services/imageService");
function ensureAuthenticated(req, res) {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: 'Not authenticated',
        });
        return null;
    }
    return req.user;
}
const generateToken = (user) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not defined in environment variables');
    }
    const payload = {
        userId: user._id.toHexString(),
        email: user.email,
        role: user.role,
    };
    return jsonwebtoken_1.default.sign(payload, secret, {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        algorithm: 'HS256',
    });
};
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        console.log('Request body:', req.body);
        const email = (_a = req.body.email) === null || _a === void 0 ? void 0 : _a.toLowerCase().trim();
        const password = req.body.password;
        const firstName = (0, securityUtils_1.sanitizeInput)(req.body.firstName);
        const lastName = (0, securityUtils_1.sanitizeInput)(req.body.lastName);
        const phoneNumber = (0, securityUtils_1.sanitizeInput)(req.body.phoneNumber || '');
        const verifyPhone = req.body.verifyPhone === true;
        if (!email || !password || !firstName || !lastName) {
            res.status(400).json({
                success: false,
                message: 'Please provide all required fields: email, password, firstName, lastName',
            });
            return;
        }
        if (!(0, securityUtils_1.isValidEmail)(email)) {
            res.status(400).json({
                success: false,
                message: 'Please provide a valid email address',
            });
            return;
        }
        const passwordCheck = (0, securityUtils_1.isStrongPassword)(password);
        if (!passwordCheck.valid) {
            res.status(400).json({
                success: false,
                message: passwordCheck.message,
            });
            return;
        }
        const existingUser = yield User_1.default.findOne({
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
            savedRooms: [],
        };
        const user = yield User_1.default.create(userData);
        const token = generateToken(user);
        const cookieOptions = {
            maxAge: 30 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/',
        };
        const userResponse = user.toObject();
        userResponse.password = undefined;
        yield (0, exports.sendInitialVerificationEmail)(user._id, user.email, user.firstName);
        res.status(201).cookie('token', token, cookieOptions).json({
            success: true,
            message: 'Registration successful',
            data: userResponse,
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during registration',
            error: error.message,
        });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const user = yield User_1.default.findOne({
            email: {
                $regex: new RegExp(`^${email.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i'),
            },
        }).select('+password');
        console.log('User lookup result:', user ? 'User found' : 'User not found');
        if (!user) {
            yield (0, securityUtils_1.addDelay)();
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
        const isMatch = yield user.comparePassword(password);
        console.log('Password match result:', isMatch);
        if (!isMatch) {
            yield (0, securityUtils_1.addDelay)();
            res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
            return;
        }
        const token = generateToken(user);
        const cookieOptions = {
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
        const userResponse = user.toObject();
        userResponse.password = undefined;
        res.status(200).cookie('token', token, cookieOptions).json({
            success: true,
            message: 'Login successful',
            data: userResponse,
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging in',
            error: error.message,
        });
    }
});
exports.login = login;
const logout = (_req, res) => {
    try {
        const cookieOptions = {
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
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during logout',
        });
    }
};
exports.logout = logout;
const getCurrentUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const cookieOptions = {
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
    }
    catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
        });
    }
});
exports.getCurrentUser = getCurrentUser;
// Export a function to trigger email verification after registration
const sendInitialVerificationEmail = (userId, email, firstName) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        // Set expiry time (10 minutes)
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);
        // Delete any existing OTPs for this user and type
        yield OtpVerification_1.default.deleteMany({ user: userId, type: 'email' });
        // Create new OTP verification record
        yield OtpVerification_1.default.create({
            user: userId,
            otp,
            type: 'email',
            expiresAt,
        });
        // Send verification email
        yield (0, emailService_1.sendVerificationEmail)(email, firstName, otp);
        return true;
    }
    catch (error) {
        console.error('Error sending initial email verification OTP:', error);
        return false;
    }
});
exports.sendInitialVerificationEmail = sendInitialVerificationEmail;
// Send phone verification OTP
const sendPhoneVerificationOTP = (userId, phoneNumber) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        // Set expiry time (10 minutes)
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);
        // Delete any existing OTPs for this user and type
        yield OtpVerification_1.default.deleteMany({ user: userId, type: 'phone' });
        // Create new OTP verification record
        yield OtpVerification_1.default.create({
            user: userId,
            otp,
            type: 'phone',
            expiresAt,
        });
        // In a real application, you would send an SMS here
        console.log(`[SMS SIMULATION] Sending OTP ${otp} to ${phoneNumber}`);
        return true;
    }
    catch (error) {
        console.error('Error sending phone verification OTP:', error);
        return false;
    }
});
exports.sendPhoneVerificationOTP = sendPhoneVerificationOTP;
const initiatePhoneVerification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUser = ensureAuthenticated(req, res);
        if (!currentUser)
            return;
        const userId = new mongoose_1.default.Types.ObjectId(currentUser._id);
        const phoneNumber = (0, securityUtils_1.sanitizeInput)(req.body.phoneNumber);
        if (!phoneNumber) {
            res.status(400).json({
                success: false,
                message: 'Phone number is required',
            });
            return;
        }
        const user = yield User_1.default.findById(userId);
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
            yield user.save();
        }
        // Send OTP
        const result = yield (0, exports.sendPhoneVerificationOTP)(userId, phoneNumber);
        if (result) {
            res.status(200).json({
                success: true,
                message: 'Verification OTP sent to phone',
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: 'Failed to send verification OTP',
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error initiating phone verification',
            error: error.message,
        });
    }
});
exports.initiatePhoneVerification = initiatePhoneVerification;
// Verify phone with OTP
const verifyPhoneWithOTP = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = ensureAuthenticated(req, res);
        if (!user)
            return;
        const userId = user._id;
        const otp = (0, securityUtils_1.sanitizeInput)(req.body.otp);
        if (!otp) {
            res.status(400).json({
                success: false,
                message: 'OTP is required',
            });
            return;
        }
        const otpRecord = yield OtpVerification_1.default.findOne({
            user: userId,
            type: 'phone',
            otp,
        });
        if (!otpRecord) {
            yield (0, securityUtils_1.addDelay)();
            res.status(400).json({
                success: false,
                message: 'Invalid OTP',
            });
            return;
        }
        if (otpRecord.expiresAt < new Date()) {
            yield OtpVerification_1.default.deleteOne({ _id: otpRecord._id });
            res.status(400).json({
                success: false,
                message: 'OTP has expired, please request a new one',
            });
            return;
        }
        yield User_1.default.findByIdAndUpdate(userId, { isPhoneVerified: true });
        yield OtpVerification_1.default.deleteOne({ _id: otpRecord._id });
        res.status(200).json({
            success: true,
            message: 'Phone verified successfully',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error verifying phone',
            error: error.message,
        });
    }
});
exports.verifyPhoneWithOTP = verifyPhoneWithOTP;
const uploadIdVerification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = ensureAuthenticated(req, res);
        if (!user)
            return;
        const userId = user._id;
        const { idType, idNumber, idImage, businessDocument } = req.body;
        if (!idType || !idNumber || !idImage) {
            res.status(400).json({
                success: false,
                message: 'ID type, number, and image (base64) are required',
            });
            return;
        }
        const userDoc = yield User_1.default.findById(userId);
        if (!userDoc) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }
        // Upload ID image
        const idImageUrl = yield (0, imageService_1.uploadBase64Image)(idImage, 'verifications', `user-${userId}-id`);
        if (!idImageUrl) {
            res.status(500).json({
                success: false,
                message: 'Failed to upload ID image',
            });
            return;
        }
        userDoc.identificationDocument = {
            idType: (0, securityUtils_1.sanitizeInput)(idType),
            idNumber: (0, securityUtils_1.sanitizeInput)(idNumber),
            idImage: idImageUrl,
            uploadDate: new Date(),
            verificationStatus: 'pending',
        };
        // Handle business document if provided
        if (businessDocument) {
            const { certificateType, certificateNumber, certificateImage } = businessDocument;
            if (certificateType && certificateNumber && certificateImage) {
                const certificateImageUrl = yield (0, imageService_1.uploadBase64Image)(certificateImage, 'verifications', `user-${userId}-business-cert`);
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
                        certificateType: (0, securityUtils_1.sanitizeInput)(certificateType),
                        certificateNumber: (0, securityUtils_1.sanitizeInput)(certificateNumber),
                        certificateImage: certificateImageUrl,
                        uploadDate: new Date(),
                    };
                }
            }
            else if (certificateType || certificateNumber || certificateImage) {
                // If some business doc fields are present but not all, it's an error
                res.status(400).json({
                    success: false,
                    message: 'All business document fields (certificateType, certificateNumber, certificateImage) are required if businessDocument is provided',
                });
                return;
            }
        }
        yield userDoc.save();
        res.status(200).json({
            success: true,
            message: 'ID verification document uploaded successfully, pending approval',
            data: userDoc.identificationDocument, // Return the updated document info
        });
    }
    catch (error) {
        console.error('Error uploading ID verification:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading ID verification',
            error: error.message,
        });
    }
});
exports.uploadIdVerification = uploadIdVerification;
const becomeHost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        yield req.user.save();
        res.status(200).json({
            success: true,
            message: 'Successfully upgraded to host',
            user: Object.assign(Object.assign({}, req.user.toObject()), { password: undefined }),
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error becoming a host',
            error: error.message,
        });
    }
});
exports.becomeHost = becomeHost;
const requestPasswordReset = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const email = (0, securityUtils_1.sanitizeInput)((_a = req.body.email) === null || _a === void 0 ? void 0 : _a.toLowerCase());
        if (!email) {
            res.status(400).json({
                success: false,
                message: 'Email is required',
            });
            return;
        }
        const user = yield User_1.default.findOne({
            email: { $regex: new RegExp(`^${email}$`, 'i') },
        });
        if (!user) {
            yield (0, securityUtils_1.addDelay)();
            res.status(200).json({
                success: true,
                message: 'If your email is registered, you will receive a password reset link',
            });
            return;
        }
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const hashedToken = crypto_1.default
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');
        // Set token and expiry
        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        yield user.save();
        try {
            const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
            yield (0, emailService_1.sendPasswordResetEmail)(user.email, resetUrl);
            res.status(200).json({
                success: true,
                message: 'Password reset email sent',
            });
        }
        catch (error) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            yield user.save();
            res.status(500).json({
                success: false,
                message: 'Email could not be sent',
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error requesting password reset',
            error: error.message,
        });
    }
});
exports.requestPasswordReset = requestPasswordReset;
const validateResetToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token } = req.params;
        // Hash the token from the URL
        const hashedToken = crypto_1.default.createHash('sha256').update(token).digest('hex');
        const user = yield User_1.default.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() },
        });
        if (!user) {
            yield (0, securityUtils_1.addDelay)();
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error validating reset token',
            error: error.message,
        });
    }
});
exports.validateResetToken = validateResetToken;
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const passwordCheck = (0, securityUtils_1.isStrongPassword)(password);
        if (!passwordCheck.valid) {
            res.status(400).json({
                success: false,
                message: passwordCheck.message,
            });
            return;
        }
        // Hash the token from the request
        const hashedToken = crypto_1.default.createHash('sha256').update(token).digest('hex');
        // Find user with matching token and valid expiry
        const user = yield User_1.default.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() },
        });
        if (!user) {
            yield (0, securityUtils_1.addDelay)();
            res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token',
            });
            return;
        }
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        yield user.save();
        res.status(200).json({
            success: true,
            message: 'Password reset successful',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error resetting password',
            error: error.message,
        });
    }
});
exports.resetPassword = resetPassword;
const updatePassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Since this is now in the protected routes section, req.user should be available
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
            return;
        }
        const user = req.user; // Cast to your User interface type
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
        const passwordCheck = (0, securityUtils_1.isStrongPassword)(newPassword);
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
        const userWithPassword = yield User_1.default.findById(user._id).select('+password');
        if (!userWithPassword) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }
        // Verify current password
        const isMatch = yield userWithPassword.comparePassword(currentPassword);
        if (!isMatch) {
            // Add delay to prevent timing attacks
            yield (0, securityUtils_1.addDelay)();
            res.status(401).json({
                success: false,
                message: 'Current password is incorrect',
            });
            return;
        }
        // Update password
        userWithPassword.password = newPassword;
        yield userWithPassword.save();
        res.status(200).json({
            success: true,
            message: 'Password updated successfully',
        });
    }
    catch (error) {
        console.error('Password update error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating password',
            error: error.message,
        });
    }
});
exports.updatePassword = updatePassword;
