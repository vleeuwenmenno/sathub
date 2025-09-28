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
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AdminOverviewResponse represents the response for admin overview statistics
type AdminOverviewResponse struct {
	TotalUsers    int64  `json:"total_users"`
	PendingUsers  int64  `json:"pending_users"`
	TotalPosts    int64  `json:"total_posts"`
	TotalStations int64  `json:"total_stations"`
	SystemHealth  string `json:"system_health"`
}

// AdminUserResponse represents user data for admin management
type AdminUserResponse struct {
	ID                string `json:"id"`
	Username          string `json:"username"`
	Email             string `json:"email,omitempty"`
	Role              string `json:"role"`
	Approved          bool   `json:"approved"`
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

// AdminUsersResponse represents paginated user data for admin management
type AdminUsersResponse struct {
	Users      []AdminUserResponse `json:"users"`
	Pagination PaginationMeta      `json:"pagination"`
}

// PaginationMeta represents pagination metadata
type PaginationMeta struct {
	Page  int `json:"page"`
	Limit int `json:"limit"`
	Total int `json:"total"`
	Pages int `json:"pages"`
}

// UpdateUserRoleRequest represents the request to update a user's role
type UpdateUserRoleRequest struct {
	Role string `json:"role" binding:"required"`
}

// GetAdminOverview returns overview statistics for the admin panel
func GetAdminOverview(c *gin.Context) {
	db := config.GetDB()

	var totalUsers int64
	var pendingUsers int64
	var totalPosts int64
	var totalStations int64

	// Count total users
	if err := db.Model(&models.User{}).Count(&totalUsers).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to count users")
		return
	}

	// Check if approval is required
	var approvalSetting models.Setting
	approvalRequired := true // Default to requiring approval
	err := db.Where("key = ?", "approval_required").First(&approvalSetting).Error
	if err == nil && approvalSetting.Value == "false" {
		approvalRequired = false
	}

	// Count pending users only if approval is required
	if approvalRequired {
		if err := db.Model(&models.User{}).Where("approved = ?", false).Count(&pendingUsers).Error; err != nil {
			utils.InternalErrorResponse(c, "Failed to count pending users")
			return
		}
	} else {
		pendingUsers = 0 // No pending users if approval is not required
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
		PendingUsers:  pendingUsers,
		TotalPosts:    totalPosts,
		TotalStations: totalStations,
		SystemHealth:  systemHealth,
	}

	utils.SuccessResponse(c, http.StatusOK, "Admin overview retrieved successfully", response)
}

// GetAllUsers returns a paginated list of users for admin management with optional search and filters
func GetAllUsers(c *gin.Context) {
	db := config.GetDB()

	// Parse query parameters
	page := 1
	limit := 20
	search := c.Query("search")
	approvedFilter := c.Query("approved") // "true", "false", or empty for all
	bannedFilter := c.Query("banned")     // "true", "false", or empty for all

	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := fmt.Sscanf(pageStr, "%d", &page); err != nil || p != 1 {
			page = 1
		}
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := fmt.Sscanf(limitStr, "%d", &limit); err != nil || l != 1 {
			limit = 20
		}
		// Cap limit at 100
		if limit > 100 {
			limit = 100
		}
	}

	// Calculate offset
	offset := (page - 1) * limit

	// Build query
	query := db.Model(&models.User{})

	// Add search filter if provided
	if search != "" {
		searchTerm := "%" + search + "%"
		query = query.Where("username ILIKE ? OR email ILIKE ?", searchTerm, searchTerm)
	}

	// Add approval filter if provided
	if approvedFilter == "true" {
		query = query.Where("approved = ?", true)
	} else if approvedFilter == "false" {
		query = query.Where("approved = ?", false)
	}

	// Add ban filter if provided
	if bannedFilter == "true" {
		query = query.Where("banned = ?", true)
	} else if bannedFilter == "false" {
		query = query.Where("banned = ?", false)
	}

	// Get total count for pagination
	var total int64
	if err := query.Count(&total).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to count users")
		return
	}

	// Get paginated users
	var users []models.User
	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&users).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to retrieve users")
		return
	}

	// Calculate total pages
	totalPages := int((total + int64(limit) - 1) / int64(limit))

	var userResponses []AdminUserResponse
	for _, user := range users {
		userResponse := AdminUserResponse{
			ID:                user.ID.String(),
			Username:          user.Username,
			Role:              user.Role,
			Approved:          user.Approved,
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
			userResponse.ProfilePictureURL = generateProfilePictureURL(user.ID.String(), user.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"))
		}

		userResponses = append(userResponses, userResponse)
	}

	response := AdminUsersResponse{
		Users: userResponses,
		Pagination: PaginationMeta{
			Page:  page,
			Limit: limit,
			Total: int(total),
			Pages: totalPages,
		},
	}

	utils.SuccessResponse(c, http.StatusOK, "Users retrieved successfully", response)
}

// UpdateUserRole updates a user's role (admin only)
func UpdateUserRole(c *gin.Context) {
	userIDStr := c.Param("id")
	if userIDStr == "" {
		utils.ValidationErrorResponse(c, "User ID is required")
		return
	}

	// Parse user ID
	targetUserID, err := uuid.Parse(userIDStr)
	if err != nil {
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
	targetUserID, err := uuid.Parse(userIDStr)
	if err != nil {
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
	if currentUserID == targetUserID.String() {
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

	// Delete all related records in a transaction to ensure atomicity
	tx := db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Get all station IDs for this user first
	var stationIDs []string
	if err := tx.Model(&models.Station{}).Where("user_id = ?", targetUserID).Pluck("id", &stationIDs).Error; err != nil {
		tx.Rollback()
		utils.InternalErrorResponse(c, "Failed to find user stations")
		return
	}

	// Get all post IDs for these stations
	var postIDs []uint
	if len(stationIDs) > 0 {
		if err := tx.Model(&models.Post{}).Where("station_id IN ?", stationIDs).Pluck("id", &postIDs).Error; err != nil {
			tx.Rollback()
			utils.InternalErrorResponse(c, "Failed to find user posts")
			return
		}
	}

	// Get all comment IDs for comments by this user
	var userCommentIDs []uint
	if err := tx.Model(&models.Comment{}).Where("user_id = ?", targetUserID).Pluck("id", &userCommentIDs).Error; err != nil {
		tx.Rollback()
		utils.InternalErrorResponse(c, "Failed to find user comments")
		return
	}

	// Get all comment IDs for comments on user's posts
	var postCommentIDs []uint
	if len(postIDs) > 0 {
		if err := tx.Model(&models.Comment{}).Where("post_id IN ?", postIDs).Pluck("id", &postCommentIDs).Error; err != nil {
			tx.Rollback()
			utils.InternalErrorResponse(c, "Failed to find comments on user posts")
			return
		}
	}

	// Combine all comment IDs that need their likes deleted
	allCommentIDsToDeleteLikes := append(userCommentIDs, postCommentIDs...)

	// Delete comment likes on comments that will be deleted (to avoid foreign key constraints)
	if len(allCommentIDsToDeleteLikes) > 0 {
		if err := tx.Where("comment_id IN ?", allCommentIDsToDeleteLikes).Delete(&models.CommentLike{}).Error; err != nil {
			tx.Rollback()
			utils.InternalErrorResponse(c, "Failed to delete comment likes on user-related comments")
			return
		}
		fmt.Printf("Deleted comment likes on %d comments\n", len(allCommentIDsToDeleteLikes))
	}

	// Delete comment likes by the user
	if err := tx.Where("user_id = ?", targetUserID).Delete(&models.CommentLike{}).Error; err != nil {
		tx.Rollback()
		utils.InternalErrorResponse(c, "Failed to delete user comment likes")
		return
	}
	fmt.Printf("Deleted comment likes by user %s\n", targetUserID)

	// Delete likes on user's posts
	if len(postIDs) > 0 {
		if err := tx.Where("post_id IN ?", postIDs).Delete(&models.Like{}).Error; err != nil {
			tx.Rollback()
			utils.InternalErrorResponse(c, "Failed to delete likes on user posts")
			return
		}
		fmt.Printf("Deleted likes on %d user posts\n", len(postIDs))
	}

	// Delete likes by the user
	if err := tx.Where("user_id = ?", targetUserID).Delete(&models.Like{}).Error; err != nil {
		tx.Rollback()
		utils.InternalErrorResponse(c, "Failed to delete user likes")
		return
	}
	fmt.Printf("Deleted likes by user %s\n", targetUserID)

	// Delete comments on user's posts
	if len(postIDs) > 0 {
		if err := tx.Where("post_id IN ?", postIDs).Delete(&models.Comment{}).Error; err != nil {
			tx.Rollback()
			utils.InternalErrorResponse(c, "Failed to delete comments on user posts")
			return
		}
		fmt.Printf("Deleted comments on %d user posts\n", len(postIDs))
	}

	// Delete comments by the user
	if err := tx.Where("user_id = ?", targetUserID).Delete(&models.Comment{}).Error; err != nil {
		tx.Rollback()
		utils.InternalErrorResponse(c, "Failed to delete user comments")
		return
	}
	fmt.Printf("Deleted %d comments by user %s\n", len(userCommentIDs), targetUserID)

	// Delete post images
	if len(postIDs) > 0 {
		if err := tx.Where("post_id IN ?", postIDs).Delete(&models.PostImage{}).Error; err != nil {
			tx.Rollback()
			utils.InternalErrorResponse(c, "Failed to delete user post images")
			return
		}
		fmt.Printf("Deleted post images for %d posts\n", len(postIDs))
	}

	// Delete posts
	if len(stationIDs) > 0 {
		if err := tx.Where("station_id IN ?", stationIDs).Delete(&models.Post{}).Error; err != nil {
			tx.Rollback()
			utils.InternalErrorResponse(c, "Failed to delete user posts")
			return
		}
		fmt.Printf("Deleted %d posts for %d stations\n", len(postIDs), len(stationIDs))
	}

	// Delete stations
	if err := tx.Where("user_id = ?", targetUserID).Delete(&models.Station{}).Error; err != nil {
		tx.Rollback()
		utils.InternalErrorResponse(c, "Failed to delete user stations")
		return
	}
	fmt.Printf("Deleted %d stations for user %s\n", len(stationIDs), targetUserID)

	// Delete tokens
	if err := tx.Where("user_id = ?", targetUserID).Delete(&models.RefreshToken{}).Error; err != nil {
		tx.Rollback()
		utils.InternalErrorResponse(c, "Failed to delete user refresh tokens")
		return
	}
	fmt.Printf("Deleted refresh tokens for user %s\n", targetUserID)

	if err := tx.Where("user_id = ?", targetUserID).Delete(&models.PasswordResetToken{}).Error; err != nil {
		tx.Rollback()
		utils.InternalErrorResponse(c, "Failed to delete user password reset tokens")
		return
	}
	fmt.Printf("Deleted password reset tokens for user %s\n", targetUserID)

	if err := tx.Where("user_id = ?", targetUserID).Delete(&models.EmailConfirmationToken{}).Error; err != nil {
		tx.Rollback()
		utils.InternalErrorResponse(c, "Failed to delete user email confirmation tokens")
		return
	}
	fmt.Printf("Deleted email confirmation tokens for user %s\n", targetUserID)

	if err := tx.Where("user_id = ?", targetUserID).Delete(&models.EmailChangeToken{}).Error; err != nil {
		tx.Rollback()
		utils.InternalErrorResponse(c, "Failed to delete user email change tokens")
		return
	}
	fmt.Printf("Deleted email change tokens for user %s\n", targetUserID)

	// Finally delete the user
	if err := tx.Delete(&user).Error; err != nil {
		tx.Rollback()
		utils.InternalErrorResponse(c, "Failed to delete user")
		return
	}
	fmt.Printf("Deleted user %s\n", targetUserID)

	// Commit the transaction
	if err := tx.Commit().Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to commit user deletion")
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
	targetUserID, err := uuid.Parse(userIDStr)
	if err != nil {
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
	if currentUserID == targetUserID.String() {
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

	// If user is being banned, terminate all their active sessions and deactivate station APIs
	if req.Banned {
		if err := db.Where("user_id = ?", targetUserID).Delete(&models.RefreshToken{}).Error; err != nil {
			// Log error but don't fail the ban operation
			fmt.Printf("Failed to delete refresh tokens for banned user %d: %v\n", targetUserID, err)
		}

		// Regenerate tokens for all stations to deactivate their APIs
		var stations []models.Station
		if err := db.Where("user_id = ?", targetUserID).Find(&stations).Error; err != nil {
			// Log error but don't fail the ban operation
			fmt.Printf("Failed to find stations for banned user %d: %v\n", targetUserID, err)
		} else {
			for _, station := range stations {
				if err := station.RegenerateToken(); err != nil {
					fmt.Printf("Failed to regenerate token for station %s: %v\n", station.ID, err)
					continue
				}
				if err := db.Save(&station).Error; err != nil {
					fmt.Printf("Failed to save regenerated token for station %s: %v\n", station.ID, err)
				}
			}
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
	targetUserID, err := uuid.Parse(userIDStr)
	if err != nil {
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
			ID:                user.ID.String(),
			Username:          user.Username,
			Role:              user.Role,
			Approved:          user.Approved,
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
		userDetails.ProfilePictureURL = generateProfilePictureURL(user.ID.String(), user.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"))
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

// RegistrationSettingsResponse represents the response for registration settings
type RegistrationSettingsResponse struct {
	Disabled bool `json:"disabled"`
}

// UpdateRegistrationSettingsRequest represents the request to update registration settings
type UpdateRegistrationSettingsRequest struct {
	Disabled bool `json:"disabled"`
}

// ApprovalSettingsResponse represents the response for approval settings
type ApprovalSettingsResponse struct {
	Required bool `json:"required"`
}

// UpdateApprovalSettingsRequest represents the request to update approval settings
type UpdateApprovalSettingsRequest struct {
	Required bool `json:"required"`
}

// GetRegistrationSettings returns the current registration settings
func GetRegistrationSettings(c *gin.Context) {
	db := config.GetDB()

	var setting models.Setting
	err := db.Where("key = ?", "registration_disabled").First(&setting).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		utils.InternalErrorResponse(c, "Failed to retrieve registration settings")
		return
	}

	disabled := false
	if err == nil && setting.Value == "true" {
		disabled = true
	}

	response := RegistrationSettingsResponse{
		Disabled: disabled,
	}

	utils.SuccessResponse(c, http.StatusOK, "Registration settings retrieved successfully", response)
}

// UpdateRegistrationSettings updates the registration disabled setting
func UpdateRegistrationSettings(c *gin.Context) {
	var req UpdateRegistrationSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	db := config.GetDB()

	setting := models.Setting{
		Key:         "registration_disabled",
		Value:       "false",
		Description: "Controls whether new user registrations are allowed",
	}

	if req.Disabled {
		setting.Value = "true"
	}

	if err := db.Save(&setting).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to update registration settings")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Registration settings updated successfully", nil)
}

// GetApprovalSettings returns the current approval settings
func GetApprovalSettings(c *gin.Context) {
	db := config.GetDB()

	var setting models.Setting
	err := db.Where("key = ?", "approval_required").First(&setting).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		utils.InternalErrorResponse(c, "Failed to retrieve approval settings")
		return
	}

	required := true // Default to requiring approval
	if err == nil && setting.Value == "false" {
		required = false
	}

	response := ApprovalSettingsResponse{
		Required: required,
	}

	utils.SuccessResponse(c, http.StatusOK, "Approval settings retrieved successfully", response)
}

// UpdateApprovalSettings updates the approval required setting
func UpdateApprovalSettings(c *gin.Context) {
	var req UpdateApprovalSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	db := config.GetDB()

	setting := models.Setting{
		Key:         "approval_required",
		Value:       "true",
		Description: "Controls whether new user registrations require admin approval",
	}

	if !req.Required {
		setting.Value = "false"
	}

	if err := db.Save(&setting).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to update approval settings")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Approval settings updated successfully", nil)
}

// ApproveUserRequest represents the request to approve or reject a user
type ApproveUserRequest struct {
	Approved bool `json:"approved"`
}

// ApproveUser approves or rejects a user (admin only)
func ApproveUser(c *gin.Context) {
	userIDStr := c.Param("id")
	if userIDStr == "" {
		utils.ValidationErrorResponse(c, "User ID is required")
		return
	}

	// Parse user ID
	targetUserID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.ValidationErrorResponse(c, "Invalid user ID format")
		return
	}

	var req ApproveUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
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

	// Update approval status
	user.Approved = req.Approved
	if err := db.Save(&user).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to update user approval status")
		return
	}

	// Send approval notification email if user was approved
	if req.Approved && user.Email.Valid {
		if err := utils.SendApprovalNotificationEmail(user.Email.String, user.Username); err != nil {
			// Log error but don't fail the approval operation
			fmt.Printf("Failed to send approval notification email to user %s: %v\n", user.Username, err)
		}
	}

	action := "approved"
	if !req.Approved {
		action = "rejected"
	}

	utils.SuccessResponse(c, http.StatusOK, fmt.Sprintf("User %s successfully", action), nil)
}
