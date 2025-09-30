package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"sathub-ui-backend/config"
	"sathub-ui-backend/middleware"
	"sathub-ui-backend/models"
	"sathub-ui-backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// generatePictureURL creates a URL for accessing station pictures
func generatePictureURL(stationID string, updatedAt string) string {
	if stationID == "" {
		return ""
	}
	return fmt.Sprintf("/stations/%s/picture?t=%s", stationID, updatedAt)
}

// isStationOnline checks if a station is considered online based on last seen time
func isStationOnline(lastSeen *time.Time, thresholdMinutes int) bool {
	if lastSeen == nil {
		return false
	}
	return time.Since(*lastSeen) <= time.Duration(thresholdMinutes)*time.Minute
}

// buildStationResponse creates a StationResponse from a Station model
func buildStationResponse(station models.Station) StationResponse {
	db := config.GetDB()
	var lastUptime models.StationUptime
	var lastSeen *time.Time

	// Get the latest uptime record for this station
	if err := db.Where("station_id = ?", station.ID).Order("timestamp DESC").First(&lastUptime).Error; err == nil {
		lastSeen = &lastUptime.Timestamp
	}

	var lastSeenStr *string
	if lastSeen != nil {
		formatted := lastSeen.Format("2006-01-02T15:04:05Z07:00")
		lastSeenStr = &formatted
	}

	return StationResponse{
		ID:              station.ID,
		Name:            station.Name,
		Location:        station.Location,
		Latitude:        station.Latitude,
		Longitude:       station.Longitude,
		Picture:         generatePictureURL(station.ID, station.UpdatedAt.Format("2006-01-02T15:04:05Z07:00")),
		HasPicture:      len(station.Picture) > 0,
		Equipment:       station.Equipment,
		IsPublic:        station.IsPublic,
		LastSeen:        lastSeenStr,
		IsOnline:        isStationOnline(lastSeen, station.OnlineThreshold),
		OnlineThreshold: station.OnlineThreshold,
		CreatedAt:       station.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:       station.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// buildStationResponseWithToken creates a StationResponse from a Station model including the token
func buildStationResponseWithToken(station models.Station) StationResponse {
	response := buildStationResponse(station)
	response.Token = station.Token
	return response
}

// StationRequest represents the request body for creating/updating a station
type StationRequest struct {
	Name            string   `json:"name" binding:"required,min=1,max=100"`
	Location        string   `json:"location" binding:"required,min=1,max=200"`
	Latitude        *float64 `json:"latitude,omitempty"`
	Longitude       *float64 `json:"longitude,omitempty"`
	Equipment       string   `json:"equipment" binding:"max=1000"`
	IsPublic        *bool    `json:"is_public,omitempty"`        // Optional, defaults to true
	OnlineThreshold *int     `json:"online_threshold,omitempty"` // Optional, defaults to 5
}

// UserResponse represents user data in responses
type UserResponse struct {
	ID                string `json:"id"`
	Username          string `json:"username"`
	DisplayName       string `json:"display_name,omitempty"`
	ProfilePictureURL string `json:"profile_picture_url,omitempty"`
	HasProfilePicture bool   `json:"has_profile_picture"`
}

// StationResponse represents the station data in responses
type StationResponse struct {
	ID              string        `json:"id"`
	UserID          string        `json:"user_id,omitempty"`
	User            *UserResponse `json:"user,omitempty"`
	Name            string        `json:"name"`
	Location        string        `json:"location"`
	Latitude        *float64      `json:"latitude,omitempty"`
	Longitude       *float64      `json:"longitude,omitempty"`
	Picture         string        `json:"picture_url"` // URL to access the picture
	HasPicture      bool          `json:"has_picture"`
	Equipment       string        `json:"equipment"`
	IsPublic        bool          `json:"is_public"`
	Token           string        `json:"token,omitempty"` // Only included when explicitly requested
	LastSeen        *string       `json:"last_seen,omitempty"`
	IsOnline        bool          `json:"is_online"`
	OnlineThreshold int           `json:"online_threshold"`
	CreatedAt       string        `json:"created_at"`
	UpdatedAt       string        `json:"updated_at"`
}

// GetStations handles listing all stations for the authenticated user
func GetStations(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	db := config.GetDB()
	var stations []models.Station

	if err := db.Where("user_id = ?", userID).Find(&stations).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to fetch stations")
		return
	}

	response := make([]StationResponse, len(stations))
	for i, station := range stations {
		response[i] = buildStationResponse(station)
	}

	utils.SuccessResponse(c, http.StatusOK, "Stations retrieved successfully", response)
}

// GetStation handles retrieving a specific station
func GetStation(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	stationID := c.Param("id")
	if stationID == "" {
		utils.ValidationErrorResponse(c, "Invalid station ID")
		return
	}

	db := config.GetDB()
	var station models.Station

	if err := db.Where("id = ? AND user_id = ?", stationID, userID).First(&station).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Station not found")
			return
		}
		utils.InternalErrorResponse(c, "Failed to fetch station")
		return
	}

	response := buildStationResponse(station)

	utils.SuccessResponse(c, http.StatusOK, "Station retrieved successfully", response)
}

// CreateStation handles creating a new station
func CreateStation(c *gin.Context) {
	userIDStr, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	var req StationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	// Parse userID to UUID
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.InternalErrorResponse(c, "Invalid user ID")
		return
	}

	db := config.GetDB()

	// Create new station
	onlineThreshold := 5 // default
	if req.OnlineThreshold != nil && *req.OnlineThreshold > 0 {
		onlineThreshold = *req.OnlineThreshold
	}

	station := models.Station{
		UserID:          userID,
		Name:            req.Name,
		Location:        req.Location,
		Latitude:        req.Latitude,
		Longitude:       req.Longitude,
		Equipment:       req.Equipment,
		IsPublic:        req.IsPublic == nil || *req.IsPublic, // Default to true if not specified
		OnlineThreshold: onlineThreshold,
	}

	// Save to database (token will be generated by BeforeCreate hook)
	if err := db.Create(&station).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to create station")
		return
	}

	// Check for achievements after station creation
	go func() {
		if _, err := utils.CheckAchievements(userID); err != nil {
			fmt.Printf("Failed to check achievements for user %s: %v\n", userID, err)
		}
	}()

	// Log station creation
	utils.LogStationAction(c, models.ActionStationCreate, station.ID, models.AuditMetadata{
		"name":      station.Name,
		"location":  station.Location,
		"is_public": station.IsPublic,
	})

	response := buildStationResponseWithToken(station)

	utils.SuccessResponse(c, http.StatusCreated, "Station created successfully", response)
}

// UpdateStation handles updating an existing station
func UpdateStation(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	stationID := c.Param("id")
	if stationID == "" {
		utils.ValidationErrorResponse(c, "Invalid station ID")
		return
	}

	var req StationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	db := config.GetDB()
	var station models.Station

	// Find and update station
	if err := db.Where("id = ? AND user_id = ?", stationID, userID).First(&station).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Station not found")
			return
		}
		utils.InternalErrorResponse(c, "Failed to fetch station")
		return
	}

	// Track changes for audit logging
	oldName := station.Name
	oldLocation := station.Location
	oldIsPublic := station.IsPublic
	oldOnlineThreshold := station.OnlineThreshold

	// Update fields
	station.Name = req.Name
	station.Location = req.Location
	station.Latitude = req.Latitude
	station.Longitude = req.Longitude
	station.Equipment = req.Equipment
	if req.IsPublic != nil {
		station.IsPublic = *req.IsPublic
	}
	if req.OnlineThreshold != nil && *req.OnlineThreshold > 0 {
		station.OnlineThreshold = *req.OnlineThreshold
	}

	if err := db.Save(&station).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to update station")
		return
	}

	// Log station update with changes
	changes := models.AuditMetadata{}
	if oldName != station.Name {
		changes["old_name"] = oldName
		changes["new_name"] = station.Name
	}
	if oldLocation != station.Location {
		changes["old_location"] = oldLocation
		changes["new_location"] = station.Location
	}
	if oldIsPublic != station.IsPublic {
		changes["old_is_public"] = oldIsPublic
		changes["new_is_public"] = station.IsPublic
	}
	if oldOnlineThreshold != station.OnlineThreshold {
		changes["old_online_threshold"] = oldOnlineThreshold
		changes["new_online_threshold"] = station.OnlineThreshold
	}

	utils.LogStationAction(c, models.ActionStationUpdate, station.ID, changes)

	response := buildStationResponse(station)

	utils.SuccessResponse(c, http.StatusOK, "Station updated successfully", response)
}

// DeleteStation handles deleting a station
func DeleteStation(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	stationID := c.Param("id")
	if stationID == "" {
		utils.ValidationErrorResponse(c, "Invalid station ID")
		return
	}

	db := config.GetDB()

	// Find station first to ensure it exists and belongs to user
	var station models.Station
	if err := db.Where("id = ? AND user_id = ?", stationID, userID).First(&station).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Station not found")
			return
		}
		utils.InternalErrorResponse(c, "Failed to fetch station")
		return
	}

	// Delete the station
	if err := db.Delete(&station).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to delete station")
		return
	}

	// Log station deletion
	utils.LogStationAction(c, models.ActionStationDelete, stationID, models.AuditMetadata{
		"station_name": station.Name,
		"was_public":   station.IsPublic,
	})

	utils.SuccessResponse(c, http.StatusOK, "Station deleted successfully", nil)
}

// GetStationToken handles retrieving the station token
func GetStationToken(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	stationID := c.Param("id")
	if stationID == "" {
		utils.ValidationErrorResponse(c, "Invalid station ID")
		return
	}

	db := config.GetDB()
	var station models.Station

	if err := db.Where("id = ? AND user_id = ?", stationID, userID).First(&station).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Station not found")
			return
		}
		utils.InternalErrorResponse(c, "Failed to fetch station")
		return
	}

	response := gin.H{
		"token": station.Token,
	}

	utils.SuccessResponse(c, http.StatusOK, "Station token retrieved successfully", response)
}

// RegenerateStationToken handles regenerating the station token
func RegenerateStationToken(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	stationID := c.Param("id")
	if stationID == "" {
		utils.ValidationErrorResponse(c, "Invalid station ID")
		return
	}

	db := config.GetDB()
	var station models.Station

	if err := db.Where("id = ? AND user_id = ?", stationID, userID).First(&station).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Station not found")
			return
		}
		utils.InternalErrorResponse(c, "Failed to fetch station")
		return
	}

	// Regenerate token
	if err := station.RegenerateToken(); err != nil {
		utils.InternalErrorResponse(c, "Failed to regenerate token")
		return
	}

	if err := db.Save(&station).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to save regenerated token")
		return
	}

	// Log token regeneration
	utils.LogStationAction(c, models.ActionStationTokenRegen, station.ID, models.AuditMetadata{
		"station_name": station.Name,
	})

	response := gin.H{
		"token": station.Token,
	}

	utils.SuccessResponse(c, http.StatusOK, "Station token regenerated successfully", response)
}

// UploadStationPicture handles uploading a picture for a station
func UploadStationPicture(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	stationID := c.Param("id")
	if stationID == "" {
		utils.ValidationErrorResponse(c, "Invalid station ID")
		return
	}

	db := config.GetDB()
	var station models.Station

	if err := db.Where("id = ? AND user_id = ?", stationID, userID).First(&station).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Station not found")
			return
		}
		utils.InternalErrorResponse(c, "Failed to fetch station")
		return
	}

	// Get uploaded file
	file, err := c.FormFile("picture")
	if err != nil {
		utils.ValidationErrorResponse(c, "No picture file provided")
		return
	}

	// Validate file type
	contentType := file.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		utils.ValidationErrorResponse(c, "File must be an image")
		return
	}

	// Open the uploaded file
	src, err := file.Open()
	if err != nil {
		utils.InternalErrorResponse(c, "Failed to open uploaded file")
		return
	}
	defer src.Close()

	// Read file data into byte slice
	fileData := make([]byte, file.Size)
	if _, err := src.Read(fileData); err != nil {
		utils.InternalErrorResponse(c, "Failed to read file data")
		return
	}

	// Update station with picture data
	station.Picture = fileData
	station.PictureType = contentType
	if err := db.Save(&station).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to update station picture")
		return
	}

	// Log picture upload
	utils.LogStationAction(c, models.ActionStationPictureUpload, station.ID, models.AuditMetadata{
		"station_name": station.Name,
		"file_size":    len(fileData),
		"content_type": contentType,
	})

	response := buildStationResponse(station)

	utils.SuccessResponse(c, http.StatusOK, "Station picture uploaded successfully", response)
}

// GetStationPicture serves station pictures from database BLOB
func GetStationPicture(c *gin.Context) {
	stationID := c.Param("id")
	if stationID == "" {
		utils.ValidationErrorResponse(c, "Invalid station ID")
		return
	}

	db := config.GetDB()
	var station models.Station

	// Check if user is authenticated (owner of the station)
	userID, isAuthenticated := middleware.GetCurrentUserID(c)

	// Build query based on permissions
	var query *gorm.DB
	if isAuthenticated {
		// Authenticated users can view pictures of stations they own or public stations
		query = db.Where("id = ? AND (user_id = ? OR is_public = ?)", stationID, userID, true)
	} else {
		// Unauthenticated users can only view pictures of public stations
		query = db.Where("id = ? AND is_public = ?", stationID, true)
	}

	if err := query.First(&station).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			if isAuthenticated {
				utils.NotFoundResponse(c, "Station not found")
			} else {
				utils.NotFoundResponse(c, "Station not found or not public")
			}
			return
		}
		utils.InternalErrorResponse(c, "Failed to fetch station")
		return
	}

	// Check if station has a picture
	if len(station.Picture) == 0 {
		utils.NotFoundResponse(c, "No picture available")
		return
	}

	// Set appropriate content type
	contentType := station.PictureType
	if contentType == "" {
		contentType = "image/jpeg" // default
	}

	c.Header("Content-Type", contentType)
	if station.IsPublic {
		c.Header("Cache-Control", "public, max-age=86400") // Cache for 24 hours for public images
	} else {
		c.Header("Cache-Control", "private, max-age=3600") // Cache for 1 hour for private images
	}
	c.Data(http.StatusOK, contentType, station.Picture)
}

// GetGlobalStations handles listing all public stations globally (public endpoint)
func GetGlobalStations(c *gin.Context) {
	db := config.GetDB()
	var stations []models.Station

	// Parse pagination parameters
	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 || limit > 100 {
		limit = 10 // default and max 100
	}

	pageStr := c.DefaultQuery("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page <= 0 {
		page = 1
	}

	offset := (page - 1) * limit

	// Parse sort parameter
	sort := c.DefaultQuery("sort", "created_at") // default sort by created_at
	order := c.DefaultQuery("order", "desc")     // default descending

	// Parse search parameter
	search := strings.TrimSpace(c.Query("search"))

	// Validate sort field
	validSorts := map[string]string{
		"created_at": "stations.created_at",
		"username":   "User.username",
		"name":       "stations.name",
	}

	sortField, valid := validSorts[sort]
	if !valid {
		sortField = "stations.created_at"
	}

	// Validate order
	if order != "asc" && order != "desc" {
		order = "desc"
	}

	// Build query with sorting and pagination
	query := db.Joins("User").Where("is_public = ?", true)

	// Add search filter if provided
	if search != "" {
		query = query.Where("stations.name LIKE ?", "%"+search+"%")
	}

	query = query.Order(sortField + " " + order).Limit(limit).Offset(offset)

	if err := query.Find(&stations).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to fetch stations")
		return
	}

	response := make([]StationResponse, len(stations))
	for i, station := range stations {
		stationResponse := buildStationResponse(station)
		stationResponse.UserID = station.UserID.String()

		// Add user information if it exists
		if station.User.ID != uuid.Nil {
			hasProfilePicture := len(station.User.ProfilePicture) > 0
			profilePictureURL := ""
			if hasProfilePicture {
				profilePictureURL = generateProfilePictureURL(station.User.ID.String(), station.User.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"))
			}
			stationResponse.User = &UserResponse{
				ID:                station.User.ID.String(),
				Username:          station.User.Username,
				DisplayName:       station.User.DisplayName,
				ProfilePictureURL: profilePictureURL,
				HasProfilePicture: hasProfilePicture,
			}
		}

		response[i] = stationResponse
	}

	utils.SuccessResponse(c, http.StatusOK, "Stations retrieved successfully", response)
}

// GetUserStations handles listing public stations for a specific user (public endpoint)
func GetUserStations(c *gin.Context) {
	userIDStr := c.Param("userId")
	if userIDStr == "" {
		utils.ValidationErrorResponse(c, "Invalid user ID")
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.ValidationErrorResponse(c, "Invalid user ID format")
		return
	}

	db := config.GetDB()
	var stations []models.Station

	if err := db.Joins("User").Where("user_id = ? AND is_public = ?", userID, true).Find(&stations).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to fetch stations")
		return
	}

	response := make([]StationResponse, len(stations))
	for i, station := range stations {
		stationResponse := buildStationResponse(station)

		// Add user information if it exists
		if station.User.ID != uuid.Nil {
			hasProfilePicture := len(station.User.ProfilePicture) > 0
			profilePictureURL := ""
			if hasProfilePicture {
				profilePictureURL = generateProfilePictureURL(station.User.ID.String(), station.User.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"))
			}
			stationResponse.User = &UserResponse{
				ID:                station.User.ID.String(),
				Username:          station.User.Username,
				DisplayName:       station.User.DisplayName,
				ProfilePictureURL: profilePictureURL,
				HasProfilePicture: hasProfilePicture,
			}
		}

		response[i] = stationResponse
	}

	utils.SuccessResponse(c, http.StatusOK, "User stations retrieved successfully", response)
}

// GetStationDetails handles retrieving detailed station information with user data (public endpoint)
func GetStationDetails(c *gin.Context) {
	stationID := c.Param("id")
	if stationID == "" {
		utils.ValidationErrorResponse(c, "Invalid station ID")
		return
	}

	db := config.GetDB()
	var station models.Station

	// Check if user is authenticated for access control
	userID, isAuthenticated := middleware.GetCurrentUserID(c)

	// Build query based on permissions
	query := db.Joins("User")
	if isAuthenticated {
		// Authenticated users can view stations they own or public stations
		query = query.Where("stations.id = ? AND (is_public = ? OR user_id = ?)", stationID, true, userID)
	} else {
		// Unauthenticated users can only view public stations
		query = query.Where("stations.id = ? AND is_public = ?", stationID, true)
	}

	if err := query.First(&station).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Station not found or not accessible")
			return
		}
		utils.InternalErrorResponse(c, "Failed to fetch station")
		return
	}

	response := buildStationResponse(station)
	response.UserID = station.UserID.String()

	// Add user information
	if station.User.ID != uuid.Nil {
		hasProfilePicture := len(station.User.ProfilePicture) > 0
		profilePictureURL := ""
		if hasProfilePicture {
			profilePictureURL = generateProfilePictureURL(station.User.ID.String(), station.User.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"))
		}
		response.User = &UserResponse{
			ID:                station.User.ID.String(),
			Username:          station.User.Username,
			DisplayName:       station.User.DisplayName,
			ProfilePictureURL: profilePictureURL,
			HasProfilePicture: hasProfilePicture,
		}
	}

	utils.SuccessResponse(c, http.StatusOK, "Station details retrieved successfully", response)
}

// StationHealth handles health check endpoint for stations
func StationHealth(c *gin.Context) {
	stationID, exists := middleware.GetCurrentStationID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "Station not authenticated")
		return
	}

	db := config.GetDB()
	now := time.Now()

	// Record the station's uptime event
	uptime := models.StationUptime{
		StationID: stationID,
		Timestamp: now,
		Event:     "online",
	}
	if err := db.Create(&uptime).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to record station health")
		return
	}

	// Get the station to check achievements for its owner
	var station models.Station
	if err := db.Where("id = ?", stationID).First(&station).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to get station information")
		return
	}

	// Check for achievements after station health check
	if _, err := utils.CheckAchievements(station.UserID); err != nil {
		fmt.Printf("Failed to check achievements for user %s: %v\n", station.UserID, err)
	}

	utils.SuccessResponse(c, http.StatusOK, "Health check successful", gin.H{
		"status":    "online",
		"timestamp": now.Format("2006-01-02T15:04:05Z07:00"),
	})
}

// GetStationUptime handles retrieving station uptime data for health graphs
func GetStationUptime(c *gin.Context) {
	stationID := c.Param("id")
	if stationID == "" {
		utils.ValidationErrorResponse(c, "Invalid station ID")
		return
	}

	// Parse query parameters
	daysStr := c.DefaultQuery("days", "7")
	days, err := strconv.Atoi(daysStr)
	if err != nil || days < 1 || days > 365 {
		utils.ValidationErrorResponse(c, "Invalid days parameter (1-365)")
		return
	}

	db := config.GetDB()

	// Get the station to include online_threshold
	var station models.Station
	if err := db.Where("id = ?", stationID).First(&station).Error; err != nil {
		utils.NotFoundResponse(c, "Station not found")
		return
	}

	// Calculate the start date
	startDate := time.Now().AddDate(0, 0, -days)

	// Get uptime records for the station within the time range
	var uptimes []models.StationUptime
	if err := db.Where("station_id = ? AND timestamp >= ?", stationID, startDate).Order("timestamp ASC").Find(&uptimes).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to fetch station uptime data")
		return
	}

	// Transform the data for the frontend
	type UptimePoint struct {
		Timestamp string `json:"timestamp"`
		Event     string `json:"event"`
	}

	uptimeData := make([]UptimePoint, len(uptimes))
	for i, uptime := range uptimes {
		uptimeData[i] = UptimePoint{
			Timestamp: uptime.Timestamp.Format("2006-01-02T15:04:05Z07:00"),
			Event:     uptime.Event,
		}
	}

	utils.SuccessResponse(c, http.StatusOK, "Station uptime data retrieved successfully", gin.H{
		"station_id":       stationID,
		"days":             days,
		"online_threshold": station.OnlineThreshold,
		"data":             uptimeData,
	})
}
