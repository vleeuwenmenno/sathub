package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserAchievement struct {
	ID            uuid.UUID   `gorm:"type:text;primaryKey" json:"id"`
	UserID        uuid.UUID   `gorm:"type:text;not null" json:"user_id"`
	AchievementID uuid.UUID   `gorm:"type:text;not null" json:"achievement_id"`
	UnlockedAt    time.Time   `json:"unlocked_at"`
	User          User        `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	Achievement   Achievement `gorm:"foreignKey:AchievementID" json:"achievement"`
}

// TableName returns the table name for UserAchievement model
func (UserAchievement) TableName() string {
	return "user_achievements"
}

// BeforeCreate generates a UUID for the user achievement before creation
func (ua *UserAchievement) BeforeCreate(tx *gorm.DB) error {
	if ua.ID == uuid.Nil {
		ua.ID = uuid.New()
	}
	return nil
}
