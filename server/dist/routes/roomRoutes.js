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
const roomController = __importStar(require("../controllers/roomController"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
// Configure multer for room image uploads
const storage = multer_1.default.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, './src/uploads/rooms/');
    },
    filename: function (_req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
    },
});
// Add file filter to only allow images
const fileFilter = (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    }
    else {
        cb(null, false); // Just reject without error
    }
};
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});
const router = express_1.default.Router();
// Public room routes
router.get('/', roomController.getRooms);
router.get('/search', roomController.searchRooms);
router.get('/host/:hostId', roomController.getRoomsByHost);
router.get('/:roomId', roomController.getRoomById);
router.get('/:roomId/availability', roomController.getRoomAvailability);
// Protected routes - need authentication
router.use(authMiddleware_1.protect);
// Host room management
router.post('/', roomController.createRoom);
router.get('/my/listings', roomController.getMyRooms);
router.put('/:roomId', roomController.updateRoom);
router.delete('/:roomId', roomController.deleteRoom);
router.put('/:roomId/availability', roomController.updateRoomAvailability);
// Room image uploads
router.post('/:roomId/images', upload.array('images', 10), roomController.uploadRoomImages);
router.delete('/:roomId/images/:imageId', roomController.deleteRoomImage);
// Admin routes
router.use('/admin', authMiddleware_1.adminOnly);
router.get('/admin/pending', roomController.getPendingRoomApprovals);
router.patch('/admin/approve/:roomId', roomController.approveRejectRoom);
exports.default = router;
