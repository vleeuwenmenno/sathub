package config

import (
	"fmt"
	"log"
	"os"
	"sathub-ui-backend/models"

	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// InitDatabase initializes the database connection WITHOUT running migrations
func InitDatabase() {
	var err error

	// Configure GORM
	config := &gorm.Config{
		// Logger: logger.Default.LogMode(logger.Info), // Uncomment for detailed SQL logging
		Logger: logger.Default.LogMode(logger.Warn),
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
			dbPath = "./sathub.db"
		}

		DB, err = gorm.Open(sqlite.Open(dbPath), config)
		if err != nil {
			log.Fatal("Failed to connect to SQLite database:", err)
		}
		log.Println("Connected to SQLite database")
	}

	log.Println("Database connection established successfully")
}

// RunMigrations runs database migrations
func RunMigrations() error {
	log.Println("Running database migrations...")

	err := DB.AutoMigrate(
		&models.User{},
		&models.RefreshToken{},
		&models.Station{},
		&models.Post{},
		&models.PostCBOR{},
		&models.PostImage{},
		&models.Like{},
		&models.Comment{},
		&models.CommentLike{},
		&models.PasswordResetToken{},
		&models.EmailConfirmationToken{},
		&models.EmailChangeToken{},
		&models.Achievement{},
		&models.UserAchievement{},
		&models.Notification{},
		&models.Setting{},
		&models.AuditLog{},
		&models.StationUptime{},
		&models.StationNotificationSettings{},
		&models.StationNotificationRule{},
	)
	if err != nil {
		return fmt.Errorf("failed to migrate database: %w", err)
	}
	log.Println("Database migrations completed successfully")
	return nil
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
		log.Printf("Error closing database connection: %v", err)
	} else {
		log.Println("Database connection closed")
	}
}
