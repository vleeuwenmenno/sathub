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

// runCommentUUIDMigration runs the migration to convert comment IDs to UUIDs
func runCommentUUIDMigration() error {
	log.Println("Running comment UUID migration...")

	// Check if we need to migrate (only for PostgreSQL and if comments table exists with bigint id)
	var dbType string
	if os.Getenv("DB_TYPE") == "postgres" {
		dbType = "postgres"
	} else {
		dbType = "sqlite"
	}

	if dbType == "postgres" {
		// Check if comments table exists and has id as bigint
		var count int
		err := DB.Raw("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'comments'").Scan(&count).Error
		if err != nil || count == 0 {
			// Table does not exist yet, skip migration
			log.Println("Comments table does not exist, skipping UUID migration")
			return nil
		}

		// Check if id column is bigint
		var columnType string
		err = DB.Raw("SELECT data_type FROM information_schema.columns WHERE table_name = 'comments' AND column_name = 'id'").Scan(&columnType).Error
		if err != nil {
			log.Printf("Error checking column type: %v, skipping migration", err)
			return nil
		}

		if columnType == "bigint" {
			log.Println("Detected bigint comment IDs, running migration to UUIDs...")

			// Run the migration SQL
			migrationSQL := `
				-- Add a temporary UUID column to comments table
				ALTER TABLE comments ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();

				-- Update the temporary column with new UUIDs for existing comments
				UPDATE comments SET id_uuid = gen_random_uuid() WHERE id_uuid IS NULL;

				-- Update comment_likes to use the new UUIDs (cast bigint to uuid)
				UPDATE comment_likes
				SET comment_id = comments.id_uuid
				FROM comments
				WHERE comment_likes.comment_id = comments.id;

				-- Change comment_likes.comment_id to UUID type
				ALTER TABLE comment_likes ALTER COLUMN comment_id TYPE UUID USING comment_id::uuid;

				-- Drop the old bigint id column from comments
				ALTER TABLE comments DROP COLUMN id;

				-- Rename the UUID column to id
				ALTER TABLE comments RENAME COLUMN id_uuid TO id;

				-- Make the new id column the primary key
				ALTER TABLE comments ADD CONSTRAINT comments_pkey PRIMARY KEY (id);

				-- Update the foreign key constraint in comment_likes
				ALTER TABLE comment_likes DROP CONSTRAINT IF EXISTS fk_comment_likes_comment;
				ALTER TABLE comment_likes ADD CONSTRAINT fk_comment_likes_comment
					FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE;
			`

			if err := DB.Exec(migrationSQL).Error; err != nil {
				return fmt.Errorf("failed to run comment UUID migration: %w", err)
			}

			log.Println("Comment UUID migration completed successfully")
		} else {
			log.Println("Comment IDs are already UUIDs, skipping migration")
		}
	}

	return nil
}

// RunMigrations runs database migrations
func RunMigrations() error {
	log.Println("Running database migrations...")

	// Run comment UUID migration first if needed
	if err := runCommentUUIDMigration(); err != nil {
		return err
	}

	err := DB.AutoMigrate(
		&models.User{},
		&models.RefreshToken{},
		&models.Station{},
		&models.Post{},
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
		log.Printf("Error closing database: %v", err)
	} else {
		log.Println("Database connection closed")
	}
}
