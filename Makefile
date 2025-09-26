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

# Seed the database (removes old DB and seeds with test data, if backend is running it will automatically restart due to the file change)
seed:
	rm -f backend/satdump.db
	docker compose exec backend go run main.go --seed

# Clean up generated files and containers
clean: down
	rm -f backend/satdump.db
