# Upload Social Icons to AWS S3 - Step by Step Guide

## 📋 Overview
This guide shows you how to upload social media icons to AWS S3 and update `site-settings.json` so they load from CloudFront CDN instead of being hardcoded.

## 🎯 Prerequisites
1. AWS S3 bucket configured
2. CloudFront distribution set up
3. Social media icon files (PNG/JPG/SVG) in `gamingPortal/public/assets/social-icon/` or `gamingPortal/src/assets/social-icon/`
4. Backend server environment variables configured (`.env` file)

## 📁 Required Icon Files
Place your social media icon files in either of these directories:
- `gamingPortal/public/assets/social-icon/`
- `gamingPortal/src/assets/social-icon/`

**Recommended icons:**
- `linkedin.png`
- `instagram.png`
- `twitter.png`
- `facebook.png`
- `youtube.png`
- `tiktok.png`
- `pinterest.png`
- `discord.png`

**Recommended specifications:**
- Format: PNG with transparency (or SVG)
- Size: 50x50px to 100x100px
- File size: < 50KB each

## 🚀 Upload Process

### Step 1: Navigate to Server Directory
```bash
cd gamingPortal-server
```

### Step 2: Run the Upload Script
```bash
node upload-social-icons-to-s3.js
```

### Step 3: Verify Output
You should see output like this:
```
🚀 Starting social icons upload to AWS S3...

📁 S3 Bucket: your-bucket-name
🌐 CloudFront URL: https://dxxxxx.cloudfront.net
📂 Social Icons Directory: D:\path\to\gamingPortal\public\assets\social-icon

📤 Found 8 social icon(s) to upload:

   Uploading linkedin.png...
   ✅ linkedin.png → https://dxxxxx.cloudfront.net/public/assets/social-icon/linkedin.png
   Uploading instagram.png...
   ✅ instagram.png → https://dxxxxx.cloudfront.net/public/assets/social-icon/instagram.png
   ...

✅ Uploaded 8 social icon(s) to S3

📥 Fetching existing site-settings.json from S3...
📝 Updating social links in site-settings.json...
✅ Updated site-settings.json in S3

✅ Successfully uploaded all social icons and updated site-settings.json!

📋 Summary:
   - Uploaded icons: 8
   - CloudFront URL: https://dxxxxx.cloudfront.net
   - Icons folder: public/assets/social-icon/
```

## 📝 What the Script Does

1. **Finds Icon Files**: Scans for PNG/JPG/SVG files in your social-icon directory
2. **Uploads to S3**: Uploads each icon to `public/assets/social-icon/` folder in your S3 bucket
3. **Fetches Settings**: Gets existing `site-settings.json` from S3 (or creates new one)
4. **Updates Settings**: Adds icon paths to social links in `site-settings.json`
5. **Saves to S3**: Uploads updated `site-settings.json` back to S3

## 📄 Resulting site-settings.json Structure

After running the script, your `site-settings.json` will look like this:

```json
{
  "siteTitle": "GameLauncher",
  "siteDescription": "Play amazing HTML5 games instantly",
  "faviconUrl": "/public/assets/favicon.ico",
  "splashLogoUrl": "/public/assets/logo.png",
  "footerText": "© 2024 GameLauncher. All rights reserved.",
  "footerLinks": { ... },
  "socialLinks": {
    "linkedin": {
      "url": "https://linkedin.com/company/yourcompany",
      "icon": "/public/assets/social-icon/linkedin.png",
      "active": true,
      "label": "LinkedIn"
    },
    "instagram": {
      "url": "https://instagram.com/yourprofile",
      "icon": "/public/assets/social-icon/instagram.png",
      "active": true,
      "label": "Instagram"
    },
    "twitter": {
      "url": "https://x.com/yourprofile",
      "icon": "/public/assets/social-icon/twitter.png",
      "active": true,
      "label": "Twitter"
    },
    "facebook": {
      "url": "",
      "icon": "/public/assets/social-icon/facebook.png",
      "active": false,
      "label": "Facebook"
    },
    "youtube": {
      "url": "",
      "icon": "/public/assets/social-icon/youtube.png",
      "active": false,
      "label": "YouTube"
    }
  },
  "customMetaTags": []
}
```

## 🎨 Managing Social Links in Dashboard

After uploading icons, you can manage them via the dashboard:

1. Navigate to **Site Settings → Social Links** tab
2. Each social platform shows with its uploaded icon
3. You can:
   - Edit URLs
   - Change labels
   - Upload new custom icons
   - Toggle visibility
   - Add custom platforms

## ✅ Benefits

### Before (Hardcoded):
```javascript
// ❌ Bad - Hardcoded paths
import linkedinIcon from '../assets/social-icon/linkedin.png';
import instagramIcon from '../assets/social-icon/instagram.png';
```

### After (AWS):
```javascript
// ✅ Good - Loaded from AWS via site-settings.json
const iconUrl = `${CLOUDFRONT_URL}${settings.socialLinks.linkedin.icon}`;
```

**Advantages:**
- ✅ No hardcoded paths
- ✅ Icons served from CloudFront CDN (faster)
- ✅ Easy to update without code changes
- ✅ Centralized management via dashboard
- ✅ Icons cached for 1 year (fast loading)

## 🔧 Troubleshooting

### Icons Not Found
**Problem**: Script says "No icon files found"

**Solution**:
1. Check that icons exist in `gamingPortal/public/assets/social-icon/` or `gamingPortal/src/assets/social-icon/`
2. Ensure files have valid extensions (.png, .jpg, .svg, etc.)

### Upload Failed
**Problem**: "Error uploading to S3"

**Solution**:
1. Check `.env` file has correct AWS credentials:
   ```
   AWS_ACCESS_KEY_ID=your-key
   AWS_SECRET_ACCESS_KEY=your-secret
   AWS_S3_BUCKET=your-bucket
   CLOUDFRONT_URL=https://dxxxxx.cloudfront.net
   ```
2. Verify S3 bucket permissions allow uploads
3. Check AWS IAM user has S3 write permissions

### Icons Don't Display on Website
**Problem**: Icons uploaded but don't show on website footer

**Solution**:
1. Clear browser cache
2. Wait 5-10 minutes for CloudFront invalidation
3. Check browser console for 404 errors
4. Verify `site-settings.json` was updated correctly
5. Check that social links are marked as `active: true`

## 🔄 Re-uploading Icons

If you need to update icons:

1. Replace icon files in the source directory
2. Run the script again: `node upload-social-icons-to-s3.js`
3. The script will:
   - Upload new icons (overwriting old ones)
   - Preserve existing URLs in `site-settings.json`
   - Update icon paths for changed icons

## 📱 Viewing in Dashboard

After upload, verify in the dashboard:

1. Go to `http://localhost:5174` (dashboard)
2. Navigate to **Site Settings** → **Social Links** tab
3. You should see all icons displayed in cards
4. Icons load from CloudFront CDN

## 🌐 Viewing on Website

On your game portal website:

1. Go to `http://localhost:5173` (frontend)
2. Scroll to footer
3. Social icons appear with links
4. Icons load from CloudFront (check Network tab in DevTools)

## 📊 Performance Benefits

**Before (Local Assets)**:
- Icons bundled with app
- ~100-200ms load time
- Increases bundle size

**After (CloudFront CDN)**:
- Icons cached globally
- ~10-20ms load time
- Smaller bundle size
- 99.9% availability

## 🎯 Best Practices

1. **Icon Format**: Use PNG with transparency or SVG for best quality
2. **Icon Size**: 50x50px to 100x100px (will be displayed at 24x24px)
3. **File Size**: Keep under 50KB each for fast loading
4. **Naming**: Use lowercase platform names (e.g., `linkedin.png`, not `LinkedIn.png`)
5. **Updates**: Re-run script when adding new platforms or updating icons
6. **Testing**: Always test in both dashboard and website after uploading

---

**Last Updated**: 2025-10-14  
**Script Location**: `gamingPortal-server/upload-social-icons-to-s3.js`  
**Related**: Follow same pattern for favicon and splash logo uploads

