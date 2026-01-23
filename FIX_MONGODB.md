# Fix MongoDB Container Error

## Problem
MongoDB container is failing with:
```
error: missing 'MONGO_INITDB_ROOT_USERNAME' or 'MONGO_INITDB_ROOT_PASSWORD'
```

## Solution

I've automatically added the missing variables to your `.env` file. However, you should:

### 1. Edit your `.env` file and set a secure password:

Open `.env` and find:
```env
MONGO_ROOT_PASSWORD=ChangeThisPassword123!
```

**Change it to a strong password**, for example:
```env
MONGO_ROOT_PASSWORD=MySecurePassword2024!@#
```

### 2. Verify all required variables are in `.env`:

```env
# MongoDB Configuration
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=YourSecurePasswordHere
MONGO_DATABASE=mrd_audit

# Backend Configuration
NODE_ENV=production
PORT=5000
JWT_SECRET=your-existing-jwt-secret

# Frontend Configuration
CORS_ORIGIN=http://localhost:3000
API_URL=http://localhost:5000/api
```

### 3. Clean up and restart:

```powershell
# Stop and remove containers
docker compose down

# Remove volumes (if you want a fresh start)
docker compose down -v

# Start again
docker compose up -d --build
```

## Why This Happened

Docker Compose reads environment variables from `.env` file. If `MONGO_ROOT_PASSWORD` is not set, MongoDB can't initialize because it requires both username and password to create the root user.

## After Fix

Once you've updated the password in `.env`, run:
```powershell
docker compose up -d --build
```

MongoDB should start successfully!
