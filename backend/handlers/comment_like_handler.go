package handlers

import (
	"net/http"
	"strconv"

	"satdump-ui-backend/config"
	"satdump-ui-backend/middleware"
	"satdump-ui-backend/models"
	"satdump-ui-backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// LikeComment handles liking/unliking a comment (toggle functionality)
func LikeComment(c *gin.Context) {
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

	commentID, err := strconv.ParseUint(c.Param("commentId"), 10, 32)
	if err != nil {
		utils.ValidationErrorResponse(c, "Invalid comment ID")
		return
	}

	db := config.GetDB()

	// Check if comment exists and is accessible (comment's post must be accessible)
	var comment models.Comment
	if err := db.Preload("Post").Preload("Post.Station").Where("comments.id = ?", uint(commentID)).First(&comment).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Comment not found")
			return
		}
		utils.InternalErrorResponse(c, "Failed to fetch comment")
		return
	}

	// Check if the post's station is accessible
	if !comment.Post.Station.IsPublic && comment.Post.Station.UserID != userID {
		utils.NotFoundResponse(c, "Comment not found or not accessible")
		return
	}

	// Check if user already liked this comment
	var existingLike models.CommentLike
	err = db.Where("user_id = ? AND comment_id = ?", userID, uint(commentID)).First(&existingLike).Error

	if err == nil {
		// User already liked, so unlike (delete the like)
		if err := db.Delete(&existingLike).Error; err != nil {
			utils.InternalErrorResponse(c, "Failed to unlike comment")
			return
		}

		// Log comment unlike
		utils.LogCommentAction(c, models.ActionCommentUnlike, uint(commentID), models.AuditMetadata{})

		utils.SuccessResponse(c, http.StatusOK, "Comment unliked successfully", gin.H{"liked": false})
	} else if err == gorm.ErrRecordNotFound {
		// User hasn't liked, so like (create the like)
		like := models.CommentLike{
			UserID:    userID,
			CommentID: uint(commentID),
		}
		if err := db.Create(&like).Error; err != nil {
			utils.InternalErrorResponse(c, "Failed to like comment")
			return
		}

		// Log comment like
		utils.LogCommentAction(c, models.ActionCommentLike, uint(commentID), models.AuditMetadata{})

		utils.SuccessResponse(c, http.StatusCreated, "Comment liked successfully", gin.H{"liked": true})
	} else {
		utils.InternalErrorResponse(c, "Failed to check like status")
		return
	}
}
