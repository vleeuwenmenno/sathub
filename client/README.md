# SatHub Data Client

A standalone binary that monitors directories for satellite data from satdump and automatically pushes complete satellite passes to the SatHub API.

## Features

- **Directory Monitoring**: Watches for complete satellite pass directories from satdump
- **Processing Delay**: Configurable delay before processing to allow satdump to complete
- **Complete Pass Processing**: Handles all data from a satellite pass (metadata, CBOR, images)
- **Multi-Platform**: Binaries for Linux, Windows, and macOS
- **Station Health**: Sends periodic health checks to keep station online
- **Error Recovery**: Automatic retry with configurable backoff

## Installation

### Download Pre-built Binary

Download the Linux binary from the releases page or build it yourself.

### Build from Source

```bash
cd client
./build.sh
```

This creates a binary at `bin/sathub-client`.

## Configuration

The client is configured via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `API_URL` | `http://localhost:4001` | SatHub API base URL |
| `STATION_TOKEN` | *required* | Station authentication token |
| `WATCH_PATHS` | `./data` | Comma-separated list of directories to monitor |
| `PROCESSED_DIR` | `./data/processed` | Directory to move processed satellite passes |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |
| `RETRY_COUNT` | `3` | Number of retries for failed API calls |
| `RETRY_DELAY` | `5` | Delay between retries in seconds |
| `PROCESS_DELAY` | `10` | Minutes to wait before processing new directories |

## Data Format

The client processes complete satellite pass directories from satdump output. Each directory should contain:

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

### Basic Setup

1. **Get your station token** from the SatHub web interface
2. **Configure satdump** to output to a monitored directory (e.g., `./data`)
3. **Set environment variables** and run the client

### Example Usage

```bash
# Set required environment variables
export STATION_TOKEN=your_station_token_from_sathub
export API_URL=http://your-sathub-server:4001

# Optional: customize watch directory and processing delay
export WATCH_PATHS=./satellite-data
export PROCESS_DELAY=15  # Wait 15 minutes before processing

# Run the client
./sathub-client
```

### Systemd Service (Linux)

Create `/etc/systemd/system/sathub-client.service`:

```ini
[Unit]
Description=SatHub Data Client
After=network.target

[Service]
Type=simple
User=satdump
Environment=STATION_TOKEN=your_token_here
Environment=API_URL=http://your-sathub-server:4001
Environment=WATCH_PATHS=/home/satdump/data
ExecStart=/path/to/sathub-client
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable sathub-client
sudo systemctl start sathub-client
sudo systemctl status sathub-client
```

## Directory Processing

1. **Directory Detection**: New satellite pass directories are detected
2. **Processing Delay**: Client waits for configured delay to allow satdump to complete
3. **Validation**: Checks for required files (`dataset.json`, product directories with `product.cbor`)
4. **Data Processing**: Parses metadata, reads CBOR data, collects all PNG images
5. **API Upload**: Creates post with metadata and CBOR, uploads all images
6. **Health Check**: Updates station status
7. **Archiving**: Moves processed directory to avoid re-processing

## Logging

The client provides detailed logging of satellite data processing:

```
[CLIENT] Starting SatHub Data Client
[WATCHER] Watching directory: ./data
[WATCHER] Detected new satellite pass directory: ./data/2025-09-26_13-01_meteor_m2-x_lrpt_137.9 MHz/
[WATCHER] Waiting 10m0s before processing...
[WATCHER] Processing satellite pass: ./data/2025-09-26_13-01_meteor_m2-x_lrpt_137.9 MHz/
[WATCHER] Parsed timestamp: 2024-09-27T16:45:00Z
[WATCHER] Parsed satellite name: METEOR-M2
[WATCHER] NORAD ID: 40069
[WATCHER] Frequency: 137.9 MHz
[WATCHER] Modulation: LRPT
[WATCHER] Found 2 datasets
[WATCHER]   Dataset 1: MSU-MR
[WATCHER]   Dataset 2: MSU-MR (Filled)
[WATCHER] Parsed dataset.json with 15 metadata fields
[WATCHER] Found 2 product directories: [MSU-MR MSU-MR (Filled)]
[WATCHER] Found CBOR data in MSU-MR (245760 bytes)
[WATCHER] Found 6 images in MSU-MR
[WATCHER] Total images to upload: 12
[WATCHER] Created post ID 123 for satellite METEOR-M2
[WATCHER] Uploaded image MSU-MR-1.png for post 123
[WATCHER] Uploaded image MSU-MR-2.png for post 123
```

## Error Handling

- **Failed API calls** are retried with configurable backoff
- **Incomplete directories** are skipped until they contain required files
- **Processing failures** mark directories for retry (not moved to processed)
- **Health check failures** are logged but don't stop processing
- **Invalid satellite passes** are logged and skipped