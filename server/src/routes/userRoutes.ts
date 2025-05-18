import express from 'express';
import * as userController from '../controllers/userController';
import { protect } from '../middlewares/authMiddleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const createUploadDir = async () => {
  try {
    await fs.mkdir('./public/uploads/profiles', { recursive: true });
  } catch (err) {
    console.error('Error creating upload directory:', err);
  }
};
createUploadDir();

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, './public/uploads/profiles/');
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (
  _req: express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = express.Router();

// Public routes (accessible without authentication)
// Get user (for viewing host profiles publicly)
router.get('/:userId', userController.getUserById);

// Protected routes (require authentication)
router.use(protect);

// Profile management
router.get('/profile', userController.getUserProfile);
router.put('/edit-profile', userController.updateProfile);
router.put('/password', userController.changePassword);

// Profile image upload
router.post(
  '/profile/upload-image',
  upload.single('profileImage'),
  userController.uploadProfileImage
);

// Dashboard
router.get('/dashboard', userController.getDashboardData);
router.get('/notifications', userController.getNotifications);
router.put('/notifications/:id/read', userController.markNotificationAsRead);

// Favorites/wishlist management
router.get('/saved-rooms', userController.getSavedRooms);
router.post('/save-room', userController.saveRoom);
router.delete('/unsave-rooms/:roomId', userController.unsaveRoom);

export default router;
