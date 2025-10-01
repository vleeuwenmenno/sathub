package seed

import (
	"fmt"
	"time"

	"sathub-ui-backend/config"
	"sathub-ui-backend/models"
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
		fmt.Println("No achievements found, seeding achievements...")
		if err := seedAchievements(); err != nil {
			return fmt.Errorf("failed to auto-seed achievements: %w", err)
		}
		fmt.Println("Achievements auto-seeded successfully!")
	} else {
		fmt.Printf("Achievements already exist (%d found), skipping auto-seed\n", count)
	}

	// Future: Add checks for other essential data here
	// e.g., check for admin user, default settings, etc.

	return nil
}

// TestScenario85PercentUptime creates a minimal test scenario with 85% uptime
// This can be used to test achievement triggering at the 90% threshold
func TestScenario85PercentUptime() error {
	db := config.GetDB()

	fmt.Println("Creating test user and station with 85% uptime...")

	// Create a test user
	testUser := models.User{
		Username:       "test_user",
		EmailConfirmed: true,
		Role:           "user",
		Approved:       true,
	}
	testUser.Email.String = "test@example.com"
	testUser.Email.Valid = true

	if err := testUser.HashPassword("password123"); err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	if err := db.Create(&testUser).Error; err != nil {
		return fmt.Errorf("failed to create test user: %w", err)
	}

	fmt.Printf("Created test user: %s (ID: %s)\n", testUser.Username, testUser.ID.String())

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

	fmt.Printf("Created test station: %s (ID: %s)\n", testStation.Name, testStation.ID)

	// Generate uptime data for exactly 7 days with 85% uptime
	// 85% uptime means 15% downtime over 7 days
	// Total time: 7 * 24 * 60 = 10080 minutes
	// Online time: 85% of 10080 = 8568 minutes
	// Offline time: 15% of 10080 = 1512 minutes

	// We'll simulate health checks every 5 minutes (matching the threshold)
	// For 85% uptime, we need some gaps longer than 5 minutes

	now := time.Now()
	startTime := now.AddDate(0, 0, -7) // 7 days ago

	fmt.Println("Generating 85% uptime health check data...")

	// Generate health checks with controlled downtime to achieve exactly 85% uptime
	currentTime := startTime
	totalMinutes := 7 * 24 * 60                        // 10080 minutes
	onlineMinutes := int(float64(totalMinutes) * 0.85) // 8568 minutes
	offlineMinutes := totalMinutes - onlineMinutes     // 1512 minutes

	fmt.Printf("Target: %d minutes online, %d minutes offline over %d total minutes\n",
		onlineMinutes, offlineMinutes, totalMinutes)

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

		fmt.Printf("Creating uptime period: %d checks over %d minutes\n", numChecks, uptimePeriodMinutes)

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

			fmt.Printf("Creating downtime period: %d minutes\n", downtimeMinutes)
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

	fmt.Printf("Created %d uptime records for 85%% target uptime\n", len(uptimeRecords))

	// Seed achievements
	fmt.Println("Seeding achievements...")
	if err := seedAchievements(); err != nil {
		return fmt.Errorf("failed to seed achievements: %w", err)
	}

	fmt.Println("Test scenario completed!")
	fmt.Printf("Test user: %s\n", testUser.Username)
	fmt.Printf("Test station: %s (ID: %s)\n", testStation.Name, testStation.ID)
	fmt.Printf("Uptime records: %d\n", len(uptimeRecords))

	return nil
}

// TestScenario90PercentUptime adds health checks to an existing 85% uptime scenario to reach 90.5%
// This fills in downtime gaps to increase uptime percentage
func TestScenario90PercentUptime() error {
	db := config.GetDB()

	fmt.Println("Finding existing test station from 85% scenario...")

	// Find the existing test station (should be the one from 85% scenario)
	// Look for a station with "Test Station 85%" name
	var testStation models.Station
	if err := db.Where("name = ?", "Test Station 85%").First(&testStation).Error; err != nil {
		return fmt.Errorf("failed to find test station with name 'Test Station 85%%': %w", err)
	}

	fmt.Printf("Found test station: %s (ID: %s)\n", testStation.Name, testStation.ID)

	// Get all existing uptime records
	var existingRecords []models.StationUptime
	if err := db.Where("station_id = ?", testStation.ID).Order("timestamp ASC").Find(&existingRecords).Error; err != nil {
		return fmt.Errorf("failed to get existing uptime records: %w", err)
	}

	fmt.Printf("Found %d existing uptime records\n", len(existingRecords))

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

	fmt.Printf("Current uptime: %.2f%%\n", currentUptimePercent)
	fmt.Printf("Target uptime: 90.5%%\n")

	// If already at or above 90.5%, we're done
	if currentUptimePercent >= 90.5 {
		fmt.Println("Station already meets 90.5% uptime requirement!")
		return nil
	}

	// Find gaps longer than the threshold where we can add health checks
	fmt.Println("Finding downtime gaps to fill...")

	newRecords := []models.StationUptime{}
	targetOnlineTimeMs := int64(float64(totalPeriodMs) * 0.905) // 90.5% of total period
	additionalOnlineTimeNeeded := targetOnlineTimeMs - currentOnlineTimeMs

	fmt.Printf("Current uptime: %.2f%%, need to add %d milliseconds of online time\n", currentUptimePercent, additionalOnlineTimeNeeded)

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
					fmt.Printf("Found gap of %.1f minutes, adding %d health checks\n",
						gapDuration.Minutes(), numChecksToAdd)

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
		fmt.Printf("Still need %d milliseconds of online time, adding at the end\n", additionalOnlineTimeNeeded)
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
		fmt.Println("No gaps found to fill and no additional time needed")
		return nil
	}

	fmt.Printf("Adding %d new health check records to fill gaps\n", len(newRecords))

	// Create the new uptime records in the database
	for _, record := range newRecords {
		if err := db.Create(&record).Error; err != nil {
			return fmt.Errorf("failed to create uptime record: %w", err)
		}
	}

	fmt.Printf("Created %d additional uptime records\n", len(newRecords))

	// Update achievements (in case the new records trigger achievements)
	fmt.Println("Updating achievements...")
	if err := seedAchievements(); err != nil {
		return fmt.Errorf("failed to update achievements: %w", err)
	}

	fmt.Println("90.5% uptime test scenario completed!")
	fmt.Printf("Test station: %s (ID: %s)\n", testStation.Name, testStation.ID)
	fmt.Printf("Added %d new records to reach 90.5%% uptime\n", len(newRecords))

	return nil
}

// DevelopmentSeed creates a general development seed with test users and data
// - test_user: Approved and email confirmed
// - test_admin: Approved and email confirmed
// - pending_user: Not approved but email confirmed
// - test_user has a station with 85% uptime data
func DevelopmentSeed() error {
	db := config.GetDB()

	fmt.Println("Checking if development seed already exists...")

	// Check if test_user already exists
	var existingUser models.User
	if err := db.Where("username = ?", "test_user").First(&existingUser).Error; err == nil {
		fmt.Println("Development seed already exists, skipping")
		return nil
	}

	fmt.Println("Creating development seed users...")

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

	fmt.Printf("Created test_user: %s (ID: %s)\n", testUser.Username, testUser.ID.String())

	// Create test_admin
	testAdmin := models.User{
		Username:       "test_admin",
		EmailConfirmed: true,
		Role:           "admin",
		Approved:       true,
	}
	testAdmin.Email.String = "admin@example.com"
	testAdmin.Email.Valid = true

	if err := testAdmin.HashPassword("password123"); err != nil {
		return fmt.Errorf("failed to hash password for test_admin: %w", err)
	}

	if err := db.Create(&testAdmin).Error; err != nil {
		return fmt.Errorf("failed to create test_admin: %w", err)
	}

	fmt.Printf("Created test_admin: %s (ID: %s)\n", testAdmin.Username, testAdmin.ID.String())

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

	fmt.Printf("Created pending_user: %s (ID: %s)\n", pendingUser.Username, pendingUser.ID.String())

	// Create station and uptime data for test_user (same as TestScenario85PercentUptime)
	fmt.Println("Creating test station with 85% uptime for test_user...")

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

	fmt.Printf("Created test station: %s (ID: %s)\n", testStation.Name, testStation.ID)

	// Generate uptime data for exactly 7 days with 85% uptime
	now := time.Now()
	startTime := now.AddDate(0, 0, -7) // 7 days ago

	fmt.Println("Generating 85% uptime health check data...")

	currentTime := startTime
	totalMinutes := 7 * 24 * 60                        // 10080 minutes
	onlineMinutes := int(float64(totalMinutes) * 0.85) // 8568 minutes
	offlineMinutes := totalMinutes - onlineMinutes     // 1512 minutes

	fmt.Printf("Target: %d minutes online, %d minutes offline over %d total minutes\n",
		onlineMinutes, offlineMinutes, totalMinutes)

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

		fmt.Printf("Creating uptime period: %d checks over %d minutes\n", numChecks, uptimePeriodMinutes)

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

			fmt.Printf("Creating downtime period: %d minutes\n", downtimeMinutes)
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

	fmt.Printf("Created %d uptime records for 85%% target uptime\n", len(uptimeRecords))

	// Seed achievements
	fmt.Println("Seeding achievements...")
	if err := seedAchievements(); err != nil {
		return fmt.Errorf("failed to seed achievements: %w", err)
	}

	fmt.Println("Development seed completed!")
	fmt.Printf("Users created: test_user, test_admin, pending_user\n")
	fmt.Printf("Station created for test_user: %s with %d uptime records\n", testStation.Name, len(uptimeRecords))

	return nil
}
