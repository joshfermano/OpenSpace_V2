"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminController = __importStar(require("../controllers/adminController"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Public endpoint - no middleware needed
router.get('/check-admin-exists', adminController.checkAdminExists);
router.post('/initial-admin-setup', adminController.initialAdminSetup);
// All other admin routes require authentication and admin role
router.use(authMiddleware_1.protect);
router.use(authMiddleware_1.adminOnly);
// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/banned', adminController.getBannedUsers);
router.get('/users/:userId', adminController.getUserById);
router.put('/users/:userId', adminController.updateUserById);
router.post('/users/create-admin', adminController.createAdmin);
router.delete('/users/:userId', adminController.deleteUser);
// User banning/unbanning
router.patch('/users/:userId/ban', adminController.banUser);
router.patch('/users/:userId/unban', adminController.unbanUser);
// ID verification management
router.get('/id-verifications', adminController.getPendingIdVerifications);
router.patch('/id-verification/:userId', adminController.verifyUserIdDocument);
// Room approvals
router.get('/rooms/pending', adminController.getPendingRoomApprovals);
router.patch('/rooms/:roomId/approve', adminController.approveRejectRoom);
// Booking management
router.get('/bookings', adminController.getAllBookings);
router.patch('/bookings/:bookingId/status', adminController.updateBookingStatus);
router.delete('/bookings/:bookingId', adminController.deleteBooking);
// Dashboard
router.get('/dashboard-summary', adminController.getDashboardSummary);
exports.default = router;
