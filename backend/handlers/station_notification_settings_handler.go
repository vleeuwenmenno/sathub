package handlers

import (
	"net/http"
	"time"

	"sathub-ui-backend/config"
	"sathub-ui-backend/middleware"
	"sathub-ui-backend/models"
	"sathub-ui-backend/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// StationNotificationRuleRequest represents a single notification rule
type StationNotificationRuleRequest struct {
	ID        string `json:"id,omitempty"`        // For updates, empty for new rules
	Type      string `json:"type"`                // 'down_minutes', 'back_online', 'low_uptime'
	Threshold *int   `json:"threshold,omitempty"` // For 'down_minutes' and 'low_uptime'
	Enabled   bool   `json:"enabled"`
}

// StationNotificationSettingsRequest represents the request body for updating notification settings
type StationNotificationSettingsRequest struct {
	Rules []StationNotificationRuleRequest `json:"rules"`
}

// StationNotificationRuleResponse represents a single notification rule in responses
type StationNotificationRuleResponse struct {
	ID        string `json:"id"`
	Type      string `json:"type"`
	Threshold *int   `json:"threshold,omitempty"`
	Enabled   bool   `json:"enabled"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// StationNotificationSettingsResponse represents the notification settings response
type StationNotificationSettingsResponse struct {
	ID        string                            `json:"id"`
	StationID string                            `json:"station_id"`
	Rules     []StationNotificationRuleResponse `json:"rules"`
	CreatedAt string                            `json:"created_at"`
	UpdatedAt string                            `json:"updated_at"`
}

// GetStationNotificationSettings handles retrieving notification settings for a station
func GetStationNotificationSettings(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	stationID := c.Param("id")
	if stationID == "" {
		utils.ValidationErrorResponse(c, "Invalid station ID")
		return
	}

	db := config.GetDB()

	// Verify user owns the station
	var station models.Station
	if err := db.Where("id = ? AND user_id = ?", stationID, userID).First(&station).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Station not found")
			return
		}
		utils.InternalErrorResponse(c, "Failed to fetch station")
		return
	}

	// Get or create notification settings with rules
	var settings models.StationNotificationSettings
	if err := db.Preload("Rules").Where("station_id = ?", stationID).First(&settings).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Create default settings if none exist
			settings = models.StationNotificationSettings{
				StationID: stationID,
			}
			if err := db.Create(&settings).Error; err != nil {
				utils.InternalErrorResponse(c, "Failed to create notification settings")
				return
			}
		} else {
			utils.InternalErrorResponse(c, "Failed to fetch notification settings")
			return
		}
	}

	// Convert rules to response format
	rules := make([]StationNotificationRuleResponse, len(settings.Rules))
	for i, rule := range settings.Rules {
		rules[i] = StationNotificationRuleResponse{
			ID:        rule.ID.String(),
			Type:      rule.Type,
			Threshold: rule.Threshold,
			Enabled:   rule.Enabled,
			CreatedAt: rule.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt: rule.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
	}

	response := StationNotificationSettingsResponse{
		ID:        settings.ID.String(),
		StationID: settings.StationID,
		Rules:     rules,
		CreatedAt: settings.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt: settings.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	utils.SuccessResponse(c, http.StatusOK, "Notification settings retrieved successfully", response)
}

// UpdateStationNotificationSettings handles updating notification settings for a station
func UpdateStationNotificationSettings(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	stationID := c.Param("id")
	if stationID == "" {
		utils.ValidationErrorResponse(c, "Invalid station ID")
		return
	}

	var req StationNotificationSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	// Validate rules
	backOnlineCount := 0
	for _, rule := range req.Rules {
		switch rule.Type {
		case "down_minutes":
			if rule.Threshold == nil || *rule.Threshold < 1 {
				utils.ValidationErrorResponse(c, "down_minutes threshold must be at least 1")
				return
			}
			// Multiple down_minutes rules are allowed
		case "low_uptime":
			if rule.Threshold == nil || *rule.Threshold < 1 || *rule.Threshold > 100 {
				utils.ValidationErrorResponse(c, "low_uptime threshold must be between 1 and 100")
				return
			}
			// Multiple low_uptime rules are allowed
		case "back_online":
			// No threshold validation needed
			// Ensure only one back_online rule per station
			backOnlineCount++
			if backOnlineCount > 1 {
				utils.ValidationErrorResponse(c, "Only one back_online notification is allowed per station")
				return
			}
		default:
			utils.ValidationErrorResponse(c, "Invalid rule type: "+rule.Type)
			return
		}
	}

	db := config.GetDB()

	// Verify user owns the station
	var station models.Station
	if err := db.Where("id = ? AND user_id = ?", stationID, userID).First(&station).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Station not found")
			return
		}
		utils.InternalErrorResponse(c, "Failed to fetch station")
		return
	}

	// Get or create notification settings (DO NOT preload Rules - we're about to replace them)
	var settings models.StationNotificationSettings
	if err := db.Where("station_id = ?", stationID).First(&settings).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Create new settings
			settings = models.StationNotificationSettings{
				StationID: stationID,
			}
			if err := db.Create(&settings).Error; err != nil {
				utils.InternalErrorResponse(c, "Failed to create notification settings")
				return
			}
		} else {
			utils.InternalErrorResponse(c, "Failed to fetch notification settings")
			return
		}
	}

	// Start a transaction to update rules
	tx := db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Delete all existing rules for this settings
	if err := tx.Where("settings_id = ?", settings.ID).Delete(&models.StationNotificationRule{}).Error; err != nil {
		tx.Rollback()
		utils.InternalErrorResponse(c, "Failed to delete notification rules")
		return
	}

	// Create new rules
	newRules := make([]models.StationNotificationRule, 0, len(req.Rules))
	for _, ruleReq := range req.Rules {
		rule := models.StationNotificationRule{
			SettingsID: settings.ID,
			Type:       ruleReq.Type,
			Threshold:  ruleReq.Threshold,
			Enabled:    ruleReq.Enabled,
		}
		if err := tx.Create(&rule).Error; err != nil {
			tx.Rollback()
			utils.InternalErrorResponse(c, "Failed to create notification rule")
			return
		}
		newRules = append(newRules, rule)
	}

	// Update settings timestamp
	settings.UpdatedAt = time.Now()
	if err := tx.Save(&settings).Error; err != nil {
		tx.Rollback()
		utils.InternalErrorResponse(c, "Failed to update notification settings")
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to save notification settings")
		return
	}

	// Use the newly created rules directly instead of reloading
	settings.Rules = newRules

	// Convert rules to response format
	responseRules := make([]StationNotificationRuleResponse, len(settings.Rules))
	for i, rule := range settings.Rules {
		responseRules[i] = StationNotificationRuleResponse{
			ID:        rule.ID.String(),
			Type:      rule.Type,
			Threshold: rule.Threshold,
			Enabled:   rule.Enabled,
			CreatedAt: rule.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt: rule.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
	}

	response := StationNotificationSettingsResponse{
		ID:        settings.ID.String(),
		StationID: settings.StationID,
		Rules:     responseRules,
		CreatedAt: settings.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt: settings.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	utils.SuccessResponse(c, http.StatusOK, "Notification settings updated successfully", response)
}
