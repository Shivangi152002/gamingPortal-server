import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Initialize CloudFront Client
const cloudfront = new CloudFrontClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const bucketName = process.env.AWS_S3_BUCKET;

async function uploadAboutData() {
  try {
    // Read the about data file
    const filePath = path.join(__dirname, 'about-data.json');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // Parse to ensure it's valid JSON
    const aboutData = JSON.parse(fileContent);
    
    console.log('📋 About data loaded successfully');
    console.log(`   Total games: ${aboutData.games.length}`);
    
    // The path where you want to upload - should be in public folder
    const s3Key = 'public/about-data.json';
    
    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: JSON.stringify(aboutData, null, 2),
      ContentType: 'application/json',
      CacheControl: 'public, max-age=3600' // Cache for 1 hour
    });
    
    console.log(`\n🚀 Uploading to S3...`);
    console.log(`   Bucket: ${bucketName}`);
    console.log(`   Key: ${s3Key}`);
    
    await s3Client.send(command);
    
    // Get CloudFront URL if configured
    const cloudFrontUrl = process.env.CLOUDFRONT_URL;
    let fileUrl;
    
    if (cloudFrontUrl) {
      fileUrl = `${cloudFrontUrl}/${s3Key}`;
    } else {
      const region = process.env.AWS_REGION || 'us-east-1';
      fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
    }
    
    console.log('\n✅ About data uploaded successfully!');
    console.log(`   URL: ${fileUrl}`);
    console.log('\n📝 Game details:');
    aboutData.games.forEach(game => {
      console.log(`   - ${game.title} by ${game.developer} (${game.sections?.length || 0} sections)`);
    });
    
    // Invalidate CloudFront cache
    if (process.env.CLOUDFRONT_DISTRIBUTION_ID) {
      console.log('\n🔄 Invalidating CloudFront cache...');
      try {
        const invalidateParams = {
          DistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
          InvalidationBatch: {
            CallerReference: `about-upload-${Date.now()}`,
            Paths: {
              Quantity: 1,
              Items: ['/public/about-data.json']
            }
          }
        };
        
        const invalidateCommand = new CreateInvalidationCommand(invalidateParams);
        const invalidateResponse = await cloudfront.send(invalidateCommand);
        
        console.log('✅ CloudFront cache invalidated successfully!');
        console.log('   Invalidation ID:', invalidateResponse.Invalidation.Id);
        console.log('   ⏱️  Fresh content will be available in 1-2 minutes');
      } catch (invalidateError) {
        console.warn('⚠️  Could not invalidate CloudFront cache:', invalidateError.message);
        console.log('   About data is updated in S3. CloudFront will refresh automatically within the cache period.');
      }
    } else {
      console.log('\n⚠️  CLOUDFRONT_DISTRIBUTION_ID not set. Skipping cache invalidation.');
      console.log('   Add CLOUDFRONT_DISTRIBUTION_ID to .env to automatically invalidate cache after upload.');
    }
    
  } catch (error) {
    console.error('❌ Error uploading about data:', error.message);
    process.exit(1);
  }
}

// Check if AWS credentials are configured
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !bucketName) {
  console.error('❌ Error: AWS credentials not configured!');
  console.error('Please set the following environment variables:');
  console.error('  - AWS_ACCESS_KEY_ID');
  console.error('  - AWS_SECRET_ACCESS_KEY');
  console.error('  - AWS_S3_BUCKET');
  console.error('  - AWS_REGION (optional, defaults to us-east-1)');
  console.error('  - CLOUDFRONT_URL (optional)');
  process.exit(1);
}

uploadAboutData();

