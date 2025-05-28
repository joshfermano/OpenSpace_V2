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
const express_1 = __importDefault(require("express"));
const userController = __importStar(require("../controllers/userController"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const createUploadDir = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield promises_1.default.mkdir('./public/uploads/profiles', { recursive: true });
    }
    catch (err) {
        console.error('Error creating upload directory:', err);
    }
});
createUploadDir();
const storage = multer_1.default.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, './public/uploads/profiles/');
    },
    filename: function (_req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `profile-${uniqueSuffix}${ext}`);
    },
});
const fileFilter = (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    }
    else {
        cb(null, false);
    }
};
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
});
const router = express_1.default.Router();
// Protected routes (require authentication) - SPECIFIC paths MUST come BEFORE parameterized routes
// Dashboard
router.get('/dashboard', authMiddleware_1.protect, userController.getDashboardData);
router.get('/notifications', authMiddleware_1.protect, userController.getNotifications);
router.put('/notifications/:id/read', authMiddleware_1.protect, userController.markNotificationAsRead);
// Profile management
router.get('/profile', authMiddleware_1.protect, userController.getUserProfile);
router.put('/edit-profile', authMiddleware_1.protect, userController.updateProfile);
router.put('/password', authMiddleware_1.protect, userController.changePassword);
// Profile image upload
router.post('/profile/upload-image', authMiddleware_1.protect, upload.single('profileImage'), userController.uploadProfileImage);
// Favorites/wishlist management
router.get('/saved-rooms', authMiddleware_1.protect, userController.getSavedRooms);
router.post('/save-room', authMiddleware_1.protect, userController.saveRoom);
router.delete('/unsave-rooms/:roomId', authMiddleware_1.protect, userController.unsaveRoom);
// Public routes (accessible without authentication) - parameterized routes come LAST
// Get user (for viewing host profiles publicly)
router.get('/:userId', userController.getUserById);
exports.default = router;
