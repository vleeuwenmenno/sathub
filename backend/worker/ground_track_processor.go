package worker

import (
	"encoding/json"
	"fmt"
	"math"
	"time"

	"sathub-ui-backend/models"
	"sathub-ui-backend/utils"

	satellite "github.com/joshuaferrara/go-satellite"
	"gorm.io/gorm"
)

// GroundTrackProcessor processes CBOR data to calculate satellite ground tracks
type GroundTrackProcessor struct {
	db *gorm.DB
}

// NewGroundTrackProcessor creates a new ground track processor
func NewGroundTrackProcessor(db *gorm.DB) *GroundTrackProcessor {
	return &GroundTrackProcessor{db: db}
}

// Start begins the processing loop
func (p *GroundTrackProcessor) Start() {
	utils.Logger.Info().Msg("Starting ground track processor")

	// Process existing posts on startup
	p.processExistingPosts()

	// Run periodic checks every 5 minutes for new posts
	ticker := time.NewTicker(5 * time.Minute)
	go func() {
		for range ticker.C {
			p.processExistingPosts()
		}
	}()
}

// processExistingPosts processes all posts that don't have ground tracks yet
func (p *GroundTrackProcessor) processExistingPosts() {
	utils.Logger.Debug().Msg("Checking for posts without ground tracks")

	// Find posts with CBOR data that don't have ground tracks
	// CBOR data can be in posts.cbor or in the post_cbors table
	var posts []models.Post
	err := p.db.
		Joins("LEFT JOIN post_ground_tracks ON posts.id = post_ground_tracks.post_id").
		Joins("LEFT JOIN post_cbors ON posts.id = post_cbors.post_id").
		Where("post_ground_tracks.id IS NULL").
		Where("LENGTH(posts.cbor) > 0 OR post_cbors.id IS NOT NULL").
		Find(&posts).Error

	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to fetch posts without ground tracks")
		return
	}

	if len(posts) == 0 {
		utils.Logger.Debug().Msg("No posts need ground track processing")
		return
	}

	utils.Logger.Info().Int("count", len(posts)).Msg("Processing posts for ground track calculation")

	for _, post := range posts {
		if err := p.processPost(&post); err != nil {
			utils.Logger.Error().
				Err(err).
				Str("post_id", post.ID.String()).
				Msg("Failed to process ground track")
		} else {
			utils.Logger.Info().
				Str("post_id", post.ID.String()).
				Msg("Successfully calculated ground track")
		}
	}
}

// processPost calculates the ground track for a single post
func (p *GroundTrackProcessor) processPost(post *models.Post) error {
	var cborBytes []byte

	// Check if CBOR data is in the post itself
	if len(post.CBOR) > 0 {
		cborBytes = post.CBOR
	} else {
		// Load CBOR data from post_cbors table
		var postCBOR models.PostCBOR
		if err := p.db.Where("post_id = ?", post.ID).First(&postCBOR).Error; err != nil {
			return fmt.Errorf("no CBOR data found: %w", err)
		}
		cborBytes = postCBOR.CBORData
	}

	// Parse CBOR data
	var cborDataRaw interface{}
	if err := utils.DecodeCBORToJSON(cborBytes, &cborDataRaw); err != nil {
		return fmt.Errorf("failed to decode CBOR: %w", err)
	}

	// Cast to map
	cborData, ok := cborDataRaw.(map[string]interface{})
	if !ok {
		return fmt.Errorf("CBOR data is not a map")
	}

	// Extract TLE data
	tleData, ok := cborData["tle"].(map[string]interface{})
	if !ok {
		return fmt.Errorf("no TLE data found in CBOR")
	}

	line1, ok := tleData["line1"].(string)
	if !ok {
		return fmt.Errorf("invalid TLE line1")
	}

	line2, ok := tleData["line2"].(string)
	if !ok {
		return fmt.Errorf("invalid TLE line2")
	}

	// Extract timestamps
	timestamps, ok := cborData["timestamps"].([]interface{})
	if !ok || len(timestamps) == 0 {
		return fmt.Errorf("no timestamps found in CBOR")
	}

	// Calculate ground track
	trackPoints, err := p.calculateGroundTrack(line1, line2, timestamps)
	if err != nil {
		return fmt.Errorf("failed to calculate ground track: %w", err)
	}

	if len(trackPoints) == 0 {
		return fmt.Errorf("no valid track points calculated")
	}

	// Convert track points to JSON
	trackJSON, err := json.Marshal(trackPoints)
	if err != nil {
		return fmt.Errorf("failed to marshal track data: %w", err)
	}

	// Save to database
	groundTrack := models.PostGroundTrack{
		PostID:      post.ID,
		TrackData:   string(trackJSON),
		StartLat:    trackPoints[0].Latitude,
		StartLon:    trackPoints[0].Longitude,
		EndLat:      trackPoints[len(trackPoints)-1].Latitude,
		EndLon:      trackPoints[len(trackPoints)-1].Longitude,
		ProcessedAt: time.Now(),
	}

	if err := p.db.Create(&groundTrack).Error; err != nil {
		return fmt.Errorf("failed to save ground track: %w", err)
	}

	return nil
}

// calculateGroundTrack uses TLE and timestamps to calculate satellite positions
func (p *GroundTrackProcessor) calculateGroundTrack(line1, line2 string, timestamps []interface{}) ([]models.GroundTrackPoint, error) {
	// Parse TLE
	sat := satellite.TLEToSat(line1, line2, satellite.GravityWGS84)

	var trackPoints []models.GroundTrackPoint
	var lastValidPoint *models.GroundTrackPoint

	for i, ts := range timestamps {
		var unixTime float64

		// Handle different timestamp formats
		switch v := ts.(type) {
		case float64:
			unixTime = v
		case int64:
			unixTime = float64(v)
		case int:
			unixTime = float64(v)
		default:
			continue
		}

		// Handle invalid timestamps (-1 indicates signal loss)
		if unixTime < 0 {
			// For signal loss, we need to estimate the position
			// Try to interpolate between last valid point and next valid point
			if lastValidPoint != nil {
				// Look ahead to find the next valid timestamp
				var nextValidTime float64
				var nextValidIndex int = -1
				for j := i + 1; j < len(timestamps); j++ {
					var nextTime float64
					switch v := timestamps[j].(type) {
					case float64:
						nextTime = v
					case int64:
						nextTime = float64(v)
					case int:
						nextTime = float64(v)
					default:
						continue
					}
					if nextTime >= 0 {
						nextValidTime = nextTime
						nextValidIndex = j
						break
					}
				}

				// Calculate estimated time for this point
				var estimatedTime float64
				if nextValidIndex > 0 {
					// Interpolate between last and next valid timestamp
					fraction := float64(i-len(trackPoints)+1) / float64(nextValidIndex-len(trackPoints)+2)
					estimatedTime = lastValidPoint.Timestamp + (nextValidTime-lastValidPoint.Timestamp)*fraction
				} else {
					// No next valid point, extrapolate from last valid point
					// Assume scan line spacing based on previous interval
					if len(trackPoints) >= 2 {
						timeDiff := trackPoints[len(trackPoints)-1].Timestamp - trackPoints[len(trackPoints)-2].Timestamp
						estimatedTime = lastValidPoint.Timestamp + timeDiff*float64(i-len(trackPoints)+1)
					} else {
						// Fallback: use last valid time + 1 second per scan line
						estimatedTime = lastValidPoint.Timestamp + float64(i-len(trackPoints)+1)
					}
				}

				// Calculate position using estimated time
				t := time.Unix(int64(estimatedTime), int64((estimatedTime-math.Floor(estimatedTime))*1e9))
				position, _ := satellite.Propagate(sat, t.Year(), int(t.Month()), t.Day(),
					t.Hour(), t.Minute(), t.Second())

				// Check for propagation errors
				if !math.IsNaN(position.X) && !math.IsNaN(position.Y) && !math.IsNaN(position.Z) {
					gmst := satellite.GSTimeFromDate(t.Year(), int(t.Month()), t.Day(),
						t.Hour(), t.Minute(), t.Second())
					altitude, _, latLong := satellite.ECIToLLA(position, gmst)
					lat := latLong.Latitude * (180.0 / math.Pi)
					lon := latLong.Longitude * (180.0 / math.Pi)

					// Add point with -1 timestamp to indicate signal loss
					trackPoints = append(trackPoints, models.GroundTrackPoint{
						Latitude:  lat,
						Longitude: lon,
						Altitude:  altitude,
						Timestamp: -1, // Mark as signal loss
					})
				}
			}
			continue
		}

		// Convert Unix timestamp to time.Time
		t := time.Unix(int64(unixTime), int64((unixTime-math.Floor(unixTime))*1e9))

		// Calculate satellite position at this time
		position, _ := satellite.Propagate(sat, t.Year(), int(t.Month()), t.Day(),
			t.Hour(), t.Minute(), t.Second())

		// Check for propagation errors
		if math.IsNaN(position.X) || math.IsNaN(position.Y) || math.IsNaN(position.Z) {
			continue
		}

		// Convert position to latitude/longitude/altitude
		gmst := satellite.GSTimeFromDate(t.Year(), int(t.Month()), t.Day(),
			t.Hour(), t.Minute(), t.Second())

		altitude, _, latLong := satellite.ECIToLLA(position, gmst)

		// LatLong contains latitude and longitude in radians, convert to degrees
		lat := latLong.Latitude * (180.0 / math.Pi)
		lon := latLong.Longitude * (180.0 / math.Pi)

		point := models.GroundTrackPoint{
			Latitude:  lat,
			Longitude: lon,
			Altitude:  altitude, // km
			Timestamp: unixTime,
		}

		trackPoints = append(trackPoints, point)
		lastValidPoint = &point
	}

	return trackPoints, nil
}
