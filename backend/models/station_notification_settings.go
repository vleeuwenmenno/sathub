package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type StationNotificationRule struct {
	ID         uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	SettingsID uuid.UUID `gorm:"type:uuid;not null" json:"settings_id"`
	Type       string    `gorm:"size:50;not null" json:"type"` // 'down_minutes', 'back_online', 'low_uptime'
	Threshold  *int      `json:"threshold,omitempty"`          // For 'down_minutes' and 'low_uptime'
	Enabled    bool      `gorm:"default:true" json:"enabled"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type StationNotificationSettings struct {
	ID        uuid.UUID                 `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	StationID string                    `gorm:"not null;index" json:"station_id"`
	Station   Station                   `gorm:"foreignKey:StationID" json:"-"`
	Rules     []StationNotificationRule `gorm:"foreignKey:SettingsID" json:"rules"`
	CreatedAt time.Time                 `json:"created_at"`
	UpdatedAt time.Time                 `json:"updated_at"`
}

// TableName returns the table name for StationNotificationSettings model
func (StationNotificationSettings) TableName() string {
	return "station_notification_settings"
}

// BeforeCreate is a GORM hook that runs before creating a notification setting
func (s *StationNotificationSettings) BeforeCreate(tx *gorm.DB) error {
	return nil
}
