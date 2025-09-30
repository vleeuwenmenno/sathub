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
	Type          string  `json:"type"`
	Value         int     `json:"value"`
	PeriodDays    int     `json:"period_days,omitempty"`    // For uptime achievements
	UptimePercent float64 `json:"uptime_percent,omitempty"` // For uptime achievements
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
	log.Printf("DEBUG: Checking achievements for user %s", userID)
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

			// Log the achievement unlock for audit purposes
			if err := LogAchievementUnlock(userID, achievement.ID, achievement.Name); err != nil {
				log.Printf("Failed to log achievement unlock for %s: %v", achievement.Name, err)
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
				RelatedID: achievement.ID.String(),
				IsRead:    false,
			}

			if err := db.Create(&notification).Error; err != nil {
				log.Printf("Failed to create notification for achievement %s: %v", achievement.Name, err)
			}

			// Send email notification if user has email notifications enabled
			var user models.User
			if err := db.Where("id = ?", userID).First(&user).Error; err == nil && user.EmailNotifications {
				achievementName := achievement.Name
				achievementDesc := achievement.Description
				go func() {
					if err := SendAchievementNotificationEmail(user.Email.String, user.Username, achievementName, achievementDesc); err != nil {
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

	case "health_checks_performed":
		// Check if user has any stations that have performed health checks
		var count int64
		db.Model(&models.StationUptime{}).Joins("JOIN stations ON station_uptimes.station_id = stations.id").Where("stations.user_id = ?", userID).Count(&count)
		return count >= int64(criteria.Value)

	case "station_uptime_percent":
		return checkStationUptimeCriteria(userID, criteria)

	default:
		log.Printf("Unknown achievement criteria type: %s", criteria.Type)
		return false
	}
}

// checkStationUptimeCriteria checks if a user meets uptime-based achievement criteria
func checkStationUptimeCriteria(userID uuid.UUID, criteria AchievementCriteria) bool {
	db := config.GetDB()

	// Get all stations for this user
	var stations []models.Station
	if err := db.Where("user_id = ?", userID).Find(&stations).Error; err != nil {
		log.Printf("Failed to get stations for user %s: %v", userID, err)
		return false
	}

	if len(stations) == 0 {
		return false
	}

	// Check if any station meets the uptime criteria
	for _, station := range stations {
		if checkSingleStationUptime(station.ID, criteria) {
			return true
		}
	}

	return false
}

// checkSingleStationUptime calculates uptime percentage for a single station
func checkSingleStationUptime(stationID string, criteria AchievementCriteria) bool {
	db := config.GetDB()

	// Calculate the start date based on period_days
	startDate := time.Now().AddDate(0, 0, -criteria.PeriodDays)

	log.Printf("DEBUG: Checking station %s for %d days, startDate: %v, now: %v", stationID, criteria.PeriodDays, startDate, time.Now())

	// Get uptime records for the station within the time range
	var uptimes []models.StationUptime
	if err := db.Where("station_id = ? AND timestamp >= ?", stationID, startDate).Order("timestamp ASC").Find(&uptimes).Error; err != nil {
		log.Printf("Failed to get uptime data for station %s: %v", stationID, err)
		return false
	}

	log.Printf("DEBUG: Found %d uptime records for station %s", len(uptimes), stationID)

	if len(uptimes) == 0 {
		return false
	}

	log.Printf("DEBUG: First record timestamp: %v, startDate: %v, After check: %v", uptimes[0].Timestamp, startDate, uptimes[0].Timestamp.After(startDate))

	// Check if the station has been running for most of the required period
	// Allow a small tolerance (e.g., 90% of the period) to account for timing variations
	minRequiredPeriod := time.Duration(float64(criteria.PeriodDays) * 24 * float64(time.Hour) * 0.9) // 90% of period
	actualRunningTime := time.Since(uptimes[0].Timestamp)
	if actualRunningTime < minRequiredPeriod {
		log.Printf("DEBUG: Station %s hasn't been running long enough (running for %v, need at least %v)", stationID, actualRunningTime, minRequiredPeriod)
		return false
	}

	// Get the station to get online_threshold
	var station models.Station
	if err := db.Where("id = ?", stationID).First(&station).Error; err != nil {
		log.Printf("Failed to get station %s: %v", stationID, err)
		return false
	}

	// Calculate uptime percentage using the same logic as the frontend
	now := time.Now().UnixMilli()
	startTime := uptimes[0].Timestamp.UnixMilli()
	totalPeriodMs := now - startTime

	var onlineTimeMs int64

	// Calculate online time between consecutive events
	for i := 0; i < len(uptimes)-1; i++ {
		currentTime := uptimes[i].Timestamp.UnixMilli()
		nextTime := uptimes[i+1].Timestamp.UnixMilli()
		gapMs := nextTime - currentTime
		thresholdMs := int64(station.OnlineThreshold) * 60 * 1000 // Convert minutes to milliseconds

		if gapMs <= thresholdMs {
			// Station was online for the entire gap
			onlineTimeMs += gapMs
		} else {
			// Station was online for threshold minutes, then offline
			onlineTimeMs += thresholdMs
		}
	}

	// Handle the current period from last event to now
	if len(uptimes) > 0 {
		lastEventTime := uptimes[len(uptimes)-1].Timestamp.UnixMilli()
		timeSinceLastEvent := now - lastEventTime
		thresholdMs := int64(station.OnlineThreshold) * 60 * 1000

		if timeSinceLastEvent <= thresholdMs {
			// Station is currently online
			onlineTimeMs += timeSinceLastEvent
		} else {
			// Station went offline after threshold
			onlineTimeMs += thresholdMs
		}
	}

	uptimePercentage := float64(0)
	if totalPeriodMs > 0 {
		uptimePercentage = (float64(onlineTimeMs) / float64(totalPeriodMs)) * 100
	}

	log.Printf("DEBUG: Station %s uptime percentage: %.2f%% (required: %.2f%%)", stationID, uptimePercentage, criteria.UptimePercent)

	return uptimePercentage >= criteria.UptimePercent
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
