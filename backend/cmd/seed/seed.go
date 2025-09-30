package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"sathub-ui-backend/config"
	"sathub-ui-backend/seed"
)

func main() {
	testScenario85 := flag.Bool("test-85", false, "Run the 85% uptime test scenario instead of full seeding")
	testScenario90 := flag.Bool("test-90", false, "Run the 90.5% uptime test scenario (adds to existing 85% scenario)")
	flag.Parse()

	fmt.Println("Starting database seeding...")

	// Set database path for seeding (use local path if not set)
	if os.Getenv("DB_PATH") == "" {
		os.Setenv("DB_PATH", "./sathub.db")
	}

	// Initialize database
	config.InitDatabase()
	defer config.CloseDatabase()

	// Run seeding based on flag
	var err error
	if *testScenario90 {
		fmt.Println("Running 90% uptime test scenario...")
		err = seed.TestScenario90PercentUptime()
	} else if *testScenario85 {
		fmt.Println("Running 85% uptime test scenario...")
		err = seed.TestScenario85PercentUptime()
	} else {
		fmt.Println("Running full database seeding...")
		err = seed.Database()
	}

	if err != nil {
		log.Fatalf("Seeding failed: %v", err)
	}

	fmt.Println("Database seeding completed!")
	fmt.Printf("Database created at: %s\n", os.Getenv("DB_PATH"))
}
