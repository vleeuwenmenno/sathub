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

// LikePost handles liking/unliking a post (toggle functionality)
func LikePost(c *gin.Context) {
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

	db := config.GetDB()

	// Check if post exists and is accessible
	var post models.Post
	query := db.Preload("Station").Where("posts.id = ?", uint(postID))
	if err := query.Joins("Station").Where("is_public = ? OR user_id = ?", true, userID).First(&post).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Post not found or not accessible")
			return
		}
		utils.InternalErrorResponse(c, "Failed to fetch post")
		return
	}

	// Check if user already liked this post
	var existingLike models.Like
	err = db.Where("user_id = ? AND post_id = ?", userID, uint(postID)).First(&existingLike).Error

	if err == nil {
		// User already liked, so unlike (delete the like)
		if err := db.Delete(&existingLike).Error; err != nil {
			utils.InternalErrorResponse(c, "Failed to unlike post")
			return
		}
		utils.SuccessResponse(c, http.StatusOK, "Post unliked successfully", gin.H{"liked": false})
	} else if err == gorm.ErrRecordNotFound {
		// User hasn't liked, so like (create the like)
		like := models.Like{
			UserID: userID,
			PostID: uint(postID),
		}
		if err := db.Create(&like).Error; err != nil {
			utils.InternalErrorResponse(c, "Failed to like post")
			return
		}
		utils.SuccessResponse(c, http.StatusCreated, "Post liked successfully", gin.H{"liked": true})
	} else {
		utils.InternalErrorResponse(c, "Failed to check like status")
		return
	}
}

// GetUserLikedPosts handles fetching posts liked by a specific user
func GetUserLikedPosts(c *gin.Context) {
	userID, err := strconv.ParseUint(c.Param("userId"), 10, 32)
	if err != nil {
		utils.ValidationErrorResponse(c, "Invalid user ID")
		return
	}

	db := config.GetDB()

	// Parse pagination parameters
	limitStr := c.DefaultQuery("limit", "20")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 || limit > 100 {
		limit = 20 // default and max 100
	}

	pageStr := c.DefaultQuery("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page <= 0 {
		page = 1
	}

	offset := (page - 1) * limit

	// Get liked posts with post details
	var likes []models.Like
	if err := db.Preload("Post").Preload("Post.Station").Where("user_id = ?", uint(userID)).Order("created_at DESC").Limit(limit).Offset(offset).Find(&likes).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to fetch liked posts")
		return
	}

	// Build response with post details
	response := make([]PostResponse, len(likes))
	for i, like := range likes {
		response[i] = buildPostResponse(like.Post, db)
	}

	// Get total count for pagination
	var totalCount int64
	db.Model(&models.Like{}).Where("user_id = ?", uint(userID)).Count(&totalCount)

	utils.SuccessResponse(c, http.StatusOK, "Liked posts retrieved successfully", gin.H{
		"posts": response,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": totalCount,
			"pages": (totalCount + int64(limit) - 1) / int64(limit), // Ceiling division
		},
	})
}
