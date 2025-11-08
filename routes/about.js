import express from 'express';
import { authenticateSession } from '../middleware/auth.js';
import { getAboutDataFromS3, updateAboutDataInS3 } from '../utils/aboutManager.js';

const router = express.Router();

// GET all about data - Public endpoint
router.get('/', async (req, res, next) => {
  try {
    const aboutData = await getAboutDataFromS3();
    res.json({
      success: true,
      data: aboutData
    });
  } catch (error) {
    next(error);
  }
});

// GET single game's about info by ID - Public endpoint
router.get('/:gameId', async (req, res, next) => {
  try {
    const { gameId } = req.params;
    const aboutData = await getAboutDataFromS3();
    const gameAbout = aboutData.games?.find(g => g.id === gameId);

    if (!gameAbout) {
      return res.status(404).json({
        success: false,
        message: 'About information not found for this game'
      });
    }

    res.json({
      success: true,
      data: gameAbout
    });
  } catch (error) {
    next(error);
  }
});

// POST new about info - Protected endpoint
router.post('/', authenticateSession, async (req, res, next) => {
  try {
    const aboutData = await getAboutDataFromS3();
    
    if (!aboutData.games) {
      aboutData.games = [];
    }

    const newAboutInfo = {
      id: req.body.id || `game_${Date.now()}`,
      title: req.body.title,
      developer: req.body.developer || '',
      rating: req.body.rating || 0,
      votes: req.body.votes || 0,
      description: req.body.description || '',
      logo: req.body.logo || '',
      hidden: req.body.hidden !== undefined ? req.body.hidden : false,
      sections: req.body.sections || [],
      categories: req.body.categories || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Check if game already has about info
    const existingIndex = aboutData.games.findIndex(g => g.id === newAboutInfo.id);
    if (existingIndex !== -1) {
      return res.status(400).json({
        success: false,
        message: 'About information already exists for this game. Use PUT to update.'
      });
    }

    aboutData.games.push(newAboutInfo);
    await updateAboutDataInS3(aboutData);

    res.status(201).json({
      success: true,
      message: 'About information added successfully',
      data: newAboutInfo
    });
  } catch (error) {
    next(error);
  }
});

// PUT update about info - Protected endpoint
router.put('/:gameId', authenticateSession, async (req, res, next) => {
  try {
    const { gameId } = req.params;
    const aboutData = await getAboutDataFromS3();
    
    const gameIndex = aboutData.games?.findIndex(g => g.id === gameId);

    if (gameIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'About information not found for this game'
      });
    }

    // Update about info
    const updatedAboutInfo = {
      ...aboutData.games[gameIndex],
      title: req.body.title !== undefined ? req.body.title : aboutData.games[gameIndex].title,
      developer: req.body.developer !== undefined ? req.body.developer : aboutData.games[gameIndex].developer,
      rating: req.body.rating !== undefined ? req.body.rating : aboutData.games[gameIndex].rating,
      votes: req.body.votes !== undefined ? req.body.votes : aboutData.games[gameIndex].votes,
      description: req.body.description !== undefined ? req.body.description : aboutData.games[gameIndex].description,
      logo: req.body.logo !== undefined ? req.body.logo : aboutData.games[gameIndex].logo,
      hidden: req.body.hidden !== undefined ? req.body.hidden : aboutData.games[gameIndex].hidden,
      sections: req.body.sections !== undefined ? req.body.sections : aboutData.games[gameIndex].sections,
      categories: req.body.categories !== undefined ? req.body.categories : aboutData.games[gameIndex].categories,
      updatedAt: new Date().toISOString()
    };

    aboutData.games[gameIndex] = updatedAboutInfo;
    await updateAboutDataInS3(aboutData);

    res.json({
      success: true,
      message: 'About information updated successfully',
      data: updatedAboutInfo
    });
  } catch (error) {
    next(error);
  }
});

// DELETE about info - Protected endpoint
router.delete('/:gameId', authenticateSession, async (req, res, next) => {
  try {
    const { gameId } = req.params;
    const aboutData = await getAboutDataFromS3();
    
    const gameIndex = aboutData.games?.findIndex(g => g.id === gameId);

    if (gameIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'About information not found for this game'
      });
    }

    const deletedAboutInfo = aboutData.games[gameIndex];
    aboutData.games.splice(gameIndex, 1);
    await updateAboutDataInS3(aboutData);

    res.json({
      success: true,
      message: 'About information deleted successfully',
      data: deletedAboutInfo
    });
  } catch (error) {
    next(error);
  }
});

export default router;

