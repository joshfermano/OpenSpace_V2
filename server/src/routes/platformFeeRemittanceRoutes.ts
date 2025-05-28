import express from 'express';
import { protect as authMiddleware } from '../middlewares/authMiddleware';
import * as platformFeeRemittanceController from '../controllers/platformFeeRemittanceController';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Host routes
router.get(
  '/host/remittances',
  platformFeeRemittanceController.getHostRemittances
);

router.post(
  '/host/remittances/:remittanceId/pay',
  platformFeeRemittanceController.processPlatformFeePayment
);

// Admin routes
router.get(
  '/admin/remittances',
  platformFeeRemittanceController.getAllPlatformFeeRemittances
);

router.post(
  '/admin/remittances/mark-overdue',
  platformFeeRemittanceController.markOverdueRemittances
);

router.get(
  '/admin/statistics',
  platformFeeRemittanceController.getPlatformFeeStatistics
);

export default router;
