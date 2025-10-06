package models

import (
	"crypto/rand"
	"encoding/base64"
	"time"

	"github.com/google/uuid"
)

// ShareToken represents a shareable token for posts
type ShareToken struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	PostID    uuid.UUID `gorm:"type:uuid;not null;index;constraint:OnDelete:CASCADE" json:"post_id"`
	Post      Post      `gorm:"foreignKey:PostID" json:"-"`
	Token     string    `gorm:"uniqueIndex;not null" json:"token"`
	ExpiresAt time.Time `gorm:"index" json:"expires_at"` // Optional expiration
	CreatedBy uuid.UUID `gorm:"type:uuid;not null;index" json:"created_by"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName returns the table name for ShareToken model
func (ShareToken) TableName() string {
	return "share_tokens"
}

// GenerateToken creates a new secure random token (shorter for better UX)
func (st *ShareToken) GenerateToken() error {
	// Generate 12 random bytes (16 chars in base64)
	bytes := make([]byte, 12)
	if _, err := rand.Read(bytes); err != nil {
		return err
	}

	// Encode to base64 URL-safe format without padding
	st.Token = base64.RawURLEncoding.EncodeToString(bytes)
	return nil
}

// IsExpired checks if the token has expired
func (st *ShareToken) IsExpired() bool {
	// If ExpiresAt is zero (not set), token never expires
	if st.ExpiresAt.IsZero() {
		return false
	}
	return time.Now().After(st.ExpiresAt)
}
