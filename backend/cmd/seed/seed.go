package main

import (
	"fmt"
	"log"
	"os"

	"satdump-ui-backend/config"
	"satdump-ui-backend/seed"
)

func main() {
	fmt.Println("Starting database seeding...")

	// Set database path for seeding (use local path if not set)
	if os.Getenv("DB_PATH") == "" {
		os.Setenv("DB_PATH", "./satdump.db")
	}

	// Initialize database
	config.InitDatabase()
	defer config.CloseDatabase()

	// Run seeding
	if err := seed.Database(); err != nil {
		log.Fatalf("Seeding failed: %v", err)
	}

	fmt.Println("Database seeding completed!")
	fmt.Printf("Database created at: %s\n", os.Getenv("DB_PATH"))
}
