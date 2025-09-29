package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"sathub-ui-backend/config"
	"sathub-ui-backend/models"
	"sathub-ui-backend/utils"

	"github.com/gin-gonic/gin"
)

// UserSummary represents user data for global listing
type UserSummary struct {
	ID                string `json:"id"`
	Username          string `json:"username"`
	DisplayName       string `json:"display_name,omitempty"`
	Email             string `json:"email,omitempty"`
	Role              string `json:"role"`
	PublicStations    int    `json:"public_stations"`
	PublicPosts       int    `json:"public_posts"`
	CreatedAt         string `json:"created_at"`
	ProfilePictureURL string `json:"profile_picture_url,omitempty"`
	HasProfilePicture bool   `json:"has_profile_picture"`
}

// GetGlobalUsers handles listing all users with public content (public endpoint)
func GetGlobalUsers(c *gin.Context) {
	db := config.GetDB()

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
		"created_at":   "users.created_at",
		"username":     "users.username",
		"display_name": "users.display_name",
	}

	sortField, valid := validSorts[sort]
	if !valid {
		sortField = "users.created_at"
	}

	// Validate order
	if order != "asc" && order != "desc" {
		order = "desc"
	}

	// Build query to get users with public stations
	query := db.Model(&models.User{}).
		Select(`users.id, users.username, users.display_name, users.email, users.role, users.created_at,
			CASE WHEN users.profile_picture IS NOT NULL AND users.profile_picture != '' THEN CONCAT('/api/users/', users.id, '/profile-picture?t=', TO_CHAR(users.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')) ELSE '' END as profile_picture_url,
			CASE WHEN users.profile_picture IS NOT NULL THEN true ELSE false END as has_profile_picture,
			COUNT(DISTINCT CASE WHEN stations.is_public = true THEN stations.id END) as public_stations,
			COUNT(DISTINCT CASE WHEN stations.is_public = true THEN posts.id END) as public_posts`).
		Joins("LEFT JOIN stations ON users.id = user_id").
		Joins("LEFT JOIN posts ON stations.id = posts.station_id AND stations.is_public = true").
		Group("users.id, users.username, users.display_name, users.email, users.role, users.created_at, users.profile_picture").
		Having("COUNT(DISTINCT CASE WHEN stations.is_public = true THEN stations.id END) > 0")

	// Add search filter if provided
	if search != "" {
		query = query.Where("users.username LIKE ?", "%"+search+"%")
	}

	// Apply sorting and pagination
	query = query.Order(sortField + " " + order).Limit(limit).Offset(offset)

	var results []struct {
		ID                string `json:"id"`
		Username          string `json:"username"`
		DisplayName       string `json:"display_name"`
		Email             string `json:"email"`
		Role              string `json:"role"`
		PublicStations    int    `json:"public_stations"`
		PublicPosts       int    `json:"public_posts"`
		CreatedAt         string `json:"created_at"`
		ProfilePictureURL string `json:"profile_picture_url"`
		HasProfilePicture bool   `json:"has_profile_picture"`
	}

	if err := query.Scan(&results).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to fetch users")
		return
	}

	// Convert to UserSummary slice
	users := make([]UserSummary, len(results))
	for i, result := range results {
		users[i] = UserSummary{
			ID:                result.ID,
			Username:          result.Username,
			DisplayName:       result.DisplayName,
			Email:             result.Email,
			Role:              result.Role,
			PublicStations:    result.PublicStations,
			PublicPosts:       result.PublicPosts,
			CreatedAt:         result.CreatedAt,
			ProfilePictureURL: result.ProfilePictureURL,
			HasProfilePicture: result.HasProfilePicture,
		}
	}

	utils.SuccessResponse(c, http.StatusOK, "Users retrieved successfully", users)
}
