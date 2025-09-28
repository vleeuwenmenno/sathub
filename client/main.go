package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	// Parse command line flags
	var showVersion bool
	flag.BoolVar(&showVersion, "version", false, "Show version information")
	flag.Parse()

	// Handle version flag
	if showVersion {
		fmt.Printf("SatHub Data Client v%s\n", VERSION)
		return
	}

	// Load configuration
	config, err := LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Validate required configuration
	if config.StationToken == "" {
		log.Fatalf("STATION_TOKEN environment variable is required")
	}

	logger := log.New(os.Stdout, "[CLIENT] ", log.LstdFlags)
	logger.Printf("Starting SatHub Data Client v%s", VERSION)
	logger.Printf("API URL: %s", config.APIURL)
	logger.Printf("Watch paths: %v", config.WatchPaths)
	logger.Printf("Processing delay: %v", config.ProcessDelay)

	// Create API client
	apiClient := NewAPIClient(config.APIURL, config.StationToken)

	// Test API connection with health check
	logger.Printf("Testing API connection...")
	if err := apiClient.StationHealth(); err != nil {
		logger.Printf("Warning: Initial health check failed: %v", err)
	} else {
		logger.Printf("API connection successful")
	}

	// Create file watcher
	watcher, err := NewFileWatcher(config, apiClient)
	if err != nil {
		log.Fatalf("Failed to create file watcher: %v", err)
	}

	// Start the watcher
	if err := watcher.Start(); err != nil {
		log.Fatalf("Failed to start file watcher: %v", err)
	}

	logger.Printf("SatHub Data Client started successfully")

	// Wait for shutdown signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Periodic health check
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case sig := <-sigChan:
			logger.Printf("Received signal %v, shutting down...", sig)
			watcher.Stop()
			return

		case <-ticker.C:
			if err := apiClient.StationHealth(); err != nil {
				logger.Printf("Health check failed: %v", err)
			} else {
				logger.Printf("Health check successful")
			}
		}
	}
}