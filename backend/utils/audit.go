package utils

import (
	"strings"

	"sathub-ui-backend/config"
	"sathub-ui-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// LogAuditEvent logs an audit event to the database
func LogAuditEvent(c *gin.Context, action models.AuditAction, targetType models.AuditTargetType, targetID string, metadata models.AuditMetadata) error {
	db := config.GetDB()

	// Get user ID from context if authenticated
	var userID *uuid.UUID
	if userIDStr, exists := c.Get("user_id"); exists {
		if uid, err := uuid.Parse(userIDStr.(string)); err == nil {
			userID = &uid
		}
	}

	// Extract client information
	ipAddress := GetClientIP(c)
	userAgent := c.GetHeader("User-Agent")

	auditLog := models.AuditLog{
		Action:     action,
		TargetType: targetType,
		TargetID:   targetID,
		Metadata:   metadata,
		IPAddress:  &ipAddress,
		UserAgent:  &userAgent,
	}

	if userID != nil {
		auditLog.UserID = userID
	}

	// Create audit log entry asynchronously to avoid blocking the main operation
	go func() {
		if err := db.Create(&auditLog).Error; err != nil {
			// Log the error but don't fail the main operation
			// In production, you might want to use a proper logging framework
			println("Failed to create audit log:", err.Error())
		}
	}()

	return nil
}

// GetClientIP extracts the real client IP address from the request
func GetClientIP(c *gin.Context) string {
	// Check X-Forwarded-For header (most common with proxies/load balancers)
	xForwardedFor := c.GetHeader("X-Forwarded-For")
	if xForwardedFor != "" {
		// X-Forwarded-For can contain multiple IPs, take the first one
		ips := strings.Split(xForwardedFor, ",")
		return strings.TrimSpace(ips[0])
	}

	// Check X-Real-IP header (nginx)
	xRealIP := c.GetHeader("X-Real-IP")
	if xRealIP != "" {
		return xRealIP
	}

	// Check X-Forwarded header
	xForwarded := c.GetHeader("X-Forwarded")
	if xForwarded != "" {
		return xForwarded
	}

	// Fall back to remote address
	return c.ClientIP()
}

// Helper functions for common audit logging scenarios

// LogUserAction logs actions performed by or on users
func LogUserAction(c *gin.Context, action models.AuditAction, targetUserID uuid.UUID, metadata models.AuditMetadata) error {
	return LogAuditEvent(c, action, models.TargetTypeUser, targetUserID.String(), metadata)
}

// LogStationAction logs actions performed on stations
func LogStationAction(c *gin.Context, action models.AuditAction, stationID string, metadata models.AuditMetadata) error {
	return LogAuditEvent(c, action, models.TargetTypeStation, stationID, metadata)
}

// LogPostAction logs actions performed on posts
func LogPostAction(c *gin.Context, action models.AuditAction, postID string, metadata models.AuditMetadata) error {
	return LogAuditEvent(c, action, models.TargetTypePost, postID, metadata)
}

// LogCommentAction logs actions performed on comments
func LogCommentAction(c *gin.Context, action models.AuditAction, commentID uuid.UUID, metadata models.AuditMetadata) error {
	return LogAuditEvent(c, action, models.TargetTypeComment, commentID.String(), metadata)
}

// LogSystemAction logs system-level actions
func LogSystemAction(c *gin.Context, action models.AuditAction, metadata models.AuditMetadata) error {
	return LogAuditEvent(c, action, models.TargetTypeSystem, "", metadata)
}

// LogAchievementUnlock logs when a user unlocks an achievement
func LogAchievementUnlock(userID uuid.UUID, achievementID uuid.UUID, achievementName string) error {
	db := config.GetDB()

	auditLog := models.AuditLog{
		UserID:     &userID,
		Action:     models.ActionAchievementUnlock,
		TargetType: models.TargetTypeUser,
		TargetID:   userID.String(),
		Metadata: models.AuditMetadata{
			"achievement_id":   achievementID.String(),
			"achievement_name": achievementName,
		},
		IPAddress: nil, // Not available without context
		UserAgent: nil, // Not available without context
	}

	// Create audit log entry asynchronously to avoid blocking the main operation
	go func() {
		if err := db.Create(&auditLog).Error; err != nil {
			// Log error but don't fail the main operation
			// In production, you might want to use a proper logging framework
			println("Failed to create achievement unlock audit log:", err.Error())
		}
	}()

	return nil
}
