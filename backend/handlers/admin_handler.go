package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"sathub-ui-backend/config"
	"sathub-ui-backend/middleware"
	"sathub-ui-backend/models"
	"sathub-ui-backend/utils"
	"strconv"
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
	oldRole := user.Role
	user.Role = req.Role
	if err := db.Save(&user).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to update user role")
		return
	}

	// Log role update
	utils.LogUserAction(c, models.ActionAdminUserRoleUpdate, targetUserID, models.AuditMetadata{
		"target_username": user.Username,
		"old_role":        oldRole,
		"new_role":        req.Role,
	})

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
	var userCommentIDs []uuid.UUID
	if err := tx.Model(&models.Comment{}).Where("user_id = ?", targetUserID).Pluck("id", &userCommentIDs).Error; err != nil {
		tx.Rollback()
		utils.InternalErrorResponse(c, "Failed to find user comments")
		return
	}

	// Get all comment IDs for comments on user's posts
	var postCommentIDs []uuid.UUID
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
		utils.Logger.Info().Int("comment_count", len(allCommentIDsToDeleteLikes)).Msg("Deleted comment likes on comments")
	}

	// Delete comment likes by the user
	if err := tx.Where("user_id = ?", targetUserID).Delete(&models.CommentLike{}).Error; err != nil {
		tx.Rollback()
		utils.InternalErrorResponse(c, "Failed to delete user comment likes")
		return
	}
	utils.Logger.Info().Str("user_id", targetUserID.String()).Msg("Deleted comment likes by user")

	// Delete likes on user's posts
	if len(postIDs) > 0 {
		if err := tx.Where("post_id IN ?", postIDs).Delete(&models.Like{}).Error; err != nil {
			tx.Rollback()
			utils.InternalErrorResponse(c, "Failed to delete likes on user posts")
			return
		}
		utils.Logger.Info().Int("post_count", len(postIDs)).Msg("Deleted likes on user posts")
	}

	// Delete likes by the user
	if err := tx.Where("user_id = ?", targetUserID).Delete(&models.Like{}).Error; err != nil {
		tx.Rollback()
		utils.InternalErrorResponse(c, "Failed to delete user likes")
		return
	}
	utils.Logger.Info().Str("user_id", targetUserID.String()).Msg("Deleted likes by user")

	// Delete comments on user's posts
	if len(postIDs) > 0 {
		if err := tx.Where("post_id IN ?", postIDs).Delete(&models.Comment{}).Error; err != nil {
			tx.Rollback()
			utils.InternalErrorResponse(c, "Failed to delete comments on user posts")
			return
		}
		utils.Logger.Info().Int("post_count", len(postIDs)).Msg("Deleted comments on user posts")
	}

	// Delete comments by the user
	if err := tx.Where("user_id = ?", targetUserID).Delete(&models.Comment{}).Error; err != nil {
		tx.Rollback()
		utils.InternalErrorResponse(c, "Failed to delete user comments")
		return
	}
	utils.Logger.Info().Int("comment_count", len(userCommentIDs)).Str("user_id", targetUserID.String()).Msg("Deleted comments by user")

	// Delete post images
	if len(postIDs) > 0 {
		if err := tx.Where("post_id IN ?", postIDs).Delete(&models.PostImage{}).Error; err != nil {
			tx.Rollback()
			utils.InternalErrorResponse(c, "Failed to delete user post images")
			return
		}
		utils.Logger.Info().Int("post_count", len(postIDs)).Msg("Deleted post images for posts")
	}

	// Delete posts
	if len(stationIDs) > 0 {
		if err := tx.Where("station_id IN ?", stationIDs).Delete(&models.Post{}).Error; err != nil {
			tx.Rollback()
			utils.InternalErrorResponse(c, "Failed to delete user posts")
			return
		}
		utils.Logger.Info().Int("post_count", len(postIDs)).Int("station_count", len(stationIDs)).Msg("Deleted posts for stations")
	}

	// Delete stations
	if err := tx.Where("user_id = ?", targetUserID).Delete(&models.Station{}).Error; err != nil {
		tx.Rollback()
		utils.InternalErrorResponse(c, "Failed to delete user stations")
		return
	}
	utils.Logger.Info().Int("station_count", len(stationIDs)).Str("user_id", targetUserID.String()).Msg("Deleted stations for user")

	// Delete tokens
	if err := tx.Where("user_id = ?", targetUserID).Delete(&models.RefreshToken{}).Error; err != nil {
		tx.Rollback()
		utils.InternalErrorResponse(c, "Failed to delete user refresh tokens")
		return
	}
	utils.Logger.Info().Str("user_id", targetUserID.String()).Msg("Deleted refresh tokens for user")

	if err := tx.Where("user_id = ?", targetUserID).Delete(&models.PasswordResetToken{}).Error; err != nil {
		tx.Rollback()
		utils.InternalErrorResponse(c, "Failed to delete user password reset tokens")
		return
	}
	utils.Logger.Info().Str("user_id", targetUserID.String()).Msg("Deleted password reset tokens for user")

	if err := tx.Where("user_id = ?", targetUserID).Delete(&models.EmailConfirmationToken{}).Error; err != nil {
		tx.Rollback()
		utils.InternalErrorResponse(c, "Failed to delete user email confirmation tokens")
		return
	}
	utils.Logger.Info().Str("user_id", targetUserID.String()).Msg("Deleted email confirmation tokens for user")

	if err := tx.Where("user_id = ?", targetUserID).Delete(&models.EmailChangeToken{}).Error; err != nil {
		tx.Rollback()
		utils.InternalErrorResponse(c, "Failed to delete user email change tokens")
		return
	}
	utils.Logger.Info().Str("user_id", targetUserID.String()).Msg("Deleted email change tokens for user")

	// Finally delete the user
	if err := tx.Delete(&user).Error; err != nil {
		tx.Rollback()
		utils.InternalErrorResponse(c, "Failed to delete user")
		return
	}
	utils.Logger.Info().Str("user_id", targetUserID.String()).Msg("Deleted user")

	// Commit the transaction
	if err := tx.Commit().Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to commit user deletion")
		return
	}

	// Log user deletion
	utils.LogUserAction(c, models.ActionAdminUserDelete, targetUserID, models.AuditMetadata{
		"target_username":  user.Username,
		"stations_deleted": len(stationIDs),
		"posts_deleted":    len(postIDs),
	})

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

	// Log ban/unban action
	auditAction := models.ActionAdminUserBan
	if !req.Banned {
		auditAction = models.ActionAdminUserUnban
	}
	utils.LogUserAction(c, auditAction, targetUserID, models.AuditMetadata{
		"target_username": user.Username,
	})

	// If user is being banned, terminate all their active sessions and deactivate station APIs
	if req.Banned {
		if err := db.Where("user_id = ?", targetUserID).Delete(&models.RefreshToken{}).Error; err != nil {
			// Log error but don't fail the ban operation
			utils.Logger.Error().Err(err).Str("user_id", targetUserID.String()).Msg("Failed to delete refresh tokens for banned user")
		}

		// Regenerate tokens for all stations to deactivate their APIs
		var stations []models.Station
		if err := db.Where("user_id = ?", targetUserID).Find(&stations).Error; err != nil {
			// Log error but don't fail the ban operation
			utils.Logger.Error().Err(err).Str("user_id", targetUserID.String()).Msg("Failed to find stations for banned user")
		} else {
			for _, station := range stations {
				if err := station.RegenerateToken(); err != nil {
					utils.Logger.Error().Err(err).Str("station_id", station.ID).Msg("Failed to regenerate token for station")
					continue
				}
				if err := db.Save(&station).Error; err != nil {
					utils.Logger.Error().Err(err).Str("station_id", station.ID).Msg("Failed to save regenerated token for station")
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

// AdminDeletePost handles deleting any post (admin only)
func AdminDeletePost(c *gin.Context) {
	postID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ValidationErrorResponse(c, "Invalid post ID")
		return
	}

	db := config.GetDB()

	// Find post to verify it exists
	var post models.Post
	if err := db.First(&post, uint(postID)).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Post not found")
			return
		}
		utils.InternalErrorResponse(c, "Failed to fetch post")
		return
	}

	// Delete associated comment likes first (for comments on this post)
	if err := db.Where("comment_id IN (SELECT id FROM comments WHERE post_id = ?)", uint(postID)).Delete(&models.CommentLike{}).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to delete comment likes")
		return
	}

	// Delete associated comments
	if err := db.Where("post_id = ?", uint(postID)).Delete(&models.Comment{}).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to delete post comments")
		return
	}

	// Delete associated likes
	if err := db.Where("post_id = ?", uint(postID)).Delete(&models.Like{}).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to delete post likes")
		return
	}

	// Delete associated images
	if err := db.Where("post_id = ?", uint(postID)).Delete(&models.PostImage{}).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to delete post images")
		return
	}

	// Delete associated CBOR records from database
	if err := db.Where("post_id = ?", uint(postID)).Delete(&models.PostCBOR{}).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to delete post CBOR")
		return
	}

	// Delete associated CADU records from database
	if err := db.Where("post_id = ?", uint(postID)).Delete(&models.PostCADU{}).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to delete post CADU")
		return
	}

	// Delete the post
	if err := db.Delete(&post).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to delete post")
		return
	}

	// Log admin post deletion
	utils.LogAuditEvent(c, models.ActionAdminPostDelete, models.TargetTypePost, fmt.Sprintf("%d", post.ID), models.AuditMetadata{
		"satellite_name": post.SatelliteName,
		"station_id":     post.StationID,
	})

	utils.SuccessResponse(c, http.StatusOK, "Post deleted successfully", nil)
}

// AdminHidePost handles hiding or unhiding a post (admin only)
func AdminHidePost(c *gin.Context) {
	postID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ValidationErrorResponse(c, "Invalid post ID")
		return
	}

	var req struct {
		Hidden bool `json:"hidden"`
	}
	if err := c.Bind(&req); err != nil {
		utils.ValidationErrorResponse(c, "Invalid request body")
		return
	}

	db := config.GetDB()

	// Find post to verify it exists
	var post models.Post
	if err := db.First(&post, uint(postID)).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Post not found")
			return
		}
		utils.InternalErrorResponse(c, "Failed to fetch post")
		return
	}

	// Update hidden status
	oldHidden := post.Hidden
	post.Hidden = req.Hidden
	if err := db.Save(&post).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to update post visibility")
		return
	}

	// Log hide/unhide action
	action := "hidden"
	if !req.Hidden {
		action = "unhidden"
	}
	utils.LogAuditEvent(c, models.ActionAdminPostHide, models.TargetTypePost, fmt.Sprintf("%d", post.ID), models.AuditMetadata{
		"satellite_name": post.SatelliteName,
		"station_id":     post.StationID,
		"old_hidden":     oldHidden,
		"new_hidden":     req.Hidden,
	})

	utils.SuccessResponse(c, http.StatusOK, fmt.Sprintf("Post %s successfully", action), nil)
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

// AuditLogResponse represents an audit log entry in responses
type AuditLogResponse struct {
	ID         string                 `json:"id"`
	UserID     string                 `json:"user_id,omitempty"`
	Username   string                 `json:"username,omitempty"`
	Action     string                 `json:"action"`
	TargetType string                 `json:"target_type"`
	TargetID   string                 `json:"target_id,omitempty"`
	Metadata   map[string]interface{} `json:"metadata,omitempty"`
	IPAddress  *string                `json:"ip_address,omitempty"`
	UserAgent  *string                `json:"user_agent,omitempty"`
	CreatedAt  string                 `json:"created_at"`
}

// AuditLogsResponse represents paginated audit log data
type AuditLogsResponse struct {
	Logs       []AuditLogResponse `json:"logs"`
	Pagination PaginationMeta     `json:"pagination"`
}

// GetAuditLogs handles fetching audit logs with filtering and pagination
func GetAuditLogs(c *gin.Context) {
	db := config.GetDB()

	// Parse query parameters
	page := 1
	limit := 50
	userID := c.Query("user_id")
	action := c.Query("action")
	targetType := c.Query("target_type")
	targetID := c.Query("target_id")
	search := c.Query("search")
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")

	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := fmt.Sscanf(pageStr, "%d", &page); err != nil || p != 1 {
			page = 1
		}
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := fmt.Sscanf(limitStr, "%d", &limit); err != nil || l != 1 {
			limit = 50
		}
		// Cap limit at 200
		if limit > 200 {
			limit = 200
		}
	}

	offset := (page - 1) * limit

	// Build query
	query := db.Model(&models.AuditLog{}).Preload("User")

	// Add filters
	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}
	if action != "" {
		query = query.Where("action = ?", action)
	}
	if targetType != "" {
		query = query.Where("target_type = ?", targetType)
	}
	if targetID != "" {
		query = query.Where("target_id = ?", targetID)
	}
	if search != "" {
		searchTerm := "%" + search + "%"
		query = query.Joins("LEFT JOIN users ON audit_logs.user_id = users.id").
			Where("users.username ILIKE ? OR audit_logs.action ILIKE ? OR audit_logs.target_type ILIKE ? OR audit_logs.target_id ILIKE ?",
				searchTerm, searchTerm, searchTerm, searchTerm)
	}
	if dateFrom != "" {
		query = query.Where("created_at >= ?", dateFrom)
	}
	if dateTo != "" {
		query = query.Where("created_at <= ?", dateTo)
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to count audit logs")
		return
	}

	// Get paginated results
	var auditLogs []models.AuditLog
	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&auditLogs).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to fetch audit logs")
		return
	}

	// Convert to response format
	logResponses := make([]AuditLogResponse, len(auditLogs))
	for i, log := range auditLogs {
		response := AuditLogResponse{
			ID:         log.ID.String(),
			Action:     string(log.Action),
			TargetType: string(log.TargetType),
			TargetID:   log.TargetID,
			Metadata:   log.Metadata,
			IPAddress:  log.IPAddress,
			UserAgent:  log.UserAgent,
			CreatedAt:  log.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}

		if log.UserID != nil {
			response.UserID = log.UserID.String()
			if log.User.Username != "" {
				response.Username = log.User.Username
			}
		}

		logResponses[i] = response
	}

	// Calculate total pages
	totalPages := int((total + int64(limit) - 1) / int64(limit))

	response := AuditLogsResponse{
		Logs: logResponses,
		Pagination: PaginationMeta{
			Page:  page,
			Limit: limit,
			Total: int(total),
			Pages: totalPages,
		},
	}

	utils.SuccessResponse(c, http.StatusOK, "Audit logs retrieved successfully", response)
}

// ApproveUserRequest represents the request to approve or reject a user
type ApproveUserRequest struct {
	Approved bool `json:"approved"`
}

// AdminPostResponse represents post data for admin management
type AdminPostResponse struct {
	ID            uint   `json:"id"`
	UUID          string `json:"uuid"` // Post ID as string for future UUID compatibility
	OwnerUUID     string `json:"owner_uuid"`
	OwnerUsername string `json:"owner_username"`
	StationID     string `json:"station_id"`
	StationName   string `json:"station_name"`
	SatelliteName string `json:"satellite_name"`
	Hidden        bool   `json:"hidden"`
	CreatedAt     string `json:"created_at"`
	UpdatedAt     string `json:"updated_at"`
}

// AdminPostsResponse represents paginated post data for admin management
type AdminPostsResponse struct {
	Posts      []AdminPostResponse `json:"posts"`
	Pagination PaginationMeta      `json:"pagination"`
}

// GetAllPosts returns a paginated list of posts for admin management with optional search and filters
func GetAllPosts(c *gin.Context) {
	db := config.GetDB()

	// Parse query parameters
	page := 1
	limit := 20
	search := c.Query("search")
	ownerUUID := c.Query("owner_uuid")
	stationID := c.Query("station_id")

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

	// Build query with joins to get station and user info
	query := db.Model(&models.Post{}).
		Select("posts.id, posts.station_id, posts.satellite_name, posts.hidden, posts.created_at, posts.updated_at, stations.name as station_name, users.id as owner_uuid, users.username as owner_username").
		Joins("JOIN stations ON posts.station_id = stations.id").
		Joins("JOIN users ON stations.user_id = users.id")

	// Add search filter if provided
	if search != "" {
		searchTerm := "%" + search + "%"
		query = query.Where("posts.satellite_name ILIKE ? OR stations.name ILIKE ? OR users.username ILIKE ? OR CAST(posts.id AS TEXT) ILIKE ? OR CAST(users.id AS TEXT) ILIKE ?",
			searchTerm, searchTerm, searchTerm, searchTerm, searchTerm)
	}

	// Add owner UUID filter if provided
	if ownerUUID != "" {
		query = query.Where("users.id = ?", ownerUUID)
	}

	// Add station ID filter if provided
	if stationID != "" {
		query = query.Where("posts.station_id = ?", stationID)
	}

	// Get total count for pagination
	var total int64
	if err := query.Count(&total).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to count posts")
		return
	}

	// Get paginated posts
	var posts []struct {
		ID            uint   `json:"id"`
		StationID     string `json:"station_id"`
		SatelliteName string `json:"satellite_name"`
		Hidden        bool   `json:"hidden"`
		CreatedAt     time.Time
		UpdatedAt     time.Time
		StationName   string `json:"station_name"`
		OwnerUUID     string `json:"owner_uuid"`
		OwnerUsername string `json:"owner_username"`
	}

	if err := query.Order("posts.created_at DESC").Limit(limit).Offset(offset).Scan(&posts).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to retrieve posts")
		return
	}

	// Calculate total pages
	totalPages := int((total + int64(limit) - 1) / int64(limit))

	var postResponses []AdminPostResponse
	for _, post := range posts {
		postResponse := AdminPostResponse{
			ID:            post.ID,
			UUID:          fmt.Sprintf("%d", post.ID), // Use ID as string for now, will be UUID later
			OwnerUUID:     post.OwnerUUID,
			OwnerUsername: post.OwnerUsername,
			StationID:     post.StationID,
			StationName:   post.StationName,
			SatelliteName: post.SatelliteName,
			Hidden:        post.Hidden,
			CreatedAt:     post.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt:     post.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
		postResponses = append(postResponses, postResponse)
	}

	response := AdminPostsResponse{
		Posts: postResponses,
		Pagination: PaginationMeta{
			Page:  page,
			Limit: limit,
			Total: int(total),
			Pages: totalPages,
		},
	}

	utils.SuccessResponse(c, http.StatusOK, "Posts retrieved successfully", response)
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

	// Log approval action
	auditAction := models.ActionAdminUserApprove
	if !req.Approved {
		auditAction = models.ActionAdminUserReject
	}
	utils.LogUserAction(c, auditAction, targetUserID, models.AuditMetadata{
		"target_username": user.Username,
	})

	// Send approval notification email if user was approved
	if req.Approved && user.Email.Valid {
		if err := utils.SendApprovalNotificationEmail(user.Email.String, user.Username); err != nil {
			// Log error but don't fail the approval operation
			utils.Logger.Error().Err(err).Str("username", user.Username).Msg("Failed to send approval notification email to user")
		}
	}

	action := "approved"
	if !req.Approved {
		action = "rejected"
	}

	utils.SuccessResponse(c, http.StatusOK, fmt.Sprintf("User %s successfully", action), nil)
}
