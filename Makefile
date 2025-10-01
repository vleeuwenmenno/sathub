.PHONY: help up down restart logs clean seed build ps exec-backend exec-frontend exec-postgres shell-backend shell-frontend shell-postgres db-console dev prod stop-all

# Default target
help:
	@echo "SatHub Docker Compose Commands"
	@echo "=============================="
	@echo ""
	@echo "Development:"
	@echo "  make up          - Start all services in development mode (with hot reload)"
	@echo "  make down        - Stop and remove all containers"
	@echo "  make restart     - Restart all services"
	@echo "  make logs        - View logs from all services"
	@echo "  make logs-f      - Follow logs from all services"
	@echo "  make logs-backend-f - Follow backend logs only"
	@echo "  make logs-frontend-f - Follow frontend logs only"
	@echo "  make logs-worker-f - Follow worker logs only"
	@echo "  make logs-backend - View backend logs only"
	@echo "  make logs-frontend - View frontend logs only"
	@echo "  make logs-worker - View worker logs only"
	@echo "  make ps          - List all running containers"
	@echo ""
	@echo "Database:"
	@echo "  make seed        - Reset and seed the database (requires backend running)"
	@echo "  make db-console  - Connect to PostgreSQL database console"
	@echo ""
	@echo "Maintenance:"
	@echo "  make build       - Build or rebuild services"
	@echo "  make clean       - Stop containers and remove volumes (DESTRUCTIVE)"
	@echo "  make stop-all    - Stop all containers without removing them"
	@echo ""
	@echo "Shell Access:"
	@echo "  make shell-backend   - Open bash shell in backend container"
	@echo "  make shell-frontend  - Open bash shell in frontend container"
	@echo "  make shell-postgres  - Open bash shell in postgres container"
	@echo ""
	@echo "Production:"
	@echo "  make prod        - Start services in production mode"
	@echo "  make prod-down   - Stop production services"
	@echo "  make prod-build  - Build production images"

# Development commands
up:
	@echo "Starting SatHub services in development mode..."
	docker compose up -d --build

down:
	@echo "Stopping SatHub services..."
	docker compose down

restart:
	@echo "Restarting SatHub services..."
	docker compose restart

logs:
	docker compose logs

logs-f:
	docker compose logs -f

logs-backend:
	docker compose logs backend

logs-frontend:
	docker compose logs frontend

logs-worker:
	docker compose logs worker

logs-backend-f:
	docker compose logs -f backend

logs-frontend-f:
	docker compose logs -f frontend

logs-worker-f:
	docker compose logs -f worker

ps:
	docker compose ps

build:
	@echo "Building SatHub services..."
	docker compose build

# Database commands
seed:
	@echo "Seeding database..."
	docker compose exec backend go run ./cmd/seed

db-console:
	@echo "Connecting to PostgreSQL database..."
	docker compose exec postgres psql -U sathub -d sathub

# Shell access
shell-backend:
	docker compose exec backend sh

shell-frontend:
	docker compose exec frontend sh

shell-postgres:
	docker compose exec postgres sh

# Maintenance commands
clean:
	@echo "WARNING: This will remove all containers, volumes, and data!"
	@printf "Are you sure? [y/N] "; \
	read REPLY; \
	case "$$REPLY" in \
		[Yy]*) \
			docker compose down -v --remove-orphans; \
			echo "Cleanup complete!" ;; \
		*) \
			echo "Cleanup cancelled." ;; \
	esac

stop-all:
	@echo "Stopping all containers..."
	docker compose stop
