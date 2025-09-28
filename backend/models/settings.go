package models

import (
	"time"

	"gorm.io/gorm"
)

type Setting struct {
	Key         string    `gorm:"primaryKey;size:255" json:"key"`
	Value       string    `gorm:"type:text" json:"value"`
	Description string    `gorm:"size:500" json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TableName returns the table name for Setting model
func (Setting) TableName() string {
	return "settings"
}

// BeforeCreate is a GORM hook that runs before creating a setting
func (s *Setting) BeforeCreate(tx *gorm.DB) error {
	if s.CreatedAt.IsZero() {
		s.CreatedAt = time.Now()
	}
	if s.UpdatedAt.IsZero() {
		s.UpdatedAt = time.Now()
	}
	return nil
}

// BeforeUpdate is a GORM hook that runs before updating a setting
func (s *Setting) BeforeUpdate(tx *gorm.DB) error {
	s.UpdatedAt = time.Now()
	return nil
}
