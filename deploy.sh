#!/bin/bash

# Production Docker Deployment Script for MRD Audit Checklist
set -e

echo "🚀 Starting MRD Audit Checklist Docker Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo -e "${YELLOW}📝 Creating .env from .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env file with your production values${NC}"
    exit 1
fi

# Load environment variables
set -a
source .env
set +a

# Generate JWT secret if not set
if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your-super-secret-jwt-key-generate-a-random-string-here-min-32-chars" ]; then
    echo -e "${YELLOW}⚠️  JWT_SECRET not set. Generating a random secret...${NC}"
    JWT_SECRET=$(openssl rand -hex 32)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    else
        # Linux
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    fi
    echo -e "${GREEN}✅ Generated JWT_SECRET${NC}"
fi

# Create necessary directories
echo -e "${YELLOW}📁 Creating directories...${NC}"
mkdir -p nginx/ssl
mkdir -p backend/logs
mkdir -p data/mongodb

# Generate self-signed SSL certificate for development (if not exists)
if [ ! -f nginx/ssl/cert.pem ]; then
    echo -e "${YELLOW}🔐 Generating self-signed SSL certificate for development...${NC}"
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=IN/ST=State/L=City/O=Hospital/CN=localhost" 2>/dev/null || \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=IN/ST=State/L=City/O=Hospital/CN=localhost"
    echo -e "${GREEN}✅ SSL certificate generated${NC}"
    echo -e "${YELLOW}⚠️  For production, replace with Let's Encrypt certificates${NC}"
fi

# Set proper permissions
echo -e "${YELLOW}🔒 Setting permissions...${NC}"
chmod 600 nginx/ssl/*.pem 2>/dev/null || true
chmod 755 data/mongodb 2>/dev/null || true

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version > /dev/null 2>&1 && ! docker-compose version > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose.${NC}"
    exit 1
fi

# Determine docker-compose command
if docker compose version > /dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
$DOCKER_COMPOSE down

# Build and start containers
echo -e "${YELLOW}🐳 Building Docker images...${NC}"
$DOCKER_COMPOSE build --no-cache

echo -e "${YELLOW}🚀 Starting containers...${NC}"
$DOCKER_COMPOSE up -d

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 15

# Check service status
echo -e "${GREEN}📊 Service Status:${NC}"
$DOCKER_COMPOSE ps

# Wait for MongoDB to be ready
echo -e "${YELLOW}⏳ Waiting for MongoDB to be ready...${NC}"
for i in {1..30}; do
    if $DOCKER_COMPOSE exec -T mongodb mongosh --quiet --eval "db.runCommand('ping').ok" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ MongoDB is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ MongoDB failed to start${NC}"
        exit 1
    fi
    sleep 2
done

# Show logs
echo -e "${GREEN}📋 Recent logs:${NC}"
$DOCKER_COMPOSE logs --tail=20

echo ""
echo -e "${GREEN}✅ Deployment completed!${NC}"
echo ""
echo -e "${GREEN}🌐 Access your application:${NC}"
echo -e "   - Frontend: ${GREEN}http://localhost:3000${NC}"
echo -e "   - Backend API: ${GREEN}http://localhost:5000${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo -e "   1. Seed initial data: ${GREEN}$DOCKER_COMPOSE exec backend npm run seed${NC}"
echo -e "   2. View logs: ${GREEN}$DOCKER_COMPOSE logs -f${NC}"
echo -e "   3. Stop services: ${GREEN}$DOCKER_COMPOSE down${NC}"
echo -e "   4. For production with Nginx: ${GREEN}$DOCKER_COMPOSE --profile production up -d${NC}"
echo ""
