# SatHub Control Script (`satctl.sh`)

A comprehensive shell script for managing the SatHub development environment, replacing the Makefile with more flexible command-line options.

## Quick Start

```bash
# Make executable (first time only)
chmod +x satctl.sh

# Start the stack
./satctl.sh up

# Check service status
./satctl.sh status

# View logs
./satctl.sh logs backend -f

# Clean restart with test data
./satctl.sh restart --scenario test-85
```

## Commands

### `up [service...] [--no-build]`

Start the stack (or specific services).

```bash
# Start all services with build
./satctl.sh up

# Start without rebuilding images
./satctl.sh up --no-build

# Start specific services only
./satctl.sh up backend postgres
```

### `down`

Stop all services.

```bash
./satctl.sh down
```

### `status [--all] [--check-ports]`

Show service status with ports.

```bash
# Show running services
./satctl.sh status

# Include stopped containers
./satctl.sh status --all

# Check if ports are actually listening (slower)
./satctl.sh status --check-ports
```

**Example Output:**
```
SERVICE      STATUS            PORT  LISTENING
------------------------------------------------
backend      ✓ Up            4001  ✓
caddy        ✓ Up            9999  ✓
frontend     ✓ Up            5173  ✓
mailpit      ✓ Up (healthy)  1025  ✓
postgres     ✓ Up            5432  ✓
```

### `logs [service] [options]`

Stream or search logs with powerful filtering.

**Options:**
- `-f, --follow` - Follow log output
- `--tail <n>` - Display the last N lines
- `--since <duration>` - Show logs since duration (e.g., `5m`, `2h`)
- `-g, --grep <pattern>` - Filter logs with extended regex
- `-C, --context <n>` - Include N lines before/after matches
- `-B, --before <n>` - Include N lines before matches
- `-A, --after <n>` - Include N lines after matches

**Examples:**

```bash
# Follow all logs
./satctl.sh logs -f

# View backend logs, last 200 lines
./satctl.sh logs backend --tail 200

# Search for errors in frontend with context
./satctl.sh logs frontend -g "ERROR|WARN" -C 3

# Follow backend logs and filter for specific pattern
./satctl.sh logs backend -f -g "station.*uptime"

# View logs from last 10 minutes
./satctl.sh logs --since 10m

# Search multiple patterns with extended regex
./satctl.sh logs -g "(connection|timeout|failed)" -B 2 -A 2
```

### `clean`

Stop services and remove persistent volumes.

```bash
./satctl.sh clean
```

**Warning:** This removes the PostgreSQL database volume!

### `seed [scenario]`

Seed the database with test data.

**Scenarios:**
- `base` (default) - Basic seed data
- `test-85` - 85% uptime test scenario
- `test-90` - 90% uptime test scenario (adds to existing)

```bash
# Basic seeding
./satctl.sh seed

# Specific scenario
./satctl.sh seed test-85
```

### `restart [options]`

Clean, start, and seed in one command - replaces your `make clean && make up && sleep 15 && make seed-test-85` workflow!

**Options:**
- `--scenario <name>` - Seed scenario (default: `base`)
- `--timeout <seconds>` - Backend readiness timeout (default: 120)
- `--no-clean` - Skip volume cleanup

```bash
# Full clean restart with test-85 data
./satctl.sh restart --scenario test-85

# Restart without cleaning volumes
./satctl.sh restart --no-clean

# Custom timeout
./satctl.sh restart --scenario test-85 --timeout 180
```

**This command:**
1. Stops and cleans volumes (unless `--no-clean`)
2. Builds and starts all services
3. Waits for backend to be ready
4. Seeds the database with your chosen scenario

### `release`

Run the release script.

```bash
./satctl.sh release
```

### `help`

Show usage information.

```bash
./satctl.sh help
```

## Advanced Usage

### Grep with Context

Search logs with surrounding context lines:

```bash
# Show 5 lines before and after each match
./satctl.sh logs backend -g "authentication" -C 5

# Show 2 lines before and 3 lines after
./satctl.sh logs -g "database.*error" -B 2 -A 3
```

### Multiple Services

Start/stop specific services:

```bash
# Start only backend and postgres
./satctl.sh up backend postgres

# View logs from multiple services
./satctl.sh logs backend
./satctl.sh logs frontend
```

### Port Verification

Check if services are actually responding:

```bash
./satctl.sh status --check-ports
```

This performs actual TCP connection tests to verify ports are listening.

## Environment Variables

You can customize behavior with environment variables:

```bash
# Use custom docker compose command
COMPOSE_BIN="docker-compose" ./satctl.sh up

# Custom postgres volume name
POSTGRES_VOLUME="my_custom_volume" ./satctl.sh clean

# Longer backend wait timeout (default: 120s)
DEFAULT_RESTART_TIMEOUT=180 ./satctl.sh restart
```

## Comparison with Makefile

| Old (Makefile) | New (satctl.sh) |
|----------------|-----------------|
| `make up` | `./satctl.sh up` |
| `make down` | `./satctl.sh down` |
| `make logs` | `./satctl.sh logs -f` |
| `make clean && make up && sleep 15 && make seed-test-85` | `./satctl.sh restart --scenario test-85` |
| No equivalent | `./satctl.sh status --check-ports` |
| No equivalent | `./satctl.sh logs backend -g "ERROR" -C 3` |
| `make seed-test-85` | `./satctl.sh seed test-85` |

## Tips

1. **Faster restarts**: Use `--no-clean` when you don't need to wipe the database
2. **Debug specific services**: `./satctl.sh logs backend --tail 100 -g "ERROR"`
3. **Monitor health**: `watch -n 2 './satctl.sh status'`
4. **Quick status check**: Add an alias: `alias ss='./satctl.sh status'`
5. **Search across time**: `./satctl.sh logs --since 1h -g "pattern"`

## Troubleshooting

### "docker compose: command not found"

The script tries both `docker compose` (v2) and `docker-compose` (v1). Install Docker Compose v2 or set:

```bash
COMPOSE_BIN="docker-compose" ./satctl.sh status
```

### Backend not ready during restart

Increase the timeout:

```bash
./satctl.sh restart --timeout 300
```

### Grep not showing context in follow mode

Context flags (`-C`, `-B`, `-A`) don't work with `-f/--follow`. Use them separately:

```bash
# First search with context
./satctl.sh logs backend -g "pattern" -C 5

# Then follow if needed
./satctl.sh logs backend -f
```
