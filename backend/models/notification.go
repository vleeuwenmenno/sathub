package models

import (
	"time"

	"github.com/google/uuid"
)

type Notification struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	User      User      `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	Type      string    `gorm:"size:50;not null" json:"type"` // achievement, comment, like, station_down, station_online, station_low_uptime
	Message   string    `gorm:"type:text;not null" json:"message"`
	RelatedID string    `gorm:"size:255" json:"related_id,omitempty"` // ID of related entity (achievement UUID, post ID, comment ID, station ID)
	IsRead    bool      `gorm:"default:false" json:"is_read"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName returns the table name for Notification model
func (Notification) TableName() string {
	return "notifications"
}
