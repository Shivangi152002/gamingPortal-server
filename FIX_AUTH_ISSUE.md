# Fix Authentication Issue (auth/me not working)

## Problem

The `/auth/me` endpoint returns 401 (Not Authenticated), causing edit/delete operations to fail in the dashboard.

## Root Cause

Session cookies are not being properly set or sent between the frontend and backend due to:
1. Missing or incorrect SESSION_SECRET
2. CORS misconfiguration
3. Cookie domain mismatch
4. Missing credentials in requests

## ✅ Quick Fix (Step by Step)

### Step 1: Check Server .env File

Create or update `gamingPortal-server/.env`:

```env
# CRITICAL: Session Secret (REQUIRED!)
SESSION_SECRET=your-random-secret-at-least-32-characters-long

# Frontend URL for CORS
FRONTEND_URL=http://localhost:5174

# Root User
ROOT_EMAIL=root@admin.com
ROOT_PASSWORD=root123

# Other settings...
```

**Generate a secure SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 2: Restart Server

**IMPORTANT:** After changing `.env`, you MUST restart the server:

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm start
```

### Step 3: Clear Browser Data

1. Open browser DevTools (F12)
2. Go to Application/Storage tab
3. Clear **Cookies** for localhost
4. Clear **Session Storage**
5. Clear **Local Storage**
6. Close and reopen the dashboard tab

### Step 4: Test Authentication

Run the test script:

```bash
cd gamingPortal-server
node test-auth-flow.js
```

Expected output:
```
✅ All tests passed! Authentication is working correctly.
```

### Step 5: Login Again

1. Open dashboard: http://localhost:5174
2. Login with: `root@admin.com` / `root123`
3. Check browser DevTools > Network tab
4. Look for `/auth/login` request
5. Verify response has `Set-Cookie` header
6. Verify `/auth/me` request includes `Cookie` header

## 🔍 Debugging Guide

### Check 1: Server Logs

When you start the server, you should see:

```
🔧 CORS Configuration:
   Allowed Origins: [ 'http://localhost:5174', ... ]

🍪 Session Configuration:
   Cookie Name: sessionId
   Secure: false
   SameSite: lax
   Domain: not set (uses request domain)
```

### Check 2: Login Request in Browser

Open DevTools > Network > `/auth/login`:

**Request Headers should include:**
```
Content-Type: application/json
Origin: http://localhost:5174
```

**Response Headers should include:**
```
Access-Control-Allow-Credentials: true
Access-Control-Allow-Origin: http://localhost:5174
Set-Cookie: sessionId=...; Path=/; HttpOnly; SameSite=Lax
```

### Check 3: Auth/me Request in Browser

Open DevTools > Network > `/auth/me`:

**Request Headers should include:**
```
Cookie: sessionId=...
Origin: http://localhost:5174
```

**Response should be:**
```json
{
  "success": true,
  "data": {
    "user": {
      "email": "root@admin.com",
      "role": "root"
    }
  }
}
```

## ❌ Common Issues & Solutions

### Issue 1: No Set-Cookie Header

**Symptom:** Login succeeds but no cookie is set

**Cause:** SESSION_SECRET not configured

**Solution:**
```bash
# Add to .env
SESSION_SECRET=your-generated-secret-here

# Restart server
npm start
```

### Issue 2: CORS Error

**Symptom:** Browser console shows CORS error

**Cause:** Frontend URL not in allowed origins

**Solution:**
```bash
# Add to .env
FRONTEND_URL=http://localhost:5174

# Restart server
npm start
```

### Issue 3: Cookie Not Sent

**Symptom:** Cookie is set but not sent in subsequent requests

**Cause:** Dashboard not using `withCredentials: true`

**Solution:** Already fixed in `gamingPortal-dashboard/src/utils/axios.js`

Verify:
```javascript
// Should have:
withCredentials: true
```

### Issue 4: 401 on auth/me

**Symptom:** Always returns "Not authenticated"

**Causes & Solutions:**

1. **Server not reading cookie:**
   ```bash
   # Check session middleware is loaded
   # Should see in server.js: app.use(session(sessionConfig))
   ```

2. **Session expired:**
   ```bash
   # Login again and immediately test
   ```

3. **Different domains:**
   ```bash
   # Use localhost for both (not 127.0.0.1)
   # Dashboard: http://localhost:5174
   # Server: http://localhost:3000
   ```

### Issue 5: Delete/Edit Not Working

**Symptom:** Edit/Delete buttons do nothing or show auth error

**Cause:** auth/me failing, so user appears not logged in

**Solution:** Fix auth/me first (follow steps 1-5 above)

## 🧪 Test Checklist

Run through this checklist:

- [ ] `.env` file exists in `gamingPortal-server`
- [ ] `SESSION_SECRET` is set (at least 32 characters)
- [ ] `FRONTEND_URL=http://localhost:5174`
- [ ] Server restarted after .env changes
- [ ] Browser cookies cleared
- [ ] Test script passes: `node test-auth-flow.js`
- [ ] Can login to dashboard
- [ ] Browser shows `Set-Cookie` header on login
- [ ] Browser sends `Cookie` header on /auth/me
- [ ] `/auth/me` returns 200 with user data
- [ ] Edit/Delete buttons work

## 📝 Complete .env Template

```env
# Server
PORT=3000
NODE_ENV=development

# CORS
FRONTEND_URL=http://localhost:5174
ADDITIONAL_ORIGINS=

# Session (CRITICAL!)
SESSION_SECRET=generate-random-32-char-string-here
SESSION_MAX_AGE=86400000

# Root User
ROOT_USERNAME=root
ROOT_EMAIL=root@admin.com
ROOT_PASSWORD=root123

# AWS (if needed)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=your-bucket
CLOUDFRONT_URL=https://d1xtpep1y73br3.cloudfront.net

# Upload
MAX_FILE_SIZE=52428800
```

## 🆘 Still Not Working?

1. **Run diagnostic test:**
   ```bash
   node test-auth-flow.js
   ```

2. **Check server logs** when accessing /auth/me

3. **Check browser console** for errors

4. **Verify axios configuration:**
   ```bash
   # In gamingPortal-dashboard/src/utils/axios.js
   # Should have: withCredentials: true
   ```

5. **Try incognito/private browser** to rule out extension issues

6. **Verify both apps on same domain:**
   - Dashboard: http://localhost:5174 ✅
   - Server: http://localhost:3000 ✅
   - DON'T use: http://127.0.0.1 ❌

## ✅ Success Indicators

When everything works:

1. ✅ Login redirects to dashboard
2. ✅ Dashboard shows user info (not login page)
3. ✅ Edit/Delete buttons are visible
4. ✅ Clicking Edit/Delete doesn't redirect to login
5. ✅ Browser DevTools shows cookie in Application > Cookies
6. ✅ Network tab shows cookie sent with all API requests

## 🎯 Quick Recovery Commands

```bash
# In gamingPortal-server directory:

# 1. Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 2. Add to .env (copy the output above)
echo "SESSION_SECRET=<paste-output-here>" >> .env

# 3. Restart server
npm start

# 4. Test
node test-auth-flow.js
```

Then in browser:
1. Clear all site data (DevTools > Application > Clear site data)
2. Reload dashboard
3. Login again

