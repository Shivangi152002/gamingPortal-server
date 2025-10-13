# Server Environment Configuration

This document describes all environment variables needed for the Gaming Portal Server.

## Quick Start

Create a `.env` file in the root of `gamingPortal-server` directory with the following content:

```env
# ========================================
# GAME ADMIN SERVER - COMPLETE ENVIRONMENT CONFIGURATION
# ========================================

# ========================================
# SERVER CONFIGURATION
# ========================================
PORT=3000
NODE_ENV=development

# ========================================
# FRONTEND CONFIGURATION
# ========================================
FRONTEND_URL=http://localhost:5174
ADDITIONAL_ORIGINS=

# ========================================
# SESSION CONFIGURATION
# ========================================
# Generate a secure random string:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
SESSION_MAX_AGE=86400000
SESSION_DOMAIN=

# ========================================
# ROOT USER CREDENTIALS
# ========================================
ROOT_USERNAME=root
ROOT_EMAIL=root@admin.com
ROOT_PASSWORD=root123

# ========================================
# AWS S3 CONFIGURATION
# ========================================
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_S3_BUCKET=your-game-bucket-name

# ========================================
# CLOUDFRONT CONFIGURATION
# ========================================
CLOUDFRONT_URL=https://d1xtpep1y73br3.cloudfront.net

# ========================================
# FILE UPLOAD SETTINGS
# ========================================
MAX_FILE_SIZE=52428800
```

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SESSION_SECRET` | Secret key for session encryption | Generate with crypto.randomBytes |
| `ROOT_USERNAME` | Admin username | `root` |
| `ROOT_EMAIL` | Admin email | `root@admin.com` |
| `ROOT_PASSWORD` | Admin password | `root123` |
| `AWS_ACCESS_KEY_ID` | AWS IAM access key | `AKIAXXXXXXXXXXXXXXXX` |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key | `xxxxxxxx...` |
| `AWS_S3_BUCKET` | S3 bucket name | `your-game-bucket-name` |
| `CLOUDFRONT_URL` | CloudFront distribution URL | `https://d1xtpep1y73br3.cloudfront.net` |

### Optional Variables with Defaults

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `FRONTEND_URL` | Dashboard URL for CORS | `http://localhost:5174` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `SESSION_MAX_AGE` | Session timeout (ms) | `86400000` (24 hours) |
| `MAX_FILE_SIZE` | Max upload size (bytes) | `52428800` (50MB) |

## AWS Setup

### 1. Create IAM User

1. Go to AWS IAM Console
2. Create new user with programmatic access
3. Attach policy: `AmazonS3FullAccess` (or create custom policy)
4. Save `Access Key ID` and `Secret Access Key`

### 2. Create S3 Bucket

1. Go to AWS S3 Console
2. Create new bucket (e.g., `my-game-portal`)
3. Enable public access for `/public/*` folder only
4. Add bucket CORS configuration (see below)

### 3. S3 Bucket CORS Configuration

Add this CORS configuration to your S3 bucket:

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

### 4. S3 Bucket Policy

Add this bucket policy to allow public read access to `/public/*`:

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

Replace `YOUR-BUCKET-NAME` with your actual bucket name.

### 5. CloudFront Setup

1. Go to AWS CloudFront Console
2. Create new distribution
3. Set origin to your S3 bucket
4. Enable CORS (important!)
5. Copy CloudFront URL (e.g., `https://d1xtpep1y73br3.cloudfront.net`)
6. Add to `.env` as `CLOUDFRONT_URL`

#### CloudFront CORS Configuration

Add these response headers in CloudFront:

- `Access-Control-Allow-Origin`: `*`
- `Access-Control-Allow-Methods`: `GET, HEAD, OPTIONS`
- `Access-Control-Allow-Headers`: `*`

## Production Setup

For production deployment:

1. Set `NODE_ENV=production`
2. Change `SESSION_SECRET` to a secure random string
3. Change `ROOT_PASSWORD` to a strong password
4. Set `FRONTEND_URL` to your dashboard domain
5. Use IAM user (not root AWS account)
6. Enable HTTPS on CloudFront
7. Configure proper CORS for production domains

## Security Notes

1. **NEVER** commit `.env` file to git
2. Keep AWS credentials secure
3. Use IAM user with minimal required permissions
4. Change default root password immediately
5. Generate secure `SESSION_SECRET`
6. Use HTTPS in production
7. Set up S3 bucket policy carefully (public read only for `/public/*`)

## Troubleshooting

### Assets not loading?
- Check `CLOUDFRONT_URL` is correct
- Verify CloudFront CORS is configured
- Check S3 bucket policy allows public read
- Verify files are in `/public/` folder in S3

### API calls failing?
- Verify server is running on correct port
- Check `FRONTEND_URL` matches dashboard URL
- Verify CORS configuration
- Check AWS credentials are valid

### Session not persisting?
- Check `SESSION_SECRET` is set
- Verify `SESSION_DOMAIN` is correct
- Check browser allows cookies
- Verify `withCredentials: true` in frontend

### Upload failing?
- Check AWS credentials are valid
- Verify S3 bucket exists and accessible
- Check `MAX_FILE_SIZE` is sufficient
- Verify IAM user has S3 write permissions

## Testing Configuration

To test your configuration:

```bash
# Test server health
curl http://localhost:3000/api/health

# Response should show:
# - s3Configured: true
# - cloudFrontConfigured: true
```

## Development Workflow

1. Copy `CONFIG_TEMPLATE.env` to `.env`
2. Fill in AWS credentials
3. Update CloudFront URL
4. Start server: `npm start`
5. Check health endpoint for configuration status
6. Test file upload functionality
7. Verify assets load from CloudFront

## Environment Variable Priority

1. System environment variables (highest priority)
2. `.env` file
3. Default values in code (lowest priority)

Always use `.env` for local development and system environment variables for production deployment.

