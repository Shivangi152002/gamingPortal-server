/**
 * Upload Category Filter Data to S3
 * 
 * This script uploads the categoryFilter.json file to S3 bucket.
 * Run: node upload-categoryFilter.js
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize S3 Client
const getS3Client = () => {
  return new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
};

const getBucketName = () => process.env.AWS_S3_BUCKET;

async function uploadCategoryFilterData() {
  try {
    console.log('📤 Starting category filter upload...\n');

    // Read categoryFilter.json
    const categoryFilterPath = path.join(__dirname, 'public', 'categoryFilter.json');
    
    if (!fs.existsSync(categoryFilterPath)) {
      console.error('❌ Error: categoryFilter.json not found at:', categoryFilterPath);
      console.error('💡 Please create the file first with category data');
      process.exit(1);
    }

    const categoryFilterData = JSON.parse(fs.readFileSync(categoryFilterPath, 'utf-8'));
    
    console.log('✅ Read categoryFilter.json');
    console.log(`   Total categories: ${categoryFilterData.categories?.length || 0}`);
    
    // Validate structure
    if (!Array.isArray(categoryFilterData.categories)) {
      throw new Error('Invalid structure: categories must be an array');
    }

    // Display category summary
    console.log('\n📋 Category Summary:');
    categoryFilterData.categories.forEach((cat, index) => {
      console.log(`   ${index + 1}. ${cat.name} (${cat.id}) - ${cat.enabled ? '✅ Enabled' : '❌ Disabled'}`);
    });

    // Upload to S3
    console.log('\n📤 Uploading to S3...');
    
    const s3Client = getS3Client();
    const bucketName = getBucketName();
    
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: 'public/categoryFilter.json',
      Body: JSON.stringify(categoryFilterData, null, 2),
      ContentType: 'application/json'
    });

    await s3Client.send(command);
    
    console.log('✅ Category filter data uploaded successfully!');
    console.log('\n📍 S3 Location: public/categoryFilter.json');
    console.log(`🌐 Access URL: https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/public/categoryFilter.json`);
    
    console.log('\n✅ Upload complete!');
    console.log('🎯 Next steps:');
    console.log('   1. Verify data in AWS S3 console');
    console.log('   2. Test frontend category filters');
    console.log('   3. Upload category icons to: public/categoryFilters/');

  } catch (error) {
    console.error('\n❌ Error uploading category filter data:', error);
    console.error('💡 Make sure:');
    console.error('   1. categoryFilter.json exists in public/ folder');
    console.error('   2. AWS credentials are configured in .env');
    console.error('   3. S3 bucket name is correct');
    process.exit(1);
  }
}

// Run the upload
uploadCategoryFilterData();

