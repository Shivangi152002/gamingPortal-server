# 🎨 Social Media Icons - AWS Upload & Management

## Quick Start

### 1️⃣ Upload Social Icons to AWS
```bash
cd gamingPortal-server
npm run upload-social-icons
```

This uploads all social icons from `gamingPortal/public/assets/social-icon/` to AWS S3 and updates `site-settings.json`.

### 2️⃣ Manage in Dashboard
1. Go to **Site Settings → Social Links** tab
2. Upload custom icons or edit URLs
3. Toggle visibility
4. Save changes

### 3️⃣ View on Website
Social icons automatically appear in the footer, loaded from AWS CloudFront CDN.

## 📁 Icon Requirements
- **Location**: `gamingPortal/public/assets/social-icon/`
- **Format**: PNG, JPG, SVG (PNG with transparency recommended)
- **Size**: 50x50px to 100x100px
- **File Size**: < 50KB each

## 🎯 Supported Platforms
- LinkedIn
- Instagram
- Twitter/X
- Facebook
- YouTube
- TikTok
- Pinterest
- Discord
- Custom platforms (add your own!)

## 📋 site-settings.json Format

```json
{
  "socialLinks": {
    "linkedin": {
      "url": "https://linkedin.com/company/yourcompany",
      "icon": "/public/assets/social-icon/linkedin.png",
      "active": true,
      "label": "LinkedIn"
    }
  }
}
```

## ✅ No Hardcoded Paths!
- ❌ **Before**: Icons hardcoded in components
- ✅ **After**: Icons loaded from AWS via JSON

All social icons are now:
- Stored in AWS S3
- Served via CloudFront CDN
- Managed through dashboard
- Updated via `site-settings.json`

## 📚 Full Documentation
See [UPLOAD_SOCIAL_ICONS_GUIDE.md](./UPLOAD_SOCIAL_ICONS_GUIDE.md) for detailed instructions.

