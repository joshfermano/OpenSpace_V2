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
exports.getBannedUsers = exports.deleteBooking = exports.updateBookingStatus = exports.getAllBookings = exports.approveRejectRoom = exports.getPendingRoomApprovals = exports.initialAdminSetup = exports.checkAdminExists = exports.deleteUser = exports.unbanUser = exports.banUser = exports.createAdmin = exports.verifyUserIdDocument = exports.getPendingIdVerifications = exports.updateUserById = exports.getUserById = exports.getAllUsers = exports.getDashboardSummary = void 0;
const User_1 = __importDefault(require("../models/User"));
const mongoose_1 = __importDefault(require("mongoose"));
const Room_1 = __importDefault(require("../models/Room"));
const Booking_1 = __importDefault(require("../models/Booking"));
// Helper function to ensure admin authentication
function ensureAdmin(req, res) {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: 'Not authenticated',
        });
        return null;
    }
    if (req.user.role !== 'admin') {
        res.status(403).json({
            success: false,
            message: 'Not authorized, admin access required',
        });
        return null;
    }
    return req.user;
}
// Get dashboard summary stats
const getDashboardSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admin = ensureAdmin(req, res);
        if (!admin)
            return;
        console.log('Processing dashboard summary request...');
        // Get user verification counts using the static method
        const userCounts = yield User_1.default.getUserVerificationCounts();
        console.log('User counts:', userCounts);
        const pendingVerifications = yield User_1.default.countDocuments({
            'identificationDocument.verificationStatus': 'pending',
        });
        // Get space and host statistics
        const totalSpaces = yield Room_1.default.countDocuments();
        const hostCount = yield User_1.default.countDocuments({ role: 'host' });
        // Prepare the response data
        const summaryData = {
            totalUsers: userCounts.total,
            verifiedUsers: userCounts.verified,
            unverifiedUsers: userCounts.unverified,
            bannedUsers: userCounts.banned,
            pendingVerifications,
            totalSpaces,
            hostCount,
        };
        console.log('Dashboard Summary Data:', summaryData);
        res.status(200).json({
            success: true,
            data: summaryData,
        });
    }
    catch (error) {
        console.error('Error fetching dashboard summary:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard summary',
            error: error.message,
        });
    }
});
exports.getDashboardSummary = getDashboardSummary;
// Get all users (admin only)
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admin = ensureAdmin(req, res);
        if (!admin)
            return;
        // Handle pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        // Handle filtering
        const filter = {};
        if (req.query.role) {
            filter.role = req.query.role;
        }
        if (req.query.verificationLevel) {
            filter.verificationLevel = req.query.verificationLevel;
        }
        if (req.query.isEmailVerified) {
            filter.isEmailVerified = req.query.isEmailVerified === 'true';
        }
        // Get users
        const users = yield User_1.default.find(filter)
            .select('-password')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
        const totalUsers = yield User_1.default.countDocuments(filter);
        res.status(200).json({
            success: true,
            count: users.length,
            totalPages: Math.ceil(totalUsers / limit),
            currentPage: page,
            data: users,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching users',
            error: error.message,
        });
    }
});
exports.getAllUsers = getAllUsers;
// Get user by ID (admin view)
const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admin = ensureAdmin(req, res);
        if (!admin)
            return;
        const { userId } = req.params;
        // Check if ID is valid
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID',
            });
            return;
        }
        // Find user
        const user = yield User_1.default.findById(userId).select('-password');
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching user',
            error: error.message,
        });
    }
});
exports.getUserById = getUserById;
// Update user by ID (admin only)
const updateUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admin = ensureAdmin(req, res);
        if (!admin)
            return;
        const { userId } = req.params;
        const { firstName, lastName, role, verificationLevel, isEmailVerified, isPhoneVerified, profileImage, active, } = req.body;
        // Check if ID is valid
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID',
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
        // Create an object with the fields to update
        const updateFields = {};
        if (firstName !== undefined)
            updateFields.firstName = firstName;
        if (lastName !== undefined)
            updateFields.lastName = lastName;
        if (role !== undefined)
            updateFields.role = role;
        if (verificationLevel !== undefined)
            updateFields.verificationLevel = verificationLevel;
        if (isEmailVerified !== undefined)
            updateFields.isEmailVerified = isEmailVerified;
        if (isPhoneVerified !== undefined)
            updateFields.isPhoneVerified = isPhoneVerified;
        if (profileImage !== undefined)
            updateFields.profileImage = profileImage;
        if (active !== undefined)
            updateFields.active = active;
        // Update user with new data
        const updatedUser = yield User_1.default.findByIdAndUpdate(userId, { $set: updateFields }, { new: true, runValidators: true }).select('-password');
        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: updatedUser,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating user',
            error: error.message,
        });
    }
});
exports.updateUserById = updateUserById;
// Get pending ID verifications
const getPendingIdVerifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admin = ensureAdmin(req, res);
        if (!admin)
            return;
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const users = yield User_1.default.find({
            'identificationDocument.verificationStatus': 'pending',
        })
            .select('_id firstName lastName email identificationDocument profileImage')
            .skip(skip)
            .limit(limit)
            .sort({ 'identificationDocument.uploadDate': 1 }); // Oldest first
        const total = yield User_1.default.countDocuments({
            'identificationDocument.verificationStatus': 'pending',
        });
        res.status(200).json({
            success: true,
            count: users.length,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            data: users,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error getting pending ID verifications',
            error: error.message,
        });
    }
});
exports.getPendingIdVerifications = getPendingIdVerifications;
// Verify user ID document
const verifyUserIdDocument = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admin = ensureAdmin(req, res);
        if (!admin)
            return;
        const { userId } = req.params;
        const { isApproved, rejectionReason } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID',
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
        if (!user.identificationDocument) {
            res.status(400).json({
                success: false,
                message: 'User has not uploaded an ID document',
            });
            return;
        }
        if (isApproved) {
            // Approve the ID verification
            user.identificationDocument.verificationStatus = 'approved';
            user.identificationDocument.verificationDate = new Date();
            // If email and phone are also verified, upgrade verification level
            if (user.isEmailVerified && user.isPhoneVerified) {
                user.verificationLevel = 'verified';
            }
        }
        else {
            // Reject the ID verification
            user.identificationDocument.verificationStatus = 'rejected';
            user.identificationDocument.verificationDate = new Date();
            user.identificationDocument.rejectionReason =
                rejectionReason || 'Document verification failed';
        }
        yield user.save();
        res.status(200).json({
            success: true,
            message: `User ID document ${isApproved ? 'approved' : 'rejected'} successfully`,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error verifying user ID document',
            error: error.message,
        });
    }
});
exports.verifyUserIdDocument = verifyUserIdDocument;
// Create admin user
const createAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // First ensure the requester is authenticated and is an admin
        const requestingUser = ensureAdmin(req, res);
        if (!requestingUser)
            return;
        const { email, password, firstName, lastName, phoneNumber, profileImage } = req.body;
        // Check if admin already exists
        const existingUser = yield User_1.default.findOne({ email });
        if (existingUser) {
            res.status(400).json({
                success: false,
                message: 'User already exists with this email',
            });
            return;
        }
        // Create new admin user
        const user = yield User_1.default.create({
            email,
            password,
            firstName,
            lastName,
            phoneNumber,
            profileImage: profileImage || '',
            role: 'admin',
            verificationLevel: 'admin',
            isEmailVerified: true,
            isPhoneVerified: true,
        });
        // Change delete operation
        const userResponse = user.toObject();
        userResponse.password = undefined;
        res.status(201).json({
            success: true,
            message: 'Admin user created successfully',
            user: userResponse,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating admin user',
            error: error.message,
        });
    }
});
exports.createAdmin = createAdmin;
// Ban user
const banUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admin = ensureAdmin(req, res);
        if (!admin)
            return;
        const { userId } = req.params;
        const { reason } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID',
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
        if (user.role === 'admin') {
            res.status(400).json({
                success: false,
                message: 'Cannot ban an admin user',
            });
            return;
        }
        const userWithBan = user;
        userWithBan.active = false;
        userWithBan.banReason = reason || 'Banned by admin';
        yield userWithBan.save();
        res.status(200).json({
            success: true,
            message: 'User banned successfully',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error banning user',
            error: error.message,
        });
    }
});
exports.banUser = banUser;
// Unban user
const unbanUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admin = ensureAdmin(req, res);
        if (!admin)
            return;
        const { userId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID',
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
        const userWithBan = user;
        userWithBan.active = true;
        userWithBan.banReason = undefined;
        yield userWithBan.save();
        res.status(200).json({
            success: true,
            message: 'User unbanned successfully',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error unbanning user',
            error: error.message,
        });
    }
});
exports.unbanUser = unbanUser;
// Delete user
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admin = ensureAdmin(req, res);
        if (!admin)
            return;
        const { userId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID',
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
        if (user.role === 'admin') {
            res.status(400).json({
                success: false,
                message: 'Cannot delete an admin user',
            });
            return;
        }
        yield User_1.default.findByIdAndDelete(userId);
        res.status(200).json({
            success: true,
            message: 'User deleted successfully',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting user',
            error: error.message,
        });
    }
});
exports.deleteUser = deleteUser;
// Check if admin exists (for initial setup)
const checkAdminExists = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const adminCount = yield User_1.default.countDocuments({ role: 'admin' });
        res.status(200).json({
            success: true,
            adminExists: adminCount > 0,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error checking admin existence',
            error: error.message,
        });
    }
});
exports.checkAdminExists = checkAdminExists;
// Initial admin setup (first admin account)
const initialAdminSetup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, firstName, lastName, phoneNumber, setupCode } = req.body;
        const validSetupCode = process.env.ADMIN_SETUP_CODE;
        if (!validSetupCode || setupCode !== validSetupCode) {
            res.status(401).json({
                success: false,
                message: 'Invalid setup code',
            });
            return;
        }
        const adminCount = yield User_1.default.countDocuments({ role: 'admin' });
        if (adminCount > 0) {
            res.status(400).json({
                success: false,
                message: 'Admin account already exists. This setup can only be used once.',
            });
            return;
        }
        const user = yield User_1.default.create({
            email,
            password,
            firstName,
            lastName,
            phoneNumber: phoneNumber || '',
            profileImage: '',
            role: 'admin',
            verificationLevel: 'admin',
            isEmailVerified: true,
            isPhoneVerified: true,
        });
        const userResponse = user.toObject();
        userResponse.password = undefined;
        res.status(201).json({
            success: true,
            message: 'Initial admin user created successfully',
            user: userResponse,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating initial admin user',
            error: error.message,
        });
    }
});
exports.initialAdminSetup = initialAdminSetup;
// Get pending room approvals
const getPendingRoomApprovals = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admin = ensureAdmin(req, res);
        if (!admin)
            return;
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        // Get pending rooms
        const pendingRooms = yield Room_1.default.find({ status: 'pending' })
            .populate('host', 'firstName lastName email')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: 1 }); // Oldest first
        const total = yield Room_1.default.countDocuments({ status: 'pending' });
        res.status(200).json({
            success: true,
            count: pendingRooms.length,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            data: pendingRooms,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching pending room approvals',
            error: error.message,
        });
    }
});
exports.getPendingRoomApprovals = getPendingRoomApprovals;
// Approve or reject room
const approveRejectRoom = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admin = ensureAdmin(req, res);
        if (!admin)
            return;
        const { roomId } = req.params;
        const { approved, rejectionReason } = req.body;
        // Check if room exists
        const room = yield Room_1.default.findById(roomId);
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
        }
        else {
            room.status = 'rejected';
            room.isPublished = false;
            room.rejectionReason =
                rejectionReason || 'Room does not meet our standards';
        }
        yield room.save();
        res.status(200).json({
            success: true,
            message: `Room ${approved ? 'approved' : 'rejected'} successfully`,
            data: room,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error approving/rejecting room',
            error: error.message,
        });
    }
});
exports.approveRejectRoom = approveRejectRoom;
// Get all bookings (admin view)
const getAllBookings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admin = ensureAdmin(req, res);
        if (!admin)
            return;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const filter = {};
        if (req.query.status) {
            filter.bookingStatus = req.query.status;
        }
        const bookings = yield Booking_1.default.find(filter)
            .populate('room', 'title images location type')
            .populate('user', 'firstName lastName email')
            .populate('host', 'firstName lastName email')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
        const total = yield Booking_1.default.countDocuments(filter);
        res.status(200).json({
            success: true,
            count: bookings.length,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            data: bookings,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching bookings',
            error: error.message,
        });
    }
});
exports.getAllBookings = getAllBookings;
// Update booking status (admin only)
const updateBookingStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admin = ensureAdmin(req, res);
        if (!admin)
            return;
        const { bookingId } = req.params;
        const { status, reason } = req.body;
        // Find booking
        const booking = yield Booking_1.default.findById(bookingId);
        if (!booking) {
            res.status(404).json({
                success: false,
                message: 'Booking not found',
            });
            return;
        }
        // Update status
        booking.bookingStatus = status;
        // Handle cancellation details if status is cancelled or rejected
        if (['cancelled', 'rejected'].includes(status)) {
            booking.cancellationDetails = {
                cancelledAt: new Date(),
                cancelledBy: 'admin',
                reason: reason || 'Administrative action',
            };
        }
        yield booking.save();
        res.status(200).json({
            success: true,
            message: 'Booking status updated successfully',
            data: booking,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating booking status',
            error: error.message,
        });
    }
});
exports.updateBookingStatus = updateBookingStatus;
// Delete booking (admin only)
const deleteBooking = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admin = ensureAdmin(req, res);
        if (!admin)
            return;
        const { bookingId } = req.params;
        // Check if booking exists
        const booking = yield Booking_1.default.findById(bookingId);
        if (!booking) {
            res.status(404).json({
                success: false,
                message: 'Booking not found',
            });
            return;
        }
        // Check if booking can be safely deleted
        if (booking.bookingStatus === 'confirmed') {
            res.status(400).json({
                success: false,
                message: 'Cannot delete a confirmed booking',
            });
            return;
        }
        // Delete booking
        yield Booking_1.default.findByIdAndDelete(bookingId);
        res.status(200).json({
            success: true,
            message: 'Booking deleted successfully',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting booking',
            error: error.message,
        });
    }
});
exports.deleteBooking = deleteBooking;
// Get banned users
const getBannedUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admin = ensureAdmin(req, res);
        if (!admin)
            return;
        // Handle pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        // Get banned users (those with active = false)
        const bannedUsers = yield User_1.default.find({ active: false })
            .select('-password')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
        const totalBannedUsers = yield User_1.default.countDocuments({ active: false });
        res.status(200).json({
            success: true,
            count: bannedUsers.length,
            totalPages: Math.ceil(totalBannedUsers / limit),
            currentPage: page,
            data: bannedUsers,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching banned users',
            error: error.message,
        });
    }
});
exports.getBannedUsers = getBannedUsers;
