#!/bin/sh

# Runtime configuration script
# This script replaces placeholders in config.js with actual environment variables

CONFIG_FILE="/app/dist/config.js"

# Set default values if environment variables are not provided
VITE_API_BASE_URL=${VITE_API_BASE_URL:-"http://localhost:4001"}
VITE_ALLOWED_HOSTS=${VITE_ALLOWED_HOSTS:-"localhost"}

echo "Configuring runtime environment..."
echo "API Base URL: $VITE_API_BASE_URL"
echo "Allowed Hosts: $VITE_ALLOWED_HOSTS"

# Replace placeholders in config.js
sed -i "s|\${VITE_API_BASE_URL}|$VITE_API_BASE_URL|g" "$CONFIG_FILE"
sed -i "s|\${VITE_ALLOWED_HOSTS}|$VITE_ALLOWED_HOSTS|g" "$CONFIG_FILE"

echo "Configuration complete!"

# Start the application
exec "$@"