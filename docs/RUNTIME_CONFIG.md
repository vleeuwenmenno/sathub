# Runtime Configuration

SatHub frontend supports runtime configuration through environment variables, making it perfect for self-hosting without requiring custom builds.

## Environment Variables

### Frontend Configuration

- `VITE_API_BASE_URL`: The base URL for your SatHub backend API (e.g., `https://api.yourdomain.com`)
- `VITE_ALLOWED_HOSTS`: Comma-separated list of allowed hosts for the frontend

## How It Works

The frontend uses a runtime configuration system that allows you to change API endpoints and other settings without rebuilding the Docker image:

1. **Build Time**: The frontend is built with placeholder values
2. **Runtime**: An entrypoint script replaces placeholders with actual environment variables
3. **Configuration**: The app reads configuration from `window.ENV` in production or `import.meta.env` in development

## Example Configuration

### Production (.env file)
```env
FRONTEND_API_BASE_URL=https://api.yourdomain.com
VITE_ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
```

### Development
Environment variables are set in `docker-compose.yml`:
```yaml
environment:
  - VITE_API_BASE_URL=https://api.sathub.local:9999
  - VITE_ALLOWED_HOSTS=sathub.local,localhost,127.0.0.1
```

## Self-Hosting

When self-hosting SatHub, simply set the appropriate environment variables in your docker-compose.yml or .env file:

```yaml
services:
  frontend:
    image: ghcr.io/vleeuwenmenno/sathub/frontend:latest
    environment:
      - VITE_API_BASE_URL=https://api.mysatellitestation.com
      - VITE_ALLOWED_HOSTS=mysatellitestation.com
```

No rebuilding required! The same Docker image works for any domain configuration.