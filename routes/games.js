import express from 'express';
import { authenticateSession } from '../middleware/auth.js';
import { getGameDataFromS3, updateGameDataInS3 } from '../utils/s3Manager.js';

const router = express.Router();

// GET all games - Public endpoint
router.get('/', async (req, res, next) => {
  try {
    const gameData = await getGameDataFromS3();
    res.json({
      success: true,
      data: gameData
    });
  } catch (error) {
    next(error);
  }
});

// GET single game by ID - Public endpoint
router.get('/:gameId', async (req, res, next) => {
  try {
    const { gameId } = req.params;
    const gameData = await getGameDataFromS3();
    const game = gameData.games?.find(g => g.id === gameId);

    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    res.json({
      success: true,
      data: game
    });
  } catch (error) {
    next(error);
  }
});

// POST new game - Protected endpoint
router.post('/', authenticateSession, async (req, res, next) => {
  try {
    const gameData = await getGameDataFromS3();
    
    if (!gameData.games) {
      gameData.games = [];
    }

    const newGame = {
      id: req.body.id || `game_${Date.now()}`,
      name: req.body.name,
      slug: req.body.slug || req.body.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
      description: req.body.description,
      thumb_url: req.body.thumb_url || '',
      logo_url: req.body.logo_url || req.body.thumb_url || '',
      gif_url: req.body.gif_url || '',
      play_url: req.body.play_url || '',
      size: req.body.size || 'small',
      category: req.body.category
    };

    gameData.games.push(newGame);
    await updateGameDataInS3(gameData);

    res.status(201).json({
      success: true,
      message: 'Game added successfully to S3',
      data: newGame
    });
  } catch (error) {
    next(error);
  }
});

// PUT update game - Protected endpoint
router.put('/:gameId', authenticateSession, async (req, res, next) => {
  try {
    const { gameId } = req.params;
    const gameData = await getGameDataFromS3();
    
    const gameIndex = gameData.games?.findIndex(g => g.id === gameId);

    if (gameIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Update game with new data (maintain consistent format)
    const updatedGame = {
      id: gameId, // Ensure ID doesn't change
      name: req.body.name || gameData.games[gameIndex].name,
      slug: req.body.slug || req.body.name?.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || gameData.games[gameIndex].slug,
      description: req.body.description || gameData.games[gameIndex].description,
      thumb_url: req.body.thumb_url || gameData.games[gameIndex].thumb_url,
      logo_url: req.body.logo_url || gameData.games[gameIndex].logo_url,
      gif_url: req.body.gif_url || gameData.games[gameIndex].gif_url,
      play_url: req.body.play_url || gameData.games[gameIndex].play_url,
      size: req.body.size || gameData.games[gameIndex].size,
      category: req.body.category || gameData.games[gameIndex].category
    };

    gameData.games[gameIndex] = updatedGame;
    await updateGameDataInS3(gameData);

    res.json({
      success: true,
      message: 'Game updated successfully in S3',
      data: updatedGame
    });
  } catch (error) {
    next(error);
  }
});

// DELETE game - Protected endpoint
router.delete('/:gameId', authenticateSession, async (req, res, next) => {
  try {
    const { gameId } = req.params;
    const gameData = await getGameDataFromS3();
    
    const gameIndex = gameData.games?.findIndex(g => g.id === gameId);

    if (gameIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    const deletedGame = gameData.games[gameIndex];
    gameData.games.splice(gameIndex, 1);
    await updateGameDataInS3(gameData);

    res.json({
      success: true,
      message: 'Game deleted successfully from S3',
      data: deletedGame
    });
  } catch (error) {
    next(error);
  }
});

// PUT update entire game-data.json - Protected endpoint
router.put('/data/full-update', authenticateSession, async (req, res, next) => {
  try {
    const newGameData = req.body;
    
    // Validate that it has games array
    if (!newGameData.games || !Array.isArray(newGameData.games)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid game data format. Must include "games" array.'
      });
    }

    await updateGameDataInS3(newGameData);

    res.json({
      success: true,
      message: 'Game data updated successfully in S3',
      data: newGameData
    });
  } catch (error) {
    next(error);
  }
});

// Clean up and migrate games to new format - Protected endpoint
router.post('/migrate', authenticateSession, async (req, res, next) => {
  try {
    const gameData = await getGameDataFromS3();
    
    if (!gameData.games || !Array.isArray(gameData.games)) {
      return res.json({
        success: true,
        message: 'No games to migrate',
        migrated: 0
      });
    }

    let migratedCount = 0;
    const cleanedGames = gameData.games.map(game => {
      // Check if game is in old format (has extra fields)
      if (game.tags || game.developer || game.releaseDate || game.ageRating || game.languages || game.createdAt) {
        migratedCount++;
        
        // Convert to new format
        return {
          id: game.id,
          name: game.name,
          slug: game.slug || game.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
          description: game.description,
          thumb_url: game.thumb_url || game.thumbnail || '',
          logo_url: game.logo_url || game.logo || game.thumbnail || '',
          gif_url: game.gif_url || game.gif || '',
          play_url: game.play_url || game.htmlFile ? `games/${game.name}/` : '',
          size: game.size || 'small',
          category: game.category
        };
      }
      
      // Already in new format, return as is
      return game;
    });

    // Update the data with cleaned games
    const cleanedData = { games: cleanedGames };
    await updateGameDataInS3(cleanedData);

    res.json({
      success: true,
      message: `Migrated ${migratedCount} games to new format`,
      migrated: migratedCount,
      total: cleanedGames.length
    });
  } catch (error) {
    next(error);
  }
});

export default router;