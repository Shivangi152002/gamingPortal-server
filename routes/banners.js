import express from 'express';
import { authenticateSession } from '../middleware/auth.js';
import { uploadFileToS3, deleteFileFromS3 } from '../utils/s3Manager.js';
import { getBannerDataFromS3, updateBannerDataInS3 } from '../utils/bannerManager.js';

const router = express.Router();

// GET all banners - Public endpoint
router.get('/', async (req, res, next) => {
  try {
    const bannerData = await getBannerDataFromS3();
    res.json({
      success: true,
      data: bannerData
    });
  } catch (error) {
    next(error);
  }
});

// GET single banner by ID - Public endpoint
router.get('/:bannerId', async (req, res, next) => {
  try {
    const { bannerId } = req.params;
    const bannerData = await getBannerDataFromS3();
    const banner = bannerData.banners?.find(b => b.id === bannerId);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    res.json({
      success: true,
      data: banner
    });
  } catch (error) {
    next(error);
  }
});

// POST new banner - Protected endpoint
router.post('/', authenticateSession, async (req, res, next) => {
  try {
    const bannerData = await getBannerDataFromS3();
    
    if (!bannerData.banners) {
      bannerData.banners = [];
    }

    const newBanner = {
      id: req.body.id || `banner_${Date.now()}`,
      position: req.body.position, // left, right, bottom
      type: req.body.type, // image, video, code
      title: req.body.title,
      url: req.body.url || '',
      content: req.body.content || '',
      link: req.body.link || '#',
      active: req.body.active !== undefined ? req.body.active : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    bannerData.banners.push(newBanner);
    await updateBannerDataInS3(bannerData);

    res.status(201).json({
      success: true,
      message: 'Banner added successfully to S3',
      data: newBanner
    });
  } catch (error) {
    next(error);
  }
});

// PUT update banner - Protected endpoint
router.put('/:bannerId', authenticateSession, async (req, res, next) => {
  try {
    const { bannerId } = req.params;
    const bannerData = await getBannerDataFromS3();
    
    const bannerIndex = bannerData.banners?.findIndex(b => b.id === bannerId);

    if (bannerIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    // Update banner
    const updatedBanner = {
      ...bannerData.banners[bannerIndex],
      position: req.body.position || bannerData.banners[bannerIndex].position,
      type: req.body.type || bannerData.banners[bannerIndex].type,
      title: req.body.title || bannerData.banners[bannerIndex].title,
      url: req.body.url !== undefined ? req.body.url : bannerData.banners[bannerIndex].url,
      content: req.body.content !== undefined ? req.body.content : bannerData.banners[bannerIndex].content,
      link: req.body.link !== undefined ? req.body.link : bannerData.banners[bannerIndex].link,
      active: req.body.active !== undefined ? req.body.active : bannerData.banners[bannerIndex].active,
      updatedAt: new Date().toISOString()
    };

    bannerData.banners[bannerIndex] = updatedBanner;
    await updateBannerDataInS3(bannerData);

    res.json({
      success: true,
      message: 'Banner updated successfully in S3',
      data: updatedBanner
    });
  } catch (error) {
    next(error);
  }
});

// DELETE banner - Protected endpoint
router.delete('/:bannerId', authenticateSession, async (req, res, next) => {
  try {
    const { bannerId } = req.params;
    const bannerData = await getBannerDataFromS3();
    
    const bannerIndex = bannerData.banners?.findIndex(b => b.id === bannerId);

    if (bannerIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    const deletedBanner = bannerData.banners[bannerIndex];
    
    // If banner has a file URL, delete it from S3
    if (deletedBanner.url && deletedBanner.url.includes('/public/')) {
      try {
        const s3Key = deletedBanner.url.split('/public/')[1];
        if (s3Key && s3Key !== '' && !s3Key.startsWith('<')) {
          await deleteFileFromS3(`public/${s3Key}`);
        }
      } catch (deleteError) {
        console.error('Error deleting banner file from S3:', deleteError.message);
      }
    }

    bannerData.banners.splice(bannerIndex, 1);
    await updateBannerDataInS3(bannerData);

    res.json({
      success: true,
      message: 'Banner deleted successfully from S3',
      data: deletedBanner
    });
  } catch (error) {
    next(error);
  }
});

export default router;

