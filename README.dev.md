# Local Development Setup with Caddy

This setup uses Caddy as a reverse proxy to provide proper hostnames for local development, eliminating CORS issues and allowing direct API calls from the frontend.

## Prerequisites

1. **Add hostnames to your `/etc/hosts` file:**
   ```
   127.0.0.1 sathub.local
   127.0.0.1 api.sathub.local
   127.0.0.1 obj.sathub.local
   ```

2. **Install Docker and Docker Compose**

## Starting the Development Environment

1. **Start all services:**
   ```bash
   docker-compose up -d
   ```

2. **Access the applications:**
   - **Frontend:** https://sathub.local:4444 (HTTP redirects to HTTPS)
   - **API:** https://api.sathub.local:4444 (HTTP redirects to HTTPS)
   - **MinIO Console:** http://localhost:9001 (admin/minioadmin)
   - **Object Storage:** https://obj.sathub.local:4444 (for direct image access)

## Services

- **Caddy** (Ports 9999/4444): Reverse proxy with automatic HTTPS and HTTP redirects
- **Frontend** (Port 5173): React/Vite development server
- **Backend** (Port 4001): Go API server
- **MinIO** (Port 9000): Object storage server
- **PostgreSQL** (Port 5432): Database
- **Mailpit** (Ports 8025/1025): Email testing

## Configuration

### Caddyfile.dev
Routes requests to appropriate services:
- `sathub.local` → Frontend
- `api.sathub.local` → Backend API
- `obj.sathub.local` → MinIO (with CORS headers)

### Environment Variables
The backend uses these MinIO settings:
- `MINIO_ENDPOINT=http://obj.sathub.local`
- `MINIO_BUCKET=sathub-images`
- `MINIO_ACCESS_KEY=minioadmin`
- `MINIO_SECRET_KEY=minioadmin`

## Image Storage

Images are now stored in MinIO with organized folder structure:
```
sathub-images/
├── images/
│   ├── post-1/
│   │   ├── image1.jpg
│   │   └── image2.png
│   ├── post-2/
│   │   └── image3.jpg
```

Images are served directly from MinIO via `obj.sathub.local`, eliminating database load and improving performance.

## Troubleshooting

1. **CORS Issues:** Ensure hostnames are added to `/etc/hosts`
2. **Image Loading:** Check MinIO console at http://localhost:9001
3. **API Calls Failing:** Verify Caddy is routing correctly
4. **MinIO Connection:** Check logs with `docker-compose logs minio`

## Production Deployment

For production, use the `docker-compose.prod.yml` file which includes proper SSL certificates and production Caddyfile configuration.