/**
 * Upload Social Media Icons to AWS S3
 * 
 * This script uploads all social media icons from the public/assets/social-icon directory
 * to AWS S3 and updates the site-settings.json file with the CloudFront URLs.
 * 
 * Usage: node upload-social-icons-to-s3.js
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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

const BUCKET_NAME = process.env.AWS_S3_BUCKET;
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL;

// Social icons directory paths
const FRONTEND_ICONS_DIR = path.join(__dirname, '../gamingPortal/public/assets/social-icon');
const DASHBOARD_ICONS_DIR = path.join(__dirname, '../gamingPortal/src/assets/social-icon');

// Check which directory exists
let SOCIAL_ICONS_DIR;
if (fs.existsSync(FRONTEND_ICONS_DIR)) {
  SOCIAL_ICONS_DIR = FRONTEND_ICONS_DIR;
  console.log('✅ Found social icons in gamingPortal/public/assets/social-icon');
} else if (fs.existsSync(DASHBOARD_ICONS_DIR)) {
  SOCIAL_ICONS_DIR = DASHBOARD_ICONS_DIR;
  console.log('✅ Found social icons in gamingPortal/src/assets/social-icon');
} else {
  console.error('❌ Social icons directory not found!');
  console.log('Checked paths:');
  console.log('  -', FRONTEND_ICONS_DIR);
  console.log('  -', DASHBOARD_ICONS_DIR);
  process.exit(1);
}

/**
 * Upload a file to S3
 */
async function uploadFileToS3(filePath, s3Key) {
  try {
    const fileContent = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    // Determine content type
    let contentType = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    if (ext === '.gif') contentType = 'image/gif';
    if (ext === '.svg') contentType = 'image/svg+xml';
    if (ext === '.webp') contentType = 'image/webp';

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileContent,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000' // 1 year cache
    });

    await s3Client.send(command);
    return `${CLOUDFRONT_URL}/${s3Key}`;
  } catch (error) {
    console.error(`Error uploading ${filePath}:`, error.message);
    throw error;
  }
}

/**
 * Get site settings from S3
 */
async function getSiteSettings() {
  try {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: 'public/site-settings.json'
    });
    
    const response = await s3Client.send(command);
    const bodyContents = await streamToString(response.Body);
    return JSON.parse(bodyContents);
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      console.log('⚠️  site-settings.json not found in S3, will create new one');
      return null;
    }
    throw error;
  }
}

/**
 * Update site settings in S3
 */
async function updateSiteSettings(settings) {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: 'public/site-settings.json',
      Body: JSON.stringify(settings, null, 2),
      ContentType: 'application/json',
      CacheControl: 'no-cache'
    });
    
    await s3Client.send(command);
    console.log('✅ Updated site-settings.json in S3');
  } catch (error) {
    console.error('Error updating site-settings.json:', error.message);
    throw error;
  }
}

/**
 * Helper to convert stream to string
 */
function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting social icons upload to AWS S3...\n');

  // Check AWS configuration
  if (!BUCKET_NAME || !CLOUDFRONT_URL || !process.env.AWS_ACCESS_KEY_ID) {
    console.error('❌ AWS not configured properly. Please check your .env file.');
    console.log('Required variables: AWS_S3_BUCKET, CLOUDFRONT_URL, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY');
    process.exit(1);
  }

  console.log('📁 S3 Bucket:', BUCKET_NAME);
  console.log('🌐 CloudFront URL:', CLOUDFRONT_URL);
  console.log('📂 Social Icons Directory:', SOCIAL_ICONS_DIR);
  console.log('');

  // Read all icon files
  const iconFiles = fs.readdirSync(SOCIAL_ICONS_DIR).filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].includes(ext);
  });

  if (iconFiles.length === 0) {
    console.log('⚠️  No icon files found in', SOCIAL_ICONS_DIR);
    process.exit(0);
  }

  console.log(`📤 Found ${iconFiles.length} social icon(s) to upload:\n`);

  const uploadedIcons = {};

  // Upload each icon
  for (const iconFile of iconFiles) {
    const filePath = path.join(SOCIAL_ICONS_DIR, iconFile);
    const s3Key = `public/assets/social-icon/${iconFile}`;
    const platformName = path.basename(iconFile, path.extname(iconFile));

    try {
      console.log(`   Uploading ${iconFile}...`);
      const url = await uploadFileToS3(filePath, s3Key);
      uploadedIcons[platformName] = `/public/assets/social-icon/${iconFile}`;
      console.log(`   ✅ ${iconFile} → ${url}`);
    } catch (error) {
      console.log(`   ❌ Failed to upload ${iconFile}`);
    }
  }

  console.log(`\n✅ Uploaded ${Object.keys(uploadedIcons).length} social icon(s) to S3\n`);

  // Get existing site settings or create new one
  console.log('📥 Fetching existing site-settings.json from S3...');
  let siteSettings = await getSiteSettings();

  if (!siteSettings) {
    // Create default site settings
    siteSettings = {
      siteTitle: 'GameLauncher',
      siteDescription: 'Play amazing HTML5 games instantly',
      faviconUrl: '',
      splashLogoUrl: '',
      footerText: '© 2024 GameLauncher. All rights reserved.',
      footerLinks: {
        getToKnowUs: [],
        privacyAndTerms: [],
        helpAndSupport: [],
        additionalLinks: []
      },
      socialLinks: {},
      customMetaTags: []
    };
  }

  // Ensure socialLinks exists
  if (!siteSettings.socialLinks) {
    siteSettings.socialLinks = {};
  }

  // Update social links with uploaded icons
  console.log('📝 Updating social links in site-settings.json...');
  
  // Create social links with icons
  const socialLinksWithIcons = {
    linkedin: {
      url: siteSettings.socialLinks.linkedin?.url || siteSettings.socialLinks.linkedin || '',
      icon: uploadedIcons.linkedin || '',
      active: !!(siteSettings.socialLinks.linkedin?.url || siteSettings.socialLinks.linkedin),
      label: 'LinkedIn'
    },
    instagram: {
      url: siteSettings.socialLinks.instagram?.url || siteSettings.socialLinks.instagram || '',
      icon: uploadedIcons.instagram || '',
      active: !!(siteSettings.socialLinks.instagram?.url || siteSettings.socialLinks.instagram),
      label: 'Instagram'
    },
    twitter: {
      url: siteSettings.socialLinks.twitter?.url || siteSettings.socialLinks.twitter || '',
      icon: uploadedIcons.twitter || '',
      active: !!(siteSettings.socialLinks.twitter?.url || siteSettings.socialLinks.twitter),
      label: 'Twitter'
    },
    facebook: {
      url: siteSettings.socialLinks.facebook?.url || siteSettings.socialLinks.facebook || '',
      icon: uploadedIcons.facebook || '',
      active: !!(siteSettings.socialLinks.facebook?.url || siteSettings.socialLinks.facebook),
      label: 'Facebook'
    },
    youtube: {
      url: siteSettings.socialLinks.youtube?.url || siteSettings.socialLinks.youtube || '',
      icon: uploadedIcons.youtube || '',
      active: !!(siteSettings.socialLinks.youtube?.url || siteSettings.socialLinks.youtube),
      label: 'YouTube'
    }
  };

  // Add any custom social platforms from existing settings
  Object.keys(siteSettings.socialLinks).forEach(platform => {
    if (!socialLinksWithIcons[platform]) {
      const existingLink = siteSettings.socialLinks[platform];
      socialLinksWithIcons[platform] = typeof existingLink === 'string' 
        ? {
            url: existingLink,
            icon: uploadedIcons[platform] || '',
            active: !!existingLink,
            label: platform.charAt(0).toUpperCase() + platform.slice(1)
          }
        : {
            ...existingLink,
            icon: existingLink.icon || uploadedIcons[platform] || ''
          };
    }
  });

  siteSettings.socialLinks = socialLinksWithIcons;

  // Upload updated site settings
  await updateSiteSettings(siteSettings);

  console.log('\n✅ Successfully uploaded all social icons and updated site-settings.json!');
  console.log('\n📋 Summary:');
  console.log(`   - Uploaded icons: ${Object.keys(uploadedIcons).length}`);
  console.log(`   - CloudFront URL: ${CLOUDFRONT_URL}`);
  console.log(`   - Icons folder: public/assets/social-icon/`);
  console.log('\n🎉 All social icons are now available via CloudFront CDN!');
  console.log('\n📝 Updated social links in site-settings.json:');
  Object.entries(socialLinksWithIcons).forEach(([platform, data]) => {
    if (data.icon) {
      console.log(`   ✅ ${platform}: ${data.icon}`);
    }
  });
}

// Run the script
main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

