/**
 * Game Ranking API Routes
 * 
 * Handles all ranking and play tracking related endpoints
 * Follows RESTful API design principles
 */

import express from 'express';
import { authenticateSession } from '../middleware/auth.js';
import GameRankingService from '../services/GameRankingService.js';
import { getGameDataFromS3, updateGameDataInS3 } from '../utils/s3Manager.js';

const router = express.Router();
const rankingService = new GameRankingService({ 
  getGameDataFromS3, 
  updateGameDataInS3 
});

/**
 * POST /api/ranking/track-play
 * Track a game play and update rankings
 */
router.post('/track-play', async (req, res) => {
  try {
    const { gameId } = req.body;
    
    if (!gameId) {
      return res.status(400).json({
        success: false,
        message: 'Game ID is required'
      });
    }

    const result = await rankingService.trackGamePlay(gameId);
    
    res.json({
      success: true,
      data: result,
      message: 'Game play tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking game play:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to track game play'
    });
  }
});

/**
 * GET /api/ranking/top-games
 * Get top N games by rank
 * Query params: limit (default: 5), activeOnly (default: true)
 */
router.get('/top-games', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const activeOnly = req.query.activeOnly !== 'false';
    
    const topGames = await rankingService.getTopGames(limit, activeOnly);
    
    res.json({
      success: true,
      data: {
        games: topGames,
        limit,
        activeOnly
      },
      message: `Retrieved top ${topGames.length} games`
    });
  } catch (error) {
    console.error('Error getting top games:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get top games'
    });
  }
});

/**
 * GET /api/ranking/all-games
 * Get all games with rankings
 * Query params: activeOnly, sortBy, sortOrder
 */
router.get('/all-games', async (req, res) => {
  try {
    const options = {
      activeOnly: req.query.activeOnly === 'true',
      sortBy: req.query.sortBy || 'rank',
      sortOrder: req.query.sortOrder || 'asc'
    };
    
    const games = await rankingService.getAllRankedGames(options);
    
    res.json({
      success: true,
      data: {
        games,
        total: games.length,
        options
      },
      message: `Retrieved ${games.length} ranked games`
    });
  } catch (error) {
    console.error('Error getting ranked games:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get ranked games'
    });
  }
});

/**
 * PUT /api/ranking/game-status
 * Update game active/inactive status (Admin only)
 */
router.put('/game-status', authenticateSession, async (req, res) => {
  try {
    const { gameId, isActive } = req.body;
    
    if (!gameId || typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Game ID and isActive status are required'
      });
    }

    const result = await rankingService.updateGameStatus(gameId, isActive);
    
    res.json({
      success: true,
      data: result,
      message: result.message
    });
  } catch (error) {
    console.error('Error updating game status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update game status'
    });
  }
});

/**
 * PUT /api/ranking/set-rank
 * Manually set game rank (Admin only)
 */
router.put('/set-rank', authenticateSession, async (req, res) => {
  try {
    const { gameId, rank } = req.body;
    
    if (!gameId || !rank || rank < 1) {
      return res.status(400).json({
        success: false,
        message: 'Game ID and valid rank (>= 1) are required'
      });
    }

    const result = await rankingService.setGameRank(gameId, parseInt(rank));
    
    res.json({
      success: true,
      data: result,
      message: result.message
    });
  } catch (error) {
    console.error('Error setting game rank:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to set game rank'
    });
  }
});

/**
 * GET /api/ranking/statistics
 * Get overall game statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = await rankingService.getGameStatistics();
    
    res.json({
      success: true,
      data: stats,
      message: 'Game statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting game statistics:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get game statistics'
    });
  }
});

/**
 * POST /api/ranking/initialize-game
 * Initialize a new game with ranking data
 */
router.post('/initialize-game', authenticateSession, async (req, res) => {
  try {
    const { game } = req.body;
    
    if (!game || !game.id) {
      return res.status(400).json({
        success: false,
        message: 'Game object with ID is required'
      });
    }

    const initializedGame = rankingService.initializeGameRanking(game);
    
    res.json({
      success: true,
      data: {
        game: initializedGame
      },
      message: 'Game initialized with ranking data'
    });
  } catch (error) {
    console.error('Error initializing game:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initialize game'
    });
  }
});

/**
 * POST /api/ranking/recalculate
 * Recalculate all game rankings (Admin only)
 */
router.post('/recalculate', authenticateSession, async (req, res) => {
  try {
    const gameData = await getGameDataFromS3();
    const games = gameData.games || [];
    
    // Recalculate rankings
    const rankedGames = rankingService.calculateRankings(games);
    
    // Update the game data
    const updatedGameData = { ...gameData, games: rankedGames };
    
    // Save to S3
    await updateGameDataInS3(updatedGameData);
    
    res.json({
      success: true,
      data: {
        totalGames: rankedGames.length,
        recalculatedAt: new Date().toISOString()
      },
      message: 'All game rankings recalculated successfully'
    });
  } catch (error) {
    console.error('Error recalculating rankings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to recalculate rankings'
    });
  }
});

export default router;
