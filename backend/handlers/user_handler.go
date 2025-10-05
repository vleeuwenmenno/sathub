package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"sathub-ui-backend/config"
	"sathub-ui-backend/middleware"
	"sathub-ui-backend/models"
	"sathub-ui-backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
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

// Activity represents a user activity
type Activity struct {
	ID        string                 `json:"id"`
	Type      string                 `json:"type"`
	Timestamp string                 `json:"timestamp"`
	Data      map[string]interface{} `json:"data"`
}

// GetUserActivities handles retrieving user activities (public endpoint)
func GetUserActivities(c *gin.Context) {
	userID := c.Param("id")
	if userID == "" {
		utils.ValidationErrorResponse(c, "User ID is required")
		return
	}

	// Parse limit parameter
	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 || limit > 50 {
		limit = 10 // default and max 50
	}

	db := config.GetDB()

	// Build union query for different activity types
	query := `
		SELECT
			CONCAT('post_', p.id) as id,
			'posted' as type,
			p.created_at as timestamp,
			JSON_BUILD_OBJECT(
				'post_id', p.id,
				'post_title', p.satellite_name
			) as data
		FROM posts p
		INNER JOIN stations s ON p.station_id = s.id
		WHERE s.user_id = $1 AND s.is_public = true

		UNION ALL

		SELECT
			CONCAT('like_', l.id) as id,
			'liked_post' as type,
			l.created_at as timestamp,
			JSON_BUILD_OBJECT(
				'post_id', p.id,
				'post_title', p.satellite_name
			) as data
		FROM likes l
		INNER JOIN posts p ON l.post_id = p.id
		INNER JOIN stations s ON p.station_id = s.id
		WHERE l.user_id = $1 AND s.is_public = true

		UNION ALL

		SELECT
			CONCAT('comment_like_', cl.id) as id,
			'liked_comment' as type,
			cl.created_at as timestamp,
			JSON_BUILD_OBJECT(
				'comment_id', cl.comment_id,
				'post_id', p.id,
				'post_title_for_comment', p.satellite_name
			) as data
		FROM comment_likes cl
		INNER JOIN comments cm ON cl.comment_id = cm.id
		INNER JOIN posts p ON cm.post_id = p.id
		INNER JOIN stations s ON p.station_id = s.id
		WHERE cl.user_id = $1 AND s.is_public = true

		UNION ALL

		SELECT
			CONCAT('comment_', cm.id) as id,
			'commented' as type,
			cm.created_at as timestamp,
			JSON_BUILD_OBJECT(
				'comment_id', cm.id,
				'post_id', p.id,
				'post_title', p.satellite_name
			) as data
		FROM comments cm
		INNER JOIN posts p ON cm.post_id = p.id
		INNER JOIN stations s ON p.station_id = s.id
		WHERE cm.user_id = $1 AND s.is_public = true

		UNION ALL

		SELECT
			CONCAT('achievement_', ua.id) as id,
			'achievement' as type,
			ua.unlocked_at as timestamp,
			JSON_BUILD_OBJECT(
				'achievement_id', a.id,
				'achievement_name', a.name_key
			) as data
		FROM user_achievements ua
		INNER JOIN achievements a ON ua.achievement_id = a.id
		WHERE ua.user_id = $1

		UNION ALL

		SELECT
			CONCAT('station_', s.id) as id,
			'station' as type,
			s.created_at as timestamp,
			JSON_BUILD_OBJECT(
				'station_id', s.id,
				'station_name', s.name
			) as data
		FROM stations s
		WHERE s.user_id = $1 AND s.is_public = true

		ORDER BY timestamp DESC
		LIMIT $2
	`

	// Use a temporary struct with string data field for scanning
	type ActivityRow struct {
		ID        string `json:"id"`
		Type      string `json:"type"`
		Timestamp string `json:"timestamp"`
		Data      string `json:"data"` // JSON as string from PostgreSQL
	}

	var rows []ActivityRow
	if err := db.Raw(query, userID, limit).Scan(&rows).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to fetch user activities")
		return
	}

	// Convert to Activity slice and parse JSON data
	activities := make([]Activity, len(rows))
	for i, row := range rows {
		activities[i] = Activity{
			ID:        row.ID,
			Type:      row.Type,
			Timestamp: row.Timestamp,
		}

		// Parse JSON string into map
		if row.Data != "" {
			var dataMap map[string]interface{}
			if err := json.Unmarshal([]byte(row.Data), &dataMap); err == nil {
				activities[i].Data = dataMap
			}
		}
	}

	// Translate achievement names
	for i := range activities {
		if activities[i].Type == "achievement" && activities[i].Data != nil {
			if nameKey, ok := activities[i].Data["achievement_name"].(string); ok {
				// Get user language for translations (default to 'en')
				language := "en"
				if userIDFromParam := c.Param("id"); userIDFromParam != "" {
					// Try to get the viewer's language (the authenticated user viewing this profile)
					if viewerID, exists := middleware.GetCurrentUserID(c); exists {
						if viewerUUID, err := uuid.Parse(viewerID); err == nil {
							var viewer models.User
							if err := db.Where("id = ?", viewerUUID).First(&viewer).Error; err == nil {
								language = viewer.Language
							}
						}
					}
				}

				// Translate the achievement name
				name, _, err := utils.TranslateAchievement(nameKey, "", language)
				if err == nil {
					activities[i].Data["achievement_name"] = name
				}
			}
		}
	}

	utils.SuccessResponse(c, http.StatusOK, "Activities retrieved successfully", activities)
}
