# Synthea Studio Makefile

.PHONY: help build up down restart logs clean test

help: ## Show this help message
	@echo "Synthea Studio - Service-Based Architecture"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

build: ## Build all services
	docker-compose -f docker-compose.services.yml build

up: ## Start all services
	docker-compose -f docker-compose.services.yml up -d

down: ## Stop all services
	docker-compose -f docker-compose.services.yml down

restart: ## Restart all services
	docker-compose -f docker-compose.services.yml restart

logs: ## View logs for all services
	docker-compose -f docker-compose.services.yml logs -f

logs-gateway: ## View gateway logs
	docker-compose -f docker-compose.services.yml logs -f gateway

logs-fhir: ## View FHIR service logs
	docker-compose -f docker-compose.services.yml logs -f fhir

logs-worker: ## View worker logs
	docker-compose -f docker-compose.services.yml logs -f worker

clean: ## Clean up volumes and containers
	docker-compose -f docker-compose.services.yml down -v

test: ## Run tests for all services
	@echo "Testing shared package..."
	cd packages/shared && python -m pytest tests/ -v
	@echo "Testing FHIR service..."
	cd services/fhir && python -m pytest tests/ -v
	@echo "Testing Worker service..."
	cd services/worker && python -m pytest tests/ -v
	@echo "Testing Gateway..."
	cd services/gateway && python -m pytest tests/ -v

test-integration: ## Run integration tests
	@echo "Running integration tests..."
	docker-compose -f docker-compose.services.yml up -d
	sleep 10  # Wait for services to start
	python -m pytest tests/integration/ -v
	docker-compose -f docker-compose.services.yml down

migrate: ## Run database migrations
	docker-compose -f docker-compose.services.yml exec fhir alembic upgrade head

scale-worker: ## Scale worker instances
	docker-compose -f docker-compose.services.yml up -d --scale worker=4

monitoring: ## Open monitoring dashboards
	@echo "Opening monitoring dashboards..."
	@echo "Flower (Celery): http://localhost:5555"
	@echo "API Docs: http://localhost:8000/docs"
	@open http://localhost:5555
	@open http://localhost:8000/docs

dev: ## Start services in development mode
	docker-compose -f docker-compose.services.yml up

prod: ## Start services in production mode
	docker-compose -f docker-compose.services.yml up -d --build

status: ## Check service status
	@echo "Checking service health..."
	@curl -s http://localhost:8000/health/ready | python -m json.tool

init: ## Initialize project (install dependencies, setup database)
	@echo "Initializing Synthea Studio..."
	@echo "1. Building Docker images..."
	docker-compose -f docker-compose.services.yml build
	@echo "2. Starting database..."
	docker-compose -f docker-compose.services.yml up -d postgres redis
	sleep 5
	@echo "3. Running migrations..."
	docker-compose -f docker-compose.services.yml run --rm fhir python scripts/init_db.py
	@echo "4. Starting all services..."
	docker-compose -f docker-compose.services.yml up -d
	@echo "✅ Synthea Studio is ready!"
	@echo "Gateway: http://localhost:8000"
	@echo "API Docs: http://localhost:8000/docs"
	@echo "Flower: http://localhost:5555"