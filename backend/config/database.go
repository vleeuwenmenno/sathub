package config

import (
	"fmt"
	"log"
	"os"
	"satdump-ui-backend/models"

	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// InitDatabase initializes the database connection and runs migrations
func InitDatabase() {
	var err error

	// Configure GORM
	config := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	}

	// Check database type from environment
	dbType := os.Getenv("DB_TYPE")
	if dbType == "" {
		dbType = "sqlite" // default to sqlite for backward compatibility
	}

	switch dbType {
	case "postgres":
		// PostgreSQL connection
		dbHost := os.Getenv("DB_HOST")
		if dbHost == "" {
			dbHost = "localhost"
		}
		dbPort := os.Getenv("DB_PORT")
		if dbPort == "" {
			dbPort = "5432"
		}
		dbUser := os.Getenv("DB_USER")
		if dbUser == "" {
			dbUser = "postgres"
		}
		dbPassword := os.Getenv("DB_PASSWORD")
		if dbPassword == "" {
			dbPassword = "password"
		}
		dbName := os.Getenv("DB_NAME")
		if dbName == "" {
			dbName = "sathub"
		}

		dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC",
			dbHost, dbUser, dbPassword, dbName, dbPort)

		DB, err = gorm.Open(postgres.Open(dsn), config)
		if err != nil {
			log.Fatal("Failed to connect to PostgreSQL database:", err)
		}
		log.Println("Connected to PostgreSQL database")

	case "sqlite":
		fallthrough
	default:
		// SQLite connection (default)
		dbPath := os.Getenv("DB_PATH")
		if dbPath == "" {
			dbPath = "./satdump.db"
		}

		DB, err = gorm.Open(sqlite.Open(dbPath), config)
		if err != nil {
			log.Fatal("Failed to connect to SQLite database:", err)
		}
		log.Println("Connected to SQLite database")
	}

	// Run auto migrations
	err = DB.AutoMigrate(
		&models.User{},
		&models.RefreshToken{},
		&models.Station{},
		&models.Post{},
		&models.PostImage{},
		&models.PasswordResetToken{},
		&models.EmailConfirmationToken{},
		&models.EmailChangeToken{},
	)
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}
	log.Println("Database initialized successfully")
}

// GetDB returns the database instance
func GetDB() *gorm.DB {
	return DB
}

// CloseDatabase closes the database connection
func CloseDatabase() {
	sqlDB, err := DB.DB()
	if err != nil {
		log.Printf("Error getting underlying sql.DB: %v", err)
		return
	}

	if err := sqlDB.Close(); err != nil {
		log.Printf("Error closing database: %v", err)
	} else {
		log.Println("Database connection closed")
	}
}
