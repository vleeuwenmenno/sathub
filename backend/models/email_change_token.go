package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type EmailChangeToken struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	NewEmail  string    `gorm:"not null" json:"new_email"`
	Token     string    `gorm:"uniqueIndex;not null" json:"token"`
	ExpiresAt time.Time `gorm:"not null" json:"expires_at"`
	Used      bool      `gorm:"default:false" json:"used"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Association
	User User `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
}

// IsExpired checks if the token has expired
func (ect *EmailChangeToken) IsExpired() bool {
	return time.Now().After(ect.ExpiresAt)
}

// TableName returns the table name for EmailChangeToken model
func (EmailChangeToken) TableName() string {
	return "email_change_tokens"
}

// BeforeCreate is a GORM hook that runs before creating an email change token
func (ect *EmailChangeToken) BeforeCreate(tx *gorm.DB) error {
	if ect.ExpiresAt.IsZero() {
		// Set default expiry to 24 hours from now
		ect.ExpiresAt = time.Now().Add(24 * time.Hour)
	}
	return nil
}
