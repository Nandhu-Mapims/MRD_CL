# Docker Deployment - Quick Reference

## 🚀 Quick Start

1. **Copy environment file:**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

2. **Deploy:**
   ```bash
   # Linux/Mac
   ./deploy.sh
   
   # Windows (PowerShell)
   docker compose up -d --build
   ```

3. **Seed database:**
   ```bash
   docker compose exec backend npm run seed
   ```

## 📍 Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **MongoDB**: Internal only (not exposed)

## 🔧 Common Commands

```bash
# View logs
docker compose logs -f

# Restart services
docker compose restart

# Stop services
docker compose down

# Update application
git pull
docker compose build --no-cache
docker compose up -d
```

## 📚 Full Documentation

See `DOCKER_DEPLOYMENT.md` for complete documentation.
