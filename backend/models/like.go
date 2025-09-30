package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Like struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	User      User      `gorm:"foreignKey:UserID" json:"-"`
	PostID    uint      `gorm:"not null;index;constraint:OnDelete:CASCADE" json:"post_id"`
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
