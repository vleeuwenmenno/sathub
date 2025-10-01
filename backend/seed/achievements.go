package seed

import (
	"fmt"
	"sathub-ui-backend/config"
	"sathub-ui-backend/models"
	"sathub-ui-backend/utils"
)

// seedAchievements creates the predefined achievements
func seedAchievements() error {
	db := config.GetDB()

	achievements := []models.Achievement{
		{
			Name:        "Welcome Aboard",
			Description: "Create your SatHub account",
			Icon:        "👋",
			Criteria:    `{"type": "account_created", "value": 1}`,
		},
		{
			Name:        "First Station",
			Description: "Set up your first ground station",
			Icon:        "📡",
			Criteria:    `{"type": "stations_created", "value": 1}`,
		},
		{
			Name:        "Station Network",
			Description: "Create 5 ground stations",
			Icon:        "🌐",
			Criteria:    `{"type": "stations_created", "value": 5}`,
		},
		{
			Name:        "Data Pioneer",
			Description: "Upload your first satellite data post",
			Icon:        "🛰️",
			Criteria:    `{"type": "posts_created", "value": 1}`,
		},
		{
			Name:        "Pro Sharer",
			Description: "Upload 50 posts",
			Icon:        "⭐",
			Criteria:    `{"type": "posts_created", "value": 50}`,
		},
		{
			Name:        "Community Builder",
			Description: "Receive your first like on a post",
			Icon:        "👍",
			Criteria:    `{"type": "likes_received", "value": 1}`,
		},
		{
			Name:        "Popular Contributor",
			Description: "Receive 50 likes on your posts",
			Icon:        "🔥",
			Criteria:    `{"type": "likes_received", "value": 50}`,
		},
		{
			Name:        "Conversation Starter",
			Description: "Post your first comment",
			Icon:        "💬",
			Criteria:    `{"type": "comments_created", "value": 1}`,
		},
		{
			Name:        "Active Discussant",
			Description: "Post 20 comments",
			Icon:        "🗣️",
			Criteria:    `{"type": "comments_created", "value": 20}`,
		},
		{
			Name:        "Insightful Commenter",
			Description: "Receive 10 likes on your comments",
			Icon:        "💡",
			Criteria:    `{"type": "comment_likes_received", "value": 10}`,
		},
		{
			Name:        "Data Transmitter",
			Description: "Have 10 successful data transmissions",
			Icon:        "📡",
			Criteria:    `{"type": "successful_transmissions", "value": 10}`,
		},
		{
			Name:        "Veteran Operator",
			Description: "Account active for 1 year",
			Icon:        "🎖️",
			Criteria:    `{"type": "account_age_days", "value": 365}`,
		},
		{
			Name:        "Satellite Explorer",
			Description: "Upload posts from 5 different satellites",
			Icon:        "🛰️",
			Criteria:    `{"type": "unique_satellites", "value": 5}`,
		},
		{
			Name:        "Global Network",
			Description: "Create stations in 3 different locations",
			Icon:        "🌍",
			Criteria:    `{"type": "unique_locations", "value": 3}`,
		},
		{
			Name:        "Data Hoarder",
			Description: "Upload 100 posts",
			Icon:        "💾",
			Criteria:    `{"type": "posts_created", "value": 100}`,
		},
		{
			Name:        "Community Leader",
			Description: "Receive 100 likes on your posts",
			Icon:        "👑",
			Criteria:    `{"type": "likes_received", "value": 100}`,
		},
		{
			Name:        "Comment Guru",
			Description: "Receive 50 likes on your comments",
			Icon:        "🧠",
			Criteria:    `{"type": "comment_likes_received", "value": 50}`,
		},
		{
			Name:        "Station Master",
			Description: "Create 10 ground stations",
			Icon:        "🏗️",
			Criteria:    `{"type": "stations_created", "value": 10}`,
		},
		{
			Name:        "Signal Specialist",
			Description: "Have 25 successful transmissions",
			Icon:        "📡",
			Criteria:    `{"type": "successful_transmissions", "value": 25}`,
		},
		{
			Name:        "Engagement Champion",
			Description: "Receive 10 comments on your posts",
			Icon:        "💬",
			Criteria:    `{"type": "comments_received", "value": 10}`,
		},
		{
			Name:        "First Check-in",
			Description: "Your station has made its first health check-in",
			Icon:        "🔋",
			Criteria:    `{"type": "health_checks_performed", "value": 1}`,
		},
		{
			Name:        "Reliable Station",
			Description: "Maintain 90% uptime on any station for 7 days",
			Icon:        "⚡",
			Criteria:    `{"type": "station_uptime_percent", "period_days": 7, "uptime_percent": 90}`,
		},
		{
			Name:        "Highly Reliable",
			Description: "Maintain 95% uptime on any station for 7 days",
			Icon:        "🔋",
			Criteria:    `{"type": "station_uptime_percent", "period_days": 7, "uptime_percent": 95}`,
		},
		{
			Name:        "Perfect Uptime",
			Description: "Maintain 100% uptime on any station for 7 days",
			Icon:        "⭐",
			Criteria:    `{"type": "station_uptime_percent", "period_days": 7, "uptime_percent": 100}`,
		},
		{
			Name:        "Consistent Operator",
			Description: "Maintain 80% uptime on any station for 30 days",
			Icon:        "🎯",
			Criteria:    `{"type": "station_uptime_percent", "period_days": 30, "uptime_percent": 80}`,
		},
		{
			Name:        "Dedicated Operator",
			Description: "Maintain 90% uptime on any station for 30 days",
			Icon:        "🏆",
			Criteria:    `{"type": "station_uptime_percent", "period_days": 30, "uptime_percent": 90}`,
		},
		{
			Name:        "Long-term Reliability",
			Description: "Maintain 95% uptime on any station for 30 days",
			Icon:        "👑",
			Criteria:    `{"type": "station_uptime_percent", "period_days": 30, "uptime_percent": 95}`,
		},
	}

	for _, achievement := range achievements {
		// Check if achievement already exists
		var existing models.Achievement
		if err := db.Where("name = ?", achievement.Name).First(&existing).Error; err == nil {
			// Achievement already exists, update it
			existing.Description = achievement.Description
			existing.Icon = achievement.Icon
			existing.Criteria = achievement.Criteria
			if err := db.Save(&existing).Error; err != nil {
				return fmt.Errorf("failed to update achievement %s: %w", achievement.Name, err)
			}
			utils.Logger.Info().Str("achievement", achievement.Name).Msg("Updated achievement")
			continue
		}

		if err := db.Create(&achievement).Error; err != nil {
			return fmt.Errorf("failed to create achievement %s: %w", achievement.Name, err)
		}
		utils.Logger.Info().Str("achievement", achievement.Name).Msg("Created achievement")
	}

	return nil
}
