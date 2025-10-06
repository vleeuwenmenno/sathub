package handlers

import (
	"encoding/json"
	"net/http"
	"sathub-ui-backend/config"
	"sathub-ui-backend/models"
	"sathub-ui-backend/utils"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GroundTrackStatus represents the processing status of ground track data
type GroundTrackStatus struct {
	Status         string    `json:"status"` // "available", "processing", "unavailable"
	Message        string    `json:"message"`
	PostAge        string    `json:"post_age"` // "fresh", "old"
	HasCBOR        bool      `json:"has_cbor"`
	HasGroundTrack bool      `json:"has_ground_track"`
	CreatedAt      time.Time `json:"created_at"`
	Data           *gin.H    `json:"data,omitempty"` // Ground track data when available
}

// GetPostGroundTrack returns the ground track for a post with detailed status
func GetPostGroundTrack(c *gin.Context) {
	postIDStr := c.Param("id")
	postID, err := uuid.Parse(postIDStr)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid post ID")
		return
	}

	db := config.GetDB()

	// Check if post exists
	var post models.Post
	if err := db.First(&post, "id = ?", postID).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Post not found")
		return
	}

	// Determine post age (fresh = created within last 10 minutes)
	now := time.Now()
	isFresh := now.Sub(post.CreatedAt) < 10*time.Minute
	postAge := "old"
	if isFresh {
		postAge = "fresh"
	}

	// Check if post has CBOR data (required for ground track processing)
	var hasCBOR bool
	// Check CBOR in post itself
	if len(post.CBOR) > 0 {
		hasCBOR = true
	} else {
		// Check CBOR in post_cbors table
		var cborCount int64
		db.Model(&models.PostCBOR{}).Where("post_id = ?", postID).Count(&cborCount)
		hasCBOR = cborCount > 0
	}

	// Get ground track
	var groundTrack models.PostGroundTrack
	hasGroundTrack := false
	if err := db.Where("post_id = ?", postID).First(&groundTrack).Error; err == nil {
		hasGroundTrack = true
	}

	// Determine status and message
	var status string
	var message string

	if hasGroundTrack {
		// Ground track is available
		status = "available"
		message = "Ground track data is available"
	} else if hasCBOR {
		// Has CBOR but no ground track - processing status
		status = "processing"
		if isFresh {
			message = "Post is fresh and ground track processing will begin shortly"
		} else {
			message = "Ground track is still processing. Please check back later"
		}
	} else {
		// No CBOR data available
		status = "unavailable"
		if isFresh {
			message = "Post is fresh and CBOR data is still being uploaded"
		} else {
			message = "Ground track data is not available for this post"
		}
	}

	statusResponse := GroundTrackStatus{
		Status:         status,
		Message:        message,
		PostAge:        postAge,
		HasCBOR:        hasCBOR,
		HasGroundTrack: hasGroundTrack,
		CreatedAt:      post.CreatedAt,
	}

	// If ground track is available, include the data
	if hasGroundTrack {
		// Parse track data JSON
		var trackPoints []models.GroundTrackPoint
		if err := json.Unmarshal([]byte(groundTrack.TrackData), &trackPoints); err != nil {
			utils.Logger.Error().Err(err).Str("post_id", postIDStr).Msg("Failed to parse ground track data")
			utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to parse ground track data")
			return
		}

		data := gin.H{
			"post_id":      groundTrack.PostID,
			"track_points": trackPoints,
			"start_lat":    groundTrack.StartLat,
			"start_lon":    groundTrack.StartLon,
			"end_lat":      groundTrack.EndLat,
			"end_lon":      groundTrack.EndLon,
			"processed_at": groundTrack.ProcessedAt,
			"point_count":  len(trackPoints),
		}
		statusResponse.Data = &data
	}

	utils.SuccessResponse(c, http.StatusOK, "Ground track status retrieved successfully", statusResponse)
}
