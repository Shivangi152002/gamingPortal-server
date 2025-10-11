import express from 'express';
import { authenticateUser } from '../utils/userManager.js';

const router = express.Router();

// Login endpoint
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Authenticate user (root or regular user)
    const user = await authenticateUser(email, password);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Store user in session
    req.session.user = user;
    
    console.log('✅ Login successful:', user.email);
    console.log('   Session ID:', req.sessionID);
    console.log('   Session saved with user:', req.session.user);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

// Check session / Get current user
router.get('/me', (req, res) => {
  console.log('🔍 /auth/me endpoint hit');
  console.log('   Session ID:', req.sessionID);
  console.log('   Session exists:', !!req.session);
  console.log('   Session user:', req.session?.user);
  console.log('   Cookies:', req.headers.cookie);
  
  if (!req.session || !req.session.user) {
    console.log('❌ Not authenticated - no session or user');
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  console.log('✅ User authenticated:', req.session.user.email);
  res.json({
    success: true,
    data: {
      user: req.session.user
    }
  });
});

export default router;