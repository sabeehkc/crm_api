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
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://192.168.1.11:3000',
      'https://crm.luvid.in',
      'https://www.luvid.in',
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    // In development, allow localhost origins
    if (config.NODE_ENV === 'development') {
      if (origin?.startsWith('http://localhost:') || origin?.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-refresh-token'],
};

app.use(cors(corsOptions));

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
    // Set CORS headers for static file requests
    const origin = req.headers.origin;
    if (origin) {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'https://crm.luvid.in',
        process.env.FRONTEND_URL,
      ].filter(Boolean);

      // In development, allow localhost origins
      if (config.NODE_ENV === 'development') {
        if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
          res.setHeader('Access-Control-Allow-Origin', origin);
        } else if (allowedOrigins.includes(origin)) {
          res.setHeader('Access-Control-Allow-Origin', origin);
        }
      } else if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
    } else {
      // Allow requests with no origin
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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


