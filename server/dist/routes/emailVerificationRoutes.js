"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const emailVerificationController_1 = require("../controllers/emailVerificationController");
const router = express_1.default.Router();
// Public routes (no authentication required)
router.post('/test-email', emailVerificationController_1.testEmailDelivery);
router.post('/send-email', emailVerificationController_1.sendVerificationByEmail);
router.post('/verify-otp', emailVerificationController_1.verifyEmailWithOTP);
router.post('/resend-otp', emailVerificationController_1.resendEmailVerification);
router.post('/send-otp', authMiddleware_1.protect, emailVerificationController_1.sendEmailVerificationOTP);
exports.default = router;
