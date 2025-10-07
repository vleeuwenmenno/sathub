package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AuditAction represents the type of action performed
type AuditAction string

const (
	// User actions
	ActionUserRegister          AuditAction = "user_register"
	ActionUserLogin             AuditAction = "user_login"
	ActionUserLogout            AuditAction = "user_logout"
	ActionUserPasswordChange    AuditAction = "user_password_change"
	ActionUserEmailChange       AuditAction = "user_email_change"
	ActionUserDisplayNameChange AuditAction = "user_display_name_change"
	ActionUser2FAEnable         AuditAction = "user_2fa_enable"
	ActionUser2FADisable        AuditAction = "user_2fa_disable"
	ActionUserProfilePicture    AuditAction = "user_profile_picture_change"

	// Admin user management actions
	ActionAdminUserRoleUpdate          AuditAction = "admin_user_role_update"
	ActionAdminUserBan                 AuditAction = "admin_user_ban"
	ActionAdminUserUnban               AuditAction = "admin_user_unban"
	ActionAdminUserApprove             AuditAction = "admin_user_approve"
	ActionAdminUserReject              AuditAction = "admin_user_reject"
	ActionAdminUserDelete              AuditAction = "admin_user_delete"
	ActionAdminUserProfilePictureClear AuditAction = "admin_user_profile_picture_clear"
	ActionAdminPostDelete              AuditAction = "admin_post_delete"
	ActionAdminPostHide                AuditAction = "admin_post_hide"

	// Admin report management actions
	ActionAdminReportUpdate AuditAction = "admin_report_update"
	ActionAdminReportDelete AuditAction = "admin_report_delete"

	// Comment actions
	ActionCommentCreate AuditAction = "comment_create"
	ActionCommentUpdate AuditAction = "comment_update"
	ActionCommentDelete AuditAction = "comment_delete"
	ActionCommentLike   AuditAction = "comment_like"
	ActionCommentUnlike AuditAction = "comment_unlike"

	// Station actions
	ActionStationCreate        AuditAction = "station_create"
	ActionStationUpdate        AuditAction = "station_update"
	ActionStationDelete        AuditAction = "station_delete"
	ActionStationTokenRegen    AuditAction = "station_token_regenerate"
	ActionStationPictureUpload AuditAction = "station_picture_upload"
	ActionAdminStationHide     AuditAction = "admin_station_hide"
	ActionAdminStationDelete   AuditAction = "admin_station_delete"

	// Post actions
	ActionPostCreate      AuditAction = "post_create"
	ActionPostDelete      AuditAction = "post_delete"
	ActionPostImageUpload AuditAction = "post_image_upload"
	ActionPostCBORUpload  AuditAction = "post_cbor_upload"
	ActionPostCADUUpload  AuditAction = "post_cadu_upload"
	ActionPostLike        AuditAction = "post_like"
	ActionPostUnlike      AuditAction = "post_unlike"

	// Achievement actions
	ActionAchievementUnlock AuditAction = "achievement_unlock"
)

// AuditTargetType represents the type of resource being acted upon
type AuditTargetType string

const (
	TargetTypeUser    AuditTargetType = "user"
	TargetTypeStation AuditTargetType = "station"
	TargetTypePost    AuditTargetType = "post"
	TargetTypeComment AuditTargetType = "comment"
	TargetTypeReport  AuditTargetType = "report"
	TargetTypeSystem  AuditTargetType = "system"
)

// AuditMetadata represents additional data about the audit event
type AuditMetadata map[string]interface{}

// Value implements the driver.Valuer interface for JSON marshaling
func (m AuditMetadata) Value() (driver.Value, error) {
	if m == nil {
		return nil, nil
	}
	return json.Marshal(m)
}

// Scan implements the sql.Scanner interface for JSON unmarshaling
func (m *AuditMetadata) Scan(value interface{}) error {
	if value == nil {
		*m = nil
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return json.Unmarshal([]byte(value.(string)), m)
	}

	return json.Unmarshal(bytes, m)
}

// AuditLog represents an audit log entry
type AuditLog struct {
	ID         uuid.UUID       `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID     *uuid.UUID      `gorm:"type:uuid;index" json:"user_id,omitempty"`
	User       *User           `gorm:"foreignKey:UserID;references:ID" json:"user,omitempty"`
	Action     AuditAction     `gorm:"type:varchar(50);not null;index" json:"action"`
	TargetType AuditTargetType `gorm:"type:varchar(20);not null;index" json:"target_type"`
	TargetID   string          `gorm:"type:varchar(100);index" json:"target_id,omitempty"`
	Metadata   AuditMetadata   `gorm:"type:jsonb" json:"metadata,omitempty"`
	IPAddress  *string         `gorm:"type:inet;index" json:"ip_address,omitempty"`
	UserAgent  *string         `gorm:"type:text" json:"user_agent,omitempty"`
	CreatedAt  time.Time       `json:"created_at"`
}

// TableName returns the table name for AuditLog model
func (AuditLog) TableName() string {
	return "audit_logs"
}

// BeforeCreate is a GORM hook that runs before creating an audit log
func (a *AuditLog) BeforeCreate(tx *gorm.DB) error {
	if a.Metadata == nil {
		a.Metadata = make(AuditMetadata)
	}
	return nil
}
