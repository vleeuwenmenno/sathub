package handlers

import (
	"encoding/json"
	"net/http"
	"sathub-ui-backend/config"
	"sathub-ui-backend/models"
	"sathub-ui-backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GetPostGroundTrack returns the ground track for a post
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

	// Get ground track
	var groundTrack models.PostGroundTrack
	if err := db.Where("post_id = ?", postID).First(&groundTrack).Error; err != nil {
		// Ground track not yet calculated
		utils.ErrorResponse(c, http.StatusNotFound, "Ground track not available yet. It may still be processing.")
		return
	}

	// Parse track data JSON
	var trackPoints []models.GroundTrackPoint
	if err := json.Unmarshal([]byte(groundTrack.TrackData), &trackPoints); err != nil {
		utils.Logger.Error().Err(err).Str("post_id", postIDStr).Msg("Failed to parse ground track data")
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to parse ground track data")
		return
	}

	// Return ground track with metadata
	utils.SuccessResponse(c, http.StatusOK, "Ground track retrieved successfully", gin.H{
		"post_id":      groundTrack.PostID,
		"track_points": trackPoints,
		"start_lat":    groundTrack.StartLat,
		"start_lon":    groundTrack.StartLon,
		"end_lat":      groundTrack.EndLat,
		"end_lon":      groundTrack.EndLon,
		"processed_at": groundTrack.ProcessedAt,
		"point_count":  len(trackPoints),
	})
}
