package handlers

import (
	"net/http"

	"sathub-ui-backend/config"
	"sathub-ui-backend/middleware"
	"sathub-ui-backend/models"
	"sathub-ui-backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// AchievementResponse represents an achievement in responses
type AchievementResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
}

// UserAchievementResponse represents a user's unlocked achievement
type UserAchievementResponse struct {
	Achievement AchievementResponse `json:"achievement"`
	UnlockedAt  string              `json:"unlocked_at"`
}

// GetUserAchievements handles fetching all achievements for the current user
func GetUserAchievements(c *gin.Context) {
	userIDStr, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.InternalErrorResponse(c, "Invalid user ID")
		return
	}

	userAchievements, err := utils.GetUserAchievements(userID)
	if err != nil {
		utils.InternalErrorResponse(c, "Failed to fetch user achievements")
		return
	}

	// Get user language for translations
	var user models.User
	if err := config.GetDB().Where("id = ?", userID).First(&user).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to fetch user language")
		return
	}

	response := make([]UserAchievementResponse, len(userAchievements))
	for i, ua := range userAchievements {
		// Translate achievement name and description
		name, description, err := utils.TranslateAchievement(ua.Achievement.NameKey, ua.Achievement.DescriptionKey, user.Language)
		if err != nil {
			utils.Logger.Error().Err(err).Str("achievement_id", ua.Achievement.ID.String()).Msg("Failed to translate achievement")
			// Fallback to keys if translation fails
			name = ua.Achievement.NameKey
			description = ua.Achievement.DescriptionKey
		}

		response[i] = UserAchievementResponse{
			Achievement: AchievementResponse{
				ID:          ua.Achievement.ID.String(),
				Name:        name,
				Description: description,
				Icon:        ua.Achievement.Icon,
			},
			UnlockedAt: ua.UnlockedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
	}

	utils.SuccessResponse(c, http.StatusOK, "User achievements retrieved successfully", response)
}

// GetAllAchievements handles fetching all available achievements
func GetAllAchievements(c *gin.Context) {
	achievements, err := utils.GetAllAchievements()
	if err != nil {
		utils.InternalErrorResponse(c, "Failed to fetch achievements")
		return
	}

	// Get user language for translations (default to 'en' if not authenticated)
	language := "en"
	if userIDStr, exists := middleware.GetCurrentUserID(c); exists {
		if userID, err := uuid.Parse(userIDStr); err == nil {
			var user models.User
			if err := config.GetDB().Where("id = ?", userID).First(&user).Error; err == nil {
				language = user.Language
			}
		}
	}

	response := make([]AchievementResponse, len(achievements))
	for i, achievement := range achievements {
		// Translate achievement name and description
		name, description, err := utils.TranslateAchievement(achievement.NameKey, achievement.DescriptionKey, language)
		if err != nil {
			utils.Logger.Error().Err(err).Str("achievement_id", achievement.ID.String()).Msg("Failed to translate achievement")
			// Fallback to keys if translation fails
			name = achievement.NameKey
			description = achievement.DescriptionKey
		}

		response[i] = AchievementResponse{
			ID:          achievement.ID.String(),
			Name:        name,
			Description: description,
			Icon:        achievement.Icon,
		}
	}

	utils.SuccessResponse(c, http.StatusOK, "Achievements retrieved successfully", response)
}

// UnlockEasterEggAchievement handles unlocking the easter egg achievement for the current user
func UnlockEasterEggAchievement(c *gin.Context) {
	userIDStr, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.InternalErrorResponse(c, "Invalid user ID")
		return
	}

	// Only allow unlocking the easter egg achievement
	easterEggNameKey := "achievements.easterEgg.name"
	if err := utils.UnlockAchievement(userID, easterEggNameKey); err != nil {
		utils.InternalErrorResponse(c, "Failed to unlock easter egg achievement")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Easter egg achievement unlocked successfully", nil)
}
