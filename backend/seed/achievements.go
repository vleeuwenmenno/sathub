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
			NameKey:        "achievements.welcomeAboard.name",
			DescriptionKey: "achievements.welcomeAboard.description",
			Icon:           "👋",
			Criteria:       `{"type": "account_created", "value": 1}`,
		},
		{
			NameKey:        "achievements.firstStation.name",
			DescriptionKey: "achievements.firstStation.description",
			Icon:           "📡",
			Criteria:       `{"type": "stations_created", "value": 1}`,
		},
		{
			NameKey:        "achievements.stationNetwork.name",
			DescriptionKey: "achievements.stationNetwork.description",
			Icon:           "🌐",
			Criteria:       `{"type": "stations_created", "value": 5}`,
		},
		{
			NameKey:        "achievements.dataPioneer.name",
			DescriptionKey: "achievements.dataPioneer.description",
			Icon:           "🛰️",
			Criteria:       `{"type": "posts_created", "value": 1}`,
		},
		{
			NameKey:        "achievements.proSharer.name",
			DescriptionKey: "achievements.proSharer.description",
			Icon:           "⭐",
			Criteria:       `{"type": "posts_created", "value": 50}`,
		},
		{
			NameKey:        "achievements.communityBuilder.name",
			DescriptionKey: "achievements.communityBuilder.description",
			Icon:           "👍",
			Criteria:       `{"type": "likes_received", "value": 1}`,
		},
		{
			NameKey:        "achievements.popularContributor.name",
			DescriptionKey: "achievements.popularContributor.description",
			Icon:           "🔥",
			Criteria:       `{"type": "likes_received", "value": 50}`,
		},
		{
			NameKey:        "achievements.conversationStarter.name",
			DescriptionKey: "achievements.conversationStarter.description",
			Icon:           "💬",
			Criteria:       `{"type": "comments_created", "value": 1}`,
		},
		{
			NameKey:        "achievements.activeDiscussant.name",
			DescriptionKey: "achievements.activeDiscussant.description",
			Icon:           "🗣️",
			Criteria:       `{"type": "comments_created", "value": 20}`,
		},
		{
			NameKey:        "achievements.insightfulCommenter.name",
			DescriptionKey: "achievements.insightfulCommenter.description",
			Icon:           "💡",
			Criteria:       `{"type": "comment_likes_received", "value": 10}`,
		},
		{
			NameKey:        "achievements.dataTransmitter.name",
			DescriptionKey: "achievements.dataTransmitter.description",
			Icon:           "📡",
			Criteria:       `{"type": "successful_transmissions", "value": 10}`,
		},
		{
			NameKey:        "achievements.veteranOperator.name",
			DescriptionKey: "achievements.veteranOperator.description",
			Icon:           "🎖️",
			Criteria:       `{"type": "account_age_days", "value": 365}`,
		},
		{
			NameKey:        "achievements.satelliteExplorer.name",
			DescriptionKey: "achievements.satelliteExplorer.description",
			Icon:           "🛰️",
			Criteria:       `{"type": "unique_satellites", "value": 5}`,
		},
		{
			NameKey:        "achievements.globalNetwork.name",
			DescriptionKey: "achievements.globalNetwork.description",
			Icon:           "🌍",
			Criteria:       `{"type": "unique_locations", "value": 3}`,
		},
		{
			NameKey:        "achievements.dataHoarder.name",
			DescriptionKey: "achievements.dataHoarder.description",
			Icon:           "💾",
			Criteria:       `{"type": "posts_created", "value": 100}`,
		},
		{
			NameKey:        "achievements.communityLeader.name",
			DescriptionKey: "achievements.communityLeader.description",
			Icon:           "👑",
			Criteria:       `{"type": "likes_received", "value": 100}`,
		},
		{
			NameKey:        "achievements.commentGuru.name",
			DescriptionKey: "achievements.commentGuru.description",
			Icon:           "🧠",
			Criteria:       `{"type": "comment_likes_received", "value": 50}`,
		},
		{
			NameKey:        "achievements.stationMaster.name",
			DescriptionKey: "achievements.stationMaster.description",
			Icon:           "🏗️",
			Criteria:       `{"type": "stations_created", "value": 10}`,
		},
		{
			NameKey:        "achievements.signalSpecialist.name",
			DescriptionKey: "achievements.signalSpecialist.description",
			Icon:           "📡",
			Criteria:       `{"type": "successful_transmissions", "value": 25}`,
		},
		{
			NameKey:        "achievements.engagementChampion.name",
			DescriptionKey: "achievements.engagementChampion.description",
			Icon:           "💬",
			Criteria:       `{"type": "comments_received", "value": 10}`,
		},
		{
			NameKey:        "achievements.firstCheckIn.name",
			DescriptionKey: "achievements.firstCheckIn.description",
			Icon:           "🔋",
			Criteria:       `{"type": "health_checks_performed", "value": 1}`,
		},
		{
			NameKey:        "achievements.reliableStation.name",
			DescriptionKey: "achievements.reliableStation.description",
			Icon:           "⚡",
			Criteria:       `{"type": "station_uptime_percent", "period_days": 7, "uptime_percent": 90}`,
		},
		{
			NameKey:        "achievements.highlyReliable.name",
			DescriptionKey: "achievements.highlyReliable.description",
			Icon:           "🔋",
			Criteria:       `{"type": "station_uptime_percent", "period_days": 7, "uptime_percent": 95}`,
		},
		{
			NameKey:        "achievements.perfectUptime.name",
			DescriptionKey: "achievements.perfectUptime.description",
			Icon:           "⭐",
			Criteria:       `{"type": "station_uptime_percent", "period_days": 7, "uptime_percent": 100}`,
		},
		{
			NameKey:        "achievements.consistentOperator.name",
			DescriptionKey: "achievements.consistentOperator.description",
			Icon:           "🎯",
			Criteria:       `{"type": "station_uptime_percent", "period_days": 30, "uptime_percent": 80}`,
		},
		{
			NameKey:        "achievements.dedicatedOperator.name",
			DescriptionKey: "achievements.dedicatedOperator.description",
			Icon:           "🏆",
			Criteria:       `{"type": "station_uptime_percent", "period_days": 30, "uptime_percent": 90}`,
		},
		{
			NameKey:        "achievements.longTermReliability.name",
			DescriptionKey: "achievements.longTermReliability.description",
			Icon:           "👑",
			Criteria:       `{"type": "station_uptime_percent", "period_days": 30, "uptime_percent": 95}`,
		},
	}

	for _, achievement := range achievements {
		// Check if achievement already exists
		var existing models.Achievement
		if err := db.Where("name_key = ?", achievement.NameKey).First(&existing).Error; err == nil {
			// Achievement already exists, update it
			existing.DescriptionKey = achievement.DescriptionKey
			existing.Icon = achievement.Icon
			existing.Criteria = achievement.Criteria
			if err := db.Save(&existing).Error; err != nil {
				return fmt.Errorf("failed to update achievement %s: %w", achievement.NameKey, err)
			}
			utils.Logger.Info().Str("achievement", achievement.NameKey).Msg("Updated achievement")
			continue
		}

		if err := db.Create(&achievement).Error; err != nil {
			return fmt.Errorf("failed to create achievement %s: %w", achievement.NameKey, err)
		}
		utils.Logger.Info().Str("achievement", achievement.NameKey).Msg("Created achievement")
	}

	return nil
}
