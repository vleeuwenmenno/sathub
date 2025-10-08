# SatHub Submodule Structure

This document describes the new submodule-based repository structure for SatHub.

## Overview

SatHub has been restructured from a monorepo into a main repository with git submodules for better separation of concerns and independent releases.

## Repository Structure

```
sathub/ (main repo)
├── backend/     -> git@github.com:vleeuwenmenno/sathub-backend.git
├── frontend/    -> git@github.com:vleeuwenmenno/sathub-frontend.git
├── client/      -> git@github.com:vleeuwenmenno/sathub-client.git
├── docker-compose.yml
├── docker-compose.prod.yml
├── docs/
└── scripts/
```

## Component Repositories

### Backend (`sathub-backend`)

- **Purpose**: Go API server, database migrations, email templates, translations
- **Release Process**: `./release.sh` (creates tags, builds Docker images)
- **CI/CD**: Builds Docker images on release
- **Docker Image**: `ghcr.io/vleeuwenmenno/sathub-backend/backend`

### Frontend (`sathub-frontend`)

- **Purpose**: React/TypeScript SPA
- **Release Process**: `./release.sh` (creates tags, builds Docker images)
- **CI/CD**: Builds Docker images on release
- **Docker Image**: `ghcr.io/vleeuwenmenno/sathub-frontend/frontend`

### Client (`sathub-client`)

- **Purpose**: Go binary for satellite data upload
- **Release Process**: `./release.sh` (creates tags, builds cross-platform binaries)
- **CI/CD**: Builds binaries for Linux, Windows, macOS on release

## Development Workflow

### Setting up Submodules

After cloning the main repository:

```bash
git clone git@github.com:vleeuwenmenno/sathub.git
cd sathub
git submodule update --init --recursive
```

### Working with Submodules

```bash
# Update all submodules to latest
git submodule update --remote

# Pull main repo and all submodules
git pull --recurse-submodules

# Push changes to main repo and submodules
git push --recurse-submodules

# Check submodule status
git submodule status
```

### Making Changes

1. **To a component**: Work in the respective submodule directory
2. **To orchestration**: Work in the main repository (docker-compose, docs, etc.)

### Releasing Components

Each component has independent releases:

```bash
# Release backend
cd backend
./release.sh

# Release frontend
cd frontend
./release.sh

# Release client
cd client
./release.sh
```

## Docker Development

The docker-compose files work with submodules:

```bash
# Development
docker-compose up

# Production
docker-compose -f docker-compose.prod.yml up
```

## Migration from Monorepo

If migrating from the old monorepo structure:

1. Run the setup script: `./setup-submodules.sh`
2. Push the submodule setup: `git push origin main`
3. Update any CI/CD references to the old paths

## Benefits

- **Independent Releases**: Each component can be released separately
- **Reduced Build Triggers**: Frontend changes don't rebuild backend/client
- **Clear Ownership**: Each component has its own repository and maintainers
- **Version Independence**: Components can use different versioning schemes
- **Parallel Development**: Teams can work on components independently

## Shared Resources

- **Translations**: Remain in backend (served via API to frontend)
- **Database Schema**: Managed by backend migrations
- **Environment Config**: Documented in main repo

## Troubleshooting

### Submodule Issues

```bash
# Fix detached HEAD state
cd backend
git checkout main

# Update submodule to specific commit
git submodule set-branch --branch main backend
```

### Docker Issues

Ensure submodules are initialized before running docker-compose:

```bash
git submodule update --init --recursive
```

## Version Management

Each component maintains its own semantic version. The main repository tracks which versions of each component are compatible.
