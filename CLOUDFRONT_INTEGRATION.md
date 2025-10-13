# CloudFront Integration Guide

## Overview

Your Gaming Portal Server is configured to work seamlessly with AWS CloudFront for fast, global asset delivery.

## Current CloudFront Configuration

**CloudFront URL:** `https://d1xtpep1y73br3.cloudfront.net`

This URL is used for:
- Game thumbnails (`/public/thumbnail/`)
- Game GIFs (`/public/gif/`)
- Game files (`/public/games/`)
- Other assets (`/public/`)

## How It Works

### 1. File Upload Flow

```
Dashboard → Server → S3 Upload → CloudFront URL Returned
```

**Example:**
```javascript
// User uploads: game-thumbnail.png
// Server uploads to S3: public/thumbnail/game-thumbnail.png
// Server returns: {
//   url: "https://d1xtpep1y73br3.cloudfront.net/public/thumbnail/game-thumbnail.png",
//   key: "public/thumbnail/game-thumbnail.png",
//   path: "/public/thumbnail/game-thumbnail.png"
// }
```

### 2. Asset Loading Flow

```
Dashboard → Constructs CloudFront URL → Browser loads from CloudFront CDN
```

**Example:**
```javascript
// Game data has: thumb_url: "thumbnail/game.png"
// Dashboard converts to: "https://d1xtpep1y73br3.cloudfront.net/public/thumbnail/game.png"
// Browser loads from CloudFront (fast, global CDN)
```

## Server Configuration

### Environment Variable

Add to `gamingPortal-server/.env`:

```env
CLOUDFRONT_URL=https://d1xtpep1y73br3.cloudfront.net
```

### Code Implementation

The server automatically uses CloudFront URL when returning file URLs:

**File:** `utils/s3Manager.js`

```javascript
// After uploading to S3
const cloudFrontUrl = process.env.CLOUDFRONT_URL;
const baseUrl = cloudFrontUrl || `https://${bucketName}.s3.amazonaws.com`;

return {
  key: 'public/thumbnail/game.png',
  url: `${cloudFrontUrl}/public/thumbnail/game.png`, // CloudFront URL
  path: '/public/thumbnail/game.png'
};
```

## CloudFront Setup Checklist

### ✅ Required CloudFront Configuration

1. **Origin Settings**
   - Origin Domain: Your S3 bucket
   - Origin Path: Leave empty or `/`
   - Origin Protocol Policy: HTTPS only (recommended)

2. **CORS Configuration** (CRITICAL!)
   ```
   Access-Control-Allow-Origin: *
   Access-Control-Allow-Methods: GET, HEAD, OPTIONS
   Access-Control-Allow-Headers: *
   Access-Control-Max-Age: 3000
   ```

3. **Behavior Settings**
   - Viewer Protocol Policy: Redirect HTTP to HTTPS
   - Allowed HTTP Methods: GET, HEAD, OPTIONS
   - Cache Policy: CachingOptimized (or custom)

4. **Custom Error Pages** (Optional but recommended)
   - 403 → 404.html
   - 404 → 404.html

### 🔧 S3 Bucket Configuration

**CORS Configuration:**

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

**Bucket Policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/public/*"
    }
  ]
}
```

## Testing CloudFront Integration

### 1. Test File Upload

```bash
# Upload a test file
curl -X POST http://localhost:3000/api/upload/file \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test.png" \
  --cookie "connect.sid=YOUR_SESSION_COOKIE"

# Response should include CloudFront URL:
{
  "success": true,
  "data": {
    "url": "https://d1xtpep1y73br3.cloudfront.net/public/thumbnail/test.png",
    "cloudFrontUrl": "https://d1xtpep1y73br3.cloudfront.net"
  }
}
```

### 2. Test Asset Loading

```bash
# Try loading an asset directly from CloudFront
curl -I https://d1xtpep1y73br3.cloudfront.net/public/thumbnail/test.png

# Should return:
# HTTP/2 200
# access-control-allow-origin: *
# content-type: image/png
```

### 3. Check Server Configuration

```bash
curl http://localhost:3000/api/health

# Should show:
{
  "configuration": {
    "cloudFrontConfigured": true,
    "cloudFrontUrl": "https://d1xtpep1y73br3.cloudfront.net"
  }
}
```

## Common Issues & Solutions

### Issue 1: CORS Errors

**Symptom:** Browser console shows CORS error when loading assets

**Solution:**
1. Add CORS headers in CloudFront response headers policy
2. Enable CORS in S3 bucket configuration
3. Verify `Access-Control-Allow-Origin: *` header is present

**Test:**
```bash
curl -I -H "Origin: http://localhost:5174" \
  https://d1xtpep1y73br3.cloudfront.net/public/thumbnail/test.png
```

Look for: `access-control-allow-origin: *`

### Issue 2: 403 Forbidden

**Symptom:** Assets return 403 error

**Solution:**
1. Check S3 bucket policy allows public read on `/public/*`
2. Verify CloudFront has access to S3 bucket
3. Check file actually exists in S3

### Issue 3: Stale/Cached Content

**Symptom:** Old version of file is served

**Solution:**
1. Create CloudFront invalidation for the file
2. Wait a few minutes for cache to clear
3. Or use versioned filenames (recommended)

**Create Invalidation:**
```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/public/thumbnail/*"
```

### Issue 4: CloudFront URL Not Used

**Symptom:** Server returns S3 URLs instead of CloudFront

**Solution:**
1. Check `.env` has `CLOUDFRONT_URL` set
2. Restart server after adding env var
3. Verify in server logs: "CloudFront: https://d1xtpep1y73br3.cloudfront.net"

## Performance Benefits

### With CloudFront:
- ⚡ **Faster Loading:** Assets served from nearest edge location
- 🌍 **Global Distribution:** 200+ edge locations worldwide
- 📦 **Reduced Bandwidth:** Caching reduces origin requests
- 🔒 **HTTPS:** Automatic SSL/TLS encryption
- 💰 **Cost Savings:** Free tier + reduced S3 bandwidth costs

### Without CloudFront:
- 🐌 Slower loading from single S3 region
- 💸 Higher S3 bandwidth costs
- 🔧 Manual SSL certificate management

## Monitoring

### Check CloudFront Distribution

```bash
# Get distribution status
aws cloudfront get-distribution \
  --id YOUR_DISTRIBUTION_ID

# Should show: "Status": "Deployed"
```

### Check Cache Statistics

1. Go to AWS CloudFront Console
2. Select your distribution
3. View "Monitoring" tab
4. Check:
   - Cache hit rate (should be >80%)
   - Requests per second
   - Error rate (should be <1%)

## Best Practices

1. ✅ Always use CloudFront in production
2. ✅ Enable CORS on both S3 and CloudFront
3. ✅ Use versioned filenames for cache-busting
4. ✅ Set appropriate cache headers
5. ✅ Monitor cache hit rate
6. ✅ Create invalidations for critical updates
7. ✅ Use HTTPS only
8. ✅ Set up custom error pages

## Additional Resources

- [AWS CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [S3 CORS Configuration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html)
- [CloudFront CORS Best Practices](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/header-caching.html#header-caching-web-cors)

