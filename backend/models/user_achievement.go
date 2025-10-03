package models

import (
	"time"

	"github.com/google/uuid"
)

type UserAchievement struct {
	ID            uuid.UUID   `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID        uuid.UUID   `gorm:"type:uuid;not null" json:"user_id"`
	AchievementID uuid.UUID   `gorm:"type:uuid;not null" json:"achievement_id"`
	UnlockedAt    time.Time   `json:"unlocked_at"`
	User          User        `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	Achievement   Achievement `gorm:"foreignKey:AchievementID" json:"achievement"`
}

// TableName returns the table name for UserAchievement model
func (UserAchievement) TableName() string {
	return "user_achievements"
}
