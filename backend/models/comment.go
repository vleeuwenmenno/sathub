package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Comment struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	User      User      `gorm:"foreignKey:UserID" json:"-"`
	PostID    uint      `gorm:"not null;index" json:"post_id"`
	Post      Post      `gorm:"foreignKey:PostID" json:"-"`
	Content   string    `gorm:"not null;type:text" json:"content"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName returns the table name for Comment model
func (Comment) TableName() string {
	return "comments"
}

// BeforeCreate ensures content is not empty
func (c *Comment) BeforeCreate(tx *gorm.DB) error {
	if c.Content == "" {
		return gorm.ErrInvalidData
	}
	return nil
}
