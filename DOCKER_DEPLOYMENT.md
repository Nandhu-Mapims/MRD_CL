# Docker Deployment Guide - MRD Audit Checklist

## 🚀 Quick Start

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+ (or docker-compose 1.29+)
- 2GB+ RAM
- 10GB+ disk space

### 1. Setup Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your values
nano .env
```

**Required Environment Variables:**
- `MONGO_ROOT_PASSWORD`: Strong password for MongoDB
- `JWT_SECRET`: Random string (auto-generated if not set)
- `API_URL`: Your API URL (e.g., `http://localhost:5000/api`)
- `CORS_ORIGIN`: Frontend URL (e.g., `http://localhost:3000`)

### 2. Deploy

```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

**Or manually:**
```bash
docker compose up -d --build
```

### 3. Initialize Database

```bash
# Seed initial data
docker compose exec backend npm run seed

# Seed comprehensive test data (optional)
docker compose exec backend npm run seed:comprehensive
```

## 📋 Port Configuration

- **Frontend (React)**: `3000` → http://localhost:3000
- **Backend (Node API)**: `5000` → http://localhost:5000
- **MongoDB**: Internal only (not exposed to host)
- **Nginx** (production): `80`, `443` (only with `--profile production`)

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         Nginx (Port 80/443)             │
│      (Production - Optional)             │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼────┐         ┌──────▼────┐
│Frontend│         │  Backend  │
│ :3000  │         │  :5000    │
└────────┘         └─────┬─────┘
                          │
                   ┌──────▼──────┐
                   │  MongoDB    │
                   │ (Internal)  │
                   └─────────────┘
```

## 🔧 Management Commands

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mongodb
```

### Restart Services
```bash
# All services
docker compose restart

# Specific service
docker compose restart backend
```

### Stop Services
```bash
# Stop containers (keeps data)
docker compose down

# Stop and remove volumes (⚠️ deletes data)
docker compose down -v
```

### Update Application
```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose build --no-cache
docker compose up -d
```

### Access Containers
```bash
# Backend shell
docker compose exec backend sh

# MongoDB shell
docker compose exec mongodb mongosh -u admin -p

# Frontend shell
docker compose exec frontend sh
```

### Run Backend Commands
```bash
# Seed data
docker compose exec backend npm run seed

# Run any npm script
docker compose exec backend npm run <script-name>
```

## 🔒 Production Deployment

### 1. Enable Nginx Reverse Proxy

```bash
# Start with production profile
docker compose --profile production up -d
```

### 2. SSL Certificate Setup

#### Option A: Let's Encrypt (Recommended)

```bash
# Install certbot on host
apt install certbot

# Get certificate
certbot certonly --standalone -d yourdomain.com

# Copy certificates
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem

# Set permissions
chmod 600 nginx/ssl/*.pem

# Restart nginx
docker compose restart nginx
```

#### Option B: Use certbot in Docker

Add certbot service to docker-compose.yml and automate renewal.

### 3. Update Environment Variables

```bash
# Edit .env for production
nano .env
```

Update:
- `API_URL=https://yourdomain.com/api`
- `CORS_ORIGIN=https://yourdomain.com`
- `MONGO_ROOT_PASSWORD`: Strong password
- `JWT_SECRET`: Strong random string

### 4. Security Checklist

- [ ] Strong `MONGO_ROOT_PASSWORD` set
- [ ] Strong `JWT_SECRET` set (32+ chars)
- [ ] SSL certificates configured
- [ ] `CORS_ORIGIN` set to your domain
- [ ] `API_URL` set to your domain
- [ ] Firewall configured (ports 80, 443)
- [ ] Regular backups scheduled
- [ ] Monitoring configured

## 💾 Backup & Restore

### Backup MongoDB

```bash
# Create backup
docker compose exec mongodb mongodump \
  --archive=/data/backup-$(date +%Y%m%d).archive \
  --username=admin --password=$MONGO_ROOT_PASSWORD --authenticationDatabase=admin

# Copy backup from container
docker cp mrd-mongodb:/data/backup-$(date +%Y%m%d).archive ./backup-$(date +%Y%m%d).archive
```

### Restore MongoDB

```bash
# Copy backup to container
docker cp backup-20260115.archive mrd-mongodb:/data/

# Restore
docker compose exec mongodb mongorestore \
  --archive=/data/backup-20260115.archive \
  --username=admin --password=$MONGO_ROOT_PASSWORD --authenticationDatabase=admin
```

### Backup Volumes

```bash
# Backup MongoDB volume
docker run --rm \
  -v mrd-audit_mongodb_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/mongodb-backup-$(date +%Y%m%d).tar.gz /data
```

## 🔍 Troubleshooting

### Check Container Status
```bash
docker compose ps
```

### View Container Logs
```bash
docker compose logs backend
docker compose logs frontend
docker compose logs mongodb
```

### Restart Specific Service
```bash
docker compose restart backend
```

### Rebuild After Code Changes
```bash
docker compose build --no-cache backend
docker compose up -d
```

### Check Network Connectivity
```bash
# From backend to MongoDB
docker compose exec backend ping mongodb

# From frontend to backend
docker compose exec frontend wget -O- http://backend:5000/
```

### MongoDB Connection Issues
```bash
# Check MongoDB logs
docker compose logs mongodb

# Test MongoDB connection
docker compose exec mongodb mongosh -u admin -p
```

### Port Conflicts

If port 5000 or 3000 is already in use:

```bash
# Edit docker-compose.yml and change ports
ports:
  - "5001:5000"  # Use 5001 instead of 5000
  - "3001:3000"  # Use 3001 instead of 3000
```

## 📊 Monitoring

### Health Checks

All services have health checks configured:
- Backend: http://localhost:5000/
- Frontend: http://localhost:3000/health
- MongoDB: Internal ping

### Resource Usage

```bash
# View resource usage
docker stats

# View specific container
docker stats mrd-backend
```

## 🎯 Default Credentials

After seeding:
- **Admin**: `admin@hospital.com` / `Admin@123`
- **Department users**: `{deptcode}@hospital.com` / `{DEPTCODE}@123`

**⚠️ Change these in production!**

## 📝 Notes

- MongoDB data persists in `./data/mongodb` directory
- Backend logs are in `./backend/logs`
- Frontend is built during Docker build (no dev server)
- All services use health checks for automatic restarts
- MongoDB is only accessible internally (not exposed to host)
- Nginx reverse proxy is optional (use `--profile production`)

## 🆘 Support

For issues:
1. Check logs: `docker compose logs -f`
2. Verify environment: `docker compose config`
3. Check health: `docker compose ps`
4. Review this guide
