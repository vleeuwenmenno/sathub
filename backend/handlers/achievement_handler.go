package handlers

import (
	"net/http"

	"satdump-ui-backend/middleware"
	"satdump-ui-backend/utils"

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

	response := make([]UserAchievementResponse, len(userAchievements))
	for i, ua := range userAchievements {
		response[i] = UserAchievementResponse{
			Achievement: AchievementResponse{
				ID:          ua.Achievement.ID.String(),
				Name:        ua.Achievement.Name,
				Description: ua.Achievement.Description,
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

	response := make([]AchievementResponse, len(achievements))
	for i, achievement := range achievements {
		response[i] = AchievementResponse{
			ID:          achievement.ID.String(),
			Name:        achievement.Name,
			Description: achievement.Description,
			Icon:        achievement.Icon,
		}
	}

	utils.SuccessResponse(c, http.StatusOK, "Achievements retrieved successfully", response)
}
