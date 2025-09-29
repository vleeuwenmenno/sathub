# SatHub Data Client

A standalone binary that monitors directories for satellite data from sathub and automatically pushes complete satellite passes to the SatHub API.

## Features

- **One-Command Installation**: Built-in install and service setup commands
- **Auto-Service Management**: Automatic systemd service creation and configuration
- **Directory Monitoring**: Watches for complete satellite pass directories from sathub
- **Processing Delay**: Configurable delay before processing to allow sathub to complete
- **Complete Pass Processing**: Handles all data from a satellite pass (metadata, CBOR, images)
- **Cross-Platform**: Binaries for Linux (x86_64 and ARM64), Windows (x86_64), and macOS (Intel and Apple Silicon)
- **Station Health**: Sends periodic health checks to keep station online
- **Error Recovery**: Automatic retry with configurable backoff
- **Flexible Configuration**: Command-line arguments with environment variable fallbacks
- **Rich Logging**: Structured logging with zerolog for better debugging

## Quick Installation & Setup (Recommended)

The easiest way to get started is with the built-in installation commands that handle everything automatically:

### 1. Download and Install

Download the binary and install it system-wide in one command:

```bash
# Download the binary for your platform
# Linux x86_64:
wget https://github.com/vleeuwenmenno/sathub/releases/latest/download/sathub-client-linux-amd64
chmod +x sathub-client-linux-amd64
sudo ./sathub-client-linux-amd64 install

# Linux ARM64 (Raspberry Pi):
wget https://github.com/vleeuwenmenno/sathub/releases/latest/download/sathub-client-linux-arm64
chmod +x sathub-client-linux-arm64
sudo ./sathub-client-linux-arm64 install
```

The installer automatically:
- Checks if you're upgrading from an older version
- Copies the binary to `/usr/bin/sathub-client`
- Sets proper executable permissions

### 2. Setup as System Service

Configure and start the systemd service with guided setup:

```bash
# Setup systemd service (interactive configuration)
sudo sathub-client install-service

# The installer will:
# - Create sathub user and directories
# - Prompt for your station token
# - Configure watch and processed directories  
# - Enable and start the service automatically
```

**That's it!** Your SatHub client is now installed and running as a system service.

### Available Commands

The SatHub client now includes built-in installation and management commands:

| Command | Description |
|---------|-------------|
| `sathub-client` | Run the client normally (requires token and watch directory) |
| `sathub-client install` | Install the binary to `/usr/bin/sathub-client` (requires sudo) |
| `sathub-client install-service` | Setup systemd service with guided configuration (requires sudo) |
| `sathub-client version` | Show version information |

### Update Token

If you need to update your station token later:

```bash
sudo sathub-client install-service
# Choose "y" when asked if you want to update the token only
```## Manual Installation

### Download Pre-built Binary

Download the appropriate binary for your platform from the [GitHub releases page](https://github.com/vleeuwenmenno/sathub/releases):

- **Linux (x86_64)**: `sathub-client-linux-amd64`
- **Linux (ARM64)**: `sathub-client-linux-arm64` (Raspberry Pi compatible)
- **Windows (x86_64)**: `sathub-client-windows-amd64.exe`
- **macOS (Intel)**: `sathub-client-darwin-amd64`
- **macOS (Apple Silicon)**: `sathub-client-darwin-arm64`

### Build from Source

```bash
cd client
go build -o sathub-client
```

This creates the `sathub-client` binary in the current directory.

## Configuration

The client supports both command-line arguments and environment variables. Command-line arguments take precedence over environment variables.

### Command-Line Arguments

```bash
sathub-client --help
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--token` | `-t` | *required* | Station API token |
| `--watch` | `-w` | *required* | Directory path to watch for new images |
| `--api` | `-a` | `https://api.sathub.de` | SatHub API URL |
| `--processed` | `-p` | `./processed` | Directory to move processed files |
| `--verbose` | `-v` | `false` | Enable verbose (debug) logging |

### Environment Variables (Fallbacks)

| Variable | Description |
|----------|-------------|
| `STATION_TOKEN` | Station authentication token (fallback for `--token`) |
| `WATCH_PATHS` | Directory to monitor (fallback for `--watch`) |
| `API_URL` | SatHub API base URL (fallback for `--api`) |
| `PROCESSED_DIR` | Directory to move processed satellite passes (fallback for `--processed`) |

## Data Format

The client processes complete satellite pass directories from sathub output. Each directory should contain:

### Required Files:
- `dataset.json` - Main metadata file with satellite information
- At least one product directory (e.g., `MSU-MR/`, `MSU-MR (Filled)/`) containing:
  - `product.cbor` - Binary satellite data
  - Multiple `.png` images from the processed data

### Example Directory Structure:
```
2025-09-26_13-01_meteor_m2-x_lrpt_137.9 MHz/
├── dataset.json          # Satellite metadata
├── meteor_m2-x_lrpt.cadu # CADU data (optional)
├── MSU-MR/               # Product directory
│   ├── product.cbor      # CBOR data
│   ├── MSU-MR-1.png      # Processed images
│   ├── MSU-MR-2.png
│   └── ...
└── MSU-MR (Filled)/      # Additional product directory
    ├── product.cbor
    └── ...
```

### dataset.json Format:

The client extracts comprehensive satellite and dataset information from `dataset.json`:

```json
{
  "timestamp": "2024-09-27T16:45:00Z",
  "satellite_name": "METEOR-M2",
  "satellite": "METEOR-M2",     // Alternative field
  "name": "METEOR-M2",          // Alternative field
  "norad": 40069,
  "frequency": 137.9,
  "modulation": "LRPT",
  "datasets": [
    {"name": "MSU-MR", "type": "thermal"},
    {"name": "MSU-MR (Filled)", "type": "thermal"}
  ],
  "products": [
    {"name": "MSU-MR-1", "description": "Thermal infrared"},
    {"name": "MSU-MR-2", "description": "Near infrared"}
  ],
  "additional_metadata": "custom data"
}
```

**Extracted Information:**
- Satellite name (with fallbacks: `satellite_name` → `satellite` → `name`)
- Timestamp and NORAD ID
- Frequency and modulation details
- Dataset and product listings
- All other fields preserved in metadata

All PNG images from product directories are automatically uploaded as post images.

## Usage

### Quick Start (With Built-in Installation)

1. **Download and install** the binary using the built-in installer
2. **Get your station token** from the SatHub web interface
3. **Run the service installer** and enter your token when prompted
4. **Configure sathub** to output to `/home/sathub/data` (or your configured directory)

The service will automatically start monitoring and uploading satellite data!

### Command-Line Usage

```bash
# Linux/macOS
./sathub-client --token YOUR_STATION_TOKEN --watch /path/to/satellite/data

# Windows
sathub-client.exe --token YOUR_STATION_TOKEN --watch C:\path\to\satellite\data

# With custom API server
./sathub-client --token YOUR_TOKEN --watch /path/to/data --api https://my-sathub.example.com

# Enable verbose logging
./sathub-client --token YOUR_TOKEN --watch /path/to/data --verbose

# Custom processed directory
./sathub-client --token YOUR_TOKEN --watch /path/to/data --processed /path/to/archive
```

### Environment Variable Usage (Legacy)

You can still use environment variables as an alternative to command-line arguments:

```bash
# Set environment variables
export STATION_TOKEN=your_station_token_from_sathub
export WATCH_PATHS=/path/to/satellite/data
export API_URL=https://api.sathub.de

# Run the client (no arguments needed)
./sathub-client
```

### Mixed Usage

Environment variables provide defaults that can be overridden by command-line arguments:

```bash
# Set defaults via environment
export STATION_TOKEN=your_default_token
export API_URL=https://api.sathub.de

# Override watch path via command line
./sathub-client --watch /different/path --verbose
```

### Systemd Service (Linux)

**Recommended**: Use the built-in service installer:

```bash
# Install binary and setup service automatically
sudo sathub-client install-service
```

This will:
- Create the systemd service file automatically
- Create a `sathub` user and required directories
- Prompt for your station token and configuration
- Enable and start the service

**Manual service configuration** (if you prefer manual setup):

Create `/etc/systemd/system/sathub-client.service`:

```ini
[Unit]
Description=SatHub Data Client
After=network.target

[Service]
Type=simple
User=sathub
ExecStart=/usr/bin/sathub-client --token your_token_here --watch /home/sathub/data --api https://api.sathub.de --processed /home/sathub/processed
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then enable and start manually:

```bash
sudo systemctl enable sathub-client
sudo systemctl start sathub-client
sudo systemctl status sathub-client
```

## Directory Processing

1. **Directory Detection**: New satellite pass directories are detected
2. **Processing Delay**: Client waits for configured delay to allow sathub to complete
3. **Validation**: Checks for required files (`dataset.json`, product directories with `product.cbor`)
4. **Data Processing**: Parses metadata, reads CBOR data, collects all PNG images
5. **API Upload**: Creates post with metadata and CBOR, uploads all images
6. **Health Check**: Updates station status
7. **Archiving**: Moves processed directory to avoid re-processing

## Logging

The client uses structured logging with zerolog for better debugging and monitoring:

**Normal logging (default):**
```
2024-09-29T15:30:00Z INF Starting SatHub Data Client component=client version=v1.0.0 api_url=https://api.sathub.de
2024-09-29T15:30:00Z INF Testing API connection... component=client
2024-09-29T15:30:01Z INF API connection successful component=client
2024-09-29T15:30:01Z INF Watching directory component=watcher path=/path/to/data
2024-09-29T15:30:01Z INF SatHub Data Client started successfully component=client
2024-09-29T15:35:00Z INF Detected new satellite pass directory component=watcher dir=/path/to/2024-09-29_15-30_meteor-m2_lrpt
2024-09-29T15:45:00Z INF Processing satellite pass component=watcher dir=/path/to/2024-09-29_15-30_meteor-m2_lrpt
2024-09-29T15:45:01Z INF Parsed satellite name component=watcher satellite=METEOR-M2
2024-09-29T15:45:02Z INF Selected product for upload component=watcher product=MSU-MR images=6
2024-09-29T15:45:03Z INF Created post component=watcher post_id=123 satellite=METEOR-M2
2024-09-29T15:45:05Z INF Uploaded image component=watcher image=MSU-MR-1.png post_id=123
```

**Verbose logging (--verbose flag):**
```
2024-09-29T15:45:01Z DBG Parsed timestamp component=watcher timestamp=2024-09-29T15:30:00Z
2024-09-29T15:45:01Z DBG NORAD ID component=watcher norad_id=40069
2024-09-29T15:45:01Z DBG Frequency component=watcher frequency_mhz=137.9
2024-09-29T15:45:01Z DBG Modulation component=watcher modulation=LRPT
2024-09-29T15:45:01Z DBG Found datasets component=watcher count=2
2024-09-29T15:45:01Z DBG Dataset component=watcher index=1 name=MSU-MR
2024-09-29T15:45:01Z DBG Found CBOR data component=watcher product=MSU-MR bytes=245760
2024-09-29T15:45:02Z DBG Found images component=watcher product=MSU-MR count=6
```

## Error Handling

- **Failed API calls** are retried with configurable backoff
- **Incomplete directories** are skipped until they contain required files
- **Processing failures** mark directories for retry (not moved to processed)
- **Health check failures** are logged but don't stop processing
- **Invalid satellite passes** are logged and skipped