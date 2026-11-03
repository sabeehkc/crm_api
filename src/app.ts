import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import limiter from './lib/express_rate_limit';
import v1Routes from './routes/v1';
import { setupSwagger } from './lib/swagger';
import config from './config';

const app = express();

/**
 * REQUIRED when behind Nginx / Proxy Manager
 */
app.set('trust proxy', 1);

/**
 * ========= CORS =========
 * Configure CORS to allow requests from frontend
 */
const envOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((url) => url.trim())
  : [];

export const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3025',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3025',
  'http://192.168.1.11:3000',
  'https://crm.luvid.in',
  'https://www.luvid.in',
  'https://crm-teal-nu.vercel.app',
  ...envOrigins,
].filter(Boolean);

export const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true; // Allow non-browser requests (Postman, curl, server-to-server)

  if (
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:') ||
    origin.startsWith('http://192.168.') ||
    origin.endsWith('.vercel.app') ||
    allowedOrigins.includes(origin)
  ) {
    return true;
  }

  return false;
};

const corsOptions: cors.CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      // Return false to gracefully deny CORS instead of throwing an unhandled Error (which causes Render 500 wildcard)
      callback(null, false);
    }
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-refresh-token'],
  exposedHeaders: ['set-cookie'],
};

// Enable CORS for all requests
app.use(cors(corsOptions));
// Explicitly handle all preflight OPTIONS requests across all routes
app.options('*', cors(corsOptions));

/**
 * ========= CORE =========
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/**
 * ========= SECURITY =========
 * Helmet configured to NOT interfere with CORS
 */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  }),
);

/**
 * ========= RATE LIMIT =========
 */
app.use(limiter);

/**
 * ========= COMPRESSION =========
 */
app.use(compression({ threshold: 1024 }));

/**
 * ========= SWAGGER DOCUMENTATION =========
 */
setupSwagger(app);

/**
 * ========= STATIC FILES (UPLOADS) =========
 * Serve static files with proper CORS headers to prevent ERR_BLOCKED_BY_ORB
 */
app.use(
  '/uploads',
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const origin = req.headers.origin;
    if (origin && isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else if (!origin) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    next();
  },
  express.static(path.join(process.cwd(), 'uploads'), {
    setHeaders: (res: express.Response, filePath: string) => {
      // Ensure proper Content-Type for images
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: { [key: string]: string } = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
      };

      if (mimeTypes[ext]) {
        res.setHeader('Content-Type', mimeTypes[ext]);
      }

      // Set cache control for images
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  }),
);

/**
 * ========= ROUTES =========
 */
app.use('/api/v1', v1Routes);

/**
 * ========= 404 HANDLER =========
 * Must be after all routes but before error handler
 */
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    success: false,
    code: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
  });
});

/**
 * ========= ERROR HANDLING =========
 * Must be last middleware
 */
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Log error
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e: any) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      code: 'Validation Error',
      message: 'Validation failed',
      errors,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(400).json({
      success: false,
      code: 'Duplicate Entry',
      message: `${field} already exists`,
    });
  }

  // Multer errors (file upload)
  if (err instanceof Error && err.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      code: 'Invalid File Type',
      message: err.message,
    });
  }

  if (err instanceof Error && err.message.includes('File too large')) {
    return res.status(400).json({
      success: false,
      code: 'File Too Large',
      message: 'File size exceeds 5MB limit',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      code: 'Unauthorized',
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      code: 'Unauthorized',
      message: 'Token expired',
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    code: err.code || 'Server Error',
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

export default app;
