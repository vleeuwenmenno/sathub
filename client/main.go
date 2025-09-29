package main

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"os/exec"
	"os/signal"
	"os/user"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/cobra"
)

var (
	token        string
	watchPath    string
	apiURL       string
	processedDir string
	processDelay int
	verbose      bool
	insecure     bool
	logger       zerolog.Logger
)

var rootCmd = &cobra.Command{
	Use:   "sathub-client",
	Short: "SatHub Data Client for uploading satellite captures",
	Long: `SatHub Data Client automatically monitors directories for new satellite images
and uploads them to your SatHub station using the station's API token.`,
	Example: `  # Basic usage
  sathub-client --token abc123def --watch /home/user/satellite-images

  # With custom API URL and processed directory
  sathub-client --token abc123def --watch /path/to/images --api https://my-api.com --processed ./done`,
	PreRun: func(cmd *cobra.Command, args []string) {
		// Configure logger
		if verbose {
			zerolog.SetGlobalLevel(zerolog.DebugLevel)
		} else {
			zerolog.SetGlobalLevel(zerolog.InfoLevel)
		}

		// Configure console output
		logger = log.Output(zerolog.ConsoleWriter{
			Out:        os.Stdout,
			TimeFormat: time.RFC3339,
		}).With().
			Str("component", "client").
			Logger()
	},
	RunE: func(cmd *cobra.Command, args []string) error {
		return runClient()
	},
}

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print the version number",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Printf("SatHub Data Client v%s\n", VERSION)
	},
}

var installCmd = &cobra.Command{
	Use:   "install",
	Short: "Install sathub-client to /usr/bin",
	Long:  "Install sathub-client to /usr/bin. Checks if current version is newer than installed version.",
	RunE: func(cmd *cobra.Command, args []string) error {
		return installBinary()
	},
}

var installServiceCmd = &cobra.Command{
	Use:   "install-service",
	Short: "Install and configure systemd service",
	Long:  "Install systemd service for sathub-client and configure station token.",
	RunE: func(cmd *cobra.Command, args []string) error {
		return installService()
	},
}

func init() {
	rootCmd.AddCommand(versionCmd)
	rootCmd.AddCommand(installCmd)
	rootCmd.AddCommand(installServiceCmd)

	// Set defaults from environment variables
	defaultToken := os.Getenv("STATION_TOKEN")
	defaultWatch := os.Getenv("WATCH_PATHS")
	defaultAPI := getEnvWithDefault("API_URL", "https://api.sathub.de")
	defaultProcessed := getEnvWithDefault("PROCESSED_DIR", "./processed")

	rootCmd.Flags().StringVarP(&token, "token", "t", defaultToken, "Station API token (required, or set STATION_TOKEN env var)")
	rootCmd.Flags().StringVarP(&watchPath, "watch", "w", defaultWatch, "Directory path to watch for new images (required, or set WATCH_PATHS env var)")
	rootCmd.Flags().StringVarP(&apiURL, "api", "a", defaultAPI, "SatHub API URL")
	rootCmd.Flags().StringVarP(&processedDir, "processed", "p", defaultProcessed, "Directory to move processed files")
	rootCmd.Flags().IntVar(&processDelay, "process-delay", 60, "Delay in seconds before processing new directories")
	rootCmd.Flags().BoolVarP(&verbose, "verbose", "v", false, "Enable verbose logging")
	rootCmd.Flags().BoolVarP(&insecure, "insecure", "k", false, "Skip TLS certificate verification (for self-signed certificates)")

	// Only mark as required if not set via environment
	if defaultToken == "" {
		rootCmd.MarkFlagRequired("token")
	}
	if defaultWatch == "" {
		rootCmd.MarkFlagRequired("watch")
	}
}

func getEnvWithDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func runClient() error {
	logger.Info().
		Str("version", VERSION).
		Str("api_url", apiURL).
		Str("watch_path", watchPath).
		Str("processed_dir", processedDir).
		Msg("Starting SatHub Data Client")

	// Create configuration from command line arguments
	config := NewConfig(apiURL, token, watchPath, processedDir, time.Duration(processDelay)*time.Second)

	// Create API client
	apiClient := NewAPIClient(config.APIURL, config.StationToken, insecure)

	// Test API connection with health check
	logger.Info().Msg("Testing API connection...")
	if err := apiClient.StationHealth(); err != nil {
		logger.Warn().Err(err).Msg("Initial health check failed")
	} else {
		logger.Info().Msg("API connection successful")
	}

	// Create file watcher
	watcher, err := NewFileWatcher(config, apiClient)
	if err != nil {
		return fmt.Errorf("failed to create file watcher: %w", err)
	}

	// Start the watcher
	if err := watcher.Start(); err != nil {
		return fmt.Errorf("failed to start file watcher: %w", err)
	}

	logger.Info().Msg("SatHub Data Client started successfully")

	// Wait for shutdown signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Periodic health check
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case sig := <-sigChan:
			logger.Info().Str("signal", sig.String()).Msg("Received shutdown signal")
			watcher.Stop()
			return nil

		case <-ticker.C:
			if err := apiClient.StationHealth(); err != nil {
				logger.Warn().Err(err).Msg("Health check failed")
			} else {
				logger.Debug().Msg("Health check successful")
			}
		}
	}
}

// installBinary installs the current binary to /usr/bin/sathub-client
func installBinary() error {
	const targetPath = "/usr/bin/sathub-client"

	// Check if we're running as root
	if os.Geteuid() != 0 {
		return fmt.Errorf("installation requires root privileges. Please run with sudo")
	}

	// Get current executable path
	currentExe, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get current executable path: %w", err)
	}

	// Check if target already exists and compare versions
	if _, err := os.Stat(targetPath); err == nil {
		// Get installed version
		cmd := exec.Command(targetPath, "version")
		output, err := cmd.Output()
		if err == nil {
			installedVersionStr := strings.TrimSpace(string(output))
			// Extract version from "SatHub Data Client vX.Y.Z"
			re := regexp.MustCompile(`v(\d+\.\d+\.\d+)`)
			matches := re.FindStringSubmatch(installedVersionStr)
			if len(matches) > 1 {
				installedVersion := matches[1]
				if compareVersions(VERSION, installedVersion) <= 0 {
					fmt.Printf("Current version (%s) is not newer than installed version (%s)\n", VERSION, installedVersion)
					fmt.Println("Installation cancelled.")
					return nil
				}
				fmt.Printf("Upgrading from version %s to %s\n", installedVersion, VERSION)
			}
		}
	}

	fmt.Printf("Installing sathub-client v%s to %s...\n", VERSION, targetPath)

	// Copy current executable to target path
	if err := copyFile(currentExe, targetPath); err != nil {
		return fmt.Errorf("failed to copy binary: %w", err)
	}

	// Make executable
	if err := os.Chmod(targetPath, 0755); err != nil {
		return fmt.Errorf("failed to set executable permissions: %w", err)
	}

	fmt.Println("Installation completed successfully!")
	fmt.Printf("You can now run 'sathub-client' from anywhere.\n")
	return nil
}

// installService creates and configures the systemd service
func installService() error {
	const servicePath = "/etc/systemd/system/sathub-client.service"

	// Check if we're running as root
	if os.Geteuid() != 0 {
		return fmt.Errorf("service installation requires root privileges. Please run with sudo")
	}

	// Check if binary is installed in /usr/bin
	binaryPath := "/usr/bin/sathub-client"
	if _, err := os.Stat(binaryPath); os.IsNotExist(err) {
		return fmt.Errorf("sathub-client is not installed in /usr/bin. Please run 'sathub-client install' first")
	}

	// Check if service already exists
	var existingToken string
	serviceExists := false
	if _, err := os.Stat(servicePath); err == nil {
		serviceExists = true
		fmt.Println("Systemd service already exists.")

		// Try to extract existing token from service file
		if content, err := os.ReadFile(servicePath); err == nil {
			re := regexp.MustCompile(`--token\s+(\S+)`)
			matches := re.FindStringSubmatch(string(content))
			if len(matches) > 1 {
				existingToken = matches[1]
			}
		}

		fmt.Print("Do you want to update the token only? (y/N): ")
		reader := bufio.NewReader(os.Stdin)
		response, _ := reader.ReadString('\n')
		if strings.ToLower(strings.TrimSpace(response)) == "y" {
			return updateServiceToken(servicePath, existingToken)
		}
	}

	// Get configuration from user
	config, err := getServiceConfiguration()
	if err != nil {
		return fmt.Errorf("failed to get service configuration: %w", err)
	}

	// Create sathub user if it doesn't exist
	if err := createSatHubUser(); err != nil {
		return fmt.Errorf("failed to create sathub user: %w", err)
	}

	// Generate service content
	serviceContent := generateServiceFile(config)

	// Write service file
	if err := os.WriteFile(servicePath, []byte(serviceContent), 0644); err != nil {
		return fmt.Errorf("failed to write service file: %w", err)
	}

	// Create directories and set permissions
	homeDir := "/home/sathub"
	dataDir := filepath.Join(homeDir, "data")
	processedDir := filepath.Join(homeDir, "processed")

	for _, dir := range []string{homeDir, dataDir, processedDir} {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("failed to create directory %s: %w", dir, err)
		}
		if err := exec.Command("chown", "sathub:sathub", dir).Run(); err != nil {
			return fmt.Errorf("failed to set ownership for %s: %w", dir, err)
		}
	}

	// Reload systemd and enable service
	if err := exec.Command("systemctl", "daemon-reload").Run(); err != nil {
		return fmt.Errorf("failed to reload systemd: %w", err)
	}

	if err := exec.Command("systemctl", "enable", "sathub-client").Run(); err != nil {
		return fmt.Errorf("failed to enable service: %w", err)
	}

	fmt.Println("Service installed successfully!")
	if serviceExists {
		fmt.Println("Use 'sudo systemctl restart sathub-client' to restart with new configuration")
	} else {
		fmt.Println("Use 'sudo systemctl start sathub-client' to start the service")
	}
	fmt.Println("Use 'sudo systemctl status sathub-client' to check service status")

	return nil
}

// updateServiceToken updates only the token in an existing service file
func updateServiceToken(servicePath, currentToken string) error {
	fmt.Printf("Current token: %s\n", maskToken(currentToken))
	fmt.Print("Enter new station token: ")
	reader := bufio.NewReader(os.Stdin)
	newToken, _ := reader.ReadString('\n')
	newToken = strings.TrimSpace(newToken)

	if newToken == "" {
		return fmt.Errorf("token cannot be empty")
	}

	// Read current service file
	content, err := os.ReadFile(servicePath)
	if err != nil {
		return fmt.Errorf("failed to read service file: %w", err)
	}

	// Replace token in the ExecStart line
	re := regexp.MustCompile(`(--token\s+)\S+`)
	newContent := re.ReplaceAllString(string(content), "${1}"+newToken)

	// Write updated service file
	if err := os.WriteFile(servicePath, []byte(newContent), 0644); err != nil {
		return fmt.Errorf("failed to write service file: %w", err)
	}

	// Reload systemd
	if err := exec.Command("systemctl", "daemon-reload").Run(); err != nil {
		return fmt.Errorf("failed to reload systemd: %w", err)
	}

	fmt.Println("Service token updated successfully!")
	fmt.Println("Use 'sudo systemctl restart sathub-client' to apply changes")
	return nil
}

// ServiceConfig holds the configuration for the systemd service
type ServiceConfig struct {
	Token        string
	WatchPath    string
	APIURL       string
	ProcessedDir string
}

// getServiceConfiguration prompts user for service configuration
func getServiceConfiguration() (*ServiceConfig, error) {
	reader := bufio.NewReader(os.Stdin)
	config := &ServiceConfig{}

	fmt.Print("Enter station token: ")
	token, _ := reader.ReadString('\n')
	config.Token = strings.TrimSpace(token)
	if config.Token == "" {
		return nil, fmt.Errorf("token cannot be empty")
	}

	fmt.Print("Enter watch directory [/home/sathub/data]: ")
	watchPath, _ := reader.ReadString('\n')
	config.WatchPath = strings.TrimSpace(watchPath)
	if config.WatchPath == "" {
		config.WatchPath = "/home/sathub/data"
	}

	fmt.Print("Enter API URL [https://api.sathub.de]: ")
	apiURL, _ := reader.ReadString('\n')
	config.APIURL = strings.TrimSpace(apiURL)
	if config.APIURL == "" {
		config.APIURL = "https://api.sathub.de"
	}

	fmt.Print("Enter processed directory [/home/sathub/processed]: ")
	processedDir, _ := reader.ReadString('\n')
	config.ProcessedDir = strings.TrimSpace(processedDir)
	if config.ProcessedDir == "" {
		config.ProcessedDir = "/home/sathub/processed"
	}

	return config, nil
}

// createSatHubUser creates the sathub system user if it doesn't exist
func createSatHubUser() error {
	// Check if user exists
	if _, err := user.Lookup("sathub"); err == nil {
		return nil // User already exists
	}

	// Create system user
	cmd := exec.Command("useradd", "-r", "-s", "/bin/false", "-d", "/home/sathub", "-m", "sathub")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to create sathub user: %w", err)
	}

	return nil
}

// generateServiceFile generates the systemd service file content
func generateServiceFile(config *ServiceConfig) string {
	return fmt.Sprintf(`[Unit]
Description=SatHub Data Client
After=network.target

[Service]
Type=simple
User=sathub
ExecStart=/usr/bin/sathub-client --token %s --watch %s --api %s --processed %s
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
`, config.Token, config.WatchPath, config.APIURL, config.ProcessedDir)
}

// copyFile copies a file from src to dst
func copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	_, err = io.Copy(destFile, sourceFile)
	return err
}

// compareVersions compares two version strings (returns -1, 0, 1)
func compareVersions(v1, v2 string) int {
	parts1 := strings.Split(v1, ".")
	parts2 := strings.Split(v2, ".")

	maxLen := len(parts1)
	if len(parts2) > maxLen {
		maxLen = len(parts2)
	}

	for i := 0; i < maxLen; i++ {
		var n1, n2 int

		if i < len(parts1) {
			n1, _ = strconv.Atoi(parts1[i])
		}
		if i < len(parts2) {
			n2, _ = strconv.Atoi(parts2[i])
		}

		if n1 < n2 {
			return -1
		} else if n1 > n2 {
			return 1
		}
	}

	return 0
}

// maskToken masks a token for display (shows first 8 and last 4 characters)
func maskToken(token string) string {
	if len(token) <= 12 {
		return strings.Repeat("*", len(token))
	}
	return token[:8] + strings.Repeat("*", len(token)-12) + token[len(token)-4:]
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}
