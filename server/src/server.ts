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
import * as swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './swagger';
import {
  sanitizeRequest,
  globalErrorHandler,
  rateLimitErrorHandler,
} from './middlewares/securityMiddleware';
import 'dotenv/config';
import fs from 'fs/promises';

import adminRoutes from './routes/adminRoutes';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import roomRoutes from './routes/roomRoutes';
import bookingRoutes from './routes/bookingRoutes';
import reviewRoutes from './routes/reviewRoutes';
import earningsRoutes from './routes/earningsRoutes';
import emailVerificationRoutes from './routes/emailVerificationRoutes';
import adminEarningsRoutes from './routes/adminEarningsRoutes';

const app = express();
const PORT = process.env.PORT || 5000;

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    const allowedOrigins = [
      'https://openspace-reserve.vercel.app',
      'https://openspace-reserve-git-main-josh-khovick-fermanos-projects.vercel.app',
      'https://openspace-reserve-fyaghgx05-josh-khovick-fermanos-projects.vercel.app',
      'https://openspace-api.onrender.com',
      /^https:\/\/openspace-reserve.*\.vercel\.app$/,
    ];

    if (process.env.NODE_ENV !== 'production') {
      allowedOrigins.push('http://localhost:5173', 'http://localhost:3000');
    }

    if (process.env.CLIENT_URL) {
      allowedOrigins.push(process.env.CLIENT_URL);
    }

    console.log('Request origin:', origin);
    console.log('Allowed origins:', allowedOrigins);

    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = origin.endsWith('/')
      ? origin.slice(0, -1)
      : origin;

    const isAllowed = allowedOrigins.some((allowedOrigin) => {
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(normalizedOrigin);
      }
      const normalized = allowedOrigin.endsWith('/')
        ? allowedOrigin.slice(0, -1)
        : allowedOrigin;
      return normalized === normalizedOrigin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.error(`Origin ${origin} not allowed by CORS`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Cache-Control',
    'Pragma',
    'Origin',
    'Accept',
    'X-Content-Type-Options',
    'X-Frame-Options',
    'X-XSS-Protection',
  ],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

app.use(cors(corsOptions));

app.options('*', cors(corsOptions));

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://vercel.live'],
        connectSrc: [
          "'self'",
          'https://*.supabase.co',
          'https://openspace-api.onrender.com',
          'https://openspace-reserve.vercel.app',
          'https://openspace-reserve-git-main-josh-khovick-fermanos-projects.vercel.app',
        ],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://*.supabase.co',
          'https://*.cloudfront.net',
        ],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  const origin = _req.headers.origin;
  if (
    origin &&
    (origin.includes('openspace-reserve') ||
      origin === 'https://openspace-api.onrender.com' ||
      (process.env.NODE_ENV !== 'production' && origin.includes('localhost')))
  ) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type,Authorization,X-Requested-With,Cache-Control,Pragma,Origin,Accept'
    );
  }

  next();
});

app.use(sanitizeRequest);

// More reasonable rate limiting for production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 300 : 1000, // 300 requests per 15 minutes in production
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP',
    retryAfter: 15 * 60, // seconds
    limit: process.env.NODE_ENV === 'production' ? 300 : 1000,
  },
  skip: (req) => req.method === 'OPTIONS',
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

app.use('/api/', limiter);

// Separate limiters for different route types
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 50 : 100, // 50 attempts per hour in production
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts from this IP',
    retryAfter: 60 * 60, // seconds
    limit: process.env.NODE_ENV === 'production' ? 50 : 100,
  },
  skip: (req) => req.method === 'OPTIONS',
});

const roomsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: process.env.NODE_ENV === 'production' ? 200 : 500, // 200 requests per 5 minutes for room operations
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many room requests from this IP',
    retryAfter: 5 * 60, // seconds
    limit: process.env.NODE_ENV === 'production' ? 200 : 500,
  },
  skip: (req) => req.method === 'OPTIONS',
});

const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 200, // 100 booking operations per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many booking requests from this IP',
    retryAfter: 15 * 60, // seconds
    limit: process.env.NODE_ENV === 'production' ? 100 : 200,
  },
  skip: (req) => req.method === 'OPTIONS',
});

// Apply specific limiters to different routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/rooms', roomsLimiter);
app.use('/api/bookings', bookingLimiter);

app.use(cookieParser());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, '../uploads')));

app.use((req: Request, res: Response, next: NextFunction) => {
  const originalCookie = res.cookie.bind(res);

  res.cookie = function (name: string, val: any, options?: CookieOptions) {
    const isProduction = process.env.NODE_ENV === 'production';

    const cookieOptions: CookieOptions = {
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction,
      httpOnly: true,
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      ...options,
    };

    console.log(
      `Setting cookie: ${name} with options:`,
      JSON.stringify(cookieOptions)
    );
    console.log(`Current environment: ${process.env.NODE_ENV}`);
    console.log(`Request origin: ${req.headers.origin}`);

    return originalCookie(name, val, cookieOptions);
  } as typeof res.cookie;

  next();
});

app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.body) {
    const sanitizeValue = (obj: any): any => {
      if (obj && typeof obj === 'object') {
        for (const key in obj) {
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

app.use(rateLimitErrorHandler);

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    cors: 'enabled',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/earnings', earningsRoutes);
app.use('/api/email-verification', emailVerificationRoutes);
app.use('/api/admin/earnings', adminEarningsRoutes);

if (
  process.env.NODE_ENV !== 'production' ||
  process.env.ENABLE_SWAGGER === 'true'
) {
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      explorer: true,
      customSiteTitle: 'OpenSpace API Documentation',
      customCss: '.swagger-ui .topbar { display: none }',
    })
  );

  console.log('API documentation available at /api/docs');

  app.get('/api/docs.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocument);
  });
}

app.use(globalErrorHandler);

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
