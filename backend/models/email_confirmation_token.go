package models

import (
	"time"

	"gorm.io/gorm"
)

type EmailConfirmationToken struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null" json:"user_id"`
	Token     string    `gorm:"uniqueIndex;not null" json:"token"`
	ExpiresAt time.Time `gorm:"not null" json:"expires_at"`
	Used      bool      `gorm:"default:false" json:"used"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Association
	User User `gorm:"foreignKey:UserID" json:"-"`
}

// IsExpired checks if the token has expired
func (ect *EmailConfirmationToken) IsExpired() bool {
	return time.Now().After(ect.ExpiresAt)
}

// TableName returns the table name for EmailConfirmationToken model
func (EmailConfirmationToken) TableName() string {
	return "email_confirmation_tokens"
}

// BeforeCreate is a GORM hook that runs before creating an email confirmation token
func (ect *EmailConfirmationToken) BeforeCreate(tx *gorm.DB) error {
	if ect.ExpiresAt.IsZero() {
		// Set default expiry to 24 hours from now
		ect.ExpiresAt = time.Now().Add(24 * time.Hour)
	}
	return nil
}
