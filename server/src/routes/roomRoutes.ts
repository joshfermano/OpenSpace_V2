import express from 'express';
import * as roomController from '../controllers/roomController';
import { protect, adminOnly } from '../middlewares/authMiddleware';
import multer from 'multer';
import path from 'path';

// Configure multer for room image uploads
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, './src/uploads/rooms/');
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

// Add file filter to only allow images
const fileFilter = (
  _req: express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(null, false); // Just reject without error
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

const router = express.Router();

// Public room routes
router.get('/', roomController.getRooms);
router.get('/search', roomController.searchRooms);
router.get('/:roomId', roomController.getRoomById);
router.get('/:roomId/availability', roomController.getRoomAvailability);

// Protected routes - need authentication
router.use(protect);

// Host/user specific routes
router.get('/host/:hostId', roomController.getRoomsByHost);

// Host room management
router.post('/', roomController.createRoom);
router.get('/my/listings', roomController.getMyRooms);
router.put('/:roomId', roomController.updateRoom);
router.delete('/:roomId', roomController.deleteRoom);
router.put('/:roomId/availability', roomController.updateRoomAvailability);

// Room image uploads
router.post(
  '/:roomId/images',
  upload.array('images', 10),
  roomController.uploadRoomImages
);
router.delete('/:roomId/images/:imageId', roomController.deleteRoomImage);

// Admin routes
router.use('/admin', adminOnly);
router.get('/admin/pending', roomController.getPendingRoomApprovals);
router.patch('/admin/approve/:roomId', roomController.approveRejectRoom);

export default router;
