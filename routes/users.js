import express from 'express';
import { getAllUsers, addUser, updateUser, deleteUser, getRootUser } from '../utils/userManager.js';
import { requireRoot } from '../middleware/auth.js';

const router = express.Router();

// Get all users (root only)
router.get('/', requireRoot, async (req, res, next) => {
  try {
    const users = await getAllUsers();
    
    // Add root user info
    const rootUser = getRootUser();
    const rootUserInfo = {
      username: rootUser.username,
      email: rootUser.email,
      role: 'root',
      isSystemUser: true
    };
    
    res.json({
      success: true,
      data: {
        users: [rootUserInfo, ...users]
      }
    });
  } catch (error) {
    next(error);
  }
});

// Add new user (root only)
router.post('/', requireRoot, async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required'
      });
    }
    
    const newUser = await addUser(username, email, password, role || 'user');
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: newUser
    });
  } catch (error) {
    if (error.message === 'User with this email already exists') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
});

// Update user (root only)
router.put('/:userId', requireRoot, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    
    const updatedUser = await updateUser(userId, updates);
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
});

// Delete user (root only)
router.delete('/:userId', requireRoot, async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    await deleteUser(userId);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
});

export default router;
