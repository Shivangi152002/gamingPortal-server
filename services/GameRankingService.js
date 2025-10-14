/**
 * Game Ranking Service - Handles play count tracking and ranking logic
 * 
 * This service follows SOLID principles:
 * - Single Responsibility: Only handles ranking and play count logic
 * - Open/Closed: Extensible for different ranking algorithms
 * - Liskov Substitution: Can be replaced with different implementations
 * - Interface Segregation: Clean, focused interface
 * - Dependency Inversion: Depends on abstractions, not concretions
 */

class GameRankingService {
  constructor(s3Manager) {
    this.s3Manager = s3Manager;
    this.rankingAlgorithm = 'playCount'; // Can be extended to support different algorithms
  }

  /**
   * Track a game play and update rankings
   * @param {string} gameId - The ID of the game that was played
   * @returns {Promise<Object>} Updated game data with new rankings
   */
  async trackGamePlay(gameId) {
    try {
      console.log(`🎮 Tracking play for game: ${gameId}`);
      
      // Get current game data
      const gameData = await this.s3Manager.getGameDataFromS3();
      const games = gameData.games || [];
      
      // Find the game
      const gameIndex = games.findIndex(game => game.id === gameId);
      if (gameIndex === -1) {
        throw new Error(`Game with ID ${gameId} not found`);
      }

      // Update play count and last played timestamp
      const game = games[gameIndex];
      game.playCount = (game.playCount || 0) + 1;
      game.lastPlayed = new Date().toISOString();
      
      // Recalculate rankings for all games
      const rankedGames = this.calculateRankings(games);
      
      // Update the game data
      const updatedGameData = { ...gameData, games: rankedGames };
      
      // Save to S3
      await this.s3Manager.updateGameDataInS3(updatedGameData);
      
      console.log(`✅ Game play tracked. New play count: ${game.playCount}`);
      
      return {
        success: true,
        game: game,
        totalPlays: game.playCount,
        rank: game.rank
      };
    } catch (error) {
      console.error('❌ Error tracking game play:', error);
      throw new Error(`Failed to track game play: ${error.message}`);
    }
  }

  /**
   * Calculate rankings for all games based on play count
   * @param {Array} games - Array of game objects
   * @returns {Array} Games with updated rankings
   */
  calculateRankings(games) {
    // Filter out inactive games for ranking calculation
    const activeGames = games.filter(game => game.isActive !== false);
    
    // Sort by play count (descending), then by last played (descending)
    const sortedGames = activeGames.sort((a, b) => {
      const playCountA = a.playCount || 0;
      const playCountB = b.playCount || 0;
      
      if (playCountA !== playCountB) {
        return playCountB - playCountA; // Higher play count = better rank
      }
      
      // If play counts are equal, sort by last played
      const lastPlayedA = new Date(a.lastPlayed || 0);
      const lastPlayedB = new Date(b.lastPlayed || 0);
      return lastPlayedB - lastPlayedA;
    });

    // Assign ranks
    sortedGames.forEach((game, index) => {
      game.rank = index + 1;
    });

    // Merge back with inactive games (they keep their existing rank or get a high number)
    const inactiveGames = games.filter(game => game.isActive === false);
    inactiveGames.forEach(game => {
      if (!game.rank) {
        game.rank = sortedGames.length + 1; // Place inactive games at the end
      }
    });

    // Combine active and inactive games
    return [...sortedGames, ...inactiveGames];
  }

  /**
   * Get top N games by rank
   * @param {number} limit - Number of top games to return
   * @param {boolean} activeOnly - Whether to include only active games
   * @returns {Promise<Array>} Top ranked games
   */
  async getTopGames(limit = 5, activeOnly = true) {
    try {
      const gameData = await this.s3Manager.getGameDataFromS3();
      let games = gameData.games || [];
      
      if (activeOnly) {
        games = games.filter(game => game.isActive !== false);
      }
      
      // Sort by rank (ascending)
      games.sort((a, b) => (a.rank || 999) - (b.rank || 999));
      
      return games.slice(0, limit);
    } catch (error) {
      console.error('❌ Error getting top games:', error);
      throw new Error(`Failed to get top games: ${error.message}`);
    }
  }

  /**
   * Get all games with rankings
   * @param {Object} options - Filtering and sorting options
   * @returns {Promise<Array>} All games with rankings
   */
  async getAllRankedGames(options = {}) {
    try {
      const { activeOnly = false, sortBy = 'rank', sortOrder = 'asc' } = options;
      
      const gameData = await this.s3Manager.getGameDataFromS3();
      let games = gameData.games || [];
      
      if (activeOnly) {
        games = games.filter(game => game.isActive !== false);
      }
      
      // Sort games
      games.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
          case 'rank':
            aValue = a.rank || 999;
            bValue = b.rank || 999;
            break;
          case 'playCount':
            aValue = a.playCount || 0;
            bValue = b.playCount || 0;
            break;
          case 'name':
            aValue = a.name || '';
            bValue = b.name || '';
            break;
          case 'lastPlayed':
            aValue = new Date(a.lastPlayed || 0);
            bValue = new Date(b.lastPlayed || 0);
            break;
          default:
            aValue = a.rank || 999;
            bValue = b.rank || 999;
        }
        
        if (sortOrder === 'desc') {
          return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
        } else {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        }
      });
      
      return games;
    } catch (error) {
      console.error('❌ Error getting ranked games:', error);
      throw new Error(`Failed to get ranked games: ${error.message}`);
    }
  }

  /**
   * Update game status (active/inactive)
   * @param {string} gameId - Game ID to update
   * @param {boolean} isActive - New active status
   * @returns {Promise<Object>} Updated game data
   */
  async updateGameStatus(gameId, isActive) {
    try {
      console.log(`🔄 Updating game status: ${gameId} -> ${isActive ? 'active' : 'inactive'}`);
      
      const gameData = await this.s3Manager.getGameDataFromS3();
      const games = gameData.games || [];
      
      const gameIndex = games.findIndex(game => game.id === gameId);
      if (gameIndex === -1) {
        throw new Error(`Game with ID ${gameId} not found`);
      }

      // Update game status
      games[gameIndex].isActive = isActive;
      games[gameIndex].statusUpdatedAt = new Date().toISOString();
      
      // Recalculate rankings
      const rankedGames = this.calculateRankings(games);
      
      // Update the game data
      const updatedGameData = { ...gameData, games: rankedGames };
      
      // Save to S3
      await this.s3Manager.updateGameDataInS3(updatedGameData);
      
      console.log(`✅ Game status updated successfully`);
      
      return {
        success: true,
        game: games[gameIndex],
        message: `Game ${isActive ? 'activated' : 'deactivated'} successfully`
      };
    } catch (error) {
      console.error('❌ Error updating game status:', error);
      throw new Error(`Failed to update game status: ${error.message}`);
    }
  }

  /**
   * Manually set game rank (admin override)
   * @param {string} gameId - Game ID to update
   * @param {number} newRank - New rank to assign
   * @returns {Promise<Object>} Updated game data
   */
  async setGameRank(gameId, newRank) {
    try {
      console.log(`🎯 Setting manual rank for game: ${gameId} -> ${newRank}`);
      
      const gameData = await this.s3Manager.getGameDataFromS3();
      const games = gameData.games || [];
      
      const gameIndex = games.findIndex(game => game.id === gameId);
      if (gameIndex === -1) {
        throw new Error(`Game with ID ${gameId} not found`);
      }

      // Set manual rank
      games[gameIndex].manualRank = newRank;
      games[gameIndex].rank = newRank;
      games[gameIndex].rankUpdatedAt = new Date().toISOString();
      
      // Recalculate other games' ranks to avoid conflicts
      const rankedGames = this.calculateRankingsWithManualOverrides(games);
      
      // Update the game data
      const updatedGameData = { ...gameData, games: rankedGames };
      
      // Save to S3
      await this.s3Manager.updateGameDataInS3(updatedGameData);
      
      console.log(`✅ Manual rank set successfully`);
      
      return {
        success: true,
        game: games[gameIndex],
        message: `Game rank set to ${newRank}`
      };
    } catch (error) {
      console.error('❌ Error setting game rank:', error);
      throw new Error(`Failed to set game rank: ${error.message}`);
    }
  }

  /**
   * Calculate rankings with manual overrides
   * @param {Array} games - Array of game objects
   * @returns {Array} Games with updated rankings considering manual overrides
   */
  calculateRankingsWithManualOverrides(games) {
    // Separate games with manual ranks and without
    const manualRankGames = games.filter(game => game.manualRank !== undefined);
    const autoRankGames = games.filter(game => game.manualRank === undefined);
    
    // Sort auto-rank games by play count
    const sortedAutoGames = autoRankGames.sort((a, b) => {
      const playCountA = a.playCount || 0;
      const playCountB = b.playCount || 0;
      
      if (playCountA !== playCountB) {
        return playCountB - playCountA;
      }
      
      const lastPlayedA = new Date(a.lastPlayed || 0);
      const lastPlayedB = new Date(b.lastPlayed || 0);
      return lastPlayedB - lastPlayedA;
    });

    // Assign ranks to auto-rank games, avoiding manual rank conflicts
    const usedRanks = new Set(manualRankGames.map(game => game.manualRank));
    let autoRank = 1;
    
    sortedAutoGames.forEach(game => {
      while (usedRanks.has(autoRank)) {
        autoRank++;
      }
      game.rank = autoRank;
      usedRanks.add(autoRank);
      autoRank++;
    });

    // Set ranks for manual rank games
    manualRankGames.forEach(game => {
      game.rank = game.manualRank;
    });

    // Combine and sort by rank
    const allGames = [...manualRankGames, ...sortedAutoGames];
    return allGames.sort((a, b) => (a.rank || 999) - (b.rank || 999));
  }

  /**
   * Initialize new games with default ranking data
   * @param {Object} game - New game object
   * @returns {Object} Game with initialized ranking data
   */
  initializeGameRanking(game) {
    return {
      ...game,
      playCount: 0,
      rank: 1, // New games start at rank 1
      isActive: true,
      lastPlayed: null,
      createdAt: new Date().toISOString(),
      manualRank: undefined
    };
  }

  /**
   * Get game statistics
   * @returns {Promise<Object>} Overall game statistics
   */
  async getGameStatistics() {
    try {
      const gameData = await this.s3Manager.getGameDataFromS3();
      const games = gameData.games || [];
      
      const activeGames = games.filter(game => game.isActive !== false);
      const totalPlays = games.reduce((sum, game) => sum + (game.playCount || 0), 0);
      const mostPlayedGame = games.reduce((max, game) => 
        (game.playCount || 0) > (max.playCount || 0) ? game : max, 
        { playCount: 0 }
      );
      
      return {
        totalGames: games.length,
        activeGames: activeGames.length,
        inactiveGames: games.length - activeGames.length,
        totalPlays,
        mostPlayedGame: mostPlayedGame.playCount > 0 ? mostPlayedGame : null,
        averagePlaysPerGame: games.length > 0 ? Math.round(totalPlays / games.length) : 0
      };
    } catch (error) {
      console.error('❌ Error getting game statistics:', error);
      throw new Error(`Failed to get game statistics: ${error.message}`);
    }
  }
}

export default GameRankingService;
