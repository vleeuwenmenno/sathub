package models

import (
	"time"

	"github.com/google/uuid"
)

type Report struct {
	ID         uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID     uuid.UUID  `gorm:"type:uuid;not null;index" json:"user_id"`
	User       User       `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	TargetType string     `gorm:"not null;size:50;index" json:"target_type"` // "post", "station", "user", "comment"
	TargetID   string     `gorm:"not null;index" json:"target_id"`           // UUID or string ID of the target
	Title      string     `gorm:"not null;size:255" json:"title"`
	Message    string     `gorm:"not null;type:text" json:"message"`
	Status     string     `gorm:"not null;size:50;default:'pending';index" json:"status"` // "pending", "reviewed", "resolved", "dismissed"
	ReviewedBy *uuid.UUID `gorm:"type:text;index" json:"reviewed_by,omitempty"`
	ReviewedAt *time.Time `json:"reviewed_at,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

// TableName returns the table name for Report model
func (Report) TableName() string {
	return "reports"
}

// ValidTargetTypes returns the valid target types for reports
func ValidTargetTypes() []string {
	return []string{"post", "station", "user", "comment"}
}

// ValidStatuses returns the valid statuses for reports
func ValidStatuses() []string {
	return []string{"pending", "reviewed", "resolved", "dismissed"}
}
