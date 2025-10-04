package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Comment struct {
	ID        uuid.UUID `gorm:"type:text;primaryKey" json:"id"`
	UserID    uuid.UUID `gorm:"type:text;not null;index" json:"user_id"`
	User      User      `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	PostID    uuid.UUID `gorm:"type:text;not null;index;constraint:OnDelete:CASCADE" json:"post_id"`
	Post      Post      `gorm:"foreignKey:PostID" json:"-"`
	Content   string    `gorm:"not null;type:text" json:"content"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName returns the table name for Comment model
func (Comment) TableName() string {
	return "comments"
}

// BeforeCreate ensures content is not empty and generates UUID
func (c *Comment) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	if c.Content == "" {
		return gorm.ErrInvalidData
	}
	return nil
}
