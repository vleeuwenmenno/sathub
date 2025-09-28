package models

import (
	"time"

	"database/sql"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type User struct {
	ID                 uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Username           string         `gorm:"uniqueIndex;not null" json:"username"`
	Email              sql.NullString `gorm:"unique" json:"email,omitempty"`
	EmailConfirmed     bool           `gorm:"default:false" json:"email_confirmed"`
	Password           string         `gorm:"not null" json:"-"`
	Role               string         `gorm:"default:user" json:"role"`
	Banned             bool           `gorm:"default:false" json:"banned"`
	BannedAt           sql.NullTime   `json:"banned_at,omitempty"`
	TwoFactorEnabled   bool           `gorm:"default:false" json:"two_factor_enabled"`
	TwoFactorSecret    string         `gorm:"size:128" json:"-"`  // Store encrypted
	RecoveryCodes      string         `gorm:"type:text" json:"-"` // Store encrypted JSON array of recovery codes
	DisplayName        string         `gorm:"size:100" json:"display_name,omitempty"`
	ProfilePicture     []byte         `json:"-"`
	ProfilePictureType string         `gorm:"size:50" json:"-"`
	EmailNotifications bool           `gorm:"default:false" json:"email_notifications"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
}

// HashPassword hashes the user's password using bcrypt
func (u *User) HashPassword(password string) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	u.Password = string(hashedPassword)
	return nil
}

// CheckPassword verifies if the provided password matches the user's hashed password
func (u *User) CheckPassword(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
	return err == nil
}

// BeforeCreate is a GORM hook that runs before creating a user
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.Role == "" {
		u.Role = "user"
	}
	return nil
}

// TableName returns the table name for User model
func (User) TableName() string {
	return "users"
}
