package models

import (
	"time"
)

type StationUptime struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	StationID string    `gorm:"not null;index" json:"station_id"`
	Timestamp time.Time `gorm:"not null;index" json:"timestamp"`
	Event     string    `gorm:"size:20;default:'online'" json:"event"` // 'online' or 'offline'
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName returns the table name for StationUptime model
func (StationUptime) TableName() string {
	return "station_uptimes"
}
