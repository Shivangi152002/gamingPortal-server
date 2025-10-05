import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';

// Initialize S3 Client (moved inside functions to ensure env vars are loaded)
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

// Check if AWS is properly configured
const isAWSConfigured = () => {
  const isConfigured = process.env.AWS_ACCESS_KEY_ID && 
         process.env.AWS_SECRET_ACCESS_KEY && 
         process.env.AWS_S3_BUCKET &&
         process.env.AWS_ACCESS_KEY_ID !== 'dummy-key' &&
         process.env.AWS_SECRET_ACCESS_KEY !== 'dummy-secret' &&
         process.env.AWS_S3_BUCKET !== 'dummy-bucket' &&
         process.env.AWS_S3_BUCKET !== 'your-existing-bucket';
  
  console.log('🔍 AWS Configuration Check:', {
    hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
    hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
    hasBucket: !!process.env.AWS_S3_BUCKET,
    accessKeyStart: process.env.AWS_ACCESS_KEY_ID?.substring(0, 8),
    bucketName: process.env.AWS_S3_BUCKET,
    isConfigured
  });
  
  return isConfigured;
};

// Get game-data.json from S3
export const getGameDataFromS3 = async () => {
  // If AWS is not properly configured, return empty data
  if (!isAWSConfigured()) {
    console.log('AWS not configured, returning empty game data');
    return { games: [] };
  }

  try {
    const s3Client = getS3Client();
    const bucketName = getBucketName();
    
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: 'public/game-data.json'
    });
    
    const response = await s3Client.send(command);
    const bodyContents = await streamToString(response.Body);
    const parsedData = JSON.parse(bodyContents);
    
    // Handle both formats: direct array or {games: []} object
    if (Array.isArray(parsedData)) {
      console.log(`📊 Found ${parsedData.length} games in S3 (array format)`);
      return { games: parsedData };
    } else if (parsedData.games && Array.isArray(parsedData.games)) {
      console.log(`📊 Found ${parsedData.games.length} games in S3 (object format)`);
      return parsedData;
    } else {
      console.log('⚠️ Unknown data format in S3, returning empty games');
      return { games: [] };
    }
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      // File doesn't exist, return empty structure
      return { games: [] };
    }
    console.error('S3 Error:', error.message);
    // Return empty data instead of throwing error
    return { games: [] };
  }
};

// Update game-data.json in S3
export const updateGameDataInS3 = async (gameData) => {
  // If AWS is not properly configured, just log and return
  if (!isAWSConfigured()) {
    console.log('AWS not configured, skipping S3 update');
    return;
  }

  try {
    const s3Client = getS3Client();
    const bucketName = getBucketName();
    
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: 'public/game-data.json',
      Body: JSON.stringify(gameData, null, 2),
      ContentType: 'application/json',
      CacheControl: 'no-cache'
    });
    
    await s3Client.send(command);
  } catch (error) {
    console.error('S3 Update Error:', error.message);
    throw new Error('Failed to update game data in S3');
  }
};

// Upload file to S3
export const uploadFileToS3 = async (file, folder = '', preserveOriginalName = false) => {
  // If AWS is not properly configured, return dummy data
  if (!isAWSConfigured()) {
    console.log('AWS not configured, returning dummy file data');
    const ext = file.originalname.split('.').pop();
    let fileName;
    
    if (preserveOriginalName) {
      // For ZIP files, preserve the original name (folder name)
      fileName = file.originalname;
    } else {
      // For other files, add timestamp and random number
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1E9);
      const baseName = file.originalname
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase();
      
      fileName = `${baseName}-${timestamp}-${random}.${ext}`;
    }
    
    const key = folder ? `public/${folder}/${fileName}` : `public/${fileName}`;
    
    return {
      key,
      url: `https://via.placeholder.com/300x200/cccccc/666666?text=${fileName}`,
      path: `/${key}`
    };
  }

  try {
    const ext = file.originalname.split('.').pop();
    let fileName;
    
    if (preserveOriginalName) {
      // For ZIP files, preserve the original name (folder name)
      fileName = file.originalname;
    } else {
      // For other files, add timestamp and random number
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1E9);
      const baseName = file.originalname
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase();
      
      fileName = `${baseName}-${timestamp}-${random}.${ext}`;
    }
    
    const key = folder ? `public/${folder}/${fileName}` : `public/${fileName}`;
    
    const s3Client = getS3Client();
    const bucketName = getBucketName();
    
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: 'public, max-age=31536000'
      }
    });
    
    await upload.done();
    
    // Return CloudFront URL
    const cloudFrontUrl = process.env.CLOUDFRONT_URL || `https://${bucketName}.s3.amazonaws.com`;
    return {
      key,
      url: `${cloudFrontUrl}/${key}`,
      path: `/${key}`
    };
  } catch (error) {
    console.error('S3 Upload Error:', error.message);
    throw new Error('Failed to upload file to S3');
  }
};

// Delete file from S3
export const deleteFileFromS3 = async (key) => {
  // If AWS is not properly configured, just log and return
  if (!isAWSConfigured()) {
    console.log('AWS not configured, skipping S3 delete');
    return;
  }

  try {
    const s3Client = getS3Client();
    const bucketName = getBucketName();
    
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key.startsWith('/') ? key.substring(1) : key
    });
    
    await s3Client.send(command);
  } catch (error) {
    console.error('S3 Delete Error:', error.message);
    throw new Error('Failed to delete file from S3');
  }
};

// Helper: Convert stream to string
const streamToString = (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
};

export default {
  getGameDataFromS3,
  updateGameDataInS3,
  uploadFileToS3,
  deleteFileFromS3
};
