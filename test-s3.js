import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Testing S3 Connection...');
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID?.substring(0, 8) + '...');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY?.substring(0, 8) + '...');
console.log('AWS_S3_BUCKET:', process.env.AWS_S3_BUCKET);

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function testS3() {
  try {
    console.log('\n📡 Attempting to fetch game-data.json from S3...');
    
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: 'public/game-data.json'
    });
    
    const response = await s3Client.send(command);
    const bodyContents = await streamToString(response.Body);
    const parsedData = JSON.parse(bodyContents);
    
    // Handle both formats: direct array or {games: []} object
    let data;
    if (Array.isArray(parsedData)) {
      console.log(`📊 Found ${parsedData.length} games in S3 (array format)`);
      data = { games: parsedData };
    } else if (parsedData.games && Array.isArray(parsedData.games)) {
      console.log(`📊 Found ${parsedData.games.length} games in S3 (object format)`);
      data = parsedData;
    } else {
      console.log('⚠️ Unknown data format in S3');
      data = { games: [] };
    }
    
    console.log('✅ SUCCESS! Data fetched from S3:');
    console.log('📊 Games count:', data.games?.length || 0);
    console.log('🎮 First game:', data.games?.[0]?.name || 'No games');
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    console.log('🔍 Error details:', {
      name: error.name,
      code: error.code,
      statusCode: error.$metadata?.httpStatusCode
    });
  }
}

function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}

testS3();
