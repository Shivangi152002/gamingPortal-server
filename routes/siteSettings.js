import express from 'express';
import { authenticateSession } from '../middleware/auth.js';
import { getSiteSettingsFromS3, updateSiteSettingsInS3 } from '../utils/s3Manager.js';

const router = express.Router();

// GET site settings - Public endpoint (website needs this)
router.get('/', async (req, res, next) => {
  try {
    const settings = await getSiteSettingsFromS3();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
});

// PUT update site settings - Protected endpoint
router.put('/', authenticateSession, async (req, res, next) => {
  try {
    const newSettings = req.body;
    
    // No mandatory fields - user can update any field they want
    // Just ensure we have some data to save
    if (!newSettings || Object.keys(newSettings).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No settings data provided'
      });
    }

    await updateSiteSettingsInS3(newSettings);

    res.json({
      success: true,
      message: 'Site settings updated successfully',
      data: newSettings
    });
  } catch (error) {
    next(error);
  }
});

export default router;

