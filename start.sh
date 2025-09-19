#!/bin/bash

echo "🚀 Starting Synthea Studio"
echo "========================="
echo ""

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Clean up any existing containers
echo "🧹 Cleaning up existing containers..."
docker-compose -f docker-compose.simple.yml down 2>/dev/null

# Start services
echo "🔨 Building and starting services..."
docker-compose -f docker-compose.simple.yml up -d --build

# Wait for services
echo "⏳ Waiting for services to start..."
sleep 10

# Check status
echo ""
echo "✅ Services Status:"
docker-compose -f docker-compose.simple.yml ps

echo ""
echo "🎉 Synthea Studio is ready!"
echo ""
echo "📱 Access the application at: http://localhost:3001"
echo "🔌 API Backend at: http://localhost:8001"
echo ""
echo "📝 Available features:"
echo "  • Create and manage synthetic populations"
echo "  • Configure Synthea parameters"
echo "  • Generate FHIR resources"
echo "  • Export data in multiple formats"
echo "  • Real-time progress tracking"
echo ""
echo "🛑 To stop: docker-compose -f docker-compose.simple.yml down"
echo "📋 View logs: docker-compose -f docker-compose.simple.yml logs -f"