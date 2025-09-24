package models

import (
	"crypto/rand"
	"encoding/hex"
	"time"

	"gorm.io/gorm"
)

type Station struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	UserID      uint      `gorm:"not null;index" json:"user_id"`
	User        User      `gorm:"foreignKey:UserID" json:"-"`
	Name        string    `gorm:"not null" json:"name"`
	Location    string    `gorm:"not null" json:"location"`
	Picture     []byte    `gorm:"type:blob" json:"-"` // Binary image data (not in JSON)
	PictureType string    `gorm:"size:50" json:"-"`   // MIME type of the image
	Equipment   string    `gorm:"type:text" json:"equipment"`
	IsPublic    bool      `gorm:"default:true" json:"is_public"` // Whether station is visible globally
	Token       string    `gorm:"uniqueIndex;not null" json:"-"` // Hidden in JSON responses
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// GenerateToken generates a secure random token for the station
func (s *Station) GenerateToken() error {
	bytes := make([]byte, 16) // 32 characters
	if _, err := rand.Read(bytes); err != nil {
		return err
	}
	s.Token = hex.EncodeToString(bytes)
	return nil
}

// BeforeCreate is a GORM hook that generates a token before creating a station
func (s *Station) BeforeCreate(tx *gorm.DB) error {
	if s.Token == "" {
		return s.GenerateToken()
	}
	return nil
}

// RegenerateToken generates a new token for the station
func (s *Station) RegenerateToken() error {
	return s.GenerateToken()
}

// TableName returns the table name for Station model
func (Station) TableName() string {
	return "stations"
}
