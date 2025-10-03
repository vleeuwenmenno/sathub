package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PasswordResetToken struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	Token     string    `gorm:"uniqueIndex;not null" json:"token"`
	ExpiresAt time.Time `gorm:"not null" json:"expires_at"`
	Used      bool      `gorm:"default:false" json:"used"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Association
	User User `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
}

// IsExpired checks if the token has expired
func (prt *PasswordResetToken) IsExpired() bool {
	return time.Now().After(prt.ExpiresAt)
}

// TableName returns the table name for PasswordResetToken model
func (PasswordResetToken) TableName() string {
	return "password_reset_tokens"
}

// BeforeCreate is a GORM hook that runs before creating a password reset token
func (prt *PasswordResetToken) BeforeCreate(tx *gorm.DB) error {
	if prt.ExpiresAt.IsZero() {
		// Set default expiry to 1 hour from now
		prt.ExpiresAt = time.Now().Add(time.Hour)
	}
	return nil
}
