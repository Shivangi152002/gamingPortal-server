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
  ...(process.env.ADDITIONAL_ORIGINS ? process.env.ADDITIONAL_ORIGINS.split(',').map(origin => origin.trim()) : [])
].filter(Boolean); // Remove any undefined/null values

app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : true, // Allow all if no origins specified
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware - fully environment driven
const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: NODE_ENV === 'production', // HTTPS in production
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000, // 24 hours default
    sameSite: NODE_ENV === 'production' ? 'none' : 'lax',
    domain: process.env.SESSION_DOMAIN || (NODE_ENV === 'production' ? undefined : 'localhost')
  }
};

// Validate required session secret
if (!process.env.SESSION_SECRET) {
  console.error('❌ SESSION_SECRET is required in .env file');
  process.exit(1);
}

app.use(session(sessionConfig));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);

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