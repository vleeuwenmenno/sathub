package utils

import (
	"encoding/json"
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
	AchievementID  uuid.UUID `json:"achievement_id"`
	NameKey        string    `json:"name_key"`
	DescriptionKey string    `json:"description_key"`
	Name           string    `json:"name"`
	Description    string    `json:"description"`
	Icon           string    `json:"icon"`
	UnlockedAt     time.Time `json:"unlocked_at"`
}

// CheckAchievements checks all achievements for a user and awards any newly unlocked ones
func CheckAchievements(userID uuid.UUID) ([]AchievementResult, error) {
	Logger.Debug().Str("user_id", userID.String()).Msg("Checking achievements for user")
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
			Logger.Error().Err(err).Str("achievement", achievement.NameKey).Msg("Failed to parse criteria for achievement")
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
				Logger.Error().Err(err).Str("achievement", achievement.NameKey).Str("user_id", userID.String()).Msg("Failed to award achievement to user")
				continue
			}

			// Log the achievement unlock for audit purposes
			if err := LogAchievementUnlock(userID, achievement.ID, achievement.NameKey); err != nil {
				Logger.Error().Err(err).Str("achievement", achievement.NameKey).Msg("Failed to log achievement unlock")
			}

			// Create notification for the achievement (store translation key for frontend translation)
			notification := models.Notification{
				UserID:    userID,
				Type:      "achievement",
				Message:   "achievement_unlocked:" + achievement.NameKey,
				RelatedID: achievement.ID.String(),
				IsRead:    false,
			}

			if err := db.Create(&notification).Error; err != nil {
				Logger.Error().Err(err).Str("achievement", achievement.NameKey).Msg("Failed to create notification for achievement")
			}

			// Get user for language and email notifications
			var user models.User
			if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
				Logger.Error().Err(err).Str("user_id", userID.String()).Msg("Failed to fetch user for achievement notification")
				continue
			}

			// Send email notification if user has email notifications enabled
			if user.EmailNotifications {
				// Translate achievement name and description for email
				achievementName, achievementDesc, err := TranslateAchievement(achievement.NameKey, achievement.DescriptionKey, user.Language)
				if err != nil {
					Logger.Error().Err(err).Str("achievement_id", achievement.ID.String()).Msg("Failed to translate achievement for email, using keys as fallback")
					achievementName = achievement.NameKey
					achievementDesc = achievement.DescriptionKey
				}
				go func() {
					if err := SendAchievementNotificationEmail(user.Email.String, user.Username, achievementName, achievementDesc, user.Language); err != nil {
						Logger.Error().Err(err).Msg("Failed to send achievement email notification")
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
		Logger.Warn().Str("criteria_type", criteria.Type).Msg("Unknown achievement criteria type")
		return false
	}
}

// checkStationUptimeCriteria checks if a user meets uptime-based achievement criteria
func checkStationUptimeCriteria(userID uuid.UUID, criteria AchievementCriteria) bool {
	db := config.GetDB()

	// Get all stations for this user
	var stations []models.Station
	if err := db.Where("user_id = ?", userID).Find(&stations).Error; err != nil {
		Logger.Error().Err(err).Str("user_id", userID.String()).Msg("Failed to get stations for user")
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

	Logger.Debug().Str("station_id", stationID).Int("period_days", criteria.PeriodDays).Time("start_date", startDate).Msg("Checking station uptime")

	// Get uptime records for the station within the time range
	var uptimes []models.StationUptime
	if err := db.Where("station_id = ? AND timestamp >= ?", stationID, startDate).Order("timestamp ASC").Find(&uptimes).Error; err != nil {
		Logger.Error().Err(err).Str("station_id", stationID).Msg("Failed to get uptime data for station")
		return false
	}

	Logger.Debug().Int("count", len(uptimes)).Str("station_id", stationID).Msg("Found uptime records for station")

	if len(uptimes) == 0 {
		return false
	}

	Logger.Debug().Time("first_record", uptimes[0].Timestamp).Time("start_date", startDate).Bool("after_check", uptimes[0].Timestamp.After(startDate)).Msg("First record details")

	// Check if the station has been running for most of the required period
	// Allow a small tolerance (e.g., 90% of the period) to account for timing variations
	minRequiredPeriod := time.Duration(float64(criteria.PeriodDays) * 24 * float64(time.Hour) * 0.9) // 90% of period
	actualRunningTime := time.Since(uptimes[0].Timestamp)
	if actualRunningTime < minRequiredPeriod {
		Logger.Debug().Str("station_id", stationID).Dur("running_time", actualRunningTime).Dur("min_required", minRequiredPeriod).Msg("Station hasn't been running long enough")
		return false
	}

	// Get the station to get online_threshold
	var station models.Station
	if err := db.Where("id = ?", stationID).First(&station).Error; err != nil {
		Logger.Error().Err(err).Str("station_id", stationID).Msg("Failed to get station")
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

	Logger.Debug().Str("station_id", stationID).Float64("uptime_percent", uptimePercentage).Float64("required_percent", criteria.UptimePercent).Msg("Station uptime percentage")

	return uptimePercentage >= criteria.UptimePercent
}

// GetUserAchievements returns all achievements for a user
func GetUserAchievements(userID uuid.UUID) ([]models.UserAchievement, error) {
	db := config.GetDB()

	var userAchievements []models.UserAchievement
	err := db.Preload("Achievement").Where("user_id = ?", userID).Order("unlocked_at DESC").Find(&userAchievements).Error

	return userAchievements, err
}

// GetAllAchievements returns all available achievements (excluding hidden ones)
func GetAllAchievements() ([]models.Achievement, error) {
	db := config.GetDB()

	var achievements []models.Achievement
	err := db.Where("is_hidden = ?", false).Order("name_key").Find(&achievements).Error

	return achievements, err
}

// UnlockAchievement manually unlocks an achievement for a user
func UnlockAchievement(userID uuid.UUID, achievementNameKey string) error {
	db := config.GetDB()

	// Find the achievement
	var achievement models.Achievement
	if err := db.Where("name_key = ?", achievementNameKey).First(&achievement).Error; err != nil {
		return err
	}

	// Check if user already has this achievement
	var existing models.UserAchievement
	if err := db.Where("user_id = ? AND achievement_id = ?", userID, achievement.ID).First(&existing).Error; err == nil {
		// User already has this achievement
		return nil
	}

	// Award the achievement
	userAchievement := models.UserAchievement{
		UserID:        userID,
		AchievementID: achievement.ID,
		UnlockedAt:    time.Now(),
	}

	if err := db.Create(&userAchievement).Error; err != nil {
		return err
	}

	// Log the achievement unlock for audit purposes
	if err := LogAchievementUnlock(userID, achievement.ID, achievement.NameKey); err != nil {
		Logger.Error().Err(err).Str("achievement", achievement.NameKey).Msg("Failed to log achievement unlock")
	}

	// Create notification for the achievement
	notification := models.Notification{
		UserID:    userID,
		Type:      "achievement",
		Message:   "achievement_unlocked:" + achievement.NameKey,
		RelatedID: achievement.ID.String(),
		IsRead:    false,
	}

	if err := db.Create(&notification).Error; err != nil {
		Logger.Error().Err(err).Str("achievement", achievement.NameKey).Msg("Failed to create notification for achievement")
	}

	// Get user for email notifications
	var user models.User
	if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
		Logger.Error().Err(err).Str("user_id", userID.String()).Msg("Failed to fetch user for achievement notification")
		return err
	}

	// Send email notification if user has email notifications enabled
	if user.EmailNotifications {
		// Translate achievement name and description for email
		achievementName, achievementDesc, err := TranslateAchievement(achievement.NameKey, achievement.DescriptionKey, user.Language)
		if err != nil {
			Logger.Error().Err(err).Str("achievement_id", achievement.ID.String()).Msg("Failed to translate achievement for email, using keys as fallback")
			achievementName = achievement.NameKey
			achievementDesc = achievement.DescriptionKey
		}
		go func() {
			if err := SendAchievementNotificationEmail(user.Email.String, user.Username, achievementName, achievementDesc, user.Language); err != nil {
				Logger.Error().Err(err).Msg("Failed to send achievement email notification")
			}
		}()
	}

	return nil
}
