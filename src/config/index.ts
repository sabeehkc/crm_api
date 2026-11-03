import dotenv from 'dotenv';

dotenv.config();

const config = {
  PORT: process.env.PORT || 5025,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/crm',
  REDIS_URI: process.env.REDIS_URI || 'redis://127.0.0.1:6379',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key',
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'your_refresh_token_secret_key',
  ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY || '1d',
  REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  // Default pagination
  defaultResLimit: 20,
  defaultResOffset: 0,
  // SMTP
  SMTP: {
    HOST: process.env.SMTP_HOST,
    PORT: Number(process.env.SMTP_PORT) || 587,
    USER: process.env.SMTP_USER,
    PASS: process.env.SMTP_PASS,
    FROM: process.env.SMTP_FROM || 'noreply@luvid.in',
  },
  RECAPTCHA_SECRET: process.env.RECAPTCHA_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
};

export default config;
