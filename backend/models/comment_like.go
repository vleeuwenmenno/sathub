package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CommentLike struct {
	ID        uuid.UUID `gorm:"type:text;primaryKey" json:"id"`
	UserID    uuid.UUID `gorm:"type:text;not null;index" json:"user_id"`
	User      User      `gorm:"foreignKey:UserID" json:"-"`
	CommentID uuid.UUID `gorm:"type:text;not null;index;constraint:OnDelete:CASCADE" json:"comment_id"`
	Comment   Comment   `gorm:"foreignKey:CommentID" json:"-"`
	CreatedAt time.Time `json:"created_at"`
}

// BeforeCreate ensures unique likes (one like per user per comment) and generates UUID
func (cl *CommentLike) BeforeCreate(tx *gorm.DB) error {
	if cl.ID == uuid.Nil {
		cl.ID = uuid.New()
	}
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
