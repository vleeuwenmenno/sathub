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
	docker compose exec backend go run main.go --seed

# Clean up generated files and containers
clean: down
	docker volume rm sathub_postgres_data || true
