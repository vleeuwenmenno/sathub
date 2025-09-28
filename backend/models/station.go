package models

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Station struct {
	ID              string     `gorm:"primaryKey" json:"id"`
	UserID          uuid.UUID  `gorm:"type:uuid;not null;index" json:"user_id"`
	User            User       `gorm:"foreignKey:UserID" json:"-"`
	Name            string     `gorm:"not null" json:"name"`
	Location        string     `gorm:"not null" json:"location"`
	Latitude        *float64   `gorm:"type:decimal(10,8)" json:"latitude,omitempty"`
	Longitude       *float64   `gorm:"type:decimal(11,8)" json:"longitude,omitempty"`
	Picture         []byte     `json:"-"`
	PictureType     string     `gorm:"size:50" json:"-"`
	Equipment       string     `gorm:"type:text" json:"equipment"`
	IsPublic        bool       `gorm:"column:is_public;default:true" json:"is_public"`
	Token           string     `gorm:"uniqueIndex;not null" json:"-"`
	LastSeen        *time.Time `json:"last_seen,omitempty"`
	OnlineThreshold int        `gorm:"default:5" json:"online_threshold"` // minutes
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
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

// BeforeCreate is a GORM hook that generates a UUID and token before creating a station
func (s *Station) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		if err := s.GenerateUUID(); err != nil {
			return err
		}
	}
	if s.Token == "" {
		return s.GenerateToken()
	}
	return nil
}

// GenerateUUID generates a UUID v4 for the station
func (s *Station) GenerateUUID() error {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return err
	}
	// Set version (4) and variant bits
	bytes[6] = (bytes[6] & 0x0f) | 0x40 // Version 4
	bytes[8] = (bytes[8] & 0x3f) | 0x80 // Variant 10
	s.ID = fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		bytes[0:4], bytes[4:6], bytes[6:8], bytes[8:10], bytes[10:16])
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
