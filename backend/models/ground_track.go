package models

import (
	"time"

	"github.com/google/uuid"
)

// PostGroundTrack stores the calculated satellite ground track for a post
type PostGroundTrack struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	PostID      uuid.UUID `gorm:"type:uuid;not null;uniqueIndex;constraint:OnDelete:CASCADE" json:"post_id"`
	Post        Post      `gorm:"foreignKey:PostID" json:"-"`
	TrackData   string    `gorm:"type:text;not null" json:"track_data"` // JSON array of {lat, lon, timestamp, altitude}
	StartLat    float64   `gorm:"index" json:"start_lat"`               // Starting latitude for quick queries
	StartLon    float64   `gorm:"index" json:"start_lon"`               // Starting longitude
	EndLat      float64   `json:"end_lat"`                              // Ending latitude
	EndLon      float64   `json:"end_lon"`                              // Ending longitude
	ProcessedAt time.Time `json:"processed_at"`
	CreatedAt   time.Time `json:"created_at"`
}

// TableName returns the table name for PostGroundTrack model
func (PostGroundTrack) TableName() string {
	return "post_ground_tracks"
}

// GroundTrackPoint represents a single point in the ground track
type GroundTrackPoint struct {
	Latitude  float64 `json:"lat"`
	Longitude float64 `json:"lon"`
	Altitude  float64 `json:"alt"`  // km above earth
	Timestamp float64 `json:"time"` // Unix timestamp
}
