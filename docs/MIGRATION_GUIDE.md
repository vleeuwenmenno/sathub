# Migration Guide: Cobra CLI & Zerolog Refactor

## Overview

This guide documents the major refactoring of the SatHub backend to use:
- **Cobra** for CLI command management
- **Zerolog** for structured logging
- **Microservices architecture** with separate API and worker containers

## Changes Made

### 1. Logging System (Zerolog)

**Before:**
```go
import "log"
log.Println("Starting server...")
log.Printf("Port: %s", port)
log.Fatalf("Error: %v", err)
```

**After:**
```go
import "github.com/rs/zerolog"
utils.Logger.Info().Msg("Starting server")
utils.Logger.Info().Str("port", port).Msg("Starting server")
utils.Logger.Fatal().Err(err).Msg("Error occurred")
```

**Benefits:**
- Structured JSON logging in production
- Pretty console output in development
- Automatic timestamp and caller information
- Better log filtering and parsing

### 2. CLI Commands (Cobra)

The application now uses Cobra for command management with three commands:

#### `api` - Start the API Server
```bash
./sathub-ui-backend api
```
Starts the HTTP API server for handling client requests.

#### `health-monitor-worker` - Start the Health Monitor
```bash
./sathub-ui-backend health-monitor-worker
```
Starts the background worker that monitors station health and sends notifications.

#### `auto-migrate` - Run Database Migrations
```bash
./sathub-ui-backend auto-migrate
```
Runs database migrations and seeds essential data (achievements). Use this once before starting services.

### 3. Microservices Architecture

The backend is now split into separate services:

```
┌──────────────┐
│  Migration   │ (runs once, exits)
└──────┬───────┘
       │
       ├──────────────┐
       │              │
┌──────▼──────┐  ┌───▼────────────────┐
│  API Server │  │ Health Monitor     │
│  (backend)  │  │ Worker             │
│             │  │                    │
│ - REST API  │  │ - Station health   │
│ - Auth      │  │ - Notifications    │
│ - CRUD      │  │ - Background jobs  │
└─────────────┘  └────────────────────┘
```

### 4. Docker Compose Updates

#### Development (`docker-compose.yml`)
```yaml
services:
  migration:
    command: ["air", "-c", ".air.toml", "--", "auto-migrate"]
    restart: "no"  # Runs once and exits

  backend:
    command: ["air", "-c", ".air.toml", "--", "api"]
    depends_on:
      migration:
        condition: service_completed_successfully

  health-monitor-worker:
    command: ["air", "-c", ".air.toml", "--", "health-monitor-worker"]
    depends_on:
      migration:
        condition: service_completed_successfully
```

#### Production (`docker-compose.prod.yml`)
```yaml
services:
  migration:
    command: ["./sathub-ui-backend", "auto-migrate"]
    restart: "no"

  backend:
    command: ["./sathub-ui-backend", "api"]
    depends_on:
      migration:
        condition: service_completed_successfully

  health-monitor-worker:
    command: ["./sathub-ui-backend", "health-monitor-worker"]
    depends_on:
      migration:
        condition: service_completed_successfully
```

### 5. Files Modified

- `backend/main.go` - Refactored with Cobra commands
- `backend/cmd/seed/seed.go` - Updated to use Cobra and zerolog
- `backend/worker/station_health_monitor.go` - Updated to use zerolog
- `backend/utils/logger.go` - New shared logger utility
- `backend/.air.toml` - Updated to support command arguments
- `docker-compose.yml` - Added migration and health-monitor-worker services
- `docker-compose.prod.yml` - Added migration and health-monitor-worker services

## Migration Steps

### For Development

1. **Pull latest changes:**
   ```bash
   git pull
   ```

2. **Stop existing containers:**
   ```bash
   make down
   # or
   docker compose down
   ```

3. **Rebuild and start:**
   ```bash
   make up
   # or
   docker compose up -d --build
   ```

4. **Verify services are running:**
   ```bash
   docker compose ps
   ```

   You should see:
   - `backend` (API server on port 4001)
   - `health-monitor-worker` (no exposed ports)
   - `migration` (exited successfully)

5. **Check logs:**
   ```bash
   # API server logs
   docker compose logs backend --tail 50

   # Health monitor logs
   docker compose logs health-monitor-worker --tail 50
   ```

### For Production

1. **Update your production environment variables** (if needed)

2. **Pull latest images:**
   ```bash
   docker compose -f docker-compose.prod.yml pull
   ```

3. **Stop existing containers:**
   ```bash
   docker compose -f docker-compose.prod.yml down
   ```

4. **Start with migrations:**
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

   The migration container will run first, then backend and health-monitor-worker will start.

## Rollback Plan

If you need to rollback:

1. **Checkout previous commit:**
   ```bash
   git checkout <previous-commit-hash>
   ```

2. **Rebuild containers:**
   ```bash
   docker compose down
   docker compose up -d --build
   ```

## Troubleshooting

### Migration container keeps restarting
- Check logs: `docker compose logs migration`
- Ensure database is accessible
- Verify DB credentials in environment variables

### Health monitor not sending notifications
- Check logs: `docker compose logs health-monitor-worker`
- Verify SMTP settings are configured
- Ensure stations have notification settings configured

### API not starting
- Check logs: `docker compose logs backend`
- Verify migration completed successfully
- Check port 4001 is not already in use

### Both services trying to migrate simultaneously
This shouldn't happen anymore with the new architecture, but if you see migration conflicts:
- Stop all services: `docker compose down`
- Manually run migration: `docker compose run --rm migration`
- Start services: `docker compose up -d backend health-monitor-worker`

## Benefits

1. **Separation of Concerns**: API and background jobs run independently
2. **Better Scaling**: Can scale API and worker separately
3. **Cleaner Logs**: Structured logging with context
4. **Safer Migrations**: Migrations run once before services start
5. **Easy Debugging**: Clear command structure and service separation
6. **Production Ready**: JSON logs for log aggregation tools

## CLI Examples

```bash
# Development (with Air hot reload)
air -c .air.toml -- api
air -c .air.toml -- health-monitor-worker
air -c .air.toml -- auto-migrate

# Production (direct binary)
./sathub-ui-backend api
./sathub-ui-backend health-monitor-worker
./sathub-ui-backend auto-migrate

# Get help
./sathub-ui-backend --help
./sathub-ui-backend api --help
```

## Log Output Examples

### Development (Pretty Console)
```
2025-09-30T17:47:21Z INF Starting API server port=4001
2025-09-30T17:47:21Z INF Starting station health monitor
2025-09-30T17:47:21Z DBG Checking station health
2025-09-30T17:47:21Z DBG Found stations with notification settings count=0
```

### Production (JSON)
```json
{"level":"info","time":1696095641,"caller":"main.go:347","message":"Starting API server","port":"4001"}
{"level":"info","time":1696095641,"caller":"worker/station_health_monitor.go:26","message":"Starting station health monitor"}
{"level":"debug","time":1696095641,"caller":"worker/station_health_monitor.go:42","message":"Checking station health"}
```
