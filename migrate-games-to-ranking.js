/**
 * Migrate Games to Ranking System
 * 
 * This script adds ranking data to existing games in game-data.json
 * - Adds playCount, rank, isActive, lastPlayed fields
 * - Initializes all games with default ranking values
 * - Recalculates rankings based on play count
 * 
 * Usage: node migrate-games-to-ranking.js
 */

import { getGameDataFromS3, updateGameDataInS3 } from './utils/s3Manager.js';
import GameRankingService from './services/GameRankingService.js';
import dotenv from 'dotenv';

dotenv.config();

async function migrateGamesToRanking() {
  console.log('🔄 Migrating games to ranking system...\n');

  try {
    // Get current game data
    console.log('📥 Fetching current game-data.json from S3...');
    const gameData = await getGameDataFromS3();
    const games = gameData.games || [];

    if (games.length === 0) {
      console.log('⚠️ No games found to migrate');
      return;
    }

    console.log(`📊 Found ${games.length} games to migrate`);

    // Initialize ranking service
    const rankingService = new GameRankingService({ 
      getGameDataFromS3, 
      updateGameDataInS3 
    });

    let migratedCount = 0;
    const migratedGames = games.map(game => {
      // Check if game already has ranking data
      if (game.playCount !== undefined && game.rank !== undefined) {
        console.log(`   ✅ Game "${game.name}" already has ranking data`);
        return game;
      }

      // Initialize with ranking data
      const migratedGame = rankingService.initializeGameRanking(game);
      migratedCount++;
      
      console.log(`   🔄 Migrated "${game.name}" - Rank: ${migratedGame.rank}, Plays: ${migratedGame.playCount}`);
      
      return migratedGame;
    });

    // Recalculate rankings for all games
    console.log('\n🔄 Recalculating rankings...');
    const rankedGames = rankingService.calculateRankings(migratedGames);

    // Update the game data
    const updatedGameData = { ...gameData, games: rankedGames };
    
    // Save to S3
    console.log('\n📤 Uploading migrated game-data.json to S3...');
    await updateGameDataInS3(updatedGameData);

    console.log('\n✅ Migration completed successfully!');
    console.log(`📊 Migrated ${migratedCount} games`);
    console.log(`📈 Total games with ranking data: ${rankedGames.length}`);
    
    // Show top 5 games
    console.log('\n🏆 Top 5 Games by Rank:');
    rankedGames.slice(0, 5).forEach((game, index) => {
      console.log(`   ${index + 1}. ${game.name} - Rank: ${game.rank}, Plays: ${game.playCount || 0}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrateGamesToRanking();
