package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/fxamacker/cbor/v2"
	"github.com/rs/zerolog"
)

// SatelliteData represents the parsed satellite data from files
type SatelliteData struct {
	Timestamp     time.Time
	SatelliteName string
	Metadata      map[string]interface{}
	ImagePaths    []string
}

// FileWatcher monitors directories for new satellite passes and processes them
type FileWatcher struct {
	config    *Config
	apiClient *APIClient
	watcher   *fsnotify.Watcher
	processed map[string]bool // Track processed directories
	logger    zerolog.Logger
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
		logger:    logger.With().Str("component", "watcher").Logger(),
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
			fw.logger.Warn().Err(err).Str("path", path).Msg("Failed to watch path")
			continue
		}
		fw.logger.Info().Str("path", path).Msg("Watching directory")
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
			fw.logger.Error().Err(err).Msg("Watcher error")
		}
	}
}

// handleDirectoryEvent processes a new directory (satellite pass)
func (fw *FileWatcher) handleDirectoryEvent(dirPath string) {
	// Check if already processed
	if fw.processed[dirPath] {
		return
	}

	fw.logger.Info().Str("dir", dirPath).Msg("Detected new satellite pass directory")

	// Wait for the configured delay to allow sathub to complete processing
	fw.logger.Info().
		Dur("delay_ms", fw.config.ProcessDelay).
		Int64("delay_seconds", int64(fw.config.ProcessDelay.Seconds())).
		Int64("delay_minutes", int64(fw.config.ProcessDelay.Minutes())).
		Msg("Waiting before processing")
	time.Sleep(fw.config.ProcessDelay)

	// Check if this looks like a complete satellite pass
	if !fw.isCompleteSatellitePass(dirPath) {
		fw.logger.Warn().Str("dir", dirPath).Msg("Directory doesn't appear to be a complete satellite pass, skipping")
		return
	}

	// Mark as processed immediately
	fw.processed[dirPath] = true

	// Process the directory
	if err := fw.processSatellitePass(dirPath); err != nil {
		fw.logger.Error().Err(err).Str("dir", dirPath).Msg("Failed to process satellite pass")
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
			fw.logger.Warn().Err(err).Str("path", watchPath).Msg("Failed to read directory")
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
			fw.logger.Debug().Time("timestamp", data.Timestamp).Msg("Parsed timestamp")
		} else {
			data.Timestamp = time.Now() // fallback
			fw.logger.Warn().Str("raw_timestamp", ts).Msg("Invalid timestamp format, using current time")
		}
	} else {
		data.Timestamp = time.Now()
		fw.logger.Warn().Msg("No timestamp found, using current time")
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
	fw.logger.Info().Str("satellite", data.SatelliteName).Msg("Parsed satellite name")

	// Log additional satellite information if available
	if norad, ok := rawData["norad"].(float64); ok {
		fw.logger.Debug().Float64("norad_id", norad).Msg("NORAD ID")
	}
	if frequency, ok := rawData["frequency"].(float64); ok {
		fw.logger.Debug().Float64("frequency_mhz", frequency).Msg("Frequency")
	}
	if modulation, ok := rawData["modulation"].(string); ok {
		fw.logger.Debug().Str("modulation", modulation).Msg("Modulation")
	}

	// Log dataset information if available
	if datasets, ok := rawData["datasets"].([]interface{}); ok {
		fw.logger.Debug().Int("count", len(datasets)).Msg("Found datasets")
		for i, ds := range datasets {
			if dsMap, ok := ds.(map[string]interface{}); ok {
				if name, ok := dsMap["name"].(string); ok {
					fw.logger.Debug().Int("index", i+1).Str("name", name).Msg("Dataset")
				}
			}
		}
	}

	// Log product information if available
	if products, ok := rawData["products"].([]interface{}); ok {
		fw.logger.Debug().Int("count", len(products)).Msg("Found products")
		for i, prod := range products {
			if prodMap, ok := prod.(map[string]interface{}); ok {
				if name, ok := prodMap["name"].(string); ok {
					fw.logger.Debug().Int("index", i+1).Str("name", name).Msg("Product")
				}
			}
		}
	}

	// Remove processed fields from metadata to avoid duplication
	delete(rawData, "timestamp")
	delete(rawData, "satellite_name")
	delete(rawData, "satellite")
	delete(rawData, "name")

	fw.logger.Debug().Int("fields", len(rawData)).Msg("Parsed dataset.json")
	return data, nil
}

// parseCBORTimestamps parses CBOR file and extracts the earliest valid timestamp
func (fw *FileWatcher) parseCBORTimestamps(cborPath string) (time.Time, error) {
	file, err := os.Open(cborPath)
	if err != nil {
		return time.Time{}, fmt.Errorf("failed to open CBOR file: %w", err)
	}
	defer file.Close()

	var product SatDumpProduct
	if err := cbor.NewDecoder(file).Decode(&product); err != nil {
		return time.Time{}, fmt.Errorf("failed to parse CBOR data: %w", err)
	}

	if len(product.Timestamps) == 0 {
		return time.Time{}, fmt.Errorf("no timestamps found in CBOR")
	}

	// Find the earliest valid timestamp (skip -1 values which indicate missing data)
	var earliestTime *time.Time
	for _, ts := range product.Timestamps {
		if timestamp, ok := ts.(float64); ok && timestamp != -1 {
			t := time.Unix(int64(timestamp), 0)
			if earliestTime == nil || t.Before(*earliestTime) {
				earliestTime = &t
			}
		}
	}

	if earliestTime == nil {
		return time.Time{}, fmt.Errorf("no valid timestamps found in CBOR")
	}

	fw.logger.Debug().Time("earliest_timestamp", *earliestTime).Int("total_timestamps", len(product.Timestamps)).Msg("Extracted earliest timestamp from CBOR")
	return *earliestTime, nil
}

// isCompleteSatellitePass checks if a directory contains a complete satellite pass
func (fw *FileWatcher) isCompleteSatellitePass(dirPath string) bool {
	// Check for dataset.json (main metadata file)
	datasetPath := filepath.Join(dirPath, "dataset.json")
	if _, err := os.Stat(datasetPath); os.IsNotExist(err) {
		return false
	}

	// Check for CADU file in root directory
	caduPath := filepath.Join(dirPath, "*.cadu")
	matches, err := filepath.Glob(caduPath)
	if err == nil && len(matches) > 0 {
		return true
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
	fw.logger.Info().Str("dir", dirPath).Msg("Processing satellite pass")

	// Read dataset.json for main metadata
	datasetPath := filepath.Join(dirPath, "dataset.json")
	dataset, err := fw.parseJSONFile(datasetPath)
	if err != nil {
		return fmt.Errorf("failed to parse dataset.json: %w", err)
	}

	// Check for CADU files in root directory
	var caduPaths []string
	caduGlob := filepath.Join(dirPath, "*.cadu")
	if matches, err := filepath.Glob(caduGlob); err == nil && len(matches) > 0 {
		caduPaths = matches
		fw.logger.Debug().Int("count", len(caduPaths)).Msg("Found CADU files")
	}

	// Always check for CBOR and images, regardless of CADU presence
	var selectedProduct string
	var cborPath string
	var imagePaths []string

	// Find product directories and collect files
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return fmt.Errorf("failed to read directory: %w", err)
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		potentialProductDir := filepath.Join(dirPath, entry.Name())
		cborFile := filepath.Join(potentialProductDir, "product.cbor")

		// Check if this directory contains a CBOR file
		if _, err := os.Stat(cborFile); err == nil {
			// Found a product directory with CBOR
			if selectedProduct == "" {
				selectedProduct = entry.Name()
				cborPath = cborFile
			}

			// Collect all PNG images from this product directory
			productEntries, err := os.ReadDir(potentialProductDir)
			if err != nil {
				fw.logger.Warn().Err(err).Str("dir", potentialProductDir).Msg("Failed to read product directory")
				continue
			}

			for _, productEntry := range productEntries {
				if strings.HasSuffix(productEntry.Name(), ".png") {
					imagePaths = append(imagePaths, filepath.Join(potentialProductDir, productEntry.Name()))
				}
			}
		}
	}

	if selectedProduct != "" {
		fw.logger.Info().Str("product", selectedProduct).Int("images", len(imagePaths)).Msg("Found product with CBOR and images")
	}

	if len(caduPaths) > 0 {
		fw.logger.Info().Int("cadu_files", len(caduPaths)).Msg("Processing CADU files")
	}

	// Determine the timestamp to use for the post
	// Prefer CBOR timestamps over dataset.json processing timestamp
	postTimestamp := dataset.Timestamp
	if cborPath != "" {
		if cborTimestamp, err := fw.parseCBORTimestamps(cborPath); err != nil {
			fw.logger.Warn().Err(err).Str("cbor", cborPath).Msg("Failed to parse CBOR timestamps, falling back to dataset.json timestamp")
		} else {
			postTimestamp = cborTimestamp
			fw.logger.Info().Time("cbor_timestamp", cborTimestamp).Time("dataset_timestamp", dataset.Timestamp).Msg("Using CBOR timestamp instead of dataset.json timestamp")
		}
	}

	// Create post with metadata
	postReq := PostRequest{
		Timestamp:     postTimestamp.Format(time.RFC3339),
		SatelliteName: dataset.SatelliteName,
		Metadata:      fw.mapToJSON(dataset.Metadata),
	}

	post, err := fw.apiClient.CreatePost(postReq)
	if err != nil {
		return fmt.Errorf("failed to create post: %w", err)
	}

	fw.logger.Info().Str("post_id", post.ID).Str("satellite", post.SatelliteName).Msg("Created post")

	// Upload CADU files if present
	for _, caduPath := range caduPaths {
		if err := fw.apiClient.UploadCADU(post.ID, caduPath); err != nil {
			fw.logger.Warn().Err(err).Str("cadu", caduPath).Msg("Failed to upload CADU")
			// Continue with other uploads
		} else {
			fw.logger.Info().Str("cadu", filepath.Base(caduPath)).Str("post_id", post.ID).Msg("Uploaded CADU")
		}
	}

	// Upload CBOR file if present
	if cborPath != "" {
		if err := fw.apiClient.UploadCBOR(post.ID, cborPath); err != nil {
			fw.logger.Warn().Err(err).Str("cbor", cborPath).Msg("Failed to upload CBOR")
			// Continue with image uploads even if CBOR fails
		} else {
			fw.logger.Info().Str("cbor", filepath.Base(cborPath)).Str("post_id", post.ID).Msg("Uploaded CBOR")
		}
	}

	// Upload all images
	for _, imagePath := range imagePaths {
		if err := fw.apiClient.UploadImage(post.ID, imagePath); err != nil {
			fw.logger.Warn().Err(err).Str("image", imagePath).Msg("Failed to upload image")
			// Continue with other images
		} else {
			fw.logger.Info().Str("image", filepath.Base(imagePath)).Str("post_id", post.ID).Msg("Uploaded image")
		}
	}

	// Send health check
	if err := fw.apiClient.StationHealth(); err != nil {
		fw.logger.Warn().Err(err).Msg("Failed to send health check")
	}

	return nil
}

// moveDirectoryToProcessed moves a processed directory to the processed location
func (fw *FileWatcher) moveDirectoryToProcessed(dirPath string) {
	dirName := filepath.Base(dirPath)
	dest := filepath.Join(fw.config.ProcessedDir, dirName)

	if err := os.Rename(dirPath, dest); err != nil {
		fw.logger.Warn().Err(err).Str("from", dirPath).Str("to", dest).Msg("Failed to move directory to processed")
	}
}

// mapToJSON converts a map to JSON string
func (fw *FileWatcher) mapToJSON(data map[string]interface{}) string {
	if jsonData, err := json.Marshal(data); err == nil {
		return string(jsonData)
	}
	return "{}"
}

// SatDumpProduct represents the structure of a SatDump CBOR product file
type SatDumpProduct struct {
	Instrument string                 `cbor:"instrument" json:"instrument"`
	Type       string                 `cbor:"type" json:"type"`
	TLE        map[string]interface{} `cbor:"tle,omitempty" json:"tle,omitempty"`
	// Image product specific fields
	BitDepth         interface{}            `cbor:"bit_depth,omitempty" json:"bit_depth,omitempty"`
	NeedsCorrelation interface{}            `cbor:"needs_correlation,omitempty" json:"needs_correlation,omitempty"`
	SaveAsMatrix     interface{}            `cbor:"save_as_matrix,omitempty" json:"save_as_matrix,omitempty"`
	Images           []interface{}          `cbor:"images,omitempty" json:"images,omitempty"`
	HasTimestamps    interface{}            `cbor:"has_timestamps,omitempty" json:"has_timestamps,omitempty"`
	TimestampsType   interface{}            `cbor:"timestamps_type,omitempty" json:"timestamps_type,omitempty"`
	Timestamps       []interface{}          `cbor:"timestamps,omitempty" json:"timestamps,omitempty"`
	ProjectionCfg    map[string]interface{} `cbor:"projection_cfg,omitempty" json:"projection_cfg,omitempty"`
	Calibration      map[string]interface{} `cbor:"calibration,omitempty" json:"calibration,omitempty"`
	// Allow additional unknown fields
	AdditionalFields map[string]interface{} `cbor:",toarray"`
}
