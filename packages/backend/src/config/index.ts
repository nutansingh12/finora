import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server Configuration
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development'
  },

  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'finora_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true'
  },

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10)
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },

  // Alpha Vantage API Configuration
  alphaVantage: {
    apiKey: process.env.ALPHA_VANTAGE_API_KEY,
    baseUrl: process.env.ALPHA_VANTAGE_BASE_URL || 'https://www.alphavantage.co',
    keyPool: process.env.ALPHA_VANTAGE_KEY_POOL?.split(',').filter(key => key.trim()) || [],
    requestsPerMinute: parseInt(process.env.ALPHA_VANTAGE_REQUESTS_PER_MINUTE || '5'),
    requestsPerDay: parseInt(process.env.ALPHA_VANTAGE_REQUESTS_PER_DAY || '500'),
    autoRegister: process.env.ALPHA_VANTAGE_AUTO_REGISTER === 'true',
    registrationEmail: process.env.ALPHA_VANTAGE_REGISTRATION_EMAIL,
    companyName: process.env.ALPHA_VANTAGE_COMPANY_NAME || 'Finora',
    companyUrl: process.env.ALPHA_VANTAGE_COMPANY_URL || 'https://finora.app',
    skipEmails: process.env.ALPHA_VANTAGE_SKIP_EMAILS?.split(',').map(email => email.trim().toLowerCase()) || []
  },

  // Yahoo Finance API Configuration
  yahooFinance: {
    apiKey: process.env.YAHOO_FINANCE_API_KEY,
    baseUrl: process.env.YAHOO_FINANCE_BASE_URL || 'https://query1.finance.yahoo.com'
  },

  // Email Configuration
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
    from: process.env.FROM_EMAIL || 'noreply@finora.app'
  },

  // Feedback System
  feedback: {
    email: process.env.FEEDBACK_EMAIL || 'nsmedia1209@gmail.com'
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:8081']
  },

  // WebSocket Configuration
  websocket: {
    port: parseInt(process.env.WS_PORT || '3002', 10)
  },

  // File Upload Configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB
    uploadPath: process.env.UPLOAD_PATH || 'uploads/'
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log'
  },

  // Cache Configuration
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '300', 10), // 5 minutes
    priceTtl: parseInt(process.env.PRICE_CACHE_TTL || '60', 10) // 1 minute
  },

  // Alert Configuration
  alerts: {
    checkInterval: parseInt(process.env.ALERT_CHECK_INTERVAL || '60000', 10), // 1 minute
    maxAlertsPerUser: parseInt(process.env.MAX_ALERTS_PER_USER || '100', 10)
  },

  // Historical Data Configuration
  historicalData: {
    retentionDays: parseInt(process.env.HISTORICAL_DATA_RETENTION_DAYS || '365', 10),
    priceUpdateInterval: parseInt(process.env.PRICE_UPDATE_INTERVAL || '30000', 10) // 30 seconds
  }
};

// Validate required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  // On Vercel serverless functions, not all endpoints require DB access.
  // Crash only in non-serverless environments; otherwise, log a warning.
  if (process.env.VERCEL !== '1') {
    console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
    process.exit(1);
  } else {
    console.warn('⚠️ Missing optional env vars on Vercel (continuing):', missingEnvVars.join(', '));
  }
}

export default config;
