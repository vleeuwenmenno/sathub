# SatHub

A community platform for satellite enthusiasts to share and explore satellite data from ground stations worldwide.

[![Release Images](https://github.com/vleeuwenmenno/sathub/actions/workflows/release.yml/badge.svg)](https://github.com/vleeuwenmenno/sathub/actions/workflows/release.yml)
[![Client Binaries](https://github.com/vleeuwenmenno/sathub/actions/workflows/build-client.yml/badge.svg)](https://github.com/vleeuwenmenno/sathub/actions/workflows/build-client.yml)
[![Service Status](https://updown.io/p/itf3y/status.svg)](https://updown.io/p/itf3y)

## What is SatHub?

SatHub is a web-based platform where satellite enthusiasts can:

- **Explore** satellite data and images from ground stations around the world
- **Share** your own captures using the SatHub client
- **Connect** with other satellite enthusiasts in the community
- **Manage** your ground station and track your satellite passes

🌐 **Visit the platform**: [sathub.de](https://sathub.de)

## SatHub Client

The SatHub client allows you to automatically upload your satellite captures to your SatHub station.

### Download

Get the latest client from the [Releases](https://github.com/vleeuwenmenno/sathub-client/releases) page:

- **Linux (x86_64)**: `sathub-client-linux-amd64`
- **Linux (ARM64)**: `sathub-client-linux-arm64` (Raspberry Pi and other ARM devices)
- **Windows (x86_64)**: `sathub-client-windows-amd64.exe`
- **macOS (Intel)**: `sathub-client-darwin-amd64`
- **macOS (Apple Silicon)**: `sathub-client-darwin-arm64`

### Quick Setup

1. Create an account on [sathub.de](https://sathub.de)
2. Create a ground station and note your **Station API Token**
3. Install the client:

**Linux/macOS (Easiest - One-line install):**

```bash
curl -sSL https://api.sathub.de/install | sudo bash
```

**Manual Download:**

Download the client for your platform from [Releases](https://github.com/vleeuwenmenno/sathub-client/releases) and run:

```bash
# Linux/macOS - make executable first
chmod +x sathub-client-*
./sathub-client-* --token YOUR_STATION_TOKEN --watch /path/to/your/images

# Windows
sathub-client-windows-amd64.exe --token YOUR_STATION_TOKEN --watch C:\path\to\your\images
```

The client will monitor the specified directory and automatically upload new satellite captures to your SatHub station.

### Client Documentation

For detailed client setup, configuration options, and troubleshooting, see the [client README](https://github.com/vleeuwenmenno/sathub-client/blob/main/README.md).

## For Developers

If you're interested in contributing to SatHub or setting up your own instance:

- **Technical documentation**: [TECHNICAL.md](TECHNICAL.md)
- **Getting started guide**: [docs/getting_started.md](docs/getting_started.md)

## License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0) - see the [LICENSE](LICENSE) file for details.
