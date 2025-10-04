package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Achievement struct {
	ID          uuid.UUID `gorm:"type:text;primaryKey" json:"id"`
	Name        string    `gorm:"not null;unique" json:"name"`
	Description string    `gorm:"not null" json:"description"`
	Icon        string    `gorm:"not null" json:"icon"`               // Emoji or icon name
	Criteria    string    `gorm:"type:text;not null" json:"criteria"` // JSON string with conditions
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TableName returns the table name for Achievement model
func (Achievement) TableName() string {
	return "achievements"
}

// BeforeCreate generates a UUID for the achievement before creation
func (a *Achievement) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}
