#!/bin/bash
# Setup script for Synthea Studio development

set -e

echo "🚀 Setting up Synthea Studio..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose found"

# Build containers
echo "📦 Building Docker containers..."
docker-compose build

# Start database and Redis first
echo "🗄️ Starting database and Redis..."
docker-compose up -d postgres redis

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Run migrations
echo "🔄 Running database migrations..."
docker-compose run --rm backend alembic upgrade head

# Start all services
echo "🎯 Starting all services..."
docker-compose up -d

# Check services
echo "✨ Checking service status..."
sleep 5
docker-compose ps

echo "
✅ Synthea Studio is ready!

🌐 Services:
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:8001
   - API Docs: http://localhost:8001/docs
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379

📝 Useful commands:
   - View logs: docker-compose logs -f [service]
   - Stop: docker-compose down
   - Reset: docker-compose down -v
   - Shell: docker-compose exec backend bash

🚀 To generate your first population:
   1. Visit http://localhost:3001
   2. Click 'New Population'
   3. Choose a template or customize
   4. Click 'Generate'
"