/**
 * Fix Site Settings JSON - Corrects malformed social links structure
 * 
 * This script fixes the facebook and youtube entries that have nested url objects
 * 
 * Usage: node fix-site-settings-json.js
 */

import { getSiteSettingsFromS3, updateSiteSettingsInS3 } from './utils/s3Manager.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixSiteSettings() {
  console.log('🔧 Fixing site-settings.json...\n');

  try {
    // Get current settings
    console.log('📥 Fetching current site-settings.json from S3...');
    const settings = await getSiteSettingsFromS3();

    // Fix socialLinks
    if (settings.socialLinks) {
      console.log('🔍 Checking social links...');
      
      Object.keys(settings.socialLinks).forEach(platform => {
        const link = settings.socialLinks[platform];
        
        // Fix nested url objects
        if (typeof link === 'object' && link.url && typeof link.url === 'object') {
          console.log(`   ⚠️  Found malformed ${platform}:`, JSON.stringify(link, null, 2));
          
          // Extract the correct values
          const correctUrl = link.url.url || '';
          const correctIcon = link.url.icon || link.icon || '';
          const correctActive = link.url.active !== undefined ? link.url.active : link.active;
          const correctLabel = link.url.label || link.label || platform.charAt(0).toUpperCase() + platform.slice(1);
          
          settings.socialLinks[platform] = {
            url: correctUrl,
            icon: correctIcon,
            active: correctActive,
            label: correctLabel
          };
          
          console.log(`   ✅ Fixed ${platform}:`, JSON.stringify(settings.socialLinks[platform], null, 2));
        }
      });
    }

    // Update in S3
    console.log('\n📤 Uploading fixed site-settings.json to S3...');
    await updateSiteSettingsInS3(settings);

    console.log('\n✅ Successfully fixed site-settings.json!');
    console.log('\n📋 Updated social links:');
    Object.entries(settings.socialLinks).forEach(([platform, data]) => {
      console.log(`   ${platform}:`, JSON.stringify(data, null, 2));
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixSiteSettings();

