# Environment Variables Setup for Docker

## ✅ Current .env File

You already have:
- `MONGO_URI`
- `JWT_SECRET`
- `PORT`

## 🔧 Required Variables for Docker

Your `.env` file needs these additional variables for Docker Compose:

### MongoDB Configuration
```env
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your-secure-mongodb-password
MONGO_DATABASE=mrd_audit
```

### Backend Configuration
```env
NODE_ENV=production
PORT=5000
CORS_ORIGIN=http://localhost:3000
```

### Frontend Configuration
```env
API_URL=http://localhost:5000/api
```

### Complete .env Template

```env
# MongoDB Configuration (for Docker)
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your-secure-mongodb-password-change-this
MONGO_DATABASE=mrd_audit

# Backend Configuration
NODE_ENV=production
PORT=5000
JWT_SECRET=your-existing-jwt-secret-here
CORS_ORIGIN=http://localhost:3000

# Frontend Configuration
API_URL=http://localhost:5000/api

# Legacy MongoDB URI (optional - Docker will override with MONGO_ROOT_USERNAME/PASSWORD)
# MONGO_URI=mongodb://admin:password@mongodb:27017/mrd_audit?authSource=admin
```

## 📝 Important Notes

1. **MONGO_URI vs Docker Variables:**
   - Your existing `MONGO_URI` is for local development
   - Docker Compose builds `MONGO_URI` automatically from:
     - `MONGO_ROOT_USERNAME`
     - `MONGO_ROOT_PASSWORD`
     - `MONGO_DATABASE`
   - Format: `mongodb://${MONGO_ROOT_USERNAME}:${MONGO_ROOT_PASSWORD}@mongodb:27017/${MONGO_DATABASE}?authSource=admin`

2. **For Production:**
   - Update `CORS_ORIGIN` to your domain: `https://yourdomain.com`
   - Update `API_URL` to your domain: `https://yourdomain.com/api`
   - Use strong passwords for `MONGO_ROOT_PASSWORD`
   - Use strong `JWT_SECRET` (32+ characters)

3. **Port Configuration:**
   - `PORT=5000` is used by backend container
   - Frontend runs on port 3000 (configured in docker-compose.yml)
   - MongoDB is internal only (not exposed)

## ✅ Quick Check

Run this to verify your .env has all required variables:

```bash
# Check required variables
docker compose config 2>&1 | grep -i "variable\|undefined" || echo "✅ All variables set"
```

## 🔄 Migration from Existing .env

If you want to keep your existing setup working:

1. **Add Docker-specific variables** to your `.env`
2. **Keep your existing variables** for local development
3. **Docker will use** the new variables automatically

Example - Add these to your existing .env:

```env
# Add these to your existing .env file
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your-secure-password
MONGO_DATABASE=mrd_audit
CORS_ORIGIN=http://localhost:3000
API_URL=http://localhost:5000/api
NODE_ENV=production
```
