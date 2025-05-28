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
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = __importDefault(require("path"));
const supabase_1 = require("./config/supabase");
const imageService_1 = require("./services/imageService");
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const swaggerUi = __importStar(require("swagger-ui-express"));
const swagger_1 = require("./swagger");
const securityMiddleware_1 = require("./middlewares/securityMiddleware");
require("dotenv/config");
const promises_1 = __importDefault(require("fs/promises"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const roomRoutes_1 = __importDefault(require("./routes/roomRoutes"));
const bookingRoutes_1 = __importDefault(require("./routes/bookingRoutes"));
const reviewRoutes_1 = __importDefault(require("./routes/reviewRoutes"));
const earningsRoutes_1 = __importDefault(require("./routes/earningsRoutes"));
const emailVerificationRoutes_1 = __importDefault(require("./routes/emailVerificationRoutes"));
const adminEarningsRoutes_1 = __importDefault(require("./routes/adminEarningsRoutes"));
const platformFeeRemittanceRoutes_1 = __importDefault(require("./routes/platformFeeRemittanceRoutes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const corsOptions = {
    origin: (origin, callback) => {
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
        }
        else {
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
app.use((0, cors_1.default)(corsOptions));
app.options('*', (0, cors_1.default)(corsOptions));
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                'https://vercel.live',
                'https://*.vercel.live',
            ],
            connectSrc: [
                "'self'",
                'https://*.supabase.co',
                'https://openspace-api.onrender.com',
                'https://openspace-reserve.vercel.app',
                'https://openspace-reserve-git-main-josh-khovick-fermanos-projects.vercel.app',
                'https://vercel.live',
                'https://*.vercel.live',
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
            frameSrc: ["'self'", 'https://vercel.live', 'https://*.vercel.live'],
            frameAncestors: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const referer = _req.headers.referer || '';
    const userAgent = _req.headers['user-agent'] || '';
    if (referer.includes('vercel.live') || userAgent.includes('Vercel')) {
    }
    else {
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    }
    res.setHeader('X-XSS-Protection', '1; mode=block');
    const origin = _req.headers.origin;
    if (origin &&
        (origin.includes('openspace-reserve') ||
            origin === 'https://openspace-api.onrender.com' ||
            (process.env.NODE_ENV !== 'production' && origin.includes('localhost')))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Cache-Control,Pragma,Origin,Accept');
    }
    next();
});
app.use(securityMiddleware_1.sanitizeRequest);
// More reasonable rate limiting for production
const limiter = (0, express_rate_limit_1.default)({
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
const authLimiter = (0, express_rate_limit_1.default)({
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
const roomsLimiter = (0, express_rate_limit_1.default)({
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
const bookingLimiter = (0, express_rate_limit_1.default)({
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
app.use((0, cookie_parser_1.default)());
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, 'uploads')));
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../public/uploads')));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ limit: '10mb', extended: true }));
app.use(express_1.default.static(path_1.default.join(__dirname, '../uploads')));
app.use((req, res, next) => {
    const originalCookie = res.cookie.bind(res);
    res.cookie = function (name, val, options) {
        const isProduction = process.env.NODE_ENV === 'production';
        const cookieOptions = Object.assign({ sameSite: isProduction ? 'none' : 'lax', secure: isProduction, httpOnly: true, path: '/', maxAge: 30 * 24 * 60 * 60 * 1000 }, options);
        console.log(`Setting cookie: ${name} with options:`, JSON.stringify(cookieOptions));
        console.log(`Current environment: ${process.env.NODE_ENV}`);
        console.log(`Request origin: ${req.headers.origin}`);
        return originalCookie(name, val, cookieOptions);
    };
    next();
});
app.use((req, _res, next) => {
    if (req.body) {
        const sanitizeValue = (obj) => {
            if (obj && typeof obj === 'object') {
                for (const key in obj) {
                    if (key.startsWith('$')) {
                        const safeKey = key.replace('$', '_dollar_');
                        obj[safeKey] = obj[key];
                        delete obj[key];
                    }
                    else if (typeof obj[key] === 'object') {
                        obj[key] = sanitizeValue(obj[key]);
                    }
                }
            }
            return obj;
        };
        req.body = sanitizeValue(req.body);
        req.query = sanitizeValue(req.query);
        req.params = sanitizeValue(req.params);
    }
    next();
});
app.use(securityMiddleware_1.rateLimitErrorHandler);
app.get('/api/health', (_req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Server is running',
        cors: 'enabled',
        timestamp: new Date().toISOString(),
    });
});
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/auth', authRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/rooms', roomRoutes_1.default);
app.use('/api/bookings', bookingRoutes_1.default);
app.use('/api/reviews', reviewRoutes_1.default);
app.use('/api/earnings', earningsRoutes_1.default);
app.use('/api/email-verification', emailVerificationRoutes_1.default);
app.use('/api/admin/earnings', adminEarningsRoutes_1.default);
app.use('/api/platform-fee-remittance', platformFeeRemittanceRoutes_1.default);
if (process.env.NODE_ENV !== 'production' ||
    process.env.ENABLE_SWAGGER === 'true') {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swagger_1.swaggerDocument, {
        explorer: true,
        customSiteTitle: 'OpenSpace API Documentation',
        customCss: '.swagger-ui .topbar { display: none }',
    }));
    console.log('API documentation available at /api/docs');
    app.get('/api/docs.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swagger_1.swaggerDocument);
    });
}
app.use(securityMiddleware_1.globalErrorHandler);
const createUploadDirs = () => __awaiter(void 0, void 0, void 0, function* () {
    const dirs = [
        './src/uploads',
        './src/uploads/rooms',
        './src/uploads/profiles',
        './src/uploads/verifications',
    ];
    for (const dir of dirs) {
        try {
            yield promises_1.default.access(dir);
        }
        catch (_a) {
            yield promises_1.default.mkdir(dir, { recursive: true });
        }
    }
});
createUploadDirs().catch(console.error);
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!process.env.MONGO_URL) {
            throw new Error('MONGO_URL not defined in environment variables');
        }
        yield mongoose_1.default.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');
        if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
            yield (0, supabase_1.checkSupabaseConnection)();
            yield (0, imageService_1.initializeStorage)();
        }
        else {
            console.warn('Supabase credentials not found, image storage will not be available');
        }
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('Server startup error:', error);
        process.exit(1);
    }
});
startServer();
exports.default = app;
