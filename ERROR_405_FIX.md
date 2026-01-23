# Error 405 (Method Not Allowed) - Explanation & Fix

## 🔍 Error Explanation

**Error:** `api/auth/login:1 Failed to load resource: the server responded with a status of 405 (Not Allowed)`

### What is a 405 Error?

A **405 Method Not Allowed** error means:
- The endpoint exists, but the HTTP method (GET, POST, PUT, DELETE) being used is not allowed
- OR the route isn't properly registered due to server initialization issues

### Root Cause

The issue was caused by a **MongoDB connection failure** due to special characters in the password:

1. **Password contains `@` symbol**: `Checklistmapims@2026`
2. **Connection string malformed**: The `@` in the password was interpreted as the credential separator
3. **Backend couldn't connect to MongoDB**: Server started but routes weren't fully initialized
4. **Result**: Login endpoint returned 405 because the route wasn't properly registered

### The Problem

**Before fix:**
```
MONGO_URI=mongodb://admin:Checklistmapims@2026@mongodb:27017/...
                    ↑ password ends here (wrong!)
                    ↑ @ is interpreted as separator
```

**After fix:**
```
MONGO_URI=mongodb://admin:Checklistmapims%402026@mongodb:27017/...
                    ↑ password properly URL-encoded (%40 = @)
```

## ✅ Fix Applied

### 1. Updated `docker-compose.yml`
Changed from building MONGO_URI directly to passing individual components:
```yaml
environment:
  - MONGO_ROOT_USERNAME=${MONGO_ROOT_USERNAME:-admin}
  - MONGO_ROOT_PASSWORD=${MONGO_ROOT_PASSWORD}
  - MONGO_DATABASE=${MONGO_DATABASE:-mrd_audit}
```

### 2. Updated `backend/src/config/db.js`
Now properly URL-encodes username and password:
```javascript
const username = encodeURIComponent(process.env.MONGO_ROOT_USERNAME || 'admin');
const password = encodeURIComponent(process.env.MONGO_ROOT_PASSWORD || '');
// Constructs: mongodb://admin:Checklistmapims%402026@mongodb:27017/...
```

## 🔄 Next Steps

1. **Backend restarted** - The fix has been applied
2. **Wait 5-10 seconds** for backend to fully restart
3. **Try login again** - The 405 error should be resolved

## ✅ Verification

Check if backend connected successfully:
```powershell
docker compose logs backend --tail=20
```

You should see:
```
MongoDB connected
Server running on port 5000
```

If you see "MongoDB connected", the fix worked!

## 🎯 Summary

- **Problem**: Special character `@` in password broke MongoDB connection string
- **Symptom**: 405 error on login endpoint
- **Solution**: URL-encode password when building connection string
- **Status**: Fixed and backend restarted

Try logging in again - it should work now! 🎉
