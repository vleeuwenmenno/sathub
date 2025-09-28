package models

import (
	"time"

	"gorm.io/gorm"
)

type Like struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	User      User      `gorm:"foreignKey:UserID" json:"-"`
	PostID    uint      `gorm:"not null;index" json:"post_id"`
	Post      Post      `gorm:"foreignKey:PostID" json:"-"`
	CreatedAt time.Time `json:"created_at"`
}

// BeforeCreate ensures unique likes (one like per user per post)
func (l *Like) BeforeCreate(tx *gorm.DB) error {
	var count int64
	tx.Model(&Like{}).Where("user_id = ? AND post_id = ?", l.UserID, l.PostID).Count(&count)
	if count > 0 {
		return gorm.ErrDuplicatedKey
	}
	return nil
}

// TableName returns the table name for Like model
func (Like) TableName() string {
	return "likes"
}
