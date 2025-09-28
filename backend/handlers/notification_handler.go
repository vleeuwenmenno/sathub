package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"satdump-ui-backend/models"
	"satdump-ui-backend/utils"
)

type NotificationHandler struct {
	db *gorm.DB
}

func NewNotificationHandler(db *gorm.DB) *NotificationHandler {
	return &NotificationHandler{db: db}
}

// GetNotifications returns the user's notifications
func (h *NotificationHandler) GetNotifications(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 20
	}

	offset := (page - 1) * limit

	var notifications []models.Notification
	var total int64

	// Get total count
	h.db.Model(&models.Notification{}).Where("user_id = ?", userID).Count(&total)

	// Get notifications with pagination, ordered by created_at desc
	result := h.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&notifications)

	if result.Error != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch notifications")
		return
	}

	totalPages := (total + int64(limit) - 1) / int64(limit)

	utils.SuccessResponse(c, http.StatusOK, "Notifications retrieved successfully", gin.H{
		"notifications": notifications,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": totalPages,
		},
	})
}

// MarkAsRead marks a specific notification as read
func (h *NotificationHandler) MarkAsRead(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
		return
	}

	notificationID := c.Param("id")
	if notificationID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Notification ID is required")
		return
	}

	// Parse UUID
	id, err := uuid.Parse(notificationID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid notification ID")
		return
	}

	// Update only if it belongs to the user
	result := h.db.Model(&models.Notification{}).
		Where("id = ? AND user_id = ?", id, userID).
		Update("is_read", true)

	if result.Error != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to mark notification as read")
		return
	}

	if result.RowsAffected == 0 {
		utils.ErrorResponse(c, http.StatusNotFound, "Notification not found")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Notification marked as read", nil)
}

// MarkAllAsRead marks all user's notifications as read
func (h *NotificationHandler) MarkAllAsRead(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
		return
	}

	result := h.db.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Update("is_read", true)

	if result.Error != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to mark notifications as read")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "All notifications marked as read", gin.H{
		"updated_count": result.RowsAffected,
	})
}

// DeleteNotification deletes a specific notification
func (h *NotificationHandler) DeleteNotification(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
		return
	}

	notificationID := c.Param("id")
	if notificationID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Notification ID is required")
		return
	}

	// Parse UUID
	id, err := uuid.Parse(notificationID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid notification ID")
		return
	}

	// Delete only if it belongs to the user
	result := h.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Notification{})

	if result.Error != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to delete notification")
		return
	}

	if result.RowsAffected == 0 {
		utils.ErrorResponse(c, http.StatusNotFound, "Notification not found")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Notification deleted", nil)
}

// GetUnreadCount returns the count of unread notifications
func (h *NotificationHandler) GetUnreadCount(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
		return
	}

	var count int64
	h.db.Model(&models.Notification{}).Where("user_id = ? AND is_read = ?", userID, false).Count(&count)

	utils.SuccessResponse(c, http.StatusOK, "Unread count retrieved", gin.H{"unread_count": count})
}
