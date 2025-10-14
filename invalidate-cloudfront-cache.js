/**
 * Invalidate CloudFront Cache
 * 
 * This script creates an invalidation for the site-settings.json file
 * so that CloudFront serves the latest version immediately.
 * 
 * Usage: node invalidate-cloudfront-cache.js
 */

import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import dotenv from 'dotenv';

dotenv.config();

const cloudfront = new CloudFrontClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function invalidateCache() {
  const distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID;
  
  if (!distributionId) {
    console.error('❌ CLOUDFRONT_DISTRIBUTION_ID not set in .env file');
    console.log('Add this to your .env file:');
    console.log('CLOUDFRONT_DISTRIBUTION_ID=your-distribution-id');
    process.exit(1);
  }

  try {
    console.log('🔄 Creating CloudFront cache invalidation...');
    
    const params = {
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: `invalidate-${Date.now()}`,
        Paths: {
          Quantity: 1,
          Items: ['/public/site-settings.json']
        }
      }
    };

    const command = new CreateInvalidationCommand(params);
    const response = await cloudfront.send(command);

    console.log('✅ Cache invalidation created successfully!');
    console.log('Invalidation ID:', response.Invalidation.Id);
    console.log('Status:', response.Invalidation.Status);
    console.log('\n⏱️  CloudFront will serve fresh content in 1-2 minutes.');
  } catch (error) {
    console.error('❌ Error creating invalidation:', error.message);
    process.exit(1);
  }
}

invalidateCache();

