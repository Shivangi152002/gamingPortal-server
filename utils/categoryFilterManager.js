import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const CATEGORY_FILTER_FILE = 'public/categoryFilter.json';

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

/**
 * Get category filter data from S3
 */
export async function getCategoryFilterDataFromS3() {
  try {
    const s3Client = getS3Client();
    const bucketName = getBucketName();

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: CATEGORY_FILTER_FILE
    });

    const response = await s3Client.send(command);
    const bodyContents = await streamToString(response.Body);
    const data = JSON.parse(bodyContents);
    
    if (!data || !data.categories) {
      console.warn('⚠️ Category filter data is empty or malformed, returning default structure');
      return {
        categories: [],
        lastUpdated: new Date().toISOString(),
        version: '1.0.0'
      };
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error fetching category filter data from S3:', error);
    // Return default structure on error
    return {
      categories: [],
      lastUpdated: new Date().toISOString(),
      version: '1.0.0'
    };
  }
}

/**
 * Update category filter data in S3
 */
export async function updateCategoryFilterDataInS3(categoryFilterData) {
  try {
    // Add metadata
    const dataToSave = {
      ...categoryFilterData,
      lastUpdated: new Date().toISOString(),
      version: categoryFilterData.version || '1.0.0'
    };
    
    // Validate structure
    if (!Array.isArray(dataToSave.categories)) {
      throw new Error('Invalid category filter data: categories must be an array');
    }
    
    // Validate each category
    dataToSave.categories.forEach((cat, index) => {
      if (!cat.id) {
        throw new Error(`Category at index ${index} is missing required field: id`);
      }
      if (!cat.name) {
        throw new Error(`Category ${cat.id} is missing required field: name`);
      }
    });

    const s3Client = getS3Client();
    const bucketName = getBucketName();
    
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: CATEGORY_FILTER_FILE,
      Body: JSON.stringify(dataToSave, null, 2),
      ContentType: 'application/json'
    });

    await s3Client.send(command);
    console.log('✅ Category filter data updated in S3 successfully');
    
    return dataToSave;
  } catch (error) {
    console.error('❌ Error updating category filter data in S3:', error);
    throw error;
  }
}

/**
 * Helper function to convert stream to string
 */
async function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}

export default {
  getCategoryFilterDataFromS3,
  updateCategoryFilterDataInS3
};

