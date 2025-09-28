# SatHub User Guide

## Welcome to SatHub!

SatHub is a community platform for satellite enthusiasts to manage their ground stations, share satellite data, and connect with other operators worldwide. Whether you're a hobbyist tracking weather satellites or a professional running a satellite network, SatHub makes it easy to organize and share your captures.

## Getting Started

### Creating Your Account

1. Visit the SatHub website
2. Click "Register" in the top navigation
3. Fill in your details:
   - Username (what others will see)
   - Email address (for account verification and password resets)
   - Password (choose something strong!)
4. Check your email for a confirmation link
5. Click the link to activate your account

### Logging In

- Use your username or email address
- Enter your password
- If you've set up two-factor authentication, enter your code

### Setting Up Two-Factor Authentication (Recommended)

For extra security:

1. Go to your User Settings
2. Click "Enable 2FA"
3. Scan the QR code with your authenticator app (like Google Authenticator)
4. Enter the code to confirm
5. Save your recovery codes in a safe place!

## Understanding the Website Structure

### Navigation

The main navigation bar includes:
- **Home**: Latest satellite posts from the community
- **Stations**: Your stations and global station directory
- **Users**: Browse other SatHub members
- **Settings**: Account and security options

### Homepage

The homepage shows:
- Recent satellite posts from public stations
- Quick access to popular stations
- Community activity feed

## Setting Up Your First Station

Stations represent your ground station equipment and location.

### Creating a Station

1. Click "Stations" in the navigation
2. Click "Create Station"
3. Fill in the details:
   - **Name**: A descriptive name for your station
   - **Description**: Tell others about your setup
   - **Location**: Enter a rough location (city, region, or country)
   - **Visibility**: Choose "Public" to share with the community or "Private" to keep it hidden

4. Click "Create"

### Station Dashboard

Once created, your station gets:
- A unique **Station Token** (keep this secret!)
- Health status monitoring
- Post management
- Settings page

### Station Health

SatHub tracks your station's status through regular health pings. The data client sends a health check every few minutes to let the system know your station is online and operational. If health pings stop, your station will show as "offline" in the directory.

## Sharing Satellite Data

The primary way to share satellite data on SatHub is through automated uploads using the SatHub Data Client. This ensures your station runs 24/7 and automatically shares every satellite pass you capture.

### Prerequisites for Automated Uploads

Before setting up the SatHub Data Client, you'll need:

#### Satdump Software
You'll need satdump (satellite processing software) installed and configured to capture satellite signals. Set it up so it automatically processes satellite passes and saves the output to a directory that the SatHub client can monitor.

**Example setup:** Configure satdump to output processed satellite data to a folder like `/home/user/satellite-data` or `C:\satellite-data` on Windows.

#### What You Need

- The SatHub Data Client software (download from the website)
- Your station token
- Satdump software installed and configured
- A directory where satdump saves processed satellite data

#### Basic Setup

1. **Download the client** for your operating system
2. **Get your station token** from your station settings
3. **Configure the client**:
   ```bash
   # Set your station token
   export STATION_TOKEN=your_token_here

   # Point to your satdump output folder
   export WATCH_PATHS=/path/to/your/satdump/data

   # Run the client
   ./sathub-client
   ```

#### Advanced Setup (Recommended)

For 24/7 operation, run the client as a service:

**On Linux with systemd:**
```bash
# Create service file
sudo nano /etc/systemd/system/sathub-client.service
```

Paste this content:
```ini
[Unit]
Description=SatHub Data Client
After=network.target

[Service]
Type=simple
User=your_username
Environment=STATION_TOKEN=your_token
Environment=WATCH_PATHS=/home/you/satellite-data
ExecStart=/path/to/sathub-client
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable sathub-client
sudo systemctl start sathub-client
```

#### What the Client Does

The client:
- Monitors your SatDump output folders
- Waits for complete satellite passes to finish processing
- Automatically extracts metadata and images
- Uploads everything to your station
- Moves processed data to an archive folder

## Exploring the Community

### Global Station Directory

Browse all public stations:
- See what equipment others are using
- Check out different locations worldwide
- Follow stations you're interested in
- Get inspired for your own setup

### User Directory

Find other satellite enthusiasts:
- See who's active in your region
- Connect with similar setups
- Learn from experienced operators

### Following and Notifications

- Follow stations to get updates on their posts
- Get notified when followed stations go online/offline
- Stay updated on new captures from your favorite stations

## Account Management

### Profile Settings

Update your:
- Username
- Email address
- Profile description

### Security Settings

- Change password
- Enable/disable 2FA
- View login history
- Manage recovery codes

### Password Reset

If you forget your password:
1. Click "Forgot Password" on the login page
2. Enter your email
3. Check your email for reset instructions
4. Follow the link to set a new password

## Best Practices

### Station Setup
- Use accurate coordinates for your antenna location
- Write clear descriptions of your equipment
- Keep your station token private (never share it publicly)

### Data Sharing
- Include metadata like frequency, modulation, and satellite name
- Upload clear, well-processed images
- Add descriptions explaining what you're sharing

### Community Etiquette
- Respect other users' privacy settings
- Give credit when sharing others' techniques
- Help newcomers get started

### Security
- Use strong, unique passwords
- Enable 2FA for your account
- Keep your station tokens secure
- Regularly update your software

## Troubleshooting

### Can't Log In?
- Check if your account is confirmed (check your email)
- Try resetting your password
- Make sure 2FA codes are entered correctly

### Station Not Showing Up?
- Check if it's set to public
- Verify your account has the station permissions

### Data Client Issues?
- Check the client logs for error messages
- Verify your station token is correct
- Make sure the watch folder path exists
- Confirm sathub is saving files in the expected format

### Upload Problems?
- Check your internet connection
- Verify file sizes aren't too large
- Make sure image formats are supported (PNG recommended)

## Getting Help

### Community Support
- Check the global forums (coming soon)
- Ask questions in the user directory
- Look at other public stations for examples

### Technical Support
- Report bugs through the website
- Include error messages and steps to reproduce
- Check the FAQ section (expanding)

## What's Next?

As you get comfortable with SatHub, you can:
- Set up multiple stations for different frequencies
- Experiment with different satellite processing software
- Contribute to the community by helping others
- Explore advanced features as they're added

Welcome to the satellite tracking community! Happy hunting! 🚀