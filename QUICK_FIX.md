# Quick Fix for Docker Issues

## Issue 1: Missing MONGO_ROOT_PASSWORD

Add this to your `.env` file:

```env
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=YourSecurePassword123!
MONGO_DATABASE=mrd_audit
CORS_ORIGIN=http://localhost:3000
API_URL=http://localhost:5000/api
NODE_ENV=production
```

## Issue 2: Docker Desktop Not Running

The error `open //./pipe/dockerDesktopLinuxEngine` means Docker Desktop is not running.

### Fix:
1. **Start Docker Desktop** from Windows Start Menu
2. Wait for it to fully start (whale icon in system tray should be steady)
3. Then run: `docker compose up -d --build`

### Verify Docker is running:
```powershell
docker info
```

If you see "Server Version", Docker is running. If you see an error, start Docker Desktop.

## Fixed Issues:
- ✅ Removed obsolete `version` from docker-compose.yml
- ✅ Added environment variable validation

## Next Steps:
1. Add variables to `.env` (see above)
2. Start Docker Desktop
3. Run: `docker compose up -d --build`
