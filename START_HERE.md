# 🚀 START HERE - Fix Authentication Issue

## The Problem

Your `/auth/me` endpoint is not working, which means:
- ❌ Login doesn't persist
- ❌ Edit/Delete operations fail
- ❌ Dashboard keeps redirecting to login

## The Solution (5 Minutes)

### Step 1: Create .env File ⚡

```bash
cd gamingPortal-server
```

Create a file named `.env` with this content:

```env
SESSION_SECRET=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
FRONTEND_URL=http://localhost:5174
ROOT_EMAIL=root@admin.com
ROOT_PASSWORD=root123
PORT=3000
```

**💡 OR** generate a better secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy the output and use as SESSION_SECRET
```

### Step 2: Restart Server 🔄

```bash
# Stop server if running (Ctrl+C)
npm start
```

You should see:
```
✅ Server running on port 3000
🍪 Session Configuration:
   Cookie Name: sessionId
```

### Step 3: Test It 🧪

```bash
node test-auth-flow.js
```

Expected:
```
✅ All tests passed!
```

### Step 4: Clear Browser & Login 🌐

1. Open Chrome/Edge DevTools (F12)
2. Application tab → Clear site data
3. Go to http://localhost:5174
4. Login: `root@admin.com` / `root123`

### Step 5: Verify It Works ✅

1. You should stay logged in (not redirect to login)
2. Try editing a game → Should work
3. Try deleting a game → Should work

## 🎯 Quick Check

### Is server running?
```bash
curl http://localhost:3000/api/health
```

### Can you login?
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"root@admin.com","password":"root123"}'
```

Should return:
```json
{
  "success": true,
  "data": {
    "user": {"email": "root@admin.com"}
  }
}
```

## ❌ Still Not Working?

### Problem: "SESSION_SECRET is required"

**Solution:**
```bash
# Make sure .env exists
ls -la .env

# Check it has SESSION_SECRET
cat .env | grep SESSION_SECRET

# Should show: SESSION_SECRET=...
```

### Problem: CORS Error in Browser

**Solution:**
```bash
# Check .env has FRONTEND_URL
echo "FRONTEND_URL=http://localhost:5174" >> .env

# Restart server
npm start
```

### Problem: Login works but auth/me fails

**Solution:**
```bash
# Clear browser cookies
# In DevTools: Application → Cookies → localhost → Delete all

# Login again
```

### Problem: Port already in use

**Solution:**
```bash
# Change port in .env
echo "PORT=3001" >> .env

# Also update dashboard .env to match
# In gamingPortal-dashboard/.env:
echo "VITE_API_BASE_URL=http://localhost:3001/api" >> .env

# Restart both server and dashboard
```

## 📋 Complete Setup Checklist

- [ ] Created `.env` in `gamingPortal-server`
- [ ] Added `SESSION_SECRET` (at least 32 characters)
- [ ] Added `FRONTEND_URL=http://localhost:5174`
- [ ] Restarted server with `npm start`
- [ ] Ran test: `node test-auth-flow.js` → All passed
- [ ] Cleared browser cookies
- [ ] Logged into dashboard → Stays logged in
- [ ] Edit/Delete buttons work

## 🆘 Need Help?

### 1. Check Logs

**Server logs** (should show):
```
🔧 CORS Configuration:
   Allowed Origins: [ 'http://localhost:5174' ]
🍪 Session Configuration:
   Cookie Name: sessionId
```

**Browser DevTools** → Network → `/auth/login`:
- Response should have `Set-Cookie` header

**Browser DevTools** → Network → `/auth/me`:
- Request should have `Cookie` header
- Response should be `200 OK`

### 2. Read Detailed Guide

See `FIX_AUTH_ISSUE.md` for complete troubleshooting guide.

### 3. AWS/CloudFront Setup (Optional)

If you need AWS/S3/CloudFront:
- See `ENV_SETUP.md`
- See `CLOUDFRONT_INTEGRATION.md`

## ✅ Success!

When working:
- ✅ Login once → Stay logged in
- ✅ Refresh page → Still logged in
- ✅ Edit games → Works
- ✅ Delete games → Works
- ✅ Upload games → Works

## 🚀 Next Steps

Once authentication works:

1. **Setup AWS (if needed)**:
   - Follow `ENV_SETUP.md`
   - Configure S3 bucket
   - Setup CloudFront

2. **Setup Dashboard**:
   - Create `gamingPortal-dashboard/.env`
   - Add `VITE_CLOUDFRONT_URL`
   - See `gamingPortal-dashboard/ENV_SETUP.md`

3. **Start Building**:
   - Upload games
   - Manage content
   - Monitor analytics

