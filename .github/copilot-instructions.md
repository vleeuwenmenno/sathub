# SatHub - AI Coding Assistant Instructions

## Project Architecture

SatHub is a full-stack satellite ground station management platform with a **Go Gin backend** (`backend/`), **React/TypeScript frontend** (`frontend/`), and **standalone Go client** (`client/`). The architecture features:

- **Backend**: RESTful JSON API with JWT auth, GORM ORM, **PostgreSQL database** (SQLite supported for dev)
- **Frontend**: React 19 + Vite + Material-UI Joy with TypeScript
- **Client**: Standalone Go binary for automated satellite data uploads
- **Worker**: Background job processor for health monitoring and achievements
- **Storage**: MinIO object storage for images (S3-compatible)
- **Data Model**: Users → Stations → Posts (with satellite data/images)
- **Authentication**: JWT access tokens + refresh tokens, station-specific API tokens

## Key Patterns & Conventions

### Database & Models

- **GORM Auto-migration**: Models in `backend/models/` define both Go structs and DB schema
- **Station Tokens**: Each station gets a unique API token for external data uploads (`Station.GenerateToken()`)
- **Image Storage**: Images stored in MinIO object storage, URLs in PostgreSQL (`PostImage.ImageURL`)
- **CBOR Storage**: Binary satellite data stored in separate `PostCBOR` table
- **ID Strategy**: Users have `uint` IDs, Stations use UUID strings, Posts use UUID

### Authentication Patterns

- **Dual Auth**: User JWT tokens (`middleware.AuthRequired()`) vs Station tokens (`middleware.StationTokenAuth()`)
- **Optional Auth**: Some endpoints use `middleware.OptionalAuth()` for public/private content
- **Frontend Auto-refresh**: `api.ts` interceptors handle token refresh on 401s

### API Design

- **Route Grouping**: Clear separation between public, user-protected, and station-protected endpoints
- **Caddy Proxy**: All services routed through Caddy on port 9999 with HTTPS in development
- **Response Format**: Consistent JSON structure via `utils/response.go` helpers

## Development Workflows

### Docker-First Development (Required)

**Always use Docker** - the stack requires PostgreSQL, MinIO, Mailpit, and Caddy reverse proxy:

```bash
make up           # Start all services with hot reload
make down         # Stop all services
make logs-f       # Follow logs from all services
make logs-backend-f  # Follow backend logs only
make seed         # Reset and seed database
```

### Setup Requirements

1. **Add hostnames to `/etc/hosts`:**

   ```
   127.0.0.1 sathub.local
   127.0.0.1 api.sathub.local
   127.0.0.1 obj.sathub.local
   ```

2. **Access the application:**

   - Frontend: https://sathub.local:9999
   - API: https://api.sathub.local:9999
   - MinIO Console: http://localhost:9001 (minioadmin/minioadmin)
   - Mailpit: http://localhost:8025

3. **Accept self-signed certificate** by visiting the API URL once

### Database Operations

```bash
# Reset and seed database (removes existing data)
make seed

# Connect to PostgreSQL database
make db-console

# Direct queries (shorthand)
docker compose exec postgres psql -U sathub -d sathub -c "SELECT * FROM posts LIMIT 5"

# List all tables
docker compose exec postgres psql -U sathub -d sathub -c "\dt"
```

**Important**: Database defaults to SQLite if `DB_TYPE` env var not set, but Docker uses PostgreSQL

### File Structure Conventions

- **Backend**:
  - `handlers/` - API route handlers
  - `middleware/` - Auth and request processing
  - `models/` - Database models
  - `worker/` - Background jobs (health monitoring, achievements)
  - `cmd/seed/` - Database seeding
  - `config/` - Configuration (database, storage, email)
  - `utils/` - Helper functions (response, storage, email)
- **Frontend**:

  - `components/` - All React components (no separate pages directory)
  - `contexts/` - React contexts (auth, theme)
  - `api.ts` - Centralized API client
  - `types.ts` - TypeScript type definitions
  - `translations/` - i18n translation files

- **Client**:
  - `main.go` - CLI and watcher orchestration
  - `watcher.go` - Directory monitoring and processing
  - `api.go` - API client for uploads
  - `config.go` - Configuration management

## Critical Implementation Details

### Station Token Authentication

Station tokens enable external devices (like the SatHub client) to upload data without user accounts:

```go
// Station creation automatically generates secure token
station.GenerateToken()
// Upload endpoint uses station middleware
stationPosts.Use(middleware.StationTokenAuth())
```

### Image & Storage Handling

Images stored in MinIO, served via backend API:

- **Upload**: Images uploaded to backend, stored in MinIO bucket `sathub-images/`
- **Organization**: Folder structure `images/post-{uuid}/filename.ext`
- **URLs**: Backend generates presigned URLs or proxies from MinIO
- **Access**: `/api/posts/:id/images/:imageId` for post images
- **Station Pictures**: `/api/stations/:id/picture`

### Frontend State Management

- **AuthContext**: Global user auth state with automatic token refresh
- **API Client**: Centralized axios instance in `api.ts` with interceptors
- **Material-UI Joy**: Consistent design system, avoid mixing with core MUI
- **No routing**: All components loaded directly in `App.tsx`, no react-router pages

### Backend Worker Service

Separate worker process handles background jobs:

- **Station Health Monitor**: Checks station online/offline status, sends notifications
- **Achievement Checker**: Awards achievements based on user activity
- **Runs independently**: Same codebase, different command (`worker` vs `api`)

### Database Seeding Strategy

`make seed` (or `docker compose exec backend go run ./cmd/seed`) creates test data:

- 2 users with known credentials (`password123`)
- 1 station owned by test_user
- 85%~ of health checks marked online for that station

### SatHub Client

Standalone binary that monitors directories for satellite data from satdump:

- **Installation**: Built-in `install` and `install-service` commands
- **Auto-upload**: Watches directories, processes complete satellite passes
- **Format**: Expects `dataset.json` + product directories with CBOR and PNG files
- **Health Pings**: Sends periodic health checks to keep station online
- **Platforms**: Linux (x86_64, ARM64), Windows, macOS (Intel, Apple Silicon)

## External Dependencies

- **Docker & Docker Compose**: Required for all development
- **PostgreSQL**: Primary database (defaults to SQLite without `DB_TYPE`)
- **MinIO**: S3-compatible object storage for images
- **Mailpit**: Email testing service (port 8025 web UI, 1025 SMTP)
- **Caddy**: Reverse proxy with automatic HTTPS for local development
- **CBOR**: Binary satellite data format (github.com/fxamacker/cbor/v2)

## Common Gotchas

- **Docker Required**: No local development without Docker (needs PostgreSQL, MinIO, Mailpit, Caddy)
- **Hosts File**: Must add `*.sathub.local` entries to `/etc/hosts` for Caddy routing
- **Certificate**: Accept self-signed cert for `api.sathub.local` in browser first
- **Seeding**: Run `make seed` to populate test data (requires backend container running)
- **Station Tokens**: Sensitive - but can be regenerated in UI if compromised
- **GORM Migrations**: Run automatically on startup via `migrate` container
- **Hot Reload**: Backend uses Air, frontend uses Vite - both restart on file changes
- **Worker Service**: Runs separately from API, handles background jobs
- **MinIO Access**: Use MinIO console at localhost:9001 to browse uploaded images
