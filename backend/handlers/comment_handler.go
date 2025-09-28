package handlers

import (
	"net/http"
	"strconv"

	"satdump-ui-backend/config"
	"satdump-ui-backend/middleware"
	"satdump-ui-backend/models"
	"satdump-ui-backend/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// CommentRequest represents the request body for creating/updating a comment
type CommentRequest struct {
	Content  string `json:"content" binding:"required,min=1,max=1000"`
	ParentID *uint  `json:"parent_id,omitempty"` // Optional for replies
}

// CommentResponse represents a comment in responses
type CommentResponse struct {
	ID                uint              `json:"id"`
	UserID            uint              `json:"user_id"`
	Username          string            `json:"username"`
	DisplayName       string            `json:"display_name,omitempty"`
	ProfilePictureURL string            `json:"profile_picture_url,omitempty"`
	HasProfilePicture bool              `json:"has_profile_picture"`
	Content           string            `json:"content"`
	ParentID          *uint             `json:"parent_id,omitempty"`
	Replies           []CommentResponse `json:"replies,omitempty"`
	CreatedAt         string            `json:"created_at"`
	UpdatedAt         string            `json:"updated_at"`
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

	// Fetch all comments for the post
	var comments []models.Comment
	if err := db.Preload("User").Where("post_id = ?", uint(postID)).Order("created_at ASC").Find(&comments).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to fetch comments")
		return
	}

	// Organize comments into tree structure
	commentMap := make(map[uint]*CommentResponse)

	// First pass: create all comment objects
	for _, comment := range comments {
		commentResp := CommentResponse{
			ID:                comment.ID,
			UserID:            comment.UserID,
			Username:          comment.User.Username,
			DisplayName:       comment.User.DisplayName,
			ProfilePictureURL: generateProfilePictureURL(comment.User.ID, comment.User.UpdatedAt.Format("2006-01-02T15:04:05Z07:00")),
			HasProfilePicture: len(comment.User.ProfilePicture) > 0,
			Content:           comment.Content,
			ParentID:          comment.ParentID,
			Replies:           []CommentResponse{},
			CreatedAt:         comment.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt:         comment.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}

		commentMap[comment.ID] = &commentResp
	}

	// Second pass: build the tree
	var rootComments []CommentResponse
	for _, comment := range comments {
		commentResp := commentMap[comment.ID]

		if comment.ParentID == nil {
			// Top-level comment
			rootComments = append(rootComments, *commentResp)
		} else {
			// Reply - add to parent's replies
			if parent, exists := commentMap[*comment.ParentID]; exists {
				parent.Replies = append(parent.Replies, *commentResp)
			}
		}
	}

	utils.SuccessResponse(c, http.StatusOK, "Comments retrieved successfully", rootComments)
}

// CreateComment handles creating a new comment
func CreateComment(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
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
	query = query.Joins("Station").Where("is_public = ? OR user_id = ?", true, userID)

	if err := query.First(&post).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Post not found or not accessible")
			return
		}
		utils.InternalErrorResponse(c, "Failed to fetch post")
		return
	}

	// If parent_id is provided, check if parent comment exists and belongs to the same post
	if req.ParentID != nil {
		var parentComment models.Comment
		if err := db.Where("id = ? AND post_id = ?", *req.ParentID, uint(postID)).First(&parentComment).Error; err != nil {
			utils.NotFoundResponse(c, "Parent comment not found")
			return
		}
	}

	// Create the comment
	comment := models.Comment{
		UserID:   userID,
		PostID:   uint(postID),
		ParentID: req.ParentID,
		Content:  req.Content,
	}

	if err := db.Create(&comment).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to create comment")
		return
	}

	// Fetch the created comment with user info for response
	if err := db.Preload("User").First(&comment, comment.ID).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to fetch created comment")
		return
	}

	response := CommentResponse{
		ID:                comment.ID,
		UserID:            comment.UserID,
		Username:          comment.User.Username,
		DisplayName:       comment.User.DisplayName,
		ProfilePictureURL: generateProfilePictureURL(comment.User.ID, comment.User.UpdatedAt.Format("2006-01-02T15:04:05Z07:00")),
		HasProfilePicture: len(comment.User.ProfilePicture) > 0,
		Content:           comment.Content,
		ParentID:          comment.ParentID,
		Replies:           []CommentResponse{}, // New comment has no replies yet
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

	commentID, err := strconv.ParseUint(c.Param("commentId"), 10, 32)
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
	if err := db.Where("id = ? AND user_id = ?", uint(commentID), userID).First(&comment).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Comment not found or not owned by user")
			return
		}
		utils.InternalErrorResponse(c, "Failed to fetch comment")
		return
	}

	// Update the comment
	comment.Content = req.Content
	if err := db.Save(&comment).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to update comment")
		return
	}

	// Fetch updated comment with user info
	if err := db.Preload("User").First(&comment, comment.ID).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to fetch updated comment")
		return
	}

	response := CommentResponse{
		ID:                comment.ID,
		UserID:            comment.UserID,
		Username:          comment.User.Username,
		DisplayName:       comment.User.DisplayName,
		ProfilePictureURL: generateProfilePictureURL(comment.User.ID, comment.User.UpdatedAt.Format("2006-01-02T15:04:05Z07:00")),
		HasProfilePicture: len(comment.User.ProfilePicture) > 0,
		Content:           comment.Content,
		ParentID:          comment.ParentID,
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

	commentID, err := strconv.ParseUint(c.Param("commentId"), 10, 32)
	if err != nil {
		utils.ValidationErrorResponse(c, "Invalid comment ID")
		return
	}

	db := config.GetDB()

	// Find comment and verify ownership
	var comment models.Comment
	if err := db.Where("id = ? AND user_id = ?", uint(commentID), userID).First(&comment).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Comment not found or not owned by user")
			return
		}
		utils.InternalErrorResponse(c, "Failed to fetch comment")
		return
	}

	// Delete all replies first (cascade delete)
	if err := db.Where("parent_id = ?", uint(commentID)).Delete(&models.Comment{}).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to delete comment replies")
		return
	}

	// Delete the comment
	if err := db.Delete(&comment).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to delete comment")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Comment deleted successfully", nil)
}
