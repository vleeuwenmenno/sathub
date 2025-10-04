package models

import (
	"time"

	"github.com/google/uuid"
)

type Achievement struct {
	ID             uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	NameKey        string    `gorm:"not null;unique" json:"name_key"`
	DescriptionKey string    `gorm:"not null" json:"description_key"`
	Icon           string    `gorm:"not null" json:"icon"`               // Emoji or icon name
	Criteria       string    `gorm:"type:json;not null" json:"criteria"` // JSON string with conditions
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// TableName returns the table name for Achievement model
func (Achievement) TableName() string {
	return "achievements"
}
