package main

import (
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds the application configuration
type Config struct {
	APIURL       string
	StationToken string
	WatchPaths   []string
	ProcessedDir string
	LogLevel     string
	RetryCount   int
	RetryDelay   time.Duration
	ProcessDelay time.Duration // Delay before processing new directories
}

// LoadConfig loads configuration from environment variables (legacy support)
func LoadConfig() (*Config, error) {
	config := &Config{
		APIURL:       getEnv("API_URL", "https://api.sathub.de"),
		StationToken: getEnv("STATION_TOKEN", ""),
		WatchPaths:   strings.Split(getEnv("WATCH_PATHS", "./data"), ","),
		ProcessedDir: getEnv("PROCESSED_DIR", "./processed"),
		LogLevel:     getEnv("LOG_LEVEL", "info"),
		RetryCount:   getEnvInt("RETRY_COUNT", 3),
		RetryDelay:   time.Duration(getEnvInt("RETRY_DELAY", 5)) * time.Second,
		ProcessDelay: time.Duration(getEnvInt("PROCESS_DELAY", 60)) * time.Second,
	}

	// Trim spaces from paths
	for i, path := range config.WatchPaths {
		config.WatchPaths[i] = strings.TrimSpace(path)
	}

	return config, nil
}

// NewConfig creates a configuration with the specified parameters
func NewConfig(apiURL, token, watchPath, processedDir string, processDelay time.Duration) *Config {
	return &Config{
		APIURL:       apiURL,
		StationToken: token,
		WatchPaths:   []string{watchPath},
		ProcessedDir: processedDir,
		LogLevel:     "info",
		RetryCount:   3,
		RetryDelay:   5 * time.Second,
		ProcessDelay: processDelay,
	}
}

// getEnv gets an environment variable with a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvInt gets an environment variable as int with a default value
func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}
