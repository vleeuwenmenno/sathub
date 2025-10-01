package handlers

import (
	"fmt"
	"net/http"
	"strconv"

	"sathub-ui-backend/config"
	"sathub-ui-backend/middleware"
	"sathub-ui-backend/models"
	"sathub-ui-backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CommentRequest represents the request body for creating/updating a comment
type CommentRequest struct {
	Content string `json:"content" binding:"required,min=1,max=2000"`
}

// CommentResponse represents a comment in responses
type CommentResponse struct {
	ID                string `json:"id"`
	UserID            string `json:"user_id"`
	Username          string `json:"username"`
	DisplayName       string `json:"display_name,omitempty"`
	ProfilePictureURL string `json:"profile_picture_url,omitempty"`
	HasProfilePicture bool   `json:"has_profile_picture"`
	Content           string `json:"content"`
	LikesCount        int64  `json:"likes_count"`
	IsLiked           bool   `json:"is_liked"`
	CreatedAt         string `json:"created_at"`
	UpdatedAt         string `json:"updated_at"`
}

// GetCommentsForPost handles fetching all comments for a specific post
func GetCommentsForPost(c *gin.Context) {
	postID, err := strconv.ParseUint(c.Param("postId"), 10, 32)
	if err != nil {
		utils.ValidationErrorResponse(c, "Invalid post ID")
		return
	}

	db := config.GetDB()

	// Check if post exists and is accessible
	userID, isAuthenticated := middleware.GetCurrentUserID(c)
	var post models.Post
	query := db.Preload("Station").Where("posts.id = ?", uint(postID))
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

	// Parse sorting parameter
	sortBy := c.DefaultQuery("sort_by", "newest")
	if sortBy != "newest" && sortBy != "most_liked" {
		sortBy = "newest" // default fallback
	}

	// Fetch all comments for the post with appropriate sorting
	var comments []models.Comment
	commentQuery := db.Preload("User").Where("post_id = ?", uint(postID))

	if sortBy == "newest" {
		commentQuery = commentQuery.Order("created_at DESC")
	} else if sortBy == "most_liked" {
		// For most liked, we need to join with comment_likes and count, then sort by count desc, created_at desc
		commentQuery = commentQuery.Joins("LEFT JOIN comment_likes cl ON comments.id = cl.comment_id").
			Select("comments.*, COUNT(cl.id) as likes_count").
			Group("comments.id").
			Order("likes_count DESC, comments.created_at DESC")
	}

	if err := commentQuery.Find(&comments).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to fetch comments")
		return
	}

	// Get current user ID for like status (userID already declared above)
	userID, isAuthenticated = middleware.GetCurrentUserID(c)

	// Convert to response format
	var commentResponses []CommentResponse
	for _, comment := range comments {
		// Count likes for this comment
		var likesCount int64
		db.Model(&models.CommentLike{}).Where("comment_id = ?", comment.ID).Count(&likesCount)

		// Check if current user liked this comment
		var isLiked bool
		if isAuthenticated {
			var like models.CommentLike
			err := db.Where("user_id = ? AND comment_id = ?", userID, comment.ID).First(&like).Error
			isLiked = err == nil
		}

		commentResp := CommentResponse{
			ID:                comment.ID.String(),
			UserID:            comment.UserID.String(),
			Username:          comment.User.Username,
			DisplayName:       comment.User.DisplayName,
			ProfilePictureURL: generateProfilePictureURL(comment.User.ID.String(), comment.User.UpdatedAt.Format("2006-01-02T15:04:05Z07:00")),
			HasProfilePicture: len(comment.User.ProfilePicture) > 0,
			Content:           comment.Content,
			LikesCount:        likesCount,
			IsLiked:           isLiked,
			CreatedAt:         comment.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt:         comment.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
		commentResponses = append(commentResponses, commentResp)
	}

	utils.SuccessResponse(c, http.StatusOK, "Comments retrieved successfully", commentResponses)
}

// CreateComment handles creating a new comment
func CreateComment(c *gin.Context) {
	userIDStr, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	// Parse userID to UUID
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.InternalErrorResponse(c, "Invalid user ID")
		return
	}

	postID, err := strconv.ParseUint(c.Param("postId"), 10, 32)
	if err != nil {
		utils.ValidationErrorResponse(c, "Invalid post ID")
		return
	}

	var req CommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	db := config.GetDB()

	// Check if post exists and is accessible
	var post models.Post
	query := db.Preload("Station").Where("posts.id = ?", uint(postID))
	query = query.Joins("Station").Where("is_public = ? OR user_id = ?", true, userIDStr)

	if err := query.First(&post).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Post not found or not accessible")
			return
		}
		utils.InternalErrorResponse(c, "Failed to fetch post")
		return
	}

	// Create the comment
	comment := models.Comment{
		UserID:  userID,
		PostID:  uint(postID),
		Content: req.Content,
	}

	// Debug logging
	utils.Logger.Info().Str("user_id", userID.String()).Uint("post_id", uint(postID)).Str("content", req.Content).Msg("Creating comment")

	if err := db.Create(&comment).Error; err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to create comment")
		utils.InternalErrorResponse(c, "Failed to create comment")
		return
	}

	utils.Logger.Info().Str("comment_id", comment.ID.String()).Msg("Comment created successfully")

	// Create notification for post owner if commenter is not the owner
	if post.Station.UserID.String() != userIDStr {
		go func() {
			// Load the commenter's user data
			var commenter models.User
			if err := db.Where("id = ?", userID).First(&commenter).Error; err != nil {
				utils.Logger.Error().Err(err).Msg("Failed to get commenter info")
				return
			}

			// Use display name if available, otherwise use username
			commenterName := commenter.Username
			if commenter.DisplayName != "" {
				commenterName = commenter.DisplayName
			}

			notification := models.Notification{
				UserID:    post.Station.UserID,
				Type:      "comment",
				Message:   fmt.Sprintf("%s commented on your post (%s)", commenterName, post.SatelliteName),
				RelatedID: fmt.Sprintf("%d:%s", uint(postID), comment.ID.String()), // postId:commentId for navigation
				IsRead:    false,
			}

			if err := db.Create(&notification).Error; err != nil {
				utils.Logger.Error().Err(err).Msg("Failed to create comment notification")
			}

			// Send email notification if user has email notifications enabled
			var postOwner models.User
			if err := db.Where("id = ?", post.Station.UserID).First(&postOwner).Error; err == nil && postOwner.EmailNotifications {
				go func() {
					if err := utils.SendCommentNotificationEmail(postOwner.Email.String, postOwner.Username, commenterName); err != nil {
						utils.Logger.Error().Err(err).Msg("Failed to send comment email notification")
					}
				}()
			}
		}()
	}

	// Log comment creation
	utils.LogCommentAction(c, models.ActionCommentCreate, comment.ID, models.AuditMetadata{
		"post_id":        postID,
		"content_length": len(req.Content),
	})

	// Fetch the created comment with user info for response
	if err := db.Preload("User").First(&comment, comment.ID).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to fetch created comment")
		return
	}

	response := CommentResponse{
		ID:                comment.ID.String(),
		UserID:            comment.UserID.String(),
		Username:          comment.User.Username,
		DisplayName:       comment.User.DisplayName,
		ProfilePictureURL: generateProfilePictureURL(comment.User.ID.String(), comment.User.UpdatedAt.Format("2006-01-02T15:04:05Z07:00")),
		HasProfilePicture: len(comment.User.ProfilePicture) > 0,
		Content:           comment.Content,
		LikesCount:        0,     // New comment has no likes yet
		IsLiked:           false, // Creator hasn't liked their own comment yet
		CreatedAt:         comment.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:         comment.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	utils.SuccessResponse(c, http.StatusCreated, "Comment created successfully", response)
}

// UpdateComment handles updating a comment (only by the owner)
func UpdateComment(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	commentIDStr := c.Param("commentId")
	commentID, err := uuid.Parse(commentIDStr)
	if err != nil {
		utils.ValidationErrorResponse(c, "Invalid comment ID")
		return
	}

	var req CommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	db := config.GetDB()

	// Find comment and verify ownership
	var comment models.Comment
	if err := db.Where("id = ? AND user_id = ?", commentID, userID).First(&comment).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Comment not found or not owned by user")
			return
		}
		utils.InternalErrorResponse(c, "Failed to fetch comment")
		return
	}

	// Update the comment
	oldContent := comment.Content
	comment.Content = req.Content
	if err := db.Save(&comment).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to update comment")
		return
	}

	// Log comment update
	utils.LogCommentAction(c, models.ActionCommentUpdate, comment.ID, models.AuditMetadata{
		"old_content_length": len(oldContent),
		"new_content_length": len(req.Content),
	})

	// Fetch updated comment with user info
	if err := db.Preload("User").First(&comment, comment.ID).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to fetch updated comment")
		return
	}

	// Count likes for this comment
	var likesCount int64
	db.Model(&models.CommentLike{}).Where("comment_id = ?", comment.ID).Count(&likesCount)

	// Check if current user liked this comment
	var isLiked bool
	var like models.CommentLike
	err = db.Where("user_id = ? AND comment_id = ?", userID, comment.ID).First(&like).Error
	isLiked = err == nil

	response := CommentResponse{
		ID:                comment.ID.String(),
		UserID:            comment.UserID.String(),
		Username:          comment.User.Username,
		DisplayName:       comment.User.DisplayName,
		ProfilePictureURL: generateProfilePictureURL(comment.User.ID.String(), comment.User.UpdatedAt.Format("2006-01-02T15:04:05Z07:00")),
		HasProfilePicture: len(comment.User.ProfilePicture) > 0,
		Content:           comment.Content,
		LikesCount:        likesCount,
		IsLiked:           isLiked,
		CreatedAt:         comment.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:         comment.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	utils.SuccessResponse(c, http.StatusOK, "Comment updated successfully", response)
}

// DeleteComment handles deleting a comment (only by the owner)
func DeleteComment(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	commentIDStr := c.Param("commentId")
	commentID, err := uuid.Parse(commentIDStr)
	if err != nil {
		utils.ValidationErrorResponse(c, "Invalid comment ID")
		return
	}

	db := config.GetDB()

	// Find comment and verify ownership
	var comment models.Comment
	if err := db.Where("id = ? AND user_id = ?", commentID, userID).First(&comment).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Comment not found or not owned by user")
			return
		}
		utils.InternalErrorResponse(c, "Failed to fetch comment")
		return
	}

	// Delete the comment
	if err := db.Delete(&comment).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to delete comment")
		return
	}

	// Log comment deletion
	utils.LogCommentAction(c, models.ActionCommentDelete, commentID, models.AuditMetadata{
		"content_length": len(comment.Content),
	})

	utils.SuccessResponse(c, http.StatusOK, "Comment deleted successfully", nil)
}
