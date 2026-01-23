# Starting Docker Desktop - Step by Step

## ✅ Docker Desktop Found

Docker Desktop is installed but not running.

## 🚀 Quick Start

I've attempted to start Docker Desktop for you. Now:

1. **Wait 30-60 seconds** for Docker Desktop to fully start
   - Look for the Docker whale icon in your system tray (bottom right)
   - The icon should stop animating when ready

2. **Verify Docker is running:**
   ```powershell
   docker info
   ```
   You should see "Server Version" (not the error you saw before)

3. **Once Docker is running, proceed with:**
   ```powershell
   # Make sure your .env has these variables:
   # MONGO_ROOT_USERNAME=admin
   # MONGO_ROOT_PASSWORD=YourPassword123!
   # MONGO_DATABASE=mrd_audit
   # CORS_ORIGIN=http://localhost:3000
   # API_URL=http://localhost:5000/api
   # NODE_ENV=production
   
   docker compose up -d --build
   ```

## 🔍 Manual Start (if needed)

If Docker Desktop didn't start automatically:

1. Press `Windows Key`
2. Type "Docker Desktop"
3. Click the application
4. Wait for it to start

## ⚠️ Important

Before running `docker compose up -d --build`, make sure your `.env` file has:

```env
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=YourSecurePassword123!
MONGO_DATABASE=mrd_audit
CORS_ORIGIN=http://localhost:3000
API_URL=http://localhost:5000/api
NODE_ENV=production
```

## ✅ Checklist

- [ ] Docker Desktop started (whale icon visible)
- [ ] `docker info` shows "Server Version"
- [ ] `.env` file has all required variables
- [ ] Ready to run `docker compose up -d --build`
