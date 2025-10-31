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

// Get about-data.json from S3
export const getAboutDataFromS3 = async () => {
  if (!isAWSConfigured()) {
    console.log('AWS not configured, returning empty about data');
    return { games: [] };
  }

  try {
    const s3Client = getS3Client();
    const bucketName = getBucketName();
    
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: 'public/about-data.json'
    });
    
    const response = await s3Client.send(command);
    const bodyContents = await streamToString(response.Body);
    const parsedData = JSON.parse(bodyContents);
    
    console.log(`📊 Found ${parsedData.games?.length || 0} games with about info in S3`);
    return parsedData;
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      return { games: [] };
    }
    console.error('S3 Error:', error.message);
    return { games: [] };
  }
};

// Update about-data.json in S3
export const updateAboutDataInS3 = async (aboutData) => {
  if (!isAWSConfigured()) {
    console.log('AWS not configured, skipping S3 update');
    return;
  }

  try {
    const s3Client = getS3Client();
    const bucketName = getBucketName();
    
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: 'public/about-data.json',
      Body: JSON.stringify(aboutData, null, 2),
      ContentType: 'application/json',
      CacheControl: 'no-cache'
    });
    
    await s3Client.send(command);
    console.log('✅ About data updated in S3');
  } catch (error) {
    console.error('S3 Update Error:', error.message);
    throw new Error('Failed to update about data in S3');
  }
};

export default {
  getAboutDataFromS3,
  updateAboutDataInS3
};

