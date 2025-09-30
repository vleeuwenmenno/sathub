package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CommentLike struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	User      User      `gorm:"foreignKey:UserID" json:"-"`
	CommentID uuid.UUID `gorm:"type:uuid;not null;index;constraint:OnDelete:CASCADE" json:"comment_id"`
	Comment   Comment   `gorm:"foreignKey:CommentID" json:"-"`
	CreatedAt time.Time `json:"created_at"`
}

// BeforeCreate ensures unique likes (one like per user per comment)
func (cl *CommentLike) BeforeCreate(tx *gorm.DB) error {
	var count int64
	tx.Model(&CommentLike{}).Where("user_id = ? AND comment_id = ?", cl.UserID, cl.CommentID).Count(&count)
	if count > 0 {
		return gorm.ErrDuplicatedKey
	}
	return nil
}

// TableName returns the table name for CommentLike model
func (CommentLike) TableName() string {
	return "comment_likes"
}
