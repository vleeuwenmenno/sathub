package models

import (
	"time"

	"github.com/google/uuid"
)

type Post struct {
	ID            uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	StationID     string    `gorm:"not null;index;constraint:OnDelete:CASCADE" json:"station_id"`
	Station       Station   `gorm:"foreignKey:StationID" json:"-"`
	Timestamp     time.Time `gorm:"not null" json:"timestamp"`
	SatelliteName string    `gorm:"not null" json:"satellite_name"`
	CBOR          []byte    `json:"-"`                         // Optional CBOR blob
	Metadata      string    `gorm:"type:text" json:"metadata"` // JSON metadata as string
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// TableName returns the table name for Post model
func (Post) TableName() string {
	return "posts"
}

type PostImage struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	PostID    uuid.UUID `gorm:"type:uuid;not null;index;constraint:OnDelete:CASCADE" json:"post_id"`
	Post      Post      `gorm:"foreignKey:PostID" json:"-"`
	ImageURL  string    `gorm:"not null" json:"image_url"` // URL to image in storage
	ImageType string    `gorm:"size:50" json:"-"`          // MIME type of the image
	Filename  string    `gorm:"not null" json:"filename"`
	CreatedAt time.Time `json:"created_at"`
}

// TableName returns the table name for PostImage model
func (PostImage) TableName() string {
	return "post_images"
}

type PostCBOR struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	PostID    uuid.UUID `gorm:"type:uuid;not null;index;constraint:OnDelete:CASCADE" json:"post_id"`
	Post      Post      `gorm:"foreignKey:PostID" json:"-"`
	CBORData  []byte    `gorm:"not null" json:"-"` // CBOR binary data
	Filename  string    `gorm:"not null" json:"filename"`
	CreatedAt time.Time `json:"created_at"`
}

// TableName returns the table name for PostCBOR model
func (PostCBOR) TableName() string {
	return "post_cbors"
}

type PostCADU struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	PostID    uuid.UUID `gorm:"type:uuid;not null;index;constraint:OnDelete:CASCADE" json:"post_id"`
	Post      Post      `gorm:"foreignKey:PostID" json:"-"`
	CADUData  []byte    `gorm:"not null" json:"-"` // CADU binary data
	Filename  string    `gorm:"not null" json:"filename"`
	CreatedAt time.Time `json:"created_at"`
}

// TableName returns the table name for PostCADU model
func (PostCADU) TableName() string {
	return "post_cadus"
}
