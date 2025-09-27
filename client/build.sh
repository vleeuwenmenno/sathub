#!/bin/bash

# Build script for SatHub client binary
# Creates a Linux binary for the SatHub data client

set -e

echo "Building SatHub client binary..."

# Create output directory
mkdir -p bin

# Build for Linux (amd64)
echo "Building for Linux amd64..."
CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build -a -installsuffix cgo -o bin/sathub-client .

echo "Build complete! Binary available at bin/sathub-client"
ls -la bin/