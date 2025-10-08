#!/bin/bash

# SatHub Client Installer
# Downloads and installs the latest sathub-client release from GitHub

set -e

# Configuration
REPO="vleeuwenmenno/sathub-client"
GITHUB_API="https://api.github.com/repos/${REPO}/releases/latest"
INSTALL_PATH="/usr/bin/sathub-client"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (sudo)"
        exit 1
    fi
}

# Detect OS and architecture
detect_platform() {
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)

    case $OS in
        linux)
            OS="linux"
            ;;
        darwin)
            OS="darwin"
            ;;
        *)
            log_error "Unsupported OS: $OS"
            exit 1
            ;;
    esac

    case $ARCH in
        x86_64|amd64)
            ARCH="amd64"
            ;;
        aarch64|arm64)
            ARCH="arm64"
            ;;
        *)
            log_error "Unsupported architecture: $ARCH"
            exit 1
            ;;
    esac

    log_info "Detected platform: ${OS}-${ARCH}"
}

# Get latest release information from GitHub
get_latest_release() {
    log_info "Fetching latest release information..."

    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed"
        exit 1
    fi

    # Fetch release data
    RELEASE_DATA=$(curl -s "$GITHUB_API")

    if [[ $? -ne 0 ]]; then
        log_error "Failed to fetch release data from GitHub"
        exit 1
    fi

    # Extract version tag
    LATEST_VERSION=$(echo "$RELEASE_DATA" | grep -o '"tag_name": "[^"]*' | cut -d'"' -f4)

    if [[ -z "$LATEST_VERSION" ]]; then
        log_error "Failed to extract version from GitHub response"
        exit 1
    fi

    log_info "Latest version: $LATEST_VERSION"
}

# Find the correct asset for current platform
find_asset() {
    ASSET_NAME="sathub-client-${OS}-${ARCH}"

    # Try to use jq if available for more reliable JSON parsing
    if command -v jq &> /dev/null; then
        DOWNLOAD_URL=$(echo "$RELEASE_DATA" | jq -r ".assets[] | select(.name == \"$ASSET_NAME\") | .browser_download_url")
    else
        # Fallback to grep/sed (less reliable)
        DOWNLOAD_URL=$(echo "$RELEASE_DATA" | grep -A 50 '"name": "'${ASSET_NAME}'"' | grep '"browser_download_url":' | head -1 | cut -d'"' -f4)
    fi

    if [[ -z "$DOWNLOAD_URL" ]]; then
        log_error "Could not find asset '${ASSET_NAME}' in release ${LATEST_VERSION}"
        log_error "Available assets:"
        if command -v jq &> /dev/null; then
            echo "$RELEASE_DATA" | jq -r '.assets[].name'
        else
            echo "$RELEASE_DATA" | grep '"name":' | cut -d'"' -f4
        fi
        exit 1
    fi

    log_info "Found asset: $ASSET_NAME"
}

# Global flag to track if installation is needed
NEEDS_INSTALL=false

# Check if update is needed
check_update_needed() {
    if [[ -f "$INSTALL_PATH" ]]; then
        # Get currently installed version
        if INSTALLED_VERSION=$("$INSTALL_PATH" version 2>/dev/null); then
            # Extract version number (remove "SatHub Data Client " prefix if present)
            INSTALLED_VERSION=$(echo "$INSTALLED_VERSION" | sed 's/SatHub Data Client //')
            
            # Normalize versions by removing 'v' prefix for comparison
            COMPARE_LATEST="${LATEST_VERSION#v}"
            COMPARE_INSTALLED="${INSTALLED_VERSION#v}"
            
            # Compare versions (simple string comparison should work for semver)
            if [[ "$COMPARE_LATEST" == "$COMPARE_INSTALLED" ]]; then
                log_success "SatHub client is already up to date (${INSTALLED_VERSION})"
                NEEDS_INSTALL=false
            else
                log_info "Update available: ${INSTALLED_VERSION} → ${LATEST_VERSION}"
                NEEDS_INSTALL=true
            fi
        else
            log_warning "Could not determine installed version, proceeding with installation"
            NEEDS_INSTALL=true
        fi
    else
        log_info "SatHub client not installed, proceeding with fresh installation"
        NEEDS_INSTALL=true
    fi
}

# Download and install the binary
download_and_install() {
    if [[ "$NEEDS_INSTALL" == "false" ]]; then
        log_info "Skipping download - client is already up to date"
        return
    fi

    TMP_DIR=$(mktemp -d)
    TMP_FILE="${TMP_DIR}/sathub-client"

    log_info "Downloading ${ASSET_NAME}..."

    if ! curl -L -o "$TMP_FILE" "$DOWNLOAD_URL"; then
        log_error "Failed to download ${ASSET_NAME}"
        rm -rf "$TMP_DIR"
        exit 1
    fi

    # Make executable
    chmod +x "$TMP_FILE"

    # Verify the binary works
    if ! "$TMP_FILE" version &>/dev/null; then
        log_error "Downloaded binary appears to be invalid"
        rm -rf "$TMP_DIR"
        exit 1
    fi

    # Install to /usr/bin
    log_info "Installing to ${INSTALL_PATH}..."
    mv "$TMP_FILE" "$INSTALL_PATH"

    # Cleanup
    rm -rf "$TMP_DIR"

    log_success "SatHub client ${LATEST_VERSION} installed successfully!"
}

# Setup systemd service
setup_service() {
    # Check if running on Linux with systemd
    if [[ "$(uname -s)" != "Linux" ]] || ! command -v systemctl &> /dev/null; then
        log_info "Systemd not available on this system, skipping service setup"
        return
    fi

    # Check if running in interactive mode
    if ! [ -t 0 ]; then
        log_info "Non-interactive mode detected, skipping service setup"
        return
    fi

    echo
    echo -e "${YELLOW}Service Setup${NC}"
    
    # Check if service already exists
    if systemctl list-unit-files | grep -q "sathub-client.service"; then
        echo "Systemd service is already installed."
        echo "Would you like to reconfigure it? (y/N): "
    else
        echo "Would you like to set up a systemd service for automatic startup? (y/N): "
    fi
    
    read -r response

    case $response in
        [Yy]|[Yy][Ee][Ss])
            log_info "Setting up systemd service..."

            if ! "$INSTALL_PATH" install-service; then
                log_error "Failed to setup systemd service"
                exit 1
            fi

            log_success "Systemd service setup complete!"
            echo
            echo "Service commands:"
            echo "  Start:  sudo systemctl start sathub-client"
            echo "  Stop:   sudo systemctl stop sathub-client"
            echo "  Status: sudo systemctl status sathub-client"
            echo "  Logs:   sudo journalctl -u sathub-client -f"
            ;;
        *)
            log_info "Skipping service setup"
            echo
            echo "You can manually setup the service later with:"
            echo "  sudo sathub-client install-service"
            ;;
    esac
}

# Main installation process
main() {
    echo -e "${BLUE}SatHub Client Installer${NC}"
    echo "=========================="
    echo

    check_root
    detect_platform
    get_latest_release
    find_asset
    check_update_needed
    download_and_install
    setup_service

    echo
    if [[ "$NEEDS_INSTALL" == "true" ]]; then
        log_success "Installation complete!"
        echo
        echo "Usage:"
        echo "  sathub-client --help"
        echo "  sathub-client --token YOUR_TOKEN --watch /path/to/data"
    else
        log_success "Client is up to date!"
    fi
}

# Run main function
main "$@"
