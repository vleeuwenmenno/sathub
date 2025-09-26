# SatHub - AI Coding Assistant Instructions

## Project Architecture

SatHub is a full-stack satellite ground station management platform with a **Go Gin backend** (`backend/`) and **React/TypeScript frontend** (`frontend/`). The architecture features:

- **Backend**: RESTful JSON API with JWT auth, GORM ORM, SQLite database
- **Frontend**: React 19 + Vite + Material-UI Joy with TypeScript
- **Data Model**: Users → Stations → Posts (with satellite data/images)
- **Authentication**: JWT access tokens + refresh tokens, station-specific API tokens

## Key Patterns & Conventions

### Database & Models

- **GORM Auto-migration**: Models in `backend/models/` define both Go structs and DB schema
- **Station Tokens**: Each station gets a unique API token for external data uploads (`Station.GenerateToken()`)
- **Blob Storage**: Images and CBOR data stored directly in SQLite as `[]byte` fields
- **ID Strategy**: Users have `uint` IDs, Stations use UUID strings, Posts use `uint`

### Authentication Patterns

- **Dual Auth**: User JWT tokens (`middleware.AuthRequired()`) vs Station tokens (`middleware.StationTokenAuth()`)
- **Optional Auth**: Some endpoints use `middleware.OptionalAuth()` for public/private content
- **Frontend Auto-refresh**: `api.ts` interceptors handle token refresh on 401s

### API Design

- **Route Grouping**: Clear separation between public, user-protected, and station-protected endpoints
- **CORS Configuration**: Explicit frontend origins in `main.go` (ports 3000, 5173, 4001)
- **Response Format**: Consistent JSON structure via `utils.response.go` helpers

## Development Workflows

### Docker-First Development (Recommended)

**Always use Docker** - the stack requires gcc for SQLite (CGO) and includes Mailpit for email testing:

```bash
make up      # Start full stack with hot reload (docker compose up -d --build)
make down    # Stop all services (docker compose down)
make logs    # View all service logs
make seed    # Reset and seed database (requires backend container running)
```

### Database Operations

```bash
# Reset and seed database (removes existing data, backend auto-restarts)
make seed
# Or manually (requires backend container running):
docker compose exec backend go run main.go --seed
```

**Important**: Seeding requires the backend container to be running first (`make up`)

### File Structure Conventions

- **Backend**: `handlers/` for routes, `middleware/` for auth, `models/` for data
- **Frontend**: `components/` for UI, `contexts/` for state, `api.ts` for HTTP client

## Critical Implementation Details

### Station Token Authentication

Station tokens enable external devices to upload data without user accounts. Key pattern:

```go
// Station creation automatically generates secure token
station.GenerateToken()
// Upload endpoint uses station middleware
stationPosts.Use(middleware.StationTokenAuth())
```

### Image Handling

Images stored as blobs in database, served via dedicated endpoints:

- Station pictures: `/api/stations/:id/picture`
- Post images: `/api/posts/:id/images/:imageId`
- Upload via multipart form to separate endpoints

### Frontend State Management

- **AuthContext**: Global user auth state with automatic token refresh
- **API Client**: Centralized axios instance in `api.ts` with interceptors
- **Material-UI Joy**: Consistent design system, avoid mixing with core MUI

### Database Seeding Strategy

`make seed` creates comprehensive test data:

- 3 users with known credentials (`password123`)
- 6 stations (mix of public/private)
- 15-40 posts with sample satellite data
- Uses mock images from legacy `data/` folder (temporary)

## External Dependencies

- **Docker**: Required for development (SQLite needs gcc/CGO, not guaranteed on Windows)
- **Mailpit**: Email testing service (port 8025) for password resets, only available via Docker
- **CBOR**: Binary satellite data format stored in Post model

## Common Gotchas

- **Docker Required**: Local development without Docker missing Mailpit + potential gcc issues
- Backend restarts automatically when `satdump.db` file changes
- Seeding (`make seed`) requires backend container running first
- Frontend proxy to backend configured in `vite.config.ts`
- Station tokens are sensitive - only show once after generation/regeneration
- GORM migrations run automatically on startup, no manual schema management needed
