package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/fsnotify/fsnotify"
)

// SatelliteData represents the parsed satellite data from files
type SatelliteData struct {
	Timestamp     time.Time
	SatelliteName string
	Metadata      map[string]interface{}
	CBORData      []byte
	ImagePaths    []string
}

// FileWatcher monitors directories for new satellite passes and processes them
type FileWatcher struct {
	config    *Config
	apiClient *APIClient
	watcher   *fsnotify.Watcher
	processed map[string]bool // Track processed directories
	logger    *log.Logger
}

// NewFileWatcher creates a new file watcher
func NewFileWatcher(config *Config, apiClient *APIClient) (*FileWatcher, error) {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, fmt.Errorf("failed to create watcher: %w", err)
	}

	fw := &FileWatcher{
		config:    config,
		apiClient: apiClient,
		watcher:   watcher,
		processed: make(map[string]bool),
		logger:    log.New(os.Stdout, "[WATCHER] ", log.LstdFlags),
	}

	// Ensure processed directory exists
	if err := os.MkdirAll(config.ProcessedDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create processed directory: %w", err)
	}

	return fw, nil
}

// Start begins watching the configured directories
func (fw *FileWatcher) Start() error {
	// Watch all configured paths
	for _, path := range fw.config.WatchPaths {
		if err := fw.watcher.Add(path); err != nil {
			fw.logger.Printf("Warning: failed to watch path %s: %v", path, err)
			continue
		}
		fw.logger.Printf("Watching directory: %s", path)
	}

	// Process existing directories first
	fw.processExistingDirectories()

	// Start the watch loop
	go fw.watchLoop()

	return nil
}

// Stop stops the file watcher
func (fw *FileWatcher) Stop() error {
	return fw.watcher.Close()
}

// watchLoop handles file system events
func (fw *FileWatcher) watchLoop() {
	// Process existing directories first
	fw.processExistingDirectories()

	for {
		select {
		case event, ok := <-fw.watcher.Events:
			if !ok {
				return
			}

			if event.Has(fsnotify.Create) {
				// Check if it's a directory (satellite pass)
				if info, err := os.Stat(event.Name); err == nil && info.IsDir() {
					fw.handleDirectoryEvent(event.Name)
				}
			}

		case err, ok := <-fw.watcher.Errors:
			if !ok {
				return
			}
			fw.logger.Printf("Watcher error: %v", err)
		}
	}
}

// handleDirectoryEvent processes a new directory (satellite pass)
func (fw *FileWatcher) handleDirectoryEvent(dirPath string) {
	// Check if already processed
	if fw.processed[dirPath] {
		return
	}

	fw.logger.Printf("Detected new satellite pass directory: %s", dirPath)

	// Wait for the configured delay to allow satdump to complete processing
	fw.logger.Printf("Waiting %v before processing...", fw.config.ProcessDelay)
	time.Sleep(fw.config.ProcessDelay)

	// Check if this looks like a complete satellite pass
	if !fw.isCompleteSatellitePass(dirPath) {
		fw.logger.Printf("Directory %s doesn't appear to be a complete satellite pass, skipping", dirPath)
		return
	}

	// Mark as processed immediately
	fw.processed[dirPath] = true

	// Process the directory
	if err := fw.processSatellitePass(dirPath); err != nil {
		fw.logger.Printf("Failed to process satellite pass %s: %v", dirPath, err)
		// Remove from processed map on failure so it can be retried
		delete(fw.processed, dirPath)
		return
	}

	// Move directory to processed
	fw.moveDirectoryToProcessed(dirPath)
}

// processExistingDirectories processes satellite pass directories that already exist
func (fw *FileWatcher) processExistingDirectories() {
	for _, watchPath := range fw.config.WatchPaths {
		entries, err := os.ReadDir(watchPath)
		if err != nil {
			fw.logger.Printf("Warning: failed to read directory %s: %v", watchPath, err)
			continue
		}

		for _, entry := range entries {
			if !entry.IsDir() {
				continue
			}

			dirPath := filepath.Join(watchPath, entry.Name())
			if fw.processed[dirPath] {
				continue
			}

			if fw.isCompleteSatellitePass(dirPath) {
				fw.handleDirectoryEvent(dirPath)
			}
		}
	}
}

// parseJSONFile parses JSON format satellite data with enhanced dataset.json support
func (fw *FileWatcher) parseJSONFile(filePath string) (*SatelliteData, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var rawData map[string]interface{}
	if err := json.NewDecoder(file).Decode(&rawData); err != nil {
		return nil, err
	}

	data := &SatelliteData{
		Metadata: rawData,
	}

	// Extract timestamp
	if ts, ok := rawData["timestamp"].(string); ok {
		if parsed, err := time.Parse(time.RFC3339, ts); err == nil {
			data.Timestamp = parsed
			fw.logger.Printf("Parsed timestamp: %s", data.Timestamp.Format(time.RFC3339))
		} else {
			data.Timestamp = time.Now() // fallback
			fw.logger.Printf("Warning: Invalid timestamp format, using current time")
		}
	} else {
		data.Timestamp = time.Now()
		fw.logger.Printf("Warning: No timestamp found, using current time")
	}

	// Extract satellite name with fallbacks
	if sat, ok := rawData["satellite_name"].(string); ok && sat != "" {
		data.SatelliteName = sat
	} else if sat, ok := rawData["satellite"].(string); ok && sat != "" {
		data.SatelliteName = sat
	} else if sat, ok := rawData["name"].(string); ok && sat != "" {
		data.SatelliteName = sat
	} else {
		data.SatelliteName = "Unknown"
	}
	fw.logger.Printf("Parsed satellite name: %s", data.SatelliteName)

	// Log additional satellite information if available
	if norad, ok := rawData["norad"].(float64); ok {
		fw.logger.Printf("NORAD ID: %.0f", norad)
	}
	if frequency, ok := rawData["frequency"].(float64); ok {
		fw.logger.Printf("Frequency: %.1f MHz", frequency)
	}
	if modulation, ok := rawData["modulation"].(string); ok {
		fw.logger.Printf("Modulation: %s", modulation)
	}

	// Log dataset information if available
	if datasets, ok := rawData["datasets"].([]interface{}); ok {
		fw.logger.Printf("Found %d datasets", len(datasets))
		for i, ds := range datasets {
			if dsMap, ok := ds.(map[string]interface{}); ok {
				if name, ok := dsMap["name"].(string); ok {
					fw.logger.Printf("  Dataset %d: %s", i+1, name)
				}
			}
		}
	}

	// Log product information if available
	if products, ok := rawData["products"].([]interface{}); ok {
		fw.logger.Printf("Found %d products", len(products))
		for i, prod := range products {
			if prodMap, ok := prod.(map[string]interface{}); ok {
				if name, ok := prodMap["name"].(string); ok {
					fw.logger.Printf("  Product %d: %s", i+1, name)
				}
			}
		}
	}

	// Remove processed fields from metadata to avoid duplication
	delete(rawData, "timestamp")
	delete(rawData, "satellite_name")
	delete(rawData, "satellite")
	delete(rawData, "name")

	fw.logger.Printf("Parsed dataset.json with %d metadata fields", len(rawData))
	return data, nil
}

// isCompleteSatellitePass checks if a directory contains a complete satellite pass
func (fw *FileWatcher) isCompleteSatellitePass(dirPath string) bool {
	// Check for dataset.json (main metadata file)
	datasetPath := filepath.Join(dirPath, "dataset.json")
	if _, err := os.Stat(datasetPath); os.IsNotExist(err) {
		return false
	}

	// Check for at least one product directory with CBOR
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return false
	}

	hasProductDir := false
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		productDir := filepath.Join(dirPath, entry.Name())
		cborPath := filepath.Join(productDir, "product.cbor")
		if _, err := os.Stat(cborPath); err == nil {
			hasProductDir = true
			break
		}
	}

	return hasProductDir
}

// processSatellitePass processes a complete satellite pass directory
func (fw *FileWatcher) processSatellitePass(dirPath string) error {
	fw.logger.Printf("Processing satellite pass: %s", dirPath)

	// Read dataset.json for main metadata
	datasetPath := filepath.Join(dirPath, "dataset.json")
	dataset, err := fw.parseJSONFile(datasetPath)
	if err != nil {
		return fmt.Errorf("failed to parse dataset.json: %w", err)
	}

	// Find product directories
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return fmt.Errorf("failed to read directory: %w", err)
	}

	var imagePaths []string
	var cborData []byte
	var productDirs []string

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		productDir := filepath.Join(dirPath, entry.Name())
		productDirs = append(productDirs, entry.Name())

		// Read CBOR data
		cborPath := filepath.Join(productDir, "product.cbor")
		if data, err := os.ReadFile(cborPath); err == nil {
			cborData = data
			fw.logger.Printf("Found CBOR data in %s (%d bytes)", entry.Name(), len(data))
		}

		// Collect all PNG images
		productEntries, err := os.ReadDir(productDir)
		if err != nil {
			continue
		}

		imageCount := 0
		for _, productEntry := range productEntries {
			if strings.HasSuffix(productEntry.Name(), ".png") {
				imagePaths = append(imagePaths, filepath.Join(productDir, productEntry.Name()))
				imageCount++
			}
		}
		if imageCount > 0 {
			fw.logger.Printf("Found %d images in %s", imageCount, entry.Name())
		}
	}

	fw.logger.Printf("Found %d product directories: %v", len(productDirs), productDirs)
	fw.logger.Printf("Total images to upload: %d", len(imagePaths))

	// Create post with combined metadata
	postReq := PostRequest{
		Timestamp:     dataset.Timestamp.Format(time.RFC3339),
		SatelliteName: dataset.SatelliteName,
		Metadata:      fw.mapToJSON(dataset.Metadata),
		CBOR:          cborData,
	}

	post, err := fw.apiClient.CreatePost(postReq)
	if err != nil {
		return fmt.Errorf("failed to create post: %w", err)
	}

	fw.logger.Printf("Created post ID %d for satellite %s", post.ID, post.SatelliteName)

	// Upload all images
	for _, imagePath := range imagePaths {
		if err := fw.apiClient.UploadImage(post.ID, imagePath); err != nil {
			fw.logger.Printf("Warning: failed to upload image %s: %v", imagePath, err)
			// Continue with other images
		} else {
			fw.logger.Printf("Uploaded image %s for post %d", filepath.Base(imagePath), post.ID)
		}
	}

	// Send health check
	if err := fw.apiClient.StationHealth(); err != nil {
		fw.logger.Printf("Warning: failed to send health check: %v", err)
	}

	return nil
}

// moveDirectoryToProcessed moves a processed directory to the processed location
func (fw *FileWatcher) moveDirectoryToProcessed(dirPath string) {
	dirName := filepath.Base(dirPath)
	dest := filepath.Join(fw.config.ProcessedDir, dirName)

	if err := os.Rename(dirPath, dest); err != nil {
		fw.logger.Printf("Warning: failed to move directory to processed: %v", err)
	}
}

// mapToJSON converts a map to JSON string
func (fw *FileWatcher) mapToJSON(data map[string]interface{}) string {
	if jsonData, err := json.Marshal(data); err == nil {
		return string(jsonData)
	}
	return "{}"
}
