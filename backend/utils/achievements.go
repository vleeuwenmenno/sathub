package utils

import (
	"encoding/json"
	"log"
	"sathub-ui-backend/config"
	"sathub-ui-backend/models"
	"time"

	"github.com/google/uuid"
)

type AchievementCriteria struct {
	Type  string `json:"type"`
	Value int    `json:"value"`
}

type AchievementResult struct {
	AchievementID uuid.UUID `json:"achievement_id"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	Icon          string    `json:"icon"`
	UnlockedAt    time.Time `json:"unlocked_at"`
}

// CheckAchievements checks all achievements for a user and awards any newly unlocked ones
func CheckAchievements(userID uuid.UUID) ([]AchievementResult, error) {
	db := config.GetDB()

	// Get all achievements
	var achievements []models.Achievement
	if err := db.Find(&achievements).Error; err != nil {
		return nil, err
	}

	// Get user's existing achievements
	var existingAchievements []models.UserAchievement
	if err := db.Where("user_id = ?", userID).Find(&existingAchievements).Error; err != nil {
		return nil, err
	}

	// Create map of existing achievement IDs for quick lookup
	existingMap := make(map[uuid.UUID]bool)
	for _, ua := range existingAchievements {
		existingMap[ua.AchievementID] = true
	}

	var newAchievements []AchievementResult

	for _, achievement := range achievements {
		// Skip if user already has this achievement
		if existingMap[achievement.ID] {
			continue
		}

		// Parse criteria
		var criteria AchievementCriteria
		if err := json.Unmarshal([]byte(achievement.Criteria), &criteria); err != nil {
			log.Printf("Failed to parse criteria for achievement %s: %v", achievement.Name, err)
			continue
		}

		// Check if user meets the criteria
		if meetsCriteria(userID, criteria) {
			// Award the achievement
			userAchievement := models.UserAchievement{
				UserID:        userID,
				AchievementID: achievement.ID,
				UnlockedAt:    time.Now(),
			}

			if err := db.Create(&userAchievement).Error; err != nil {
				log.Printf("Failed to award achievement %s to user %s: %v", achievement.Name, userID, err)
				continue
			}

			newAchievements = append(newAchievements, AchievementResult{
				AchievementID: achievement.ID,
				Name:          achievement.Name,
				Description:   achievement.Description,
				Icon:          achievement.Icon,
				UnlockedAt:    userAchievement.UnlockedAt,
			})

			// Create notification for the achievement
			notification := models.Notification{
				UserID:    userID,
				Type:      "achievement",
				Message:   "You unlocked the achievement: " + achievement.Name,
				RelatedID: achievement.ID,
				IsRead:    false,
			}

			if err := db.Create(&notification).Error; err != nil {
				log.Printf("Failed to create notification for achievement %s: %v", achievement.Name, err)
			}

			// Send email notification if user has email notifications enabled
			var user models.User
			if err := db.Where("id = ?", userID).First(&user).Error; err == nil && user.EmailNotifications {
				go func() {
					if err := SendAchievementNotificationEmail(user.Email.String, user.Username, achievement.Name, achievement.Description); err != nil {
						log.Printf("Failed to send achievement email notification: %v", err)
					}
				}()
			}
		}
	}

	return newAchievements, nil
}

// meetsCriteria checks if a user meets the criteria for an achievement
func meetsCriteria(userID uuid.UUID, criteria AchievementCriteria) bool {
	db := config.GetDB()

	switch criteria.Type {
	case "account_created":
		// Always true for registered users
		return true

	case "stations_created":
		var count int64
		db.Model(&models.Station{}).Where("user_id = ?", userID).Count(&count)
		return count >= int64(criteria.Value)

	case "posts_created":
		var count int64
		db.Model(&models.Post{}).Joins("JOIN stations ON posts.station_id = stations.id").Where("stations.user_id = ?", userID).Count(&count)
		return count >= int64(criteria.Value)

	case "likes_received":
		var count int64
		db.Model(&models.Like{}).Joins("JOIN posts ON likes.post_id = posts.id").Joins("JOIN stations ON posts.station_id = stations.id").Where("stations.user_id = ?", userID).Count(&count)
		return count >= int64(criteria.Value)

	case "comments_created":
		var count int64
		db.Model(&models.Comment{}).Where("user_id = ?", userID).Count(&count)
		return count >= int64(criteria.Value)

	case "comment_likes_received":
		var count int64
		db.Model(&models.CommentLike{}).Joins("JOIN comments ON comment_likes.comment_id = comments.id").Where("comments.user_id = ?", userID).Count(&count)
		return count >= int64(criteria.Value)

	case "successful_transmissions":
		// For now, count posts as transmissions (each post represents a successful transmission)
		var count int64
		db.Model(&models.Post{}).Joins("JOIN stations ON posts.station_id = stations.id").Where("stations.user_id = ?", userID).Count(&count)
		return count >= int64(criteria.Value)

	case "account_age_days":
		var user models.User
		if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
			return false
		}
		days := int(time.Since(user.CreatedAt).Hours() / 24)
		return days >= criteria.Value

	case "unique_satellites":
		var count int64
		db.Model(&models.Post{}).Joins("JOIN stations ON posts.station_id = stations.id").Where("stations.user_id = ?", userID).Distinct("satellite_name").Count(&count)
		return count >= int64(criteria.Value)

	case "unique_locations":
		var count int64
		db.Model(&models.Station{}).Where("user_id = ?", userID).Distinct("location").Count(&count)
		return count >= int64(criteria.Value)

	case "comments_received":
		var count int64
		db.Model(&models.Comment{}).Joins("JOIN posts ON comments.post_id = posts.id").Joins("JOIN stations ON posts.station_id = stations.id").Where("stations.user_id = ?", userID).Count(&count)
		return count >= int64(criteria.Value)

	default:
		log.Printf("Unknown achievement criteria type: %s", criteria.Type)
		return false
	}
}

// GetUserAchievements returns all achievements for a user
func GetUserAchievements(userID uuid.UUID) ([]models.UserAchievement, error) {
	db := config.GetDB()

	var userAchievements []models.UserAchievement
	err := db.Preload("Achievement").Where("user_id = ?", userID).Order("unlocked_at DESC").Find(&userAchievements).Error

	return userAchievements, err
}

// GetAllAchievements returns all available achievements
func GetAllAchievements() ([]models.Achievement, error) {
	db := config.GetDB()

	var achievements []models.Achievement
	err := db.Order("name").Find(&achievements).Error

	return achievements, err
}
