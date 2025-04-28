import express, {
  CookieOptions,
  Request,
  Response,
  NextFunction,
} from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { checkSupabaseConnection } from './config/supabase';
import { initializeStorage } from './services/imageService';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import {
  sanitizeRequest,
  globalErrorHandler,
  rateLimitErrorHandler,
} from './middlewares/securityMiddleware';
import 'dotenv/config';
import fs from 'fs/promises';

// Import routes
import adminRoutes from './routes/adminRoutes';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import roomRoutes from './routes/roomRoutes';
import bookingRoutes from './routes/bookingRoutes';
import reviewRoutes from './routes/reviewRoutes';
import earningsRoutes from './routes/earningsRoutes';
import emailVerificationRoutes from './routes/emailVerificationRoutes';
import adminEarningsRoutes from './routes/adminEarningsRoutes';

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Security middlewares
// Set security HTTP headers
app.use(helmet());

// Apply global request sanitization
app.use(sanitizeRequest);

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

// Apply rate limiting to all routes
app.use('/api/', limiter);

// More strict rate limiting for authentication routes
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 login attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts, please try again after an hour',
});

// Apply auth rate limiting specifically to authentication routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

const corsOptions = {
  origin:
    process.env.NODE_ENV === 'production'
      ? [
          /\.vercel\.app$/,
          'https://openspace-reserve.vercel.app',
          process.env.CLIENT_URL,
        ].filter(Boolean)
      : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Cache-Control',
    'Pragma',
  ],
  exposedHeaders: ['set-cookie'],
};

app.use(cors(corsOptions));
app.use(cookieParser());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.static(path.join(__dirname, '../uploads')));

app.use((req: Request, res: Response, next: NextFunction) => {
  const originalCookie = res.cookie.bind(res);

  res.cookie = function (name: string, val: any, options?: CookieOptions) {
    const cookieOptions: CookieOptions = {
      sameSite:
        process.env.NODE_ENV === 'production'
          ? ('none' as const)
          : ('lax' as const),
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      ...options,
    };

    console.log(`Setting cookie: ${name}`, cookieOptions);

    // Call original method with our enhanced options
    return originalCookie(name, val, cookieOptions);
  } as typeof res.cookie;

  next();
});

// Middleware to sanitize data against NoSQL query injection
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.body) {
    const sanitizeValue = (obj: any): any => {
      if (obj && typeof obj === 'object') {
        for (const key in obj) {
          // Convert MongoDB operator keys ($...) to safe strings if not in a trusted context
          if (key.startsWith('$')) {
            const safeKey = key.replace('$', '_dollar_');
            obj[safeKey] = obj[key];
            delete obj[key];
          } else if (typeof obj[key] === 'object') {
            obj[key] = sanitizeValue(obj[key]);
          }
        }
      }
      return obj;
    };

    req.body = sanitizeValue(req.body);
    req.query = sanitizeValue(req.query as any) as any;
    req.params = sanitizeValue(req.params) as any;
  }
  next();
});

// Error handlers
app.use(rateLimitErrorHandler);

// API routes
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/earnings', earningsRoutes);
app.use('/api/email-verification', emailVerificationRoutes);
app.use('/api/admin/earnings', adminEarningsRoutes);

// Error handling middleware (must be after all routes)
app.use(globalErrorHandler);

// Health check route
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

const createUploadDirs = async () => {
  const dirs = [
    './src/uploads',
    './src/uploads/rooms',
    './src/uploads/profiles',
    './src/uploads/verifications',
  ];

  for (const dir of dirs) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }
};

createUploadDirs().catch(console.error);

const startServer = async () => {
  try {
    // Connect to MongoDB
    if (!process.env.MONGO_URL) {
      throw new Error('MONGO_URL not defined in environment variables');
    }

    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      await checkSupabaseConnection();
      await initializeStorage();
    } else {
      console.warn(
        'Supabase credentials not found, image storage will not be available'
      );
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
};

startServer();

export default app;
