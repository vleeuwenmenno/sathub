package seed

import (
	"fmt"
	"time"

	"sathub-ui-backend/config"
	"sathub-ui-backend/models"
	"sathub-ui-backend/utils"
)

// AutoSeed checks for missing essential data and seeds it automatically
// This runs on application startup to ensure required data exists
func AutoSeed() error {
	db := config.GetDB()

	// Check if achievements already exist
	var count int64
	if err := db.Model(&models.Achievement{}).Count(&count).Error; err != nil {
		return fmt.Errorf("failed to check achievements count: %w", err)
	}

	if count == 0 {
		utils.Logger.Info().Msg("No achievements found, seeding achievements")
		if err := seedAchievements(); err != nil {
			return fmt.Errorf("failed to auto-seed achievements: %w", err)
		}
		utils.Logger.Info().Msg("Achievements auto-seeded successfully")
	} else {
		utils.Logger.Info().Int64("count", count).Msg("Achievements already exist, skipping auto-seed")
	}

	return nil
}

// TestScenario85PercentUptime creates a minimal test scenario with 85% uptime
// This can be used to test achievement triggering at the 90% threshold
func TestScenario85PercentUptime() error {
	db := config.GetDB()

	utils.Logger.Info().Msg("Creating test user and station with 85% uptime")

	// Create a test user
	testUser := models.User{
		Username:       "test_user",
		EmailConfirmed: true,
		Role:           "user",
		Approved:       true,
		Language:       "en",
	}
	testUser.Email.String = "test@example.com"
	testUser.Email.Valid = true

	if err := testUser.HashPassword("password123"); err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	if err := db.Create(&testUser).Error; err != nil {
		return fmt.Errorf("failed to create test user: %w", err)
	}

	utils.Logger.Info().Str("username", testUser.Username).Str("id", testUser.ID.String()).Msg("Created test user")

	// Create a test station
	testStation := models.Station{
		UserID:          testUser.ID,
		Name:            "Test Station 85%",
		Location:        "Test Location",
		Equipment:       "Test Equipment",
		IsPublic:        true,
		OnlineThreshold: 5, // 5 minutes
	}

	if err := db.Create(&testStation).Error; err != nil {
		return fmt.Errorf("failed to create test station: %w", err)
	}

	utils.Logger.Info().Str("name", testStation.Name).Str("id", testStation.ID).Msg("Created test station")

	// Generate uptime data for exactly 7 days with 85% uptime
	// 85% uptime means 15% downtime over 7 days
	// Total time: 7 * 24 * 60 = 10080 minutes
	// Online time: 85% of 10080 = 8568 minutes
	// Offline time: 15% of 10080 = 1512 minutes

	// We'll simulate health checks every 5 minutes (matching the threshold)
	// For 85% uptime, we need some gaps longer than 5 minutes

	now := time.Now()
	startTime := now.AddDate(0, 0, -7) // 7 days ago

	utils.Logger.Info().Msg("Generating 85% uptime health check data")

	// Generate health checks with controlled downtime to achieve exactly 85% uptime
	currentTime := startTime
	totalMinutes := 7 * 24 * 60                        // 10080 minutes
	onlineMinutes := int(float64(totalMinutes) * 0.85) // 8568 minutes
	offlineMinutes := totalMinutes - onlineMinutes     // 1512 minutes

	utils.Logger.Info().Int("online_minutes", onlineMinutes).Int("offline_minutes", offlineMinutes).Int("total_minutes", totalMinutes).Msg("Target uptime parameters")

	// Create periods of uptime followed by downtime
	uptimeRecords := []models.StationUptime{}
	minutesProcessed := 0

	for minutesProcessed < totalMinutes {
		// Determine how long this uptime period should be
		remainingOnline := onlineMinutes - (len(uptimeRecords) * 5) // Rough estimate
		if remainingOnline > 120 {                                  // Cap at 2 hours of continuous uptime
			remainingOnline = 120
		}
		if remainingOnline < 5 {
			remainingOnline = 5
		}

		// Generate uptime period (health checks every 5 minutes)
		uptimePeriodMinutes := remainingOnline
		if uptimePeriodMinutes > (totalMinutes - minutesProcessed) {
			uptimePeriodMinutes = totalMinutes - minutesProcessed
		}

		numChecks := uptimePeriodMinutes / 5
		if numChecks < 1 {
			numChecks = 1
		}

		utils.Logger.Info().Int("num_checks", numChecks).Int("minutes", uptimePeriodMinutes).Msg("Creating uptime period")

		for i := 0; i < numChecks && minutesProcessed < totalMinutes; i++ {
			uptimeRecord := models.StationUptime{
				StationID: testStation.ID,
				Timestamp: currentTime,
			}
			uptimeRecords = append(uptimeRecords, uptimeRecord)
			currentTime = currentTime.Add(5 * time.Minute)
			minutesProcessed += 5
		}

		// Add a downtime period if we still have offline time to use
		remainingOffline := offlineMinutes - ((totalMinutes - minutesProcessed) - (totalMinutes - onlineMinutes))
		if remainingOffline > 0 && minutesProcessed < totalMinutes {
			// Create a gap (downtime) - skip some time
			downtimeMinutes := 30 // 30 minutes of downtime
			if downtimeMinutes > remainingOffline {
				downtimeMinutes = remainingOffline
			}
			if downtimeMinutes > (totalMinutes - minutesProcessed) {
				downtimeMinutes = totalMinutes - minutesProcessed
			}

			utils.Logger.Info().Int("minutes", downtimeMinutes).Msg("Creating downtime period")
			currentTime = currentTime.Add(time.Duration(downtimeMinutes) * time.Minute)
			minutesProcessed += downtimeMinutes
		}
	}

	// Create the uptime records in the database
	for _, record := range uptimeRecords {
		if err := db.Create(&record).Error; err != nil {
			return fmt.Errorf("failed to create uptime record: %w", err)
		}
	}

	utils.Logger.Info().Int("count", len(uptimeRecords)).Msg("Created uptime records for 85% target uptime")

	// Seed achievements
	utils.Logger.Info().Msg("Seeding achievements")
	if err := seedAchievements(); err != nil {
		return fmt.Errorf("failed to seed achievements: %w", err)
	}

	utils.Logger.Info().Msg("Test scenario completed")
	utils.Logger.Info().Str("username", testUser.Username).Msg("Test user")
	utils.Logger.Info().Str("name", testStation.Name).Str("id", testStation.ID).Msg("Test station")
	utils.Logger.Info().Int("count", len(uptimeRecords)).Msg("Uptime records")

	return nil
}

// TestScenario90PercentUptime adds health checks to an existing 85% uptime scenario to reach 90.5%
// This fills in downtime gaps to increase uptime percentage
func TestScenario90PercentUptime() error {
	db := config.GetDB()

	utils.Logger.Info().Msg("Finding existing test station from 85% scenario")

	// Find the existing test station (should be the one from 85% scenario)
	// Look for a station with "Test Station 85%" name
	var testStation models.Station
	if err := db.Where("name = ?", "Test Station 85%").First(&testStation).Error; err != nil {
		return fmt.Errorf("failed to find test station with name 'Test Station 85%%': %w", err)
	}

	utils.Logger.Info().Str("name", testStation.Name).Str("id", testStation.ID).Msg("Found test station")

	// Get all existing uptime records
	var existingRecords []models.StationUptime
	if err := db.Where("station_id = ?", testStation.ID).Order("timestamp ASC").Find(&existingRecords).Error; err != nil {
		return fmt.Errorf("failed to get existing uptime records: %w", err)
	}

	utils.Logger.Info().Int("count", len(existingRecords)).Msg("Found existing uptime records")

	if len(existingRecords) == 0 {
		return fmt.Errorf("no existing uptime records found for test station")
	}

	// Calculate current uptime to see where we stand
	now := time.Now().UnixMilli()
	startTime := existingRecords[0].Timestamp.UnixMilli()
	totalPeriodMs := now - startTime

	var currentOnlineTimeMs int64
	thresholdMs := int64(testStation.OnlineThreshold) * 60 * 1000 // 5 minutes in milliseconds

	// Calculate current online time
	for i := 0; i < len(existingRecords)-1; i++ {
		currentTime := existingRecords[i].Timestamp.UnixMilli()
		nextTime := existingRecords[i+1].Timestamp.UnixMilli()
		gapMs := nextTime - currentTime

		if gapMs <= thresholdMs {
			currentOnlineTimeMs += gapMs
		} else {
			currentOnlineTimeMs += thresholdMs
		}
	}

	// Add time from last record to now
	if len(existingRecords) > 0 {
		lastEventTime := existingRecords[len(existingRecords)-1].Timestamp.UnixMilli()
		timeSinceLastEvent := now - lastEventTime
		if timeSinceLastEvent <= thresholdMs {
			currentOnlineTimeMs += timeSinceLastEvent
		} else {
			currentOnlineTimeMs += thresholdMs
		}
	}

	currentUptimePercent := float64(0)
	if totalPeriodMs > 0 {
		currentUptimePercent = (float64(currentOnlineTimeMs) / float64(totalPeriodMs)) * 100
	}

	utils.Logger.Info().Float64("uptime_percent", currentUptimePercent).Msg("Current uptime")
	utils.Logger.Info().Msg("Target uptime: 90.5%")

	// If already at or above 90.5%, we're done
	if currentUptimePercent >= 90.5 {
		utils.Logger.Info().Msg("Station already meets 90.5% uptime requirement")
		return nil
	}

	// Find gaps longer than the threshold where we can add health checks
	utils.Logger.Info().Msg("Finding downtime gaps to fill")

	newRecords := []models.StationUptime{}
	targetOnlineTimeMs := int64(float64(totalPeriodMs) * 0.905) // 90.5% of total period
	additionalOnlineTimeNeeded := targetOnlineTimeMs - currentOnlineTimeMs

	utils.Logger.Info().Float64("current_uptime", currentUptimePercent).Int64("additional_time_ms", additionalOnlineTimeNeeded).Msg("Uptime analysis")

	// Look for gaps between existing records and fill them
	for i := 0; i < len(existingRecords)-1 && additionalOnlineTimeNeeded > 0; i++ {
		currentTime := existingRecords[i].Timestamp
		nextTime := existingRecords[i+1].Timestamp
		gapDuration := nextTime.Sub(currentTime)

		// If gap is longer than threshold, we can fill part of it
		if gapDuration > time.Duration(testStation.OnlineThreshold)*time.Minute {
			// Calculate how much of this gap is offline
			offlineMs := gapDuration.Milliseconds() - thresholdMs
			if offlineMs > 0 {
				// We can fill up to the amount we need, but limit to what's available in this gap
				fillMs := offlineMs
				if fillMs > additionalOnlineTimeNeeded {
					fillMs = additionalOnlineTimeNeeded
				}

				// Calculate how many 5-minute health checks we can add in this gap
				numChecksToAdd := int(fillMs / (5 * 60 * 1000)) // 5 minutes in milliseconds
				if numChecksToAdd > 0 {
					utils.Logger.Info().Float32("gap_minutes", float32(gapDuration.Minutes())).Int("num_checks", numChecksToAdd).Msg("Found gap, adding health checks")

					// Add health checks starting just after the threshold
					checkTime := currentTime.Add(time.Duration(testStation.OnlineThreshold) * time.Minute)
					for j := 0; j < numChecksToAdd && additionalOnlineTimeNeeded > 0; j++ {
						record := models.StationUptime{
							StationID: testStation.ID,
							Timestamp: checkTime,
						}
						newRecords = append(newRecords, record)

						checkTime = checkTime.Add(5 * time.Minute)
						additionalOnlineTimeNeeded -= 5 * 60 * 1000 // 5 minutes in milliseconds
					}
				}
			}
		}
	}

	// If we still need more online time and couldn't fill all gaps, add records at the end
	if additionalOnlineTimeNeeded > 0 {
		utils.Logger.Info().Int64("additional_time_ms", additionalOnlineTimeNeeded).Msg("Still need online time, adding at the end")
		checksToAdd := int(float64(additionalOnlineTimeNeeded)/(5*60*1000)) + 1
		currentTime := existingRecords[len(existingRecords)-1].Timestamp.Add(5 * time.Minute)

		for i := 0; i < checksToAdd; i++ {
			record := models.StationUptime{
				StationID: testStation.ID,
				Timestamp: currentTime,
			}
			newRecords = append(newRecords, record)
			currentTime = currentTime.Add(5 * time.Minute)
		}
	}

	if len(newRecords) == 0 {
		utils.Logger.Info().Msg("No gaps found to fill and no additional time needed")
		return nil
	}

	utils.Logger.Info().Int("count", len(newRecords)).Msg("Adding new health check records to fill gaps")

	// Create the new uptime records in the database
	for _, record := range newRecords {
		if err := db.Create(&record).Error; err != nil {
			return fmt.Errorf("failed to create uptime record: %w", err)
		}
	}

	utils.Logger.Info().Int("count", len(newRecords)).Msg("Created additional uptime records")

	// Update achievements (in case the new records trigger achievements)
	utils.Logger.Info().Msg("Updating achievements")
	if err := seedAchievements(); err != nil {
		return fmt.Errorf("failed to update achievements: %w", err)
	}

	utils.Logger.Info().Msg("90.5% uptime test scenario completed")
	utils.Logger.Info().Str("name", testStation.Name).Str("id", testStation.ID).Msg("Test station")
	utils.Logger.Info().Int("count", len(newRecords)).Msg("Added new records to reach 90.5% uptime")

	return nil
}

// DevelopmentSeed creates a general development seed with test users and data
// - test_user: Approved and email confirmed
// - test_admin: Approved and email confirmed
// - pending_user: Not approved but email confirmed
// - test_user has a station with 85% uptime data
func DevelopmentSeed() error {
	db := config.GetDB()

	utils.Logger.Info().Msg("Checking if development seed already exists")

	// Check if test_user already exists
	var existingUser models.User
	if err := db.Where("username = ?", "test_user").First(&existingUser).Error; err == nil {
		utils.Logger.Info().Msg("Development seed already exists, skipping")
		return nil
	}

	utils.Logger.Info().Msg("Creating development seed users")

	// Create test_user
	testUser := models.User{
		Username:       "test_user",
		EmailConfirmed: true,
		Role:           "user",
		Approved:       true,
	}
	testUser.Email.String = "test@example.com"
	testUser.Email.Valid = true

	if err := testUser.HashPassword("password123"); err != nil {
		return fmt.Errorf("failed to hash password for test_user: %w", err)
	}

	if err := db.Create(&testUser).Error; err != nil {
		return fmt.Errorf("failed to create test_user: %w", err)
	}

	utils.Logger.Info().Str("username", testUser.Username).Str("id", testUser.ID.String()).Msg("Created test_user")

	// Create test_admin
	testAdmin := models.User{
		Username:       "test_admin",
		EmailConfirmed: true,
		Role:           "admin",
		Approved:       true,
		Language:       "en",
	}
	testAdmin.Email.String = "admin@example.com"
	testAdmin.Email.Valid = true

	if err := testAdmin.HashPassword("password123"); err != nil {
		return fmt.Errorf("failed to hash password for test_admin: %w", err)
	}

	if err := db.Create(&testAdmin).Error; err != nil {
		return fmt.Errorf("failed to create test_admin: %w", err)
	}

	utils.Logger.Info().Str("username", testAdmin.Username).Str("id", testAdmin.ID.String()).Msg("Created test_admin")

	// Create pending_user
	pendingUser := models.User{
		Username:       "pending_user",
		EmailConfirmed: true,
		Role:           "user",
		Approved:       false,
	}
	pendingUser.Email.String = "pending@example.com"
	pendingUser.Email.Valid = true

	if err := pendingUser.HashPassword("password123"); err != nil {
		return fmt.Errorf("failed to hash password for pending_user: %w", err)
	}

	if err := db.Create(&pendingUser).Error; err != nil {
		return fmt.Errorf("failed to create pending_user: %w", err)
	}

	utils.Logger.Info().Str("username", pendingUser.Username).Str("id", pendingUser.ID.String()).Msg("Created pending_user")

	// Create station and uptime data for test_user (same as TestScenario85PercentUptime)
	utils.Logger.Info().Msg("Creating test station with 85% uptime for test_user")

	testStation := models.Station{
		UserID:          testUser.ID,
		Name:            "Test Station 85%",
		Location:        "Test Location",
		Equipment:       "Test Equipment",
		IsPublic:        true,
		OnlineThreshold: 5, // 5 minutes
	}

	if err := db.Create(&testStation).Error; err != nil {
		return fmt.Errorf("failed to create test station: %w", err)
	}

	utils.Logger.Info().Str("name", testStation.Name).Str("id", testStation.ID).Msg("Created test station")

	// Generate uptime data for exactly 7 days with 85% uptime
	now := time.Now()
	startTime := now.AddDate(0, 0, -7) // 7 days ago

	utils.Logger.Info().Msg("Generating 85% uptime health check data")

	currentTime := startTime
	totalMinutes := 7 * 24 * 60                        // 10080 minutes
	onlineMinutes := int(float64(totalMinutes) * 0.85) // 8568 minutes
	offlineMinutes := totalMinutes - onlineMinutes     // 1512 minutes

	utils.Logger.Info().Int("online_minutes", onlineMinutes).Int("offline_minutes", offlineMinutes).Int("total_minutes", totalMinutes).Msg("Target uptime parameters")

	uptimeRecords := []models.StationUptime{}
	minutesProcessed := 0

	for minutesProcessed < totalMinutes {
		remainingOnline := onlineMinutes - (len(uptimeRecords) * 5)
		if remainingOnline > 120 {
			remainingOnline = 120
		}
		if remainingOnline < 5 {
			remainingOnline = 5
		}

		uptimePeriodMinutes := remainingOnline
		if uptimePeriodMinutes > (totalMinutes - minutesProcessed) {
			uptimePeriodMinutes = totalMinutes - minutesProcessed
		}

		numChecks := uptimePeriodMinutes / 5
		if numChecks < 1 {
			numChecks = 1
		}

		utils.Logger.Info().Int("num_checks", numChecks).Int("minutes", uptimePeriodMinutes).Msg("Creating uptime period")

		for i := 0; i < numChecks && minutesProcessed < totalMinutes; i++ {
			uptimeRecord := models.StationUptime{
				StationID: testStation.ID,
				Timestamp: currentTime,
			}
			uptimeRecords = append(uptimeRecords, uptimeRecord)
			currentTime = currentTime.Add(5 * time.Minute)
			minutesProcessed += 5
		}

		remainingOffline := offlineMinutes - ((totalMinutes - minutesProcessed) - (totalMinutes - onlineMinutes))
		if remainingOffline > 0 && minutesProcessed < totalMinutes {
			downtimeMinutes := 30
			if downtimeMinutes > remainingOffline {
				downtimeMinutes = remainingOffline
			}
			if downtimeMinutes > (totalMinutes - minutesProcessed) {
				downtimeMinutes = totalMinutes - minutesProcessed
			}

			utils.Logger.Info().Int("minutes", downtimeMinutes).Msg("Creating downtime period")
			currentTime = currentTime.Add(time.Duration(downtimeMinutes) * time.Minute)
			minutesProcessed += downtimeMinutes
		}
	}

	// Create the uptime records in the database
	for _, record := range uptimeRecords {
		if err := db.Create(&record).Error; err != nil {
			return fmt.Errorf("failed to create uptime record: %w", err)
		}
	}

	utils.Logger.Info().Int("count", len(uptimeRecords)).Msg("Created uptime records for 85% target uptime")

	// Seed achievements
	utils.Logger.Info().Msg("Seeding achievements")
	if err := seedAchievements(); err != nil {
		return fmt.Errorf("failed to seed achievements: %w", err)
	}

	utils.Logger.Info().Msg("Development seed completed")
	utils.Logger.Info().Msg("Users created: test_user, test_admin, pending_user")
	utils.Logger.Info().Str("station_name", testStation.Name).Int("uptime_records", len(uptimeRecords)).Msg("Station created for test_user")

	return nil
}
