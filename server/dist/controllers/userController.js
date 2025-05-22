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
exports.getUserProfile = exports.uploadProfileImage = exports.markNotificationAsRead = exports.getNotifications = exports.getDashboardData = exports.getSavedRooms = exports.unsaveRoom = exports.saveRoom = exports.changePassword = exports.updateProfile = exports.getUserById = void 0;
const User_1 = __importDefault(require("../models/User"));
const mongoose_1 = __importDefault(require("mongoose"));
const Room_1 = __importDefault(require("../models/Room"));
const Booking_1 = __importDefault(require("../models/Booking"));
const imageService_1 = require("../services/imageService");
const imageService_2 = require("../services/imageService");
// Helper function to safely access req.user
function getUserFromRequest(req, res) {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: 'Not authenticated',
        });
        return null;
    }
    // Handle both possible structures
    const user = req.user;
    if (!user._id && !user.id) {
        res.status(401).json({
            success: false,
            message: 'Invalid user data in request',
        });
        return null;
    }
    return req.user;
}
// Get user by ID
const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
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
const updateProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        // Get user ID from authenticated user
        const currentUser = getUserFromRequest(req, res);
        if (!currentUser)
            return;
        const userId = currentUser._id;
        const { firstName, lastName, phoneNumber, profileImage, hostInfo } = req.body;
        // Check if user exists
        const user = yield User_1.default.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }
        // Update basic user information
        if (firstName)
            user.firstName = firstName;
        if (lastName)
            user.lastName = lastName;
        if (phoneNumber)
            user.phoneNumber = phoneNumber;
        if (profileImage)
            user.profileImage = profileImage;
        // Update host info if provided
        if (hostInfo && (user.role === 'host' || user.role === 'admin')) {
            user.hostInfo = Object.assign(Object.assign({}, user.hostInfo), { bio: hostInfo.bio || ((_a = user.hostInfo) === null || _a === void 0 ? void 0 : _a.bio) || '', languagesSpoken: hostInfo.languagesSpoken || ((_b = user.hostInfo) === null || _b === void 0 ? void 0 : _b.languagesSpoken) || [], responseTime: hostInfo.responseTime || ((_c = user.hostInfo) === null || _c === void 0 ? void 0 : _c.responseTime), hostSince: ((_d = user.hostInfo) === null || _d === void 0 ? void 0 : _d.hostSince) || new Date() });
        }
        // Save updated user
        yield user.save();
        // Remove password from response
        const userResponse = user.toObject();
        userResponse.password = undefined;
        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: userResponse,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating profile',
            error: error.message,
        });
    }
});
exports.updateProfile = updateProfile;
// Change password
const changePassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { currentPassword, newPassword } = req.body;
        const currentUser = getUserFromRequest(req, res);
        if (!currentUser)
            return;
        const userId = currentUser._id;
        if (!currentPassword || !newPassword) {
            res.status(400).json({
                success: false,
                message: 'Current password and new password are required',
            });
            return;
        }
        // Find user
        const user = yield User_1.default.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }
        // Check if current password is correct
        const isMatch = yield user.comparePassword(currentPassword);
        if (!isMatch) {
            res.status(401).json({
                success: false,
                message: 'Current password is incorrect',
            });
            return;
        }
        // Update password
        user.password = newPassword;
        yield user.save();
        res.status(200).json({
            success: true,
            message: 'Password updated successfully',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error changing password',
            error: error.message,
        });
    }
});
exports.changePassword = changePassword;
// Save a room to favorites
const saveRoom = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUser = getUserFromRequest(req, res);
        if (!currentUser)
            return;
        const userId = currentUser._id;
        const { roomId } = req.body;
        if (!roomId) {
            res.status(400).json({
                success: false,
                message: 'Room ID is required',
            });
            return;
        }
        // Check if room exists
        const room = yield Room_1.default.findById(roomId);
        if (!room) {
            res.status(404).json({
                success: false,
                message: 'Room not found',
            });
            return;
        }
        // Add room to saved rooms if not already saved
        const user = yield User_1.default.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }
        if (!user.savedRooms.includes(roomId)) {
            user.savedRooms.push(roomId);
            yield user.save();
        }
        res.status(200).json({
            success: true,
            message: 'Room saved to favorites',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error saving room to favorites',
            error: error.message,
        });
    }
});
exports.saveRoom = saveRoom;
// Remove a room from favorites
const unsaveRoom = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUser = getUserFromRequest(req, res);
        if (!currentUser)
            return;
        const userId = currentUser._id;
        const { roomId } = req.params;
        if (!roomId) {
            res.status(400).json({
                success: false,
                message: 'Room ID is required',
            });
            return;
        }
        // Remove room from saved rooms
        const user = yield User_1.default.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }
        user.savedRooms = user.savedRooms.filter((id) => id.toString() !== roomId);
        yield user.save();
        res.status(200).json({
            success: true,
            message: 'Room removed from favorites',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error removing room from favorites',
            error: error.message,
        });
    }
});
exports.unsaveRoom = unsaveRoom;
// Get saved rooms
const getSavedRooms = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUser = getUserFromRequest(req, res);
        if (!currentUser)
            return;
        const userId = currentUser._id;
        const user = yield User_1.default.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }
        // Get saved rooms with details
        const savedRooms = yield Room_1.default.find({
            _id: { $in: user.savedRooms },
            isPublished: true,
            status: 'approved',
        });
        res.status(200).json({
            success: true,
            count: savedRooms.length,
            data: savedRooms,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching saved rooms',
            error: error.message,
        });
    }
});
exports.getSavedRooms = getSavedRooms;
// Get user dashboard data
const getDashboardData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUser = getUserFromRequest(req, res);
        if (!currentUser)
            return;
        const userId = currentUser._id;
        const user = yield User_1.default.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }
        // Different dashboard data based on user role
        let dashboardData = {
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                profileImage: user.profileImage,
                role: user.role,
                verificationLevel: user.verificationLevel,
                isEmailVerified: user.isEmailVerified,
                isPhoneVerified: user.isPhoneVerified,
            },
        };
        if (user.role === 'host') {
            // Get host rooms
            const rooms = yield Room_1.default.find({ host: userId });
            // Get recent bookings
            const recentBookings = yield Booking_1.default.find({ host: userId })
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('room', 'title images')
                .populate('user', 'firstName lastName profileImage');
            // Calculate stats
            const pendingBookings = yield Booking_1.default.countDocuments({
                host: userId,
                bookingStatus: 'pending',
            });
            const confirmedBookings = yield Booking_1.default.countDocuments({
                host: userId,
                bookingStatus: 'confirmed',
            });
            dashboardData = Object.assign(Object.assign({}, dashboardData), { hostData: {
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
                } });
        }
        else {
            // Regular user dashboard
            // Get recent bookings
            const recentBookings = yield Booking_1.default.find({ user: userId })
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('room', 'title images')
                .populate('host', 'firstName lastName');
            // Get count of saved rooms
            const savedRoomsCount = user.savedRooms.length;
            dashboardData = Object.assign(Object.assign({}, dashboardData), { userData: {
                    bookings: {
                        recent: recentBookings,
                        upcoming: yield Booking_1.default.countDocuments({
                            user: userId,
                            bookingStatus: 'confirmed',
                            checkIn: { $gte: new Date() },
                        }),
                        completed: yield Booking_1.default.countDocuments({
                            user: userId,
                            bookingStatus: 'completed',
                        }),
                    },
                    savedRooms: savedRoomsCount,
                } });
        }
        res.status(200).json({
            success: true,
            data: dashboardData,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard data',
            error: error.message,
        });
    }
});
exports.getDashboardData = getDashboardData;
const getNotifications = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Placeholder for notifications implementation
        res.status(200).json({
            success: true,
            data: [],
            message: 'Notifications feature coming soon',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching notifications',
            error: error.message,
        });
    }
});
exports.getNotifications = getNotifications;
const markNotificationAsRead = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.status(200).json({
            success: true,
            message: 'Notification marked as read',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error marking notification as read',
            error: error.message,
        });
    }
});
exports.markNotificationAsRead = markNotificationAsRead;
const uploadProfileImage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        if (!currentUser)
            return;
        const userId = currentUser._id;
        const user = yield User_1.default.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }
        // If user already has a profile image, delete the old one
        if (user.profileImage && user.profileImage.includes('supabase')) {
            yield (0, imageService_2.deleteImage)(user.profileImage);
        }
        // Upload to Supabase
        const imageUrl = yield (0, imageService_1.uploadImage)(file.path, 'profiles');
        if (!imageUrl) {
            res.status(500).json({
                success: false,
                message: 'Failed to upload profile image',
            });
            return;
        }
        // Update user with new profile image URL
        user.profileImage = imageUrl;
        yield user.save();
        res.status(200).json({
            success: true,
            message: 'Profile image uploaded successfully',
            data: {
                profileImage: imageUrl,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error uploading profile image',
            error: error.message,
        });
    }
});
exports.uploadProfileImage = uploadProfileImage;
const getUserProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUser = getUserFromRequest(req, res);
        if (!currentUser)
            return;
        const userId = currentUser._id;
        // Get fresh user data with populated fields if needed
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
            message: 'Error fetching user profile',
            error: error.message,
        });
    }
});
exports.getUserProfile = getUserProfile;
