import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

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

// Check if AWS is properly configured
const isAWSConfigured = () => {
  return process.env.AWS_ACCESS_KEY_ID && 
         process.env.AWS_SECRET_ACCESS_KEY && 
         process.env.AWS_S3_BUCKET &&
         process.env.AWS_ACCESS_KEY_ID !== 'dummy-key' &&
         process.env.AWS_SECRET_ACCESS_KEY !== 'dummy-secret' &&
         process.env.AWS_S3_BUCKET !== 'dummy-bucket';
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

// Get banner-data.json from S3
export const getBannerDataFromS3 = async () => {
  if (!isAWSConfigured()) {
    console.log('AWS not configured, returning empty banner data');
    return { banners: [] };
  }

  try {
    const s3Client = getS3Client();
    const bucketName = getBucketName();
    
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: 'public/banner-data.json'
    });
    
    const response = await s3Client.send(command);
    const bodyContents = await streamToString(response.Body);
    const parsedData = JSON.parse(bodyContents);
    
    console.log(`📊 Found ${parsedData.banners?.length || 0} banners in S3`);
    return parsedData;
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      return { banners: [] };
    }
    console.error('S3 Error:', error.message);
    return { banners: [] };
  }
};

// Update banner-data.json in S3
export const updateBannerDataInS3 = async (bannerData) => {
  if (!isAWSConfigured()) {
    console.log('AWS not configured, skipping S3 update');
    return;
  }

  try {
    const s3Client = getS3Client();
    const bucketName = getBucketName();
    
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: 'public/banner-data.json',
      Body: JSON.stringify(bannerData, null, 2),
      ContentType: 'application/json',
      CacheControl: 'no-cache'
    });
    
    await s3Client.send(command);
    console.log('✅ Banner data updated in S3');
  } catch (error) {
    console.error('S3 Update Error:', error.message);
    throw new Error('Failed to update banner data in S3');
  }
};

export default {
  getBannerDataFromS3,
  updateBannerDataInS3
};

