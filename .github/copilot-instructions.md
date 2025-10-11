# SatHub - AI Coding Assistant Instructions

## Project Architecture

SatHub is a satellite ground station management platform organized as a monorepo with git submodules:

- **Backend** (`backend/`): Go + Gin REST API with PostgreSQL, GORM, MinIO storage
- **Frontend** (`frontend/`): React 19 + TypeScript + Vite + Material-UI Joy
- **Client** (`client/`): Standalone Go binary for automated satellite data uploads
- **Worker**: Background service (same codebase, different command) for health monitoring and achievements

**Data flow**: Users → Stations → Posts (satellite captures + images). Dual authentication: JWT tokens for users, station-specific API tokens for automated uploads.

## Critical Workflows

### Development Environment (Docker Required)

All development uses Docker Compose. No local setup works without it (requires PostgreSQL, MinIO, Mailpit, Caddy).

```bash
# Essential commands
make up              # Start all services (auto-rebuild, hot reload via Air/Vite)
make seed            # Reset DB and create test user (test_user/password123)
make cycle           # Nuclear option: wipe everything (DB, volumes) + rebuild + seed
make logs-backend-f  # Follow backend logs
make db-console      # PostgreSQL psql shell

# Access points (add *.sathub.local to /etc/hosts first)
# Frontend: https://sathub.local:9999
# API: https://api.sathub.local:9999
# MinIO Console: http://localhost:9001 (minioadmin/minioadmin)
# Mailpit: http://localhost:8025
```

**First-time setup gotcha**: Accept self-signed cert by visiting API URL in browser once.

**Build process**:

```bash
# Client builds (outside Docker)
cd client && go build . -o bin/sathub-client

# Backend/Frontend: NO manual builds needed!
# Docker containers auto-reload on file changes via Air/Vite
docker compose restart backend   # Force restart if needed
docker compose restart frontend  # Force restart if needed
```

**NEVER build from `tmp/`** - that's Air's hot reload working directory, not source code.

### Backend Architecture Patterns

**Command structure** (`backend/main.go`):

```go
// Single binary, multiple modes via cobra commands
rootCmd.AddCommand(apiCmd)    // HTTP API server
rootCmd.AddCommand(workerCmd)  // Background jobs
rootCmd.AddCommand(migrateCmd) // DB auto-migration
```

**Dual authentication** (`backend/middleware/auth.go`):

```go
// User JWT: "Authorization: Bearer <token>"
middleware.AuthRequired()       // Requires valid user JWT
middleware.OptionalAuth()       // JWT optional, context populated if present
middleware.RequireRole("admin") // Role-based access control

// Station token: "Authorization: Station <token>"
middleware.StationTokenAuth()   // For client uploads/health pings
// Station tokens auto-generated on Station.BeforeCreate() via GenerateToken()
```

**Route organization** (`backend/main.go:280-400`):

- Public routes: No auth (e.g., `/api/posts`, `/api/settings/registration`)
- Protected routes: `middleware.AuthRequired()` (user endpoints)
- Station routes: `middleware.StationTokenAuth()` (upload endpoints like `/api/posts`, `/api/stations/health`)
- Admin routes: `middleware.AuthRequired() + middleware.RequireRole("admin")`

**Model conventions** (`backend/models/`):

- Users: `uuid.UUID` IDs (via `gorm:"type:uuid;default:gen_random_uuid()"`)
- Stations: String UUIDs (custom generation in `BeforeCreate`)
- Posts: `uuid.UUID` IDs (auto-generated)
- Images: Stored in MinIO (`PostImage.ImageURL`), metadata in PostgreSQL
- CBOR: Binary satellite data in separate `PostCBOR` table

**CRITICAL - PostgreSQL-specific types** (`backend/models/`):

```go
// ✅ CORRECT - Use PostgreSQL native types
ID         uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
Metadata   string    `gorm:"type:jsonb" json:"metadata"`  // JSONB for JSON data
Data       []byte    `gorm:"type:bytea" json:"-"`         // Binary data

// ❌ WRONG - Don't simplify to generic types
ID         uuid.UUID `gorm:"primaryKey" json:"id"`        // Missing type:uuid!
Metadata   string    `gorm:"type:text" json:"metadata"`   // Should be jsonb
```

**Never remove PostgreSQL-specific type declarations**. We use native types (uuid, jsonb, bytea, decimal) for performance and data integrity.

### Frontend Patterns

**API client** (`frontend/src/api.ts`):

```typescript
// Axios interceptor auto-refreshes JWT on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      // Refresh token, retry request
    }
  }
);
```

**No routing**: All components in `components/`, loaded directly in `App.tsx`. No react-router.

**Material-UI Joy only**: Don't mix with core MUI components.

### Worker Service Details

Background jobs run via separate process: `docker compose up worker` (uses `command: ["air", "-c", ".air.toml", "--", "worker"]`).

**Jobs** (`backend/worker/`):

- `station_health_monitor.go`: Checks `StationUptime` records against `Station.OnlineThreshold`, sends notifications
- `achievement_checker.go`: Awards achievements based on user activity
- `ground_track_processor.go`: Processes satellite pass predictions

Shares database/storage with API, but runs independently.

### Database & Storage

**GORM auto-migration**: Models define schema. Migration runs via `migrate` service on startup (`command: ["go", "run", ".", "auto-migrate"]`).

**MinIO organization**:

- Bucket: `sathub-images`
- Path: `images/post-{uuid}/filename.ext`
- Access: Backend proxies via `/api/posts/:id/images/:imageId`

**Seeding** (`backend/seed/seed.go`):

```bash
make seed  # Creates test_user/password123, 1 station, 85% uptime records
```

### Client Integration

**SatHub Client** (`client/`): Standalone binary that watches directories for satellite data from tools like SatDump.

**Expected format**:

- `dataset.json` + product directories with CBOR and PNG files
- Uses station token: `Authorization: Station <token>`
- Sends health pings to `/api/stations/health` (keeps station "online")

**Installation**:

```bash
curl -sSL https://api.sathub.de/install | sudo bash
sathub-client install-service  # Interactive setup
```

## Key Conventions

### Code Patterns

**Backend responses** (`backend/utils/response.go`):

```go
utils.SuccessResponse(c, http.StatusOK, "Message", data)
utils.ErrorResponse(c, http.StatusBadRequest, "Error")
utils.UnauthorizedResponse(c, "Unauthorized")
```

**Context helpers** (`backend/middleware/auth.go`):

```go
userID, exists := middleware.GetCurrentUserID(c)
stationID, exists := middleware.GetCurrentStationID(c)
```

**Frontend types** (`frontend/src/types.ts`):

- All API response types defined here
- Match backend `handlers/*_handler.go` response structs

### Environment Variables

**Backend** (`.env.development`):

- `DB_TYPE=postgres` (defaults to SQLite if unset)
- `MINIO_ENDPOINT=http://minio:9000` (internal) vs `MINIO_EXTERNAL_URL=https://obj.sathub.local:9999` (public)
- `FRONTEND_URL=https://sathub.local:9999` (CORS)

**Frontend**:

- `VITE_API_BASE_URL=https://api.sathub.local:9999`

## Common Mistakes to Avoid

1. **Don't bypass Docker**: Stack requires PostgreSQL, MinIO, Mailpit, Caddy. No "local" mode.
2. **Station vs User auth**: Upload endpoints use `StationTokenAuth()`, not `AuthRequired()`
3. **Worker jobs**: Don't add long-running tasks to API handlers. Use worker service.
4. **Image URLs**: Never expose MinIO URLs directly. Use backend proxy endpoints.
5. **Database queries**: Direct PostgreSQL access: `docker compose exec postgres psql -U sathub -d sathub`
6. **Hot reload**: Backend uses Air (`.air.toml`), frontend uses Vite. Changes auto-restart.
7. **Migrations**: GORM auto-migrates on `migrate` service startup. Don't run migrations manually.
8. **Full reset needed**: Use `make cycle` to wipe DB/volumes and rebuild (preserves SSL certs for \*.sathub.local).
9. **PostgreSQL types**: ALWAYS preserve `type:uuid`, `type:jsonb`, `type:bytea` in GORM tags. Don't simplify to generic types.
10. **Don't build from `tmp/`**: Air's working directory. Backend/frontend auto-reload in Docker. Client builds: `cd client && go build . -o bin/sathub-client`.

## Key Files Reference

- `backend/main.go` - Route definitions, command structure
- `backend/middleware/auth.go` - Auth patterns (JWT vs Station tokens)
- `backend/models/*.go` - Database schema (GORM models)
- `backend/handlers/*_handler.go` - API endpoint logic
- `backend/worker/*.go` - Background job implementations
- `frontend/src/api.ts` - Centralized API client with auth interceptors
- `docker-compose.yml` - Full stack definition (backend, worker, frontend, postgres, minio, mailpit, caddy)
- `docker/Caddyfile.dev` - Reverse proxy config (HTTPS on port 9999)
