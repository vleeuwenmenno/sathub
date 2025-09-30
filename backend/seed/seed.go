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
			Name:        "Reliable Operator",
			Description: "Have 10 successful data transmissions",
			Icon:        "⚡",
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
	}

	for _, achievement := range achievements {
		if err := db.Create(&achievement).Error; err != nil {
			return fmt.Errorf("failed to create achievement %s: %w", achievement.Name, err)
		}
		fmt.Printf("Created achievement: %s\n", achievement.Name)
	}

	return nil
}

// Database seeds the database with test data
func Database() error {
	db := config.GetDB()

	// Seed users
	fmt.Println("Seeding users...")
	var users []models.User
	for _, userData := range testUsers {
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
