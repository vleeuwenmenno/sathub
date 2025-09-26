package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"satdump-ui-backend/config"
	"satdump-ui-backend/models"
	"satdump-ui-backend/utils"

	"github.com/gin-gonic/gin"
)

// UserSummary represents user data for global listing
type UserSummary struct {
	ID             uint   `json:"id"`
	Username       string `json:"username"`
	Email          string `json:"email,omitempty"`
	Role           string `json:"role"`
	PublicStations int    `json:"public_stations"`
	PublicPosts    int    `json:"public_posts"`
	CreatedAt      string `json:"created_at"`
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
		"created_at": "users.created_at",
		"username":   "users.username",
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
		Select(`users.id, users.username, users.email, users.role, users.created_at,
			COUNT(DISTINCT CASE WHEN stations.is_public = true THEN stations.id END) as public_stations,
			COUNT(DISTINCT CASE WHEN stations.is_public = true THEN posts.id END) as public_posts`).
		Joins("LEFT JOIN stations ON users.id = user_id").
		Joins("LEFT JOIN posts ON stations.id = posts.station_id AND stations.is_public = true").
		Group("users.id, users.username, users.email, users.role, users.created_at").
		Having("COUNT(DISTINCT CASE WHEN stations.is_public = true THEN stations.id END) > 0")

	// Add search filter if provided
	if search != "" {
		query = query.Where("users.username LIKE ?", "%"+search+"%")
	}

	// Apply sorting and pagination
	query = query.Order(sortField + " " + order).Limit(limit).Offset(offset)

	var results []struct {
		ID             uint   `json:"id"`
		Username       string `json:"username"`
		Email          string `json:"email"`
		Role           string `json:"role"`
		PublicStations int    `json:"public_stations"`
		PublicPosts    int    `json:"public_posts"`
		CreatedAt      string `json:"created_at"`
	}

	if err := query.Scan(&results).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to fetch users")
		return
	}

	// Convert to UserSummary slice
	users := make([]UserSummary, len(results))
	for i, result := range results {
		users[i] = UserSummary{
			ID:             result.ID,
			Username:       result.Username,
			Email:          result.Email,
			Role:           result.Role,
			PublicStations: result.PublicStations,
			PublicPosts:    result.PublicPosts,
			CreatedAt:      result.CreatedAt,
		}
	}

	utils.SuccessResponse(c, http.StatusOK, "Users retrieved successfully", users)
}
