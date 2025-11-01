#!/usr/bin/env node

/**
 * Upload complete about-data.json to S3
 * This includes all games from game-data.json
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Validate environment variables
const requiredEnvVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`  - ${varName}`));
  console.error('\nPlease set these in your .env file');
  process.exit(1);
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function uploadAboutData() {
  try {
    console.log('📖 Reading about-data.json...');
    
    // Read the about-data.json file
    const aboutDataPath = join(__dirname, 'public', 'about-data.json');
    const aboutData = JSON.parse(readFileSync(aboutDataPath, 'utf-8'));
    
    console.log(`✅ Found ${aboutData.games?.length || 0} games in about-data.json`);
    
    // Upload to S3
    console.log('\n🚀 Uploading to S3...');
    const bucketName = process.env.AWS_S3_BUCKET;
    
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: 'public/about-data.json',
      Body: JSON.stringify(aboutData, null, 2),
      ContentType: 'application/json',
      CacheControl: 'no-cache, no-store, must-revalidate',
      Metadata: {
        'uploaded-by': 'about-data-complete-script',
        'upload-date': new Date().toISOString()
      }
    });
    
    await s3Client.send(command);
    
    const cloudFrontUrl = process.env.CLOUDFRONT_URL || `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`;
    const fileUrl = `${cloudFrontUrl}/public/about-data.json`;
    
    console.log('\n✅ Upload successful!');
    console.log('\n📁 File details:');
    console.log(`   S3 Bucket: ${bucketName}`);
    console.log(`   S3 Key: public/about-data.json`);
    console.log(`   URL: ${fileUrl}`);
    console.log(`   Games: ${aboutData.games?.length || 0}`);
    
    console.log('\n🎮 Games included:');
    aboutData.games?.forEach((game, idx) => {
      console.log(`   ${idx + 1}. ${game.title} (${game.id})`);
    });
    
    console.log('\n✅ About data is now available!');
    console.log('🔄 Frontend will fetch from: /api/s3/public/about-data.json');
    console.log('💡 Refresh your frontend to see the about sections!');
    
  } catch (error) {
    console.error('\n❌ Upload failed:', error.message);
    if (error.Code) {
      console.error(`   Error Code: ${error.Code}`);
    }
    process.exit(1);
  }
}

// Run the upload
uploadAboutData();

