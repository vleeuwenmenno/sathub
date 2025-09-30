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

// LikePost handles liking/unliking a post (toggle functionality)
func LikePost(c *gin.Context) {
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

	db := config.GetDB()

	// Check if post exists and is accessible
	var post models.Post
	query := db.Preload("Station").Where("posts.id = ?", uint(postID))
	if err := query.Joins("Station").Where("is_public = ? OR user_id = ?", true, userIDStr).First(&post).Error; err != nil {
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

		// Log post unlike
		utils.LogPostAction(c, models.ActionPostUnlike, uint(postID), models.AuditMetadata{})

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

		// Check for achievements after liking
		go func() {
			if _, err := utils.CheckAchievements(userID); err != nil {
				fmt.Printf("Failed to check achievements for user %s: %v\n", userID, err)
			}
		}()

		// Create notification for post owner if liker is not the owner
		if post.Station.UserID.String() != userIDStr {
			go func() {
				// Get the liker's info
				var liker models.User
				if err := db.Where("id = ?", userID).First(&liker).Error; err != nil {
					fmt.Printf("Failed to get liker info: %v\n", err)
					return
				}

				// Use display name if available, otherwise use username
				likerName := liker.Username
				if liker.DisplayName != "" {
					likerName = liker.DisplayName
				}

				notification := models.Notification{
					UserID:    post.Station.UserID,
					Type:      "like",
					Message:   fmt.Sprintf("%s liked your post (%s)", likerName, post.SatelliteName),
					RelatedID: strconv.Itoa(int(post.ID)), // Post ID for navigation
					IsRead:    false,
				}

				if err := db.Create(&notification).Error; err != nil {
					fmt.Printf("Failed to create like notification: %v\n", err)
				}

				// Send email notification if user has email notifications enabled
				var postOwner models.User
				if err := db.Where("id = ?", post.Station.UserID).First(&postOwner).Error; err == nil && postOwner.EmailNotifications {
					go func() {
						if err := utils.SendLikeNotificationEmail(postOwner.Email.String, postOwner.Username, liker.Username); err != nil {
							fmt.Printf("Failed to send like email notification: %v\n", err)
						}
					}()
				}
			}()
		}

		// Log post like
		utils.LogPostAction(c, models.ActionPostLike, uint(postID), models.AuditMetadata{})
		utils.SuccessResponse(c, http.StatusCreated, "Post liked successfully", gin.H{"liked": true})
	} else {
		utils.InternalErrorResponse(c, "Failed to check like status")
		return
	}
}

// GetUserLikedPosts handles fetching posts liked by a specific user
func GetUserLikedPosts(c *gin.Context) {
	userIDStr := c.Param("userId")
	if userIDStr == "" {
		utils.ValidationErrorResponse(c, "Invalid user ID")
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.ValidationErrorResponse(c, "Invalid user ID format")
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
	if err := db.Preload("Post").Preload("Post.Station").Where("user_id = ?", userID).Order("created_at DESC").Limit(limit).Offset(offset).Find(&likes).Error; err != nil {
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
	db.Model(&models.Like{}).Where("user_id = ?", userID).Count(&totalCount)

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
