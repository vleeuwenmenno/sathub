package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"sathub-ui-backend/config"
	"sathub-ui-backend/middleware"
	"sathub-ui-backend/models"
	"sathub-ui-backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// PostRequest represents the request body for creating a post
type PostRequest struct {
	Timestamp     string `json:"timestamp" binding:"required"`
	SatelliteName string `json:"satellite_name" binding:"required,min=1,max=100"`
	Metadata      string `json:"metadata"` // JSON string
}

// PostResponse represents a post in responses
type PostResponse struct {
	ID            string              `json:"id"`
	StationID     string              `json:"station_id"`
	StationName   string              `json:"station_name"`
	StationUser   *UserDetailResponse `json:"station_user,omitempty"`
	Timestamp     string              `json:"timestamp"`
	SatelliteName string              `json:"satellite_name"`
	Metadata      string              `json:"metadata"`
	Images        []PostImageResponse `json:"images"`
	LikesCount    int                 `json:"likes_count"`
	IsLiked       bool                `json:"is_liked"`
	CreatedAt     string              `json:"created_at"`
	UpdatedAt     string              `json:"updated_at"`
}

// PostImageResponse represents an image in responses
type PostImageResponse struct {
	ID       uint   `json:"id"`
	Filename string `json:"filename"`
	ImageURL string `json:"image_url"`
}

// generatePostImageURL creates a URL for accessing post images
func generatePostImageURL(postID string, imageID uint) string {
	return fmt.Sprintf("/api/posts/%s/images/%d", postID, imageID)
}

// GetUserPosts handles fetching all public posts for a specific user
func GetUserPosts(c *gin.Context) {
	userIDStr := c.Param("userId")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.ValidationErrorResponse(c, "Invalid user ID")
		return
	}

	db := config.GetDB()
	var posts []models.Post

	// Get posts where station belongs to user and station is public (exclude hidden posts)
	if err := db.Preload("Station").Joins("Station").Where("user_id = ? AND is_public = ? AND posts.hidden = ?", userID, true, false).Find(&posts).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to fetch posts")
		return
	}

	response := make([]PostResponse, len(posts))
	for i, post := range posts {
		response[i] = buildPostResponseWithUser(post, db, userIDStr)
	}

	utils.SuccessResponse(c, http.StatusOK, "Posts retrieved successfully", response)
}

// GetStationPosts handles fetching all posts for a specific station (if public or owned by user)
func GetStationPosts(c *gin.Context) {
	stationID := c.Param("stationId")
	if stationID == "" {
		utils.ValidationErrorResponse(c, "Invalid station ID")
		return
	}

	db := config.GetDB()
	var station models.Station

	// Check if station exists and is accessible
	userID, isAuthenticated := middleware.GetCurrentUserID(c)
	query := db.Where("id = ?", stationID)
	if !isAuthenticated {
		query = query.Where("is_public = ?", true)
	} else {
		query = query.Where("is_public = ? OR user_id = ?", true, userID)
	}

	if err := query.First(&station).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Station not found or not accessible")
			return
		}
		utils.InternalErrorResponse(c, "Failed to fetch station")
		return
	}

	var posts []models.Post

	// Get all non-hidden posts for the station
	if err := db.Preload("Station").Preload("Station.User").Where("station_id = ? AND hidden = ?", stationID, false).Order("created_at DESC").Find(&posts).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to fetch posts")
		return
	}

	response := make([]PostResponse, len(posts))
	for i, post := range posts {
		response[i] = buildPostResponseWithUser(post, db, userID)
	}

	utils.SuccessResponse(c, http.StatusOK, "Posts retrieved successfully", response)
}

// GetDatabasePostDetail handles fetching a single database post detail
func GetDatabasePostDetail(c *gin.Context) {
	postIDStr := c.Param("id")
	postID, err := uuid.Parse(postIDStr)
	if err != nil {
		utils.ValidationErrorResponse(c, "Invalid post ID")
		return
	}

	db := config.GetDB()

	// Check if user is authenticated
	userID, isAuthenticated := middleware.GetCurrentUserID(c)

	// Find post with station and user info (exclude hidden posts)
	var post models.Post
	query := db.Preload("Station").Preload("Station.User").Where("posts.id = ? AND posts.hidden = ?", postID, false)
	if !isAuthenticated {
		query = query.Joins("Station").Where("is_public = ?", true)
	} else {
		query = query.Joins("Station").Where("is_public = ? OR user_id = ?", true, userID)
	}

	if err := query.First(&post).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Post not found or not accessible")
			return
		}
		utils.InternalErrorResponse(c, "Failed to fetch post")
		return
	}

	response := buildPostDetailResponseWithUser(post, db, userID)
	utils.SuccessResponse(c, http.StatusOK, "Post detail retrieved successfully", response)
}

// PostDetailResponse represents detailed post information
type PostDetailResponse struct {
	ID            string              `json:"id"`
	StationID     string              `json:"station_id"`
	StationName   string              `json:"station_name"`
	StationUser   *UserDetailResponse `json:"station_user,omitempty"`
	Timestamp     string              `json:"timestamp"`
	SatelliteName string              `json:"satellite_name"`
	Metadata      string              `json:"metadata"`
	Images        []PostImageResponse `json:"images"`
	LikesCount    int                 `json:"likes_count"`
	IsLiked       bool                `json:"is_liked"`
	CreatedAt     string              `json:"created_at"`
	UpdatedAt     string              `json:"updated_at"`
}

// UserDetailResponse represents user information with profile picture for post details
type UserDetailResponse struct {
	ID                string `json:"id"`
	Username          string `json:"username"`
	DisplayName       string `json:"display_name,omitempty"`
	ProfilePictureURL string `json:"profile_picture_url,omitempty"`
	HasProfilePicture bool   `json:"has_profile_picture"`
}

// GetLatestPosts handles fetching the latest public posts
func GetLatestPosts(c *gin.Context) {
	db := config.GetDB()
	var posts []models.Post

	// Check if user is authenticated and get user ID
	userID, isAuthenticated := middleware.GetCurrentUserID(c)

	// Parse limit from query, default to 10
	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 || limit > 100 {
		limit = 10 // default and max 100
	}

	// Parse page from query, default to 1
	pageStr := c.DefaultQuery("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page <= 0 {
		page = 1
	}

	// For unauthenticated users, force limit to 10 and page to 1
	if !isAuthenticated {
		limit = 10
		page = 1
	}

	offset := (page - 1) * limit

	// Get posts from public stations, ordered by created_at desc (exclude hidden posts)
	if err := db.Preload("Station").Preload("Station.User").Joins("Station").Where("is_public = ? AND posts.hidden = ?", true, false).Order("posts.created_at DESC").Limit(limit).Offset(offset).Find(&posts).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to fetch posts")
		return
	}

	response := make([]PostResponse, len(posts))
	for i, post := range posts {
		response[i] = buildPostResponseWithUser(post, db, userID)
	}

	utils.SuccessResponse(c, http.StatusOK, "Latest posts retrieved successfully", response)
}

// CreatePost handles creating a new post using station token
func CreatePost(c *gin.Context) {
	stationID, exists := middleware.GetCurrentStationID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "Station not authenticated")
		return
	}

	var req PostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	// Validate metadata is valid JSON if provided
	if req.Metadata != "" {
		var metadataMap map[string]interface{}
		if err := json.Unmarshal([]byte(req.Metadata), &metadataMap); err != nil {
			utils.ValidationErrorResponse(c, "Invalid metadata JSON")
			return
		}
	}

	db := config.GetDB()

	// Parse timestamp
	timestamp, err := time.Parse(time.RFC3339, req.Timestamp)
	if err != nil {
		utils.ValidationErrorResponse(c, "Invalid timestamp format. Use RFC3339 format (e.g., 2023-01-01T12:00:00Z)")
		return
	}

	// Create new post
	post := models.Post{
		StationID:     stationID,
		Timestamp:     timestamp,
		SatelliteName: req.SatelliteName,
		Metadata:      req.Metadata,
	}

	if err := db.Create(&post).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to create post")
		return
	}

	// Log post creation (system action since it's done by station token)
	utils.LogSystemAction(c, models.ActionPostCreate, models.AuditMetadata{
		"post_id":        post.ID,
		"station_id":     stationID,
		"satellite_name": req.SatelliteName,
		"has_metadata":   req.Metadata != "",
	})

	response := buildPostResponseWithUser(post, db, "") // New post, no likes yet
	utils.SuccessResponse(c, http.StatusCreated, "Post created successfully", response)
}

// UploadPostImage handles uploading images for a post using station token
func UploadPostImage(c *gin.Context) {
	stationID, exists := middleware.GetCurrentStationID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "Station not authenticated")
		return
	}

	postIDStr := c.Param("postId")
	postID, err := uuid.Parse(postIDStr)
	if err != nil {
		utils.ValidationErrorResponse(c, "Invalid post ID")
		return
	}

	db := config.GetDB()

	// Verify post belongs to the station
	var post models.Post
	if err := db.Where("id = ? AND station_id = ?", postID, stationID).First(&post).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Post not found or not owned by station")
			return
		}
		utils.InternalErrorResponse(c, "Failed to fetch post")
		return
	}

	// Get uploaded file
	file, err := c.FormFile("image")
	if err != nil {
		utils.ValidationErrorResponse(c, "No image file provided")
		return
	}

	// Validate file type
	contentType := file.Header.Get("Content-Type")
	if !utils.IsImageContentType(contentType) {
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

	// Upload image to storage
	imageURL, err := utils.UploadImage(fileData, file.Filename, contentType, postID.String())
	if err != nil {
		utils.InternalErrorResponse(c, "Failed to upload image to storage")
		return
	}

	// Create post image record
	postImage := models.PostImage{
		PostID:    postID,
		ImageURL:  imageURL,
		ImageType: contentType,
		Filename:  file.Filename,
	}

	if err := db.Create(&postImage).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to save image record")
		return
	}

	// Log image upload (system action since it's done by station token)
	utils.LogSystemAction(c, models.ActionPostImageUpload, models.AuditMetadata{
		"post_id":      postID.String(),
		"image_id":     postImage.ID,
		"filename":     postImage.Filename,
		"file_size":    len(fileData),
		"content_type": contentType,
	})

	response := PostImageResponse{
		ID:       postImage.ID,
		Filename: postImage.Filename,
		ImageURL: generatePostImageURL(postID.String(), postImage.ID),
	}

	utils.SuccessResponse(c, http.StatusCreated, "Image uploaded successfully", response)
}

// PostCBORResponse represents a CBOR file in responses
type PostCBORResponse struct {
	ID       uint   `json:"id"`
	Filename string `json:"filename"`
}

// PostCADUResponse represents a CADU file in responses
type PostCADUResponse struct {
	ID       uint   `json:"id"`
	Filename string `json:"filename"`
}

// UploadPostCBOR handles uploading CBOR files for a post using station token
func UploadPostCBOR(c *gin.Context) {
	stationID, exists := middleware.GetCurrentStationID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "Station not authenticated")
		return
	}

	postIDStr := c.Param("postId")
	postID, err := uuid.Parse(postIDStr)
	if err != nil {
		utils.ValidationErrorResponse(c, "Invalid post ID")
		return
	}

	db := config.GetDB()

	// Verify post belongs to the station
	var post models.Post
	if err := db.Where("id = ? AND station_id = ?", postID, stationID).First(&post).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Post not found or not owned by station")
			return
		}
		utils.InternalErrorResponse(c, "Failed to fetch post")
		return
	}

	// Check if post already has a CBOR file
	var existingCBOR models.PostCBOR
	if err := db.Where("post_id = ?", postID).First(&existingCBOR).Error; err == nil {
		utils.ValidationErrorResponse(c, "Post already has a CBOR file")
		return
	} else if err != gorm.ErrRecordNotFound {
		utils.InternalErrorResponse(c, "Failed to check existing CBOR")
		return
	}

	// Get uploaded file
	file, err := c.FormFile("cbor")
	if err != nil {
		utils.ValidationErrorResponse(c, "No CBOR file provided")
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

	// Validate CBOR format and SatDump structure
	if _, err := utils.ValidateSatDumpCBOR(fileData); err != nil {
		utils.ValidationErrorResponse(c, fmt.Sprintf("Invalid CBOR file: %s", err.Error()))
		return
	}

	// Create post CBOR record
	postCBOR := models.PostCBOR{
		PostID:   postID,
		CBORData: fileData,
		Filename: file.Filename,
	}

	if err := db.Create(&postCBOR).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to save CBOR record")
		return
	}

	// Log CBOR upload (system action since it's done by station token)
	utils.LogSystemAction(c, models.ActionPostCBORUpload, models.AuditMetadata{
		"post_id":   postID.String(),
		"cbor_id":   postCBOR.ID,
		"filename":  postCBOR.Filename,
		"file_size": len(fileData),
	})

	response := PostCBORResponse{
		ID:       postCBOR.ID,
		Filename: postCBOR.Filename,
	}

	utils.SuccessResponse(c, http.StatusCreated, "CBOR uploaded successfully", response)
}

// UploadPostCADU handles uploading CADU files for a post using station token
func UploadPostCADU(c *gin.Context) {
	stationID, exists := middleware.GetCurrentStationID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "Station not authenticated")
		return
	}

	postIDStr := c.Param("postId")
	postID, err := uuid.Parse(postIDStr)
	if err != nil {
		utils.ValidationErrorResponse(c, "Invalid post ID")
		return
	}

	db := config.GetDB()

	// Verify post belongs to the station
	var post models.Post
	if err := db.Where("id = ? AND station_id = ?", postID, stationID).First(&post).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Post not found or not owned by station")
			return
		}
		utils.InternalErrorResponse(c, "Failed to fetch post")
		return
	}

	// Check if post already has a CADU file
	var existingCADU models.PostCADU
	if err := db.Where("post_id = ?", postID).First(&existingCADU).Error; err == nil {
		utils.ValidationErrorResponse(c, "Post already has a CADU file")
		return
	} else if err != gorm.ErrRecordNotFound {
		utils.InternalErrorResponse(c, "Failed to check existing CADU")
		return
	}

	// Get uploaded file
	file, err := c.FormFile("cadu")
	if err != nil {
		utils.ValidationErrorResponse(c, "No CADU file provided")
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

	// Create post CADU record
	postCADU := models.PostCADU{
		PostID:   postID,
		CADUData: fileData,
		Filename: file.Filename,
	}

	if err := db.Create(&postCADU).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to save CADU record")
		return
	}

	// Log CADU upload (system action since it's done by station token)
	utils.LogSystemAction(c, models.ActionPostCADUUpload, models.AuditMetadata{
		"post_id":   postID.String(),
		"cadu_id":   postCADU.ID,
		"filename":  postCADU.Filename,
		"file_size": len(fileData),
	})

	response := PostCADUResponse{
		ID:       postCADU.ID,
		Filename: postCADU.Filename,
	}

	utils.SuccessResponse(c, http.StatusCreated, "CADU uploaded successfully", response)
}

// GetPostCBOR serves post CBOR files
func GetPostCBOR(c *gin.Context) {
	utils.Logger.Info().Str("post_id", c.Param("id")).Msg("GetPostCBOR called")

	postIDStr := c.Param("id")
	postID, err := uuid.Parse(postIDStr)
	if err != nil {
		utils.Logger.Info().Str("post_id", c.Param("id")).Msg("Invalid post ID")
		utils.ValidationErrorResponse(c, "Invalid post ID")
		return
	}

	utils.Logger.Info().Str("post_id", postID.String()).Msg("Parsed post ID")

	db := config.GetDB()

	// Check if user is authenticated (for private posts)
	userID, isAuthenticated := middleware.GetCurrentUserID(c)
	utils.Logger.Info().Bool("authenticated", isAuthenticated).Str("user_id", userID).Msg("User authentication status")

	// First check if the post exists and is accessible (exclude hidden posts)
	var post models.Post
	postQuery := db.Where("posts.id = ? AND posts.hidden = ?", postID, false)
	if !isAuthenticated {
		postQuery = postQuery.Joins("Station").Where("is_public = ?", true)
	} else {
		postQuery = postQuery.Joins("Station").Where("is_public = ? OR user_id = ?", true, userID)
	}

	utils.Logger.Info().Msg("Checking post accessibility")
	if err := postQuery.First(&post).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.Logger.Info().Str("post_id", postID.String()).Msg("Post not found or not accessible")
			utils.NotFoundResponse(c, "Post not found or not accessible")
			return
		}
		utils.Logger.Error().Err(err).Msg("Error fetching post")
		utils.InternalErrorResponse(c, "Failed to fetch post")
		return
	}

	utils.Logger.Info().Str("station_id", post.StationID).Msg("Post found")

	// Now get the CBOR data for this post
	var cbor models.PostCBOR
	utils.Logger.Info().Str("post_id", postID.String()).Msg("Fetching CBOR data")
	if err := db.Where("post_id = ?", postID).First(&cbor).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.Logger.Info().Str("post_id", postID.String()).Msg("CBOR not found for post")
			utils.NotFoundResponse(c, "CBOR not found for this post")
			return
		}
		utils.Logger.Error().Err(err).Str("post_id", postID.String()).Msg("Error fetching CBOR")
		utils.InternalErrorResponse(c, "Failed to fetch CBOR")
		return
	}

	utils.Logger.Info().Str("post_id", postID.String()).Int("data_length", len(cbor.CBORData)).Str("filename", cbor.Filename).Msg("Found CBOR for post")

	// Check if client wants JSON format
	format := c.Query("format")
	utils.Logger.Info().Str("format", format).Msg("Requested format")
	if format == "json" {
		utils.Logger.Info().Str("post_id", postID.String()).Msg("Decoding CBOR to JSON")
		// Decode CBOR to JSON
		var jsonData interface{}
		if err := utils.DecodeCBORToJSON(cbor.CBORData, &jsonData); err != nil {
			utils.Logger.Error().Err(err).Str("post_id", postID.String()).Int("data_length", len(cbor.CBORData)).Msg("CBOR decode error")
			utils.InternalErrorResponse(c, "Failed to decode CBOR to JSON")
			return
		}

		utils.Logger.Info().Str("post_id", postID.String()).Msg("CBOR decoded successfully, returning JSON")
		c.Header("Content-Type", "application/json")
		c.JSON(http.StatusOK, jsonData)
		return
	}

	utils.Logger.Info().Msg("Returning CBOR binary data")
	// Set content type and headers
	c.Header("Content-Type", "application/cbor")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", cbor.Filename))

	// Return CBOR data
	c.Data(http.StatusOK, "application/cbor", cbor.CBORData)
}

// GetPostCADU serves post CADU files
func GetPostCADU(c *gin.Context) {
	utils.Logger.Info().Str("post_id", c.Param("id")).Msg("GetPostCADU called")

	postIDStr := c.Param("id")
	postID, err := uuid.Parse(postIDStr)
	if err != nil {
		utils.Logger.Info().Str("post_id", c.Param("id")).Msg("Invalid post ID")
		utils.ValidationErrorResponse(c, "Invalid post ID")
		return
	}

	utils.Logger.Info().Str("post_id", postID.String()).Msg("Parsed post ID")

	db := config.GetDB()

	// Check if user is authenticated (for private posts)
	userID, isAuthenticated := middleware.GetCurrentUserID(c)
	utils.Logger.Info().Bool("authenticated", isAuthenticated).Str("user_id", userID).Msg("User authentication status")

	// First check if the post exists and is accessible (exclude hidden posts)
	var post models.Post
	postQuery := db.Where("posts.id = ? AND posts.hidden = ?", postID, false)
	if !isAuthenticated {
		postQuery = postQuery.Joins("Station").Where("is_public = ?", true)
	} else {
		postQuery = postQuery.Joins("Station").Where("is_public = ? OR user_id = ?", true, userID)
	}

	utils.Logger.Info().Msg("Checking post accessibility")
	if err := postQuery.First(&post).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.Logger.Info().Str("post_id", postID.String()).Msg("Post not found or not accessible")
			utils.NotFoundResponse(c, "Post not found or not accessible")
			return
		}
		utils.Logger.Error().Err(err).Msg("Error fetching post")
		utils.InternalErrorResponse(c, "Failed to fetch post")
		return
	}

	utils.Logger.Info().Str("station_id", post.StationID).Msg("Post found")

	// Now get the CADU data for this post
	var cadu models.PostCADU
	utils.Logger.Info().Str("post_id", postID.String()).Msg("Fetching CADU data")
	if err := db.Where("post_id = ?", postID).First(&cadu).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.Logger.Info().Str("post_id", postID.String()).Msg("CADU not found for post")
			utils.NotFoundResponse(c, "CADU not found for this post")
			return
		}
		utils.Logger.Error().Err(err).Str("post_id", postID.String()).Msg("Error fetching CADU")
		utils.InternalErrorResponse(c, "Failed to fetch CADU")
		return
	}

	utils.Logger.Info().Str("post_id", postID.String()).Int("data_length", len(cadu.CADUData)).Str("filename", cadu.Filename).Msg("Found CADU for post")

	utils.Logger.Info().Msg("Returning CADU binary data")
	// Set content type and headers
	c.Header("Content-Type", "application/octet-stream")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", cadu.Filename))

	// Return CADU data
	c.Data(http.StatusOK, "application/octet-stream", cadu.CADUData)
}

// DeletePost handles deleting a post (only if owned by the authenticated user)
func DeletePost(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	postIDStr := c.Param("id")
	postID, err := uuid.Parse(postIDStr)
	if err != nil {
		utils.ValidationErrorResponse(c, "Invalid post ID")
		return
	}

	db := config.GetDB()

	// Find post and verify ownership through station
	var post models.Post
	if err := db.Joins("Station").Where("posts.id = ? AND user_id = ?", postID, userID).First(&post).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Post not found or not owned by user")
			return
		}
		utils.InternalErrorResponse(c, "Failed to fetch post")
		return
	}

	// Delete associated comment likes first (for comments on this post)
	if err := db.Where("comment_id IN (SELECT id FROM comments WHERE post_id = ?)", postID).Delete(&models.CommentLike{}).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to delete comment likes")
		return
	}

	// Delete associated comments
	if err := db.Where("post_id = ?", postID).Delete(&models.Comment{}).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to delete post comments")
		return
	}

	// Delete associated likes
	if err := db.Where("post_id = ?", postID).Delete(&models.Like{}).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to delete post likes")
		return
	}

	// Delete associated images from storage and database
	var images []models.PostImage
	if err := db.Where("post_id = ?", postID).Find(&images).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to fetch post images")
		return
	}

	// Delete images from storage
	for _, img := range images {
		if err := utils.DeleteImage(img.ImageURL); err != nil {
			// Log error but continue with deletion
			utils.Logger.Error().Err(err).Msg("Failed to delete image from storage")
		}
	}

	// Delete image records from database
	if err := db.Where("post_id = ?", postID).Delete(&models.PostImage{}).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to delete post images")
		return
	}

	// Delete associated CBOR records from database
	if err := db.Where("post_id = ?", postID).Delete(&models.PostCBOR{}).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to delete post CBOR")
		return
	}

	// Delete associated CADU records from database
	if err := db.Where("post_id = ?", postID).Delete(&models.PostCADU{}).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to delete post CADU")
		return
	}

	// Delete the post
	if err := db.Delete(&post).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to delete post")
		return
	}

	// Log post deletion
	utils.LogPostAction(c, models.ActionPostDelete, post.ID.String(), models.AuditMetadata{
		"satellite_name": post.SatelliteName,
		"station_id":     post.StationID,
	})

	utils.SuccessResponse(c, http.StatusOK, "Post deleted successfully", nil)
}

// GetPostImage serves post images by proxying from MinIO
func GetPostImage(c *gin.Context) {
	postIDStr := c.Param("id")
	postID, err := uuid.Parse(postIDStr)
	if err != nil {
		utils.ValidationErrorResponse(c, "Invalid post ID")
		return
	}

	imageID, err := strconv.ParseUint(c.Param("imageId"), 10, 32)
	if err != nil {
		utils.ValidationErrorResponse(c, "Invalid image ID")
		return
	}

	db := config.GetDB()

	// Check if user is authenticated (for private posts)
	userID, isAuthenticated := middleware.GetCurrentUserID(c)

	// Find image and check post's station visibility (exclude hidden posts)
	var image models.PostImage
	query := db.Joins("Post").Joins("Post.Station").Where("post_images.id = ? AND post_images.post_id = ? AND posts.hidden = ?", uint(imageID), postID, false)
	if !isAuthenticated {
		query = query.Where("is_public = ?", true)
	} else {
		query = query.Where("is_public = ? OR user_id = ?", true, userID)
	}

	if err := query.First(&image).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Image not found or not accessible")
			return
		}
		utils.InternalErrorResponse(c, "Failed to fetch image")
		return
	}

	// Proxy the image from MinIO
	resp, err := http.Get(image.ImageURL)
	if err != nil {
		utils.InternalErrorResponse(c, "Failed to fetch image from storage")
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		utils.InternalErrorResponse(c, "Image not available")
		return
	}

	// Set content type
	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = image.ImageType
		if contentType == "" {
			contentType = "image/jpeg"
		}
	}

	// Set cache control for images
	c.Header("Cache-Control", "public, max-age=86400") // Cache for 24 hours

	// Stream the image data
	c.DataFromReader(http.StatusOK, resp.ContentLength, contentType, resp.Body, nil)
}

// buildPostDetailResponseWithUser builds a PostDetailResponse from a Post model with user context
func buildPostDetailResponseWithUser(post models.Post, db *gorm.DB, userID string) PostDetailResponse {
	var images []models.PostImage
	db.Where("post_id = ?", post.ID).Find(&images)

	imageResponses := make([]PostImageResponse, len(images))
	for i, img := range images {
		imageResponses[i] = PostImageResponse{
			ID:       img.ID,
			Filename: img.Filename,
			ImageURL: generatePostImageURL(post.ID.String(), img.ID),
		}
	}

	var stationUser *UserDetailResponse
	if post.Station.User.ID != uuid.Nil {
		stationUser = &UserDetailResponse{
			ID:                post.Station.User.ID.String(),
			Username:          post.Station.User.Username,
			DisplayName:       post.Station.User.DisplayName,
			ProfilePictureURL: generateProfilePictureURL(post.Station.User.ID.String(), post.Station.User.UpdatedAt.Format("2006-01-02T15:04:05Z07:00")),
			HasProfilePicture: len(post.Station.User.ProfilePicture) > 0,
		}
	}

	// Get likes count
	var likesCount int64
	db.Model(&models.Like{}).Where("post_id = ?", post.ID).Count(&likesCount)

	// Check if user liked this post
	var isLiked bool
	if userID != "" {
		var like models.Like
		err := db.Where("user_id = ? AND post_id = ?", userID, post.ID).First(&like).Error
		isLiked = err == nil
	}

	return PostDetailResponse{
		ID:            post.ID.String(),
		StationID:     post.StationID,
		StationName:   post.Station.Name,
		StationUser:   stationUser,
		Timestamp:     post.Timestamp.Format("2006-01-02T15:04:05Z07:00"),
		SatelliteName: post.SatelliteName,
		Metadata:      post.Metadata,
		Images:        imageResponses,
		LikesCount:    int(likesCount),
		IsLiked:       isLiked,
		CreatedAt:     post.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:     post.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// buildPostResponse builds a PostResponse from a Post model
func buildPostResponse(post models.Post, db *gorm.DB) PostResponse {
	return buildPostResponseWithUser(post, db, "")
}

// buildPostResponseWithUser builds a PostResponse from a Post model with user context for likes
func buildPostResponseWithUser(post models.Post, db *gorm.DB, userID string) PostResponse {
	var images []models.PostImage
	db.Where("post_id = ?", post.ID).Find(&images)

	imageResponses := make([]PostImageResponse, len(images))
	for i, img := range images {
		imageResponses[i] = PostImageResponse{
			ID:       img.ID,
			Filename: img.Filename,
			ImageURL: generatePostImageURL(post.ID.String(), img.ID),
		}
	}

	var stationUser *UserDetailResponse
	if post.Station.User.ID != uuid.Nil {
		stationUser = &UserDetailResponse{
			ID:                post.Station.User.ID.String(),
			Username:          post.Station.User.Username,
			DisplayName:       post.Station.User.DisplayName,
			ProfilePictureURL: generateProfilePictureURL(post.Station.User.ID.String(), post.Station.User.UpdatedAt.Format("2006-01-02T15:04:05Z07:00")),
			HasProfilePicture: len(post.Station.User.ProfilePicture) > 0,
		}
	}

	// Get likes count
	var likesCount int64
	db.Model(&models.Like{}).Where("post_id = ?", post.ID).Count(&likesCount)

	// Check if user liked this post
	var isLiked bool
	if userID != "" {
		var like models.Like
		err := db.Where("user_id = ? AND post_id = ?", userID, post.ID).First(&like).Error
		isLiked = err == nil
	}

	return PostResponse{
		ID:            post.ID.String(),
		StationID:     post.StationID,
		StationName:   post.Station.Name,
		StationUser:   stationUser,
		Timestamp:     post.Timestamp.Format("2006-01-02T15:04:05Z07:00"),
		SatelliteName: post.SatelliteName,
		Metadata:      post.Metadata,
		Images:        imageResponses,
		LikesCount:    int(likesCount),
		IsLiked:       isLiked,
		CreatedAt:     post.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:     post.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}
