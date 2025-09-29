# SatHub

A community platform for satellite enthusiasts to share and explore satellite data from ground stations worldwide.

[![Release Images](https://github.com/vleeuwenmenno/sathub/actions/workflows/release.yml/badge.svg)](https://github.com/vleeuwenmenno/sathub/actions/workflows/release.yml)
[![Client Binaries](https://github.com/vleeuwenmenno/sathub/actions/workflows/build-client.yml/badge.svg)](https://github.com/vleeuwenmenno/sathub/actions/workflows/build-client.yml)

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

Get the latest client from the [Releases](https://github.com/vleeuwenmenno/sathub/releases) page:

- **Linux (x86_64)**: `sathub-client-linux-amd64`
- **Linux (ARM64)**: `sathub-client-linux-arm64` (Raspberry Pi and other ARM devices)

*Windows support is planned for future releases. macOS is not currently supported.*

### Quick Setup

1. Create an account on [sathub.de](https://sathub.de)
2. Create a ground station and note your **Station API Token**
3. Download the client for your platform
4. Run the client with your station token:

```bash
# Linux (x86_64)
./sathub-client-linux-amd64 --token YOUR_STATION_TOKEN --watch /path/to/your/satdump/live_output

# Linux (ARM64 - Raspberry Pi)
./sathub-client-linux-arm64 --token YOUR_STATION_TOKEN --watch /path/to/your/satdump/live_output
```

The client will monitor the specified directory and automatically upload new images to your SatHub station.

### Client Documentation

For detailed client setup, configuration options, and troubleshooting, see the [client README](client/README.md).

## For Developers

If you're interested in contributing to SatHub or setting up your own instance:

- **Technical documentation**: [TECHNICAL.md](TECHNICAL.md)
- **Getting started guide**: [docs/getting_started.md](docs/getting_started.md)

## License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0) - see the [LICENSE](LICENSE) file for details.
