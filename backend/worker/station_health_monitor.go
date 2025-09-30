package worker

import (
	"fmt"
	"log"
	"time"

	"sathub-ui-backend/models"
	"sathub-ui-backend/utils"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// StationHealthMonitor monitors station health and sends notifications
type StationHealthMonitor struct {
	db *gorm.DB
}

// NewStationHealthMonitor creates a new station health monitor
func NewStationHealthMonitor(db *gorm.DB) *StationHealthMonitor {
	return &StationHealthMonitor{db: db}
}

// Start begins the monitoring process
func (m *StationHealthMonitor) Start() {
	log.Println("Starting station health monitor...")

	// Run initial check
	m.checkStations()

	// Schedule periodic checks every minute
	ticker := time.NewTicker(1 * time.Minute)
	go func() {
		for range ticker.C {
			m.checkStations()
		}
	}()
}

// checkStations performs health checks on all stations with notification settings
func (m *StationHealthMonitor) checkStations() {
	log.Println("Checking station health...")

	var settings []models.StationNotificationSettings
	if err := m.db.Preload("Station").Preload("Rules").Find(&settings).Error; err != nil {
		log.Printf("Failed to fetch notification settings: %v", err)
		return
	}

	log.Printf("Found %d stations with notification settings", len(settings))

	for _, setting := range settings {
		if err := m.checkStationHealth(setting); err != nil {
			log.Printf("Failed to check station %s health: %v", setting.StationID, err)
		}
	}
}

// checkStationHealth checks a single station's health and sends notifications if needed
func (m *StationHealthMonitor) checkStationHealth(setting models.StationNotificationSettings) error {
	station := setting.Station
	if station.ID == "" {
		return fmt.Errorf("station not loaded for setting %s", setting.ID)
	}

	log.Printf("Checking station %s (%s) - %d rules", station.Name, station.ID, len(setting.Rules))

	// Get the latest uptime record
	var lastUptime models.StationUptime
	if err := m.db.Where("station_id = ?", station.ID).Order("timestamp DESC").First(&lastUptime).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			log.Printf("No uptime records for station %s, skipping", station.ID)
			// No uptime records yet, skip
			return nil
		}
		return err
	}

	now := time.Now()
	lastSeen := lastUptime.Timestamp
	timeSinceLastSeen := now.Sub(lastSeen)
	isCurrentlyOnline := timeSinceLastSeen <= time.Duration(station.OnlineThreshold)*time.Minute

	log.Printf("Station %s: last seen %v ago, online threshold %d min, currently online: %v",
		station.ID, timeSinceLastSeen, station.OnlineThreshold, isCurrentlyOnline)

	// Check each enabled rule
	for _, rule := range setting.Rules {
		if !rule.Enabled {
			log.Printf("Rule %s for station %s is disabled, skipping", rule.Type, station.ID)
			continue
		}

		log.Printf("Checking rule %s (threshold: %v) for station %s", rule.Type, rule.Threshold, station.ID)

		switch rule.Type {
		case "down_minutes":
			if rule.Threshold != nil && *rule.Threshold > 0 {
				downThreshold := time.Duration(*rule.Threshold) * time.Minute
				log.Printf("Down rule: time since last seen %v, threshold %v, is currently online: %v",
					timeSinceLastSeen, downThreshold, isCurrentlyOnline)

				if !isCurrentlyOnline && timeSinceLastSeen >= downThreshold {
					log.Printf("Station %s is down and meets threshold, checking for recent notifications", station.ID)
					// Check if we already sent a notification for this down period
					if !m.hasRecentDownNotification(station.ID, lastSeen, *rule.Threshold) {
						log.Printf("Sending down notification for station %s", station.ID)
						if err := m.sendStationDownNotification(station, *rule.Threshold, lastSeen); err != nil {
							return err
						}
					} else {
						log.Printf("Recent down notification already exists for station %s", station.ID)
					}
				} else {
					log.Printf("Station %s down conditions not met: online=%v, timeSince=%v, threshold=%v",
						station.ID, isCurrentlyOnline, timeSinceLastSeen, downThreshold)
				}
			}
		case "back_online":
			// Check if station was previously down and is now online
			if isCurrentlyOnline && m.wasStationRecentlyDown(station.ID, lastSeen) {
				// Check if we already sent a "back online" notification recently
				if !m.hasRecentOnlineNotification(station.ID, lastSeen) {
					if err := m.sendStationOnlineNotification(station, lastSeen); err != nil {
						return err
					}
				}
			}
		case "low_uptime":
			if rule.Threshold != nil && *rule.Threshold > 0 {
				uptimePercentage := m.calculateUptimePercentage(station.ID, 24*time.Hour)
				if uptimePercentage < float64(*rule.Threshold) {
					// Check if we already sent a low uptime notification in the last 24 hours
					if !m.hasRecentLowUptimeNotification(station.ID, *rule.Threshold) {
						if err := m.sendLowUptimeNotification(station, uptimePercentage, *rule.Threshold); err != nil {
							return err
						}
					}
				}
			}
		}
	}

	return nil
}

// calculateUptimePercentage calculates the uptime percentage for a station over the given duration
func (m *StationHealthMonitor) calculateUptimePercentage(stationID string, duration time.Duration) float64 {
	startTime := time.Now().Add(-duration)

	var uptimes []models.StationUptime
	if err := m.db.Where("station_id = ? AND timestamp >= ?", stationID, startTime).Order("timestamp ASC").Find(&uptimes).Error; err != nil {
		return 0
	}

	if len(uptimes) == 0 {
		return 0
	}

	now := time.Now()
	totalPeriodMs := now.Sub(startTime).Milliseconds()
	onlineTimeMs := float64(0)

	// Get station to check online threshold
	var station models.Station
	if err := m.db.Where("id = ?", stationID).First(&station).Error; err != nil {
		return 0
	}

	thresholdMs := float64(station.OnlineThreshold) * 60 * 1000 // Convert minutes to milliseconds

	// Calculate online time between consecutive events
	for i := 0; i < len(uptimes)-1; i++ {
		currentTime := uptimes[i].Timestamp
		nextTime := uptimes[i+1].Timestamp
		gapMs := float64(nextTime.Sub(currentTime).Milliseconds())

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
		lastEventTime := uptimes[len(uptimes)-1].Timestamp
		timeSinceLastEvent := float64(now.Sub(lastEventTime).Milliseconds())

		if timeSinceLastEvent <= thresholdMs {
			// Station is currently online
			onlineTimeMs += timeSinceLastEvent
		} else {
			// Station went offline after threshold
			onlineTimeMs += thresholdMs
		}
	}

	if totalPeriodMs > 0 {
		return (onlineTimeMs / float64(totalPeriodMs)) * 100
	}
	return 0
}

// hasRecentDownNotification checks if a down notification was sent recently for this station and specific threshold
func (m *StationHealthMonitor) hasRecentDownNotification(stationID string, lastSeen time.Time, threshold int) bool {
	var count int64
	// Look for notifications in the last hour to avoid spam
	oneHourAgo := time.Now().Add(-time.Hour)
	m.db.Model(&models.Notification{}).
		Where("type = ? AND related_id = ? AND message LIKE ? AND created_at >= ?",
			"station_down", stationID, fmt.Sprintf("%%%d minutes%%", threshold), oneHourAgo).
		Count(&count)
	return count > 0
}

// hasRecentOnlineNotification checks if an online notification was sent recently
func (m *StationHealthMonitor) hasRecentOnlineNotification(stationID string, lastSeen time.Time) bool {
	var count int64
	oneHourAgo := time.Now().Add(-time.Hour)
	m.db.Model(&models.Notification{}).
		Where("type = ? AND related_id = ? AND created_at >= ?",
			"station_online", stationID, oneHourAgo).
		Count(&count)
	return count > 0
}

// hasRecentLowUptimeNotification checks if a low uptime notification was sent in the last 24 hours for this threshold
func (m *StationHealthMonitor) hasRecentLowUptimeNotification(stationID string, threshold int) bool {
	oneDayAgo := time.Now().Add(-24 * time.Hour)
	var count int64
	m.db.Model(&models.Notification{}).
		Where("type = ? AND related_id = ? AND message LIKE ? AND created_at >= ?",
			"station_low_uptime", stationID, fmt.Sprintf("%%%d%%%%%%", threshold), oneDayAgo).
		Count(&count)
	return count > 0
}

// wasStationRecentlyDown checks if the station was down before coming back online
func (m *StationHealthMonitor) wasStationRecentlyDown(stationID string, lastSeen time.Time) bool {
	// Check if there was a down notification in the last hour before this online event
	oneHourAgo := lastSeen.Add(-time.Hour)
	var count int64
	m.db.Model(&models.Notification{}).
		Where("type = ? AND related_id = ? AND created_at >= ? AND created_at <= ?",
			"station_down", stationID, oneHourAgo, lastSeen).
		Count(&count)
	return count > 0
}

// sendStationDownNotification sends a notification when a station goes down
func (m *StationHealthMonitor) sendStationDownNotification(station models.Station, downMinutes int, lastSeen time.Time) error {
	userID, err := uuid.Parse(station.UserID.String())
	if err != nil {
		return err
	}

	message := fmt.Sprintf("🚨 Station '%s' has been down for %d minutes. Last seen: %s",
		station.Name, downMinutes, lastSeen.Format("2006-01-02 15:04:05"))

	notification := models.Notification{
		UserID:    userID,
		Type:      "station_down",
		Message:   message,
		RelatedID: station.ID,
	}

	if err := m.db.Create(&notification).Error; err != nil {
		return err
	}

	// Send email notification
	return m.sendEmailNotification(userID, "Station Down Alert", message)
}

// sendStationOnlineNotification sends a notification when a station comes back online
func (m *StationHealthMonitor) sendStationOnlineNotification(station models.Station, lastSeen time.Time) error {
	userID, err := uuid.Parse(station.UserID.String())
	if err != nil {
		return err
	}

	message := fmt.Sprintf("✅ Station '%s' is back online. Last seen: %s",
		station.Name, lastSeen.Format("2006-01-02 15:04:05"))

	notification := models.Notification{
		UserID:    userID,
		Type:      "station_online",
		Message:   message,
		RelatedID: station.ID,
	}

	if err := m.db.Create(&notification).Error; err != nil {
		return err
	}

	// Send email notification
	return m.sendEmailNotification(userID, "Station Back Online", message)
}

// sendLowUptimeNotification sends a notification when station uptime is low
func (m *StationHealthMonitor) sendLowUptimeNotification(station models.Station, actualUptime float64, threshold int) error {
	userID, err := uuid.Parse(station.UserID.String())
	if err != nil {
		return err
	}

	message := fmt.Sprintf("⚠️ Station '%s' has low uptime: %.1f%% (below %d%% threshold in the last 24 hours)",
		station.Name, actualUptime, threshold)

	notification := models.Notification{
		UserID:    userID,
		Type:      "station_low_uptime",
		Message:   message,
		RelatedID: station.ID,
	}

	if err := m.db.Create(&notification).Error; err != nil {
		return err
	}

	// Send email notification
	return m.sendEmailNotification(userID, "Low Station Uptime Alert", message)
}

// sendEmailNotification sends an email notification to the user
func (m *StationHealthMonitor) sendEmailNotification(userID uuid.UUID, subject, message string) error {
	var user models.User
	if err := m.db.Where("id = ?", userID).First(&user).Error; err != nil {
		return err
	}

	// Only send email if user has station email notifications enabled and email is valid
	if !user.StationEmailNotifications || !user.Email.Valid {
		return nil
	}

	data := utils.EmailData{
		Subject:  subject,
		To:       user.Email.String,
		Template: "station_health_notification",
		Data: map[string]interface{}{
			"Username": user.Username,
			"Subject":  subject,
			"Message":  message,
		},
	}

	return utils.SendEmail(data)
}
