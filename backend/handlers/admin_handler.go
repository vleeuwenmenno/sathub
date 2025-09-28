package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"satdump-ui-backend/config"
	"satdump-ui-backend/middleware"
	"satdump-ui-backend/models"
	"satdump-ui-backend/utils"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// AdminOverviewResponse represents the response for admin overview statistics
type AdminOverviewResponse struct {
	TotalUsers    int64  `json:"total_users"`
	TotalPosts    int64  `json:"total_posts"`
	TotalStations int64  `json:"total_stations"`
	SystemHealth  string `json:"system_health"`
}

// AdminUserResponse represents user data for admin management
type AdminUserResponse struct {
	ID                uint   `json:"id"`
	Username          string `json:"username"`
	Email             string `json:"email,omitempty"`
	Role              string `json:"role"`
	Banned            bool   `json:"banned"`
	BannedAt          string `json:"banned_at,omitempty"`
	EmailConfirmed    bool   `json:"email_confirmed"`
	TwoFactorEnabled  bool   `json:"two_factor_enabled"`
	DisplayName       string `json:"display_name,omitempty"`
	ProfilePictureURL string `json:"profile_picture_url,omitempty"`
	HasProfilePicture bool   `json:"has_profile_picture"`
	CreatedAt         string `json:"created_at"`
	UpdatedAt         string `json:"updated_at"`
}

// UpdateUserRoleRequest represents the request to update a user's role
type UpdateUserRoleRequest struct {
	Role string `json:"role" binding:"required"`
}

// GetAdminOverview returns overview statistics for the admin panel
func GetAdminOverview(c *gin.Context) {
	db := config.GetDB()

	var totalUsers int64
	var totalPosts int64
	var totalStations int64

	// Count total users
	if err := db.Model(&models.User{}).Count(&totalUsers).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to count users")
		return
	}

	// Count total posts
	if err := db.Model(&models.Post{}).Count(&totalPosts).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to count posts")
		return
	}

	// Count total stations
	if err := db.Model(&models.Station{}).Count(&totalStations).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to count stations")
		return
	}

	// Simple system health check (can be expanded)
	systemHealth := "healthy"

	response := AdminOverviewResponse{
		TotalUsers:    totalUsers,
		TotalPosts:    totalPosts,
		TotalStations: totalStations,
		SystemHealth:  systemHealth,
	}

	utils.SuccessResponse(c, http.StatusOK, "Admin overview retrieved successfully", response)
}

// GetAllUsers returns a list of all users for admin management
func GetAllUsers(c *gin.Context) {
	db := config.GetDB()

	var users []models.User
	if err := db.Find(&users).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to retrieve users")
		return
	}

	var userResponses []AdminUserResponse
	for _, user := range users {
		userResponse := AdminUserResponse{
			ID:                user.ID,
			Username:          user.Username,
			Role:              user.Role,
			Banned:            user.Banned,
			EmailConfirmed:    user.EmailConfirmed,
			TwoFactorEnabled:  user.TwoFactorEnabled,
			DisplayName:       user.DisplayName,
			HasProfilePicture: len(user.ProfilePicture) > 0,
			CreatedAt:         user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt:         user.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}

		// Include banned timestamp if user is banned
		if user.Banned && user.BannedAt.Valid {
			userResponse.BannedAt = user.BannedAt.Time.Format("2006-01-02T15:04:05Z07:00")
		}

		// Include email if valid
		if user.Email.Valid {
			userResponse.Email = user.Email.String
		}

		// Generate profile picture URL if exists
		if len(user.ProfilePicture) > 0 {
			userResponse.ProfilePictureURL = generateProfilePictureURL(user.ID, user.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"))
		}

		userResponses = append(userResponses, userResponse)
	}

	utils.SuccessResponse(c, http.StatusOK, "Users retrieved successfully", userResponses)
}

// UpdateUserRole updates a user's role (admin only)
func UpdateUserRole(c *gin.Context) {
	userIDStr := c.Param("id")
	if userIDStr == "" {
		utils.ValidationErrorResponse(c, "User ID is required")
		return
	}

	// Parse user ID
	var targetUserID uint
	if _, err := fmt.Sscanf(userIDStr, "%d", &targetUserID); err != nil {
		utils.ValidationErrorResponse(c, "Invalid user ID format")
		return
	}

	var req UpdateUserRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	// Validate role
	if req.Role != "user" && req.Role != "admin" {
		utils.ValidationErrorResponse(c, "Invalid role. Must be 'user' or 'admin'")
		return
	}

	db := config.GetDB()

	// Find the target user
	var user models.User
	if err := db.First(&user, targetUserID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "User not found")
			return
		}
		utils.InternalErrorResponse(c, "Database error")
		return
	}

	// Update the role
	user.Role = req.Role
	if err := db.Save(&user).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to update user role")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "User role updated successfully", nil)
}

// DeleteUser deletes a user (admin only)
func DeleteUser(c *gin.Context) {
	userIDStr := c.Param("id")
	if userIDStr == "" {
		utils.ValidationErrorResponse(c, "User ID is required")
		return
	}

	// Parse user ID
	var targetUserID uint
	if _, err := fmt.Sscanf(userIDStr, "%d", &targetUserID); err != nil {
		utils.ValidationErrorResponse(c, "Invalid user ID format")
		return
	}

	db := config.GetDB()

	// Get current user ID to prevent self-deletion
	currentUserID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	// Prevent admin from deleting themselves
	if currentUserID == targetUserID {
		utils.ValidationErrorResponse(c, "Cannot delete your own account")
		return
	}

	// Find the target user
	var user models.User
	if err := db.First(&user, targetUserID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "User not found")
			return
		}
		utils.InternalErrorResponse(c, "Database error")
		return
	}

	// Delete the user (cascade will handle related records)
	if err := db.Delete(&user).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to delete user")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "User deleted successfully", nil)
}

// BanUserRequest represents the request to ban/unban a user
type BanUserRequest struct {
	Banned bool `json:"banned"`
}

// BanUser bans or unbans a user (admin only)
func BanUser(c *gin.Context) {
	userIDStr := c.Param("id")
	if userIDStr == "" {
		utils.ValidationErrorResponse(c, "User ID is required")
		return
	}

	// Parse user ID
	var targetUserID uint
	if _, err := fmt.Sscanf(userIDStr, "%d", &targetUserID); err != nil {
		utils.ValidationErrorResponse(c, "Invalid user ID format")
		return
	}

	var req BanUserRequest
	if err := c.Bind(&req); err != nil {
		utils.ValidationErrorResponse(c, fmt.Sprintf("Failed to bind request: %v", err))
		return
	}

	db := config.GetDB()

	// Find the target user
	var user models.User
	if err := db.First(&user, targetUserID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "User not found")
			return
		}
		utils.InternalErrorResponse(c, "Database error")
		return
	}

	// Get current user ID to prevent self-banning
	currentUserID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	// Prevent admin from banning themselves
	if currentUserID == targetUserID {
		utils.ValidationErrorResponse(c, "Cannot ban your own account")
		return
	}

	// Update ban status
	user.Banned = req.Banned
	if req.Banned {
		user.BannedAt = sql.NullTime{Time: time.Now(), Valid: true}
	} else {
		user.BannedAt = sql.NullTime{Valid: false}
	}

	if err := db.Save(&user).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to update user ban status")
		return
	}

	// If user is being banned, terminate all their active sessions
	if req.Banned {
		if err := db.Where("user_id = ?", targetUserID).Delete(&models.RefreshToken{}).Error; err != nil {
			// Log error but don't fail the ban operation
			fmt.Printf("Failed to delete refresh tokens for banned user %d: %v\n", targetUserID, err)
		}
	}

	action := "banned"
	if !req.Banned {
		action = "unbanned"
	}

	utils.SuccessResponse(c, http.StatusOK, fmt.Sprintf("User %s successfully", action), nil)
}

// GetUserDetails returns detailed information about a specific user
func GetUserDetails(c *gin.Context) {
	userIDStr := c.Param("id")
	if userIDStr == "" {
		utils.ValidationErrorResponse(c, "User ID is required")
		return
	}

	// Parse user ID
	var targetUserID uint
	if _, err := fmt.Sscanf(userIDStr, "%d", &targetUserID); err != nil {
		utils.ValidationErrorResponse(c, "Invalid user ID format")
		return
	}

	db := config.GetDB()

	// Find the target user
	var user models.User
	if err := db.First(&user, targetUserID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "User not found")
			return
		}
		utils.InternalErrorResponse(c, "Database error")
		return
	}

	// Get user's post count
	var postCount int64
	if err := db.Model(&models.Post{}).Where("station_id IN (SELECT id FROM stations WHERE user_id = ?)", user.ID).Count(&postCount).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to count user posts")
		return
	}

	// Get user's station count
	var stationCount int64
	if err := db.Model(&models.Station{}).Where("user_id = ?", user.ID).Count(&stationCount).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to count user stations")
		return
	}

	userDetails := struct {
		AdminUserResponse
		PostCount    int64 `json:"post_count"`
		StationCount int64 `json:"station_count"`
	}{
		AdminUserResponse: AdminUserResponse{
			ID:                user.ID,
			Username:          user.Username,
			Role:              user.Role,
			Banned:            user.Banned,
			EmailConfirmed:    user.EmailConfirmed,
			TwoFactorEnabled:  user.TwoFactorEnabled,
			DisplayName:       user.DisplayName,
			HasProfilePicture: len(user.ProfilePicture) > 0,
			CreatedAt:         user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt:         user.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		},
		PostCount:    postCount,
		StationCount: stationCount,
	}

	// Include email if valid
	if user.Email.Valid {
		userDetails.Email = user.Email.String
	}

	// Include banned timestamp if user is banned
	if user.Banned && user.BannedAt.Valid {
		userDetails.BannedAt = user.BannedAt.Time.Format("2006-01-02T15:04:05Z07:00")
	}

	// Generate profile picture URL if exists
	if len(user.ProfilePicture) > 0 {
		userDetails.ProfilePictureURL = generateProfilePictureURL(user.ID, user.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"))
	}

	utils.SuccessResponse(c, http.StatusOK, "User details retrieved successfully", userDetails)
}

// GetAdminInvite returns placeholder data for the invite functionality
func GetAdminInvite(c *gin.Context) {
	// Placeholder response - no logic implemented yet
	response := map[string]interface{}{
		"message":     "Invite functionality not yet implemented",
		"placeholder": true,
	}

	utils.SuccessResponse(c, http.StatusOK, "Invite page data retrieved", response)
}
