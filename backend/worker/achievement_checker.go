package worker

import (
	"sathub-ui-backend/models"
	"sathub-ui-backend/utils"
	"time"

	"gorm.io/gorm"
)

// AchievementChecker checks and awards achievements for all users periodically
type AchievementChecker struct {
	db *gorm.DB
}

// NewAchievementChecker creates a new achievement checker
func NewAchievementChecker(db *gorm.DB) *AchievementChecker {
	return &AchievementChecker{db: db}
}

// Start begins the achievement checking process
func (c *AchievementChecker) Start() {
	utils.Logger.Info().Msg("Starting achievement checker")

	// Run initial check
	c.checkAllAchievements()

	// Schedule periodic checks every minute
	ticker := time.NewTicker(1 * time.Minute)
	go func() {
		for range ticker.C {
			c.checkAllAchievements()
		}
	}()
}

// checkAllAchievements checks achievements for all users
func (c *AchievementChecker) checkAllAchievements() {
	utils.Logger.Debug().Msg("Checking achievements for all users")

	// Get all users
	var users []models.User
	if err := c.db.Find(&users).Error; err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to fetch users for achievement checking")
		return
	}

	utils.Logger.Debug().Int("user_count", len(users)).Msg("Found users to check achievements for")

	for _, user := range users {
		userID := user.ID
		if _, err := utils.CheckAchievements(userID); err != nil {
			utils.Logger.Error().Err(err).Str("user_id", userID.String()).Msg("Failed to check achievements for user")
		}
	}
}
