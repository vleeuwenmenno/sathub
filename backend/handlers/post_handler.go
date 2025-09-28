package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"satdump-ui-backend/config"
	"satdump-ui-backend/middleware"
	"satdump-ui-backend/models"
	"satdump-ui-backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// PostRequest represents the request body for creating a post
type PostRequest struct {
	Timestamp     string `json:"timestamp" binding:"required"`
	SatelliteName string `json:"satellite_name" binding:"required,min=1,max=100"`
	Metadata      string `json:"metadata"`       // JSON string
	CBOR          []byte `json:"cbor,omitempty"` // Optional CBOR blob
}

// PostResponse represents a post in responses
type PostResponse struct {
	ID            uint                `json:"id"`
	StationID     string              `json:"station_id"`
	StationName   string              `json:"station_name"`
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
func generatePostImageURL(postID, imageID uint) string {
	return fmt.Sprintf("/api/posts/%d/images/%d", postID, imageID)
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

	// Get posts where station belongs to user and station is public
	if err := db.Preload("Station").Joins("Station").Where("user_id = ? AND is_public = ?", userID, true).Find(&posts).Error; err != nil {
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

	// Get all posts for the station
	if err := db.Preload("Station").Where("station_id = ?", stationID).Order("created_at DESC").Find(&posts).Error; err != nil {
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
	postID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ValidationErrorResponse(c, "Invalid post ID")
		return
	}

	db := config.GetDB()

	// Check if user is authenticated
	userID, isAuthenticated := middleware.GetCurrentUserID(c)

	// Find post with station and user info
	var post models.Post
	query := db.Preload("Station").Preload("Station.User").Where("posts.id = ?", uint(postID))
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
	ID            uint                `json:"id"`
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

	// Get posts from public stations, ordered by created_at desc
	if err := db.Preload("Station").Joins("Station").Where("is_public = ?", true).Order("posts.created_at DESC").Limit(limit).Offset(offset).Find(&posts).Error; err != nil {
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
		CBOR:          req.CBOR,
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
		"has_cbor":       len(req.CBOR) > 0,
	})

	// Check for achievements after post creation
	go func() {
		// Get user ID from station
		var station models.Station
		if err := db.Where("id = ?", stationID).First(&station).Error; err == nil {
			if _, err := utils.CheckAchievements(station.UserID); err != nil {
				fmt.Printf("Failed to check achievements for user %s: %v\n", station.UserID, err)
			}
		}
	}()

	// Log post creation (system action since it's done by station token)
	utils.LogSystemAction(c, models.ActionPostCreate, models.AuditMetadata{
		"post_id":        post.ID,
		"station_id":     stationID,
		"satellite_name": req.SatelliteName,
		"has_metadata":   req.Metadata != "",
		"has_cbor":       len(req.CBOR) > 0,
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

	postID, err := strconv.ParseUint(c.Param("postId"), 10, 32)
	if err != nil {
		utils.ValidationErrorResponse(c, "Invalid post ID")
		return
	}

	db := config.GetDB()

	// Verify post belongs to the station
	var post models.Post
	if err := db.Where("id = ? AND station_id = ?", uint(postID), stationID).First(&post).Error; err != nil {
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

	// Create post image record
	postImage := models.PostImage{
		PostID:    uint(postID),
		ImageData: fileData,
		ImageType: contentType,
		Filename:  file.Filename,
	}

	if err := db.Create(&postImage).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to save image")
		return
	}

	// Log image upload (system action since it's done by station token)
	utils.LogSystemAction(c, models.ActionPostImageUpload, models.AuditMetadata{
		"post_id":      postID,
		"image_id":     postImage.ID,
		"filename":     postImage.Filename,
		"file_size":    len(fileData),
		"content_type": contentType,
	})

	response := PostImageResponse{
		ID:       postImage.ID,
		Filename: postImage.Filename,
		ImageURL: generatePostImageURL(uint(postID), postImage.ID),
	}

	utils.SuccessResponse(c, http.StatusCreated, "Image uploaded successfully", response)
}

// DeletePost handles deleting a post (only if owned by the authenticated user)
func DeletePost(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	postID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ValidationErrorResponse(c, "Invalid post ID")
		return
	}

	db := config.GetDB()

	// Find post and verify ownership through station
	var post models.Post
	if err := db.Joins("Station").Where("posts.id = ? AND user_id = ?", uint(postID), userID).First(&post).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Post not found or not owned by user")
			return
		}
		utils.InternalErrorResponse(c, "Failed to fetch post")
		return
	}

	// Delete associated images first
	if err := db.Where("post_id = ?", uint(postID)).Delete(&models.PostImage{}).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to delete post images")
		return
	}

	// Delete the post
	if err := db.Delete(&post).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to delete post")
		return
	}

	// Log post deletion
	utils.LogPostAction(c, models.ActionPostDelete, post.ID, models.AuditMetadata{
		"satellite_name": post.SatelliteName,
		"station_id":     post.StationID,
	})

	utils.SuccessResponse(c, http.StatusOK, "Post deleted successfully", nil)
}

// GetPostImage serves post images from database BLOB
func GetPostImage(c *gin.Context) {
	postID, err := strconv.ParseUint(c.Param("id"), 10, 32)
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

	// Find image and check post's station visibility
	var image models.PostImage
	query := db.Joins("Post").Joins("Post.Station").Where("post_images.id = ? AND post_images.post_id = ?", uint(imageID), uint(postID))
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

	// Set appropriate content type
	contentType := image.ImageType
	if contentType == "" {
		contentType = "image/jpeg" // default
	}

	c.Header("Content-Type", contentType)
	c.Data(http.StatusOK, contentType, image.ImageData)
}

// buildPostDetailResponse builds a PostDetailResponse from a Post model
func buildPostDetailResponse(post models.Post, db *gorm.DB) PostDetailResponse {
	return buildPostDetailResponseWithUser(post, db, "")
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
			ImageURL: generatePostImageURL(post.ID, img.ID),
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
		ID:            post.ID,
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
			ImageURL: generatePostImageURL(post.ID, img.ID),
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
		ID:            post.ID,
		StationID:     post.StationID,
		StationName:   post.Station.Name,
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
