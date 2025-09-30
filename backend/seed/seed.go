package seed

import (
	"fmt"
	"log"
	"math/rand"
	"os"
	"path/filepath"
	"time"

	"sathub-ui-backend/config"
	"sathub-ui-backend/models"

	"github.com/google/uuid"
)

// min returns the minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// Test data constants
var (
	testUsers = []struct {
		username string
		email    string
		password string
		role     string
	}{
		{"alice_skywatcher", "alice@example.com", "password123", "user"},
		{"bob_satellite", "bob@example.com", "password123", "user"},
		{"charlie_space", "charlie@example.com", "password123", "user"},
	}

	testStations = []struct {
		name      string
		location  string
		equipment string
		isPublic  bool
	}{
		{"Alice's Ground Station", "San Francisco, CA", "RTL-SDR, 2m dish, Funcube Dongle", true},
		{"Alice's Backup Station", "Mountain View, CA", "Airspy HF+, 3m dish", false},
		{"Bob's Satellite Lab", "Austin, TX", "HackRF One, 5m dish, LNA", true},
		{"Bob's Mobile Setup", "Houston, TX", "RTL-SDR, portable antenna", true},
		{"Charlie's Observatory", "Seattle, WA", "USRP B210, 10m dish, tracking system", true},
		{"Charlie's Test Station", "Portland, OR", "LimeSDR, 2m dish", false},
	}

	satelliteNames = []string{
		"NOAA 15", "NOAA 18", "NOAA 19", "METEOR-M2", "METEOR-M2-2",
		"ELECTRO-L N2", "Fengyun 3C", "Fengyun 3D", "Terra", "Aqua",
		"Suomi NPP", "NOAA 20", "NOAA 21", "Sentinel-1A", "Sentinel-1B",
	}

	locations = []string{
		"Northern Hemisphere", "Southern Hemisphere", "Equatorial Region",
		"Pacific Ocean", "Atlantic Ocean", "Indian Ocean", "Arctic Circle",
		"Antarctic Region", "European Continent", "North American Continent",
		"South American Continent", "Asian Continent", "African Continent",
		"Australian Continent",
	}

	commentTexts = []string{
		"Great capture! The image quality is excellent.",
		"Nice work on this pass. Signal strength looks good.",
		"Beautiful false color image. Love the detail in the clouds.",
		"Impressive setup! What equipment did you use for this?",
		"Perfect timing on this satellite pass.",
		"Excellent processing. The colors really pop.",
		"Very clear image. You can see all the geographical features.",
		"Well done! This is one of the best captures I've seen.",
		"Amazing detail in the water vapor patterns.",
		"Outstanding work. Keep up the great captures!",
		"The contrast and brightness are spot on.",
		"Fantastic image! The resolution is incredible.",
		"Nice job on the tracking. Very stable pass.",
		"Beautiful composition. The framing is perfect.",
		"Excellent signal processing. Very clean image.",
		"Impressive work! The details are amazing.",
		"Great capture of the weather patterns.",
		"Perfect exposure and color balance.",
		"Outstanding technical achievement.",
		"Beautiful image. Really shows the power of satellite imagery.",
	}
)

func createTestImageData() []byte {
	// List of available test images in the MSU-MR directory
	imageFiles := []string{
		"MSU-MR-1.png",
		"MSU-MR-2.png",
		"MSU-MR-3.png",
		"msu_mr_rgb_AVHRR_221_False_Color.png",
		"msu_mr_rgb_AVHRR_221_False_Color_corrected.png",
		"msu_mr_rgb_AVHRR_3a21_False_Color.png",
		"msu_mr_rgb_AVHRR_3a21_False_Color_corrected.png",
		"msu_mr_rgb_MSA.png",
		"msu_mr_rgb_MSA_corrected.png",
		"msu_mr_rgb_MSA_corrected_map.png",
		"msu_mr_rgb_MSA_map.png",
		"rgb_msu_mr_rgb_AVHRR_3a21_False_Color_projected.png",
	}

	// Select a random image file
	selectedFile := imageFiles[rand.Intn(len(imageFiles))]

	// Construct the full path relative to the project root
	imagePath := filepath.Join("..", "data", "images", selectedFile)

	// Read the image file
	imageData, err := os.ReadFile(imagePath)
	if err != nil {
		log.Printf("Warning: Failed to read image file %s: %v", imagePath, err)
		// Fallback to placeholder data if file cannot be read
		return []byte("placeholder_image_data")
	}

	return imageData
}

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
			Name:        "Data Contributor",
			Description: "Upload 10 posts",
			Icon:        "📊",
			Criteria:    `{"type": "posts_created", "value": 10}`,
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
			fmt.Printf("Updated achievement: %s\n", achievement.Name)
			continue
		}

		if err := db.Create(&achievement).Error; err != nil {
			return fmt.Errorf("failed to create achievement %s: %w", achievement.Name, err)
		}
		fmt.Printf("Created achievement: %s\n", achievement.Name)
	}

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

// Database seeds the database with test data
func Database() error {
	db := config.GetDB()

	// Seed users
	fmt.Println("Seeding users...")
	var users []models.User
	for _, userData := range testUsers {
		// Check if user already exists
		var existing models.User
		if err := db.Where("email = ?", userData.email).First(&existing).Error; err == nil {
			// User already exists, skip
			users = append(users, existing)
			fmt.Printf("User already exists: %s (ID: %s)\n", existing.Username, existing.ID.String())
			continue
		}

		user := models.User{
			Username:       userData.username,
			EmailConfirmed: true, // Seed users are pre-confirmed
			Role:           userData.role,
		}

		if userData.email != "" {
			user.Email.String = userData.email
			user.Email.Valid = true
		}

		if err := user.HashPassword(userData.password); err != nil {
			return fmt.Errorf("failed to hash password for %s: %w", userData.username, err)
		}

		if err := db.Create(&user).Error; err != nil {
			return fmt.Errorf("failed to create user %s: %w", userData.username, err)
		}

		users = append(users, user)
		fmt.Printf("Created user: %s (ID: %s)\n", user.Username, user.ID.String())
	}

	// Seed stations
	fmt.Println("\nSeeding stations...")
	var stations []models.Station
	stationIndex := 0

	for _, user := range users {
		// Assign 2-3 stations per user
		numStations := 2 + rand.Intn(2) // 2 or 3 stations

		for j := 0; j < numStations && stationIndex < len(testStations); j++ {
			stationData := testStations[stationIndex]
			stationIndex++

			station := models.Station{
				UserID:    user.ID,
				Name:      stationData.name,
				Location:  stationData.location,
				Equipment: stationData.equipment,
				IsPublic:  stationData.isPublic,
			}

			if err := db.Create(&station).Error; err != nil {
				return fmt.Errorf("failed to create station %s: %w", stationData.name, err)
			}

			stations = append(stations, station)
			fmt.Printf("Created station: %s (ID: %s, User: %s, Public: %t)\n",
				station.Name, station.ID, user.Username, station.IsPublic)
		}
	}

	// Seed posts
	fmt.Println("\nSeeding posts...")
	rand.Seed(time.Now().UnixNano())

	for _, station := range stations {
		// Create 3-8 posts per station
		numPosts := 3 + rand.Intn(6) // 3 to 8 posts

		for i := 0; i < numPosts; i++ {
			// Generate random timestamp within the last 30 days
			daysAgo := rand.Intn(30)
			hoursAgo := rand.Intn(24)
			minutesAgo := rand.Intn(60)

			timestamp := time.Now().AddDate(0, 0, -daysAgo).Add(-time.Hour * time.Duration(hoursAgo)).Add(-time.Minute * time.Duration(minutesAgo))

			post := models.Post{
				StationID:     station.ID,
				Timestamp:     timestamp,
				SatelliteName: satelliteNames[rand.Intn(len(satelliteNames))],
				Metadata:      fmt.Sprintf(`{"location": "%s", "frequency": "%d MHz", "mode": "APT"}`, locations[rand.Intn(len(locations))], 137000000+rand.Intn(10000000)),
			}

			if err := db.Create(&post).Error; err != nil {
				return fmt.Errorf("failed to create post for station %s: %w", station.Name, err)
			}

			fmt.Printf("Created post: %s - %s (ID: %d, Station: %s)\n",
				post.SatelliteName, timestamp.Format("2006-01-02 15:04"), post.ID, station.Name)

			// Note: Images are not seeded since they require MinIO storage to be running
			// In a real environment, images would be uploaded via the API after seeding
			fmt.Printf("  Note: Images not created during seeding (requires MinIO)\n")
		}
	}

	// Seed comments
	fmt.Println("\nSeeding comments...")
	var allPosts []models.Post
	if err := db.Find(&allPosts).Error; err != nil {
		return fmt.Errorf("failed to fetch posts for comments: %w", err)
	}

	commentCount := 0
	for _, post := range allPosts {
		// Create 0-5 comments per post (some posts will have no comments)
		numComments := rand.Intn(6) // 0 to 5 comments

		for i := 0; i < numComments; i++ {
			// Random user from the test users
			randomUser := users[rand.Intn(len(users))]

			// Generate random timestamp after the post was created
			hoursAfterPost := rand.Intn(48) // Within 48 hours after post
			commentTime := post.CreatedAt.Add(time.Hour * time.Duration(hoursAfterPost))

			comment := models.Comment{
				UserID:    randomUser.ID,
				PostID:    post.ID,
				Content:   commentTexts[rand.Intn(len(commentTexts))],
				CreatedAt: commentTime,
				UpdatedAt: commentTime,
			}

			if err := db.Create(&comment).Error; err != nil {
				return fmt.Errorf("failed to create comment for post %d: %w", post.ID, err)
			}

			commentCount++
			fmt.Printf("Created comment on post %d by %s: %s\n", post.ID, randomUser.Username, comment.Content[:min(50, len(comment.Content))]+"...")
		}
	}

	// Seed comment likes
	fmt.Println("\nSeeding comment likes...")
	var allComments []models.Comment
	if err := db.Find(&allComments).Error; err != nil {
		return fmt.Errorf("failed to fetch comments for likes: %w", err)
	}

	likeCount := 0
	for _, comment := range allComments {
		// 30% chance of having likes, with 1-3 likes per comment
		if rand.Float32() < 0.3 {
			numLikes := 1 + rand.Intn(3)        // 1 to 3 likes
			likedUsers := make(map[string]bool) // Track who already liked to avoid duplicates

			for i := 0; i < numLikes; i++ {
				// Random user who didn't already like this comment
				var liker models.User
				maxAttempts := 10
				for attempts := 0; attempts < maxAttempts; attempts++ {
					randomUser := users[rand.Intn(len(users))]
					userIDStr := randomUser.ID.String()
					if !likedUsers[userIDStr] && randomUser.ID != comment.UserID { // Don't let users like their own comments
						liker = randomUser
						likedUsers[userIDStr] = true
						break
					}
				}

				if liker.ID == uuid.Nil {
					continue // Skip if we couldn't find a suitable user
				}

				commentLike := models.CommentLike{
					UserID:    liker.ID,
					CommentID: comment.ID,
				}

				// Check if like already exists
				var existing models.CommentLike
				if err := db.Where("user_id = ? AND comment_id = ?", liker.ID, comment.ID).First(&existing).Error; err == nil {
					// Like already exists, skip
					continue
				}

				if err := db.Create(&commentLike).Error; err != nil {
					return fmt.Errorf("failed to create like for comment %d: %w", comment.ID, err)
				}

				likeCount++
				fmt.Printf("User %s liked comment %d\n", liker.Username, comment.ID)
			}
		}
	}

	// Seed achievements
	fmt.Println("\nSeeding achievements...")
	if err := seedAchievements(); err != nil {
		return fmt.Errorf("failed to seed achievements: %w", err)
	}

	fmt.Println("\nSeeding completed successfully!")
	fmt.Printf("Created: %d users, %d stations, posts with images, %d comments, and %d comment likes\n",
		len(users), len(stations), commentCount, likeCount)

	return nil
}
