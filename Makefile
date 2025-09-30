## Makefile for SatHub

.PHONY: up down seed clean logs

# Start the full stack (frontend + backend)
up:
	docker compose up -d --build

# Stop all services
down:
	docker compose down

# View logs for all services
logs:
	docker compose logs -f

# Seed the database (requires backend container running)
seed:
	docker compose exec backend go run . --seed

# Seed with 85% uptime test scenario (requires backend container running)
seed-test-85:
	docker compose exec backend go run cmd/seed/seed.go --test-85

# Seed with 90% uptime test scenario (adds to existing 85% scenario, requires backend container running)
seed-test-90:
	docker compose exec backend go run cmd/seed/seed.go --test-90

# Clean up generated files and containers
clean: down
	docker volume rm development-sathub_postgres_data || true

# Create a new release
release:
	./release.sh

# This will run automigration
migrate:
	docker compose up migrate