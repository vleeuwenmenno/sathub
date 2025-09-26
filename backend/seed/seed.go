package seed

import (
	"fmt"
	"log"
	"math/rand"
	"os"
	"path/filepath"
	"time"

	"satdump-ui-backend/config"
	"satdump-ui-backend/models"
)

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

// Database seeds the database with test data
func Database() error {
	db := config.GetDB()

	// Seed users
	fmt.Println("Seeding users...")
	var users []models.User
	for _, userData := range testUsers {
		user := models.User{
			Username: userData.username,
			Role:     userData.role,
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
		fmt.Printf("Created user: %s (ID: %d)\n", user.Username, user.ID)
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

			// Create 1-3 images per post
			numImages := 1 + rand.Intn(3) // 1 to 3 images

			for j := 0; j < numImages; j++ {
				imageData := createTestImageData()

				postImage := models.PostImage{
					PostID:    post.ID,
					ImageData: imageData,
					ImageType: "image/png",
					Filename:  fmt.Sprintf("%s_%s_%d.png", post.SatelliteName, timestamp.Format("20060102_150405"), j+1),
				}

				if err := db.Create(&postImage).Error; err != nil {
					return fmt.Errorf("failed to create image for post %d: %w", post.ID, err)
				}

				fmt.Printf("  Created image: %s (ID: %d)\n", postImage.Filename, postImage.ID)
			}
		}
	}

	fmt.Println("\nSeeding completed successfully!")
	fmt.Printf("Created: %d users, %d stations, and posts with images\n", len(users), len(stations))

	return nil
}
