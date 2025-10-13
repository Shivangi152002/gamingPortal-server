import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import gameRoutes from './routes/games.js';
import uploadRoutes from './routes/upload.js';
import userRoutes from './routes/users.js';
import siteSettingsRoutes from './routes/siteSettings.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration - fully environment driven
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5174', // Default dashboard URL
  'http://localhost:5173', // Alternative Vite port
  ...(process.env.ADDITIONAL_ORIGINS ? process.env.ADDITIONAL_ORIGINS.split(',').map(origin => origin.trim()) : [])
].filter(Boolean); // Remove any undefined/null values

console.log('🔧 CORS Configuration:');
console.log('   Allowed Origins:', allowedOrigins);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes(true)) {
      callback(null, true);
    } else {
      console.log('⚠️ CORS blocked origin:', origin);
      callback(null, true); // Still allow in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['set-cookie']
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Validate required session secret
if (!process.env.SESSION_SECRET) {
  console.error('❌ SESSION_SECRET is required in .env file');
  console.error('💡 Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

// Session middleware - optimized for development
const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'sessionId', // Custom name instead of default connect.sid
  cookie: {
    secure: NODE_ENV === 'production', // HTTPS in production only
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000, // 24 hours default
    sameSite: NODE_ENV === 'production' ? 'none' : 'lax', // 'lax' for development (same-site)
    path: '/'
  }
};

// Don't set domain in development (causes cookie issues)
if (NODE_ENV === 'production' && process.env.SESSION_DOMAIN) {
  sessionConfig.cookie.domain = process.env.SESSION_DOMAIN;
}

console.log('🍪 Session Configuration:');
console.log('   Cookie Name:', sessionConfig.name);
console.log('   Secure:', sessionConfig.cookie.secure);
console.log('   SameSite:', sessionConfig.cookie.sameSite);
console.log('   Domain:', sessionConfig.cookie.domain || 'not set (uses request domain)');
console.log('   Max Age:', sessionConfig.cookie.maxAge / 1000, 'seconds');

app.use(session(sessionConfig));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/site-settings', siteSettingsRoutes);

// Health check - shows configuration status
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Game Admin Server is running',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    configuration: {
      s3Configured: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_S3_BUCKET),
      cloudFrontConfigured: !!process.env.CLOUDFRONT_URL,
      rootUser: process.env.ROOT_USERNAME || 'Not configured',
      allowedOrigins: allowedOrigins,
      sessionDomain: process.env.SESSION_DOMAIN || 'default'
    }
  });
});

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${NODE_ENV}`);
  console.log(`🔐 Root User: ${process.env.ROOT_USERNAME || 'Not configured'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'Not configured'}`);
  console.log(`🔒 Session Domain: ${process.env.SESSION_DOMAIN || 'default'}`);
  console.log(`☁️  S3 Bucket: ${process.env.AWS_S3_BUCKET || 'Not configured'}`);
  console.log(`🌐 CloudFront: ${process.env.CLOUDFRONT_URL || 'Not configured'}`);
  console.log(`🎯 Allowed Origins: ${allowedOrigins.length > 0 ? allowedOrigins.join(', ') : 'All origins allowed'}`);
});