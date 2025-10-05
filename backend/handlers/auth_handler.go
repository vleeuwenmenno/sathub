package handlers

import (
	"fmt"
	"net/http"
	"sathub-ui-backend/config"
	"sathub-ui-backend/middleware"
	"sathub-ui-backend/models"
	"sathub-ui-backend/utils"
	"strings"
	"time"

	"database/sql"

	"github.com/dchest/captcha"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// RegisterRequest represents the request body for user registration
type RegisterRequest struct {
	Email         string `json:"email" binding:"required,email"`
	Username      string `json:"username" binding:"required,min=3,max=50"`
	Password      string `json:"password" binding:"required,min=6"`
	Role          string `json:"role" binding:"omitempty"`
	CaptchaID     string `json:"captcha_id" binding:"required"`
	CaptchaAnswer string `json:"captcha_answer" binding:"required"`
	Language      string `json:"language" binding:"omitempty"`
}

// LoginRequest represents the request body for user login
type LoginRequest struct {
	UsernameOrEmail string `json:"username" binding:"required"`
	Password        string `json:"password" binding:"required"`
}

// RefreshRequest represents the request body for token refresh
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// AuthResponse represents the response for successful authentication
type AuthResponse struct {
	AccessToken  string   `json:"access_token"`
	RefreshToken string   `json:"refresh_token"`
	User         UserInfo `json:"user"`
}

// UserInfo represents user information in responses
type UserInfo struct {
	ID                        string `json:"id"`
	Username                  string `json:"username"`
	Email                     string `json:"email,omitempty"`
	Role                      string `json:"role"`
	TwoFactorEnabled          bool   `json:"two_factor_enabled"`
	DisplayName               string `json:"display_name,omitempty"`
	ProfilePictureURL         string `json:"profile_picture_url,omitempty"`
	HasProfilePicture         bool   `json:"has_profile_picture"`
	EmailNotifications        bool   `json:"email_notifications"`
	StationEmailNotifications bool   `json:"station_email_notifications"`
	Language                  string `json:"language"`
}

// Register handles user registration
func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	// Verify captcha
	if !captcha.VerifyString(req.CaptchaID, req.CaptchaAnswer) {
		utils.ValidationErrorResponse(c, "Invalid captcha")
		return
	}

	// Check if registration is disabled
	var setting models.Setting
	err := config.GetDB().Where("key = ?", "registration_disabled").First(&setting).Error
	if err == nil && setting.Value == "true" {
		utils.ValidationErrorResponse(c, "New user registration is currently disabled")
		return
	}

	db := config.GetDB()

	// Check if username already exists
	var existingUser models.User
	if err := db.Where("username = ?", req.Username).First(&existingUser).Error; err == nil {
		utils.ValidationErrorResponse(c, "Username already exists")
		return
	}

	// Check if email already exists
	if err := db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		utils.ValidationErrorResponse(c, "Email already exists")
		return
	}

	// Validate and set role
	role := strings.ToLower(req.Role)
	if role == "" {
		role = "user"
	}
	if role != "user" && role != "admin" {
		utils.ValidationErrorResponse(c, "Invalid role. Must be 'user' or 'admin'")
		return
	}

	// Check if approval is required
	var approvalSetting models.Setting
	approvalRequired := true // Default to requiring approval
	err = config.GetDB().Where("key = ?", "approval_required").First(&approvalSetting).Error
	if err == nil && approvalSetting.Value == "false" {
		approvalRequired = false
	}

	// Validate language
	language := req.Language
	if language == "" {
		language = "en" // Default to English
	}
	// Validate supported languages
	supportedLanguages := map[string]bool{"en": true, "de": true, "nl": true}
	if !supportedLanguages[language] {
		language = "en" // Fallback to English for unsupported languages
	}

	// Create new user
	user := models.User{
		Username: req.Username,
		Email:    sql.NullString{String: req.Email, Valid: true},
		Role:     role,
		Approved: !approvalRequired, // Auto-approve if approval is not required
		Language: language,
	}

	// Hash password
	if err := user.HashPassword(req.Password); err != nil {
		utils.InternalErrorResponse(c, "Failed to process password")
		return
	}

	// Save user to database
	if err := db.Create(&user).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to create user")
		return
	}

	// Generate email confirmation token
	confirmToken := utils.GenerateRandomString(32)

	// Create email confirmation token record
	confirmTokenRecord := models.EmailConfirmationToken{
		UserID:    user.ID,
		Token:     confirmToken,
		ExpiresAt: time.Now().Add(24 * time.Hour), // 24 hours
	}

	if err := db.Create(&confirmTokenRecord).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to create confirmation token")
		return
	}

	// Send confirmation email
	if err := utils.SendEmailConfirmationEmail(user.Email.String, user.Username, confirmToken, user.Language); err != nil {
		// Log error but don't fail registration - user can request resend
		utils.InternalErrorResponse(c, "Failed to send confirmation email")
	}

	// Log successful registration
	utils.LogUserAction(c, models.ActionUserRegister, user.ID, models.AuditMetadata{
		"username": user.Username,
		"email":    user.Email.String,
		"role":     user.Role,
	})

	utils.SuccessResponse(c, http.StatusCreated, "User registered successfully. Please check your email to confirm your account.", nil)
}

// Login handles user login
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	db := config.GetDB()

	// Find user by username or email
	var user models.User
	if err := db.Where("username = ?", req.UsernameOrEmail).First(&user).Error; err != nil {
		// If not found by username, try by email
		if err == gorm.ErrRecordNotFound {
			if err := db.Where("email = ?", req.UsernameOrEmail).First(&user).Error; err != nil {
				if err == gorm.ErrRecordNotFound {
					utils.UnauthorizedResponse(c, "Invalid credentials")
					return
				}
				utils.InternalErrorResponse(c, "Database error")
				return
			}
		} else {
			utils.InternalErrorResponse(c, "Database error")
			return
		}
	}

	// Check password
	if !user.CheckPassword(req.Password) {
		utils.UnauthorizedResponse(c, "Invalid credentials")
		return
	}

	// Check if email is confirmed
	if !user.EmailConfirmed {
		utils.UnauthorizedResponse(c, "Please confirm your email address before logging in")
		return
	}

	// Check if user is approved
	if !user.Approved {
		utils.UnauthorizedResponse(c, "Your account is registered but awaiting approval from a moderator/admin. Please check back later.")
		return
	}

	// Check if user is banned
	if user.Banned {
		utils.UnauthorizedResponse(c, "Your account has been banned. Please contact an administrator.")
		return
	}

	// Check if 2FA is enabled
	if user.TwoFactorEnabled {
		// Return a response indicating 2FA verification is needed
		twoFactorResponse := struct {
			RequiresTwoFactor bool   `json:"requires_two_factor"`
			UserID            string `json:"user_id"`
			Username          string `json:"username"`
		}{
			RequiresTwoFactor: true,
			UserID:            user.ID.String(),
			Username:          user.Username,
		}
		utils.SuccessResponse(c, http.StatusOK, "Two-factor authentication required", twoFactorResponse)
		return
	}

	// Generate access token
	accessToken, err := utils.GenerateAccessToken(user.ID.String(), user.Username, user.Role)
	if err != nil {
		utils.InternalErrorResponse(c, "Failed to generate access token")
		return
	}

	// Generate UUID for the refresh token record
	tokenID := uuid.New()

	// Generate the refresh token with the predetermined ID
	refreshToken, err := utils.GenerateRefreshToken(tokenID.String(), user.ID.String())
	if err != nil {
		utils.InternalErrorResponse(c, "Failed to generate refresh token")
		return
	}

	// Create refresh token record with the token already set
	refreshTokenRecord := models.RefreshToken{
		ID:        tokenID,
		UserID:    user.ID,
		Token:     refreshToken,
		ExpiresAt: time.Now().Add(utils.RefreshTokenExpiry),
	}

	if err := db.Create(&refreshTokenRecord).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to create refresh token")
		return
	}

	response := AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User: UserInfo{
			ID:                        user.ID.String(),
			Username:                  user.Username,
			Email:                     user.Email.String,
			Role:                      user.Role,
			TwoFactorEnabled:          user.TwoFactorEnabled,
			DisplayName:               user.DisplayName,
			ProfilePictureURL:         generateProfilePictureURL(user.ID.String(), user.UpdatedAt.Format("2006-01-02T15:04:05Z07:00")),
			HasProfilePicture:         len(user.ProfilePicture) > 0,
			EmailNotifications:        user.EmailNotifications,
			StationEmailNotifications: user.StationEmailNotifications,
		},
	}

	// Log successful login
	utils.LogUserAction(c, models.ActionUserLogin, user.ID, models.AuditMetadata{
		"username": user.Username,
	})

	utils.SuccessResponse(c, http.StatusOK, "Login successful", response)
}

// RefreshTokens handles refresh token validation and new token generation
func RefreshTokens(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	db := config.GetDB()

	// Validate refresh token
	claims, err := utils.ValidateRefreshToken(req.RefreshToken)
	if err != nil {
		utils.UnauthorizedResponse(c, "Invalid refresh token")
		return
	}

	// Find refresh token in database
	var refreshTokenRecord models.RefreshToken
	if err := db.Where("id = ? AND token = ?", claims.TokenID, req.RefreshToken).First(&refreshTokenRecord).Error; err != nil {
		utils.UnauthorizedResponse(c, "Invalid refresh token")
		return
	}

	// Check if token is expired
	if refreshTokenRecord.IsExpired() {
		db.Delete(&refreshTokenRecord)
		utils.UnauthorizedResponse(c, "Refresh token expired")
		return
	}

	// Get user information
	var user models.User
	if err := db.First(&user, refreshTokenRecord.UserID).Error; err != nil {
		utils.InternalErrorResponse(c, "User not found")
		return
	}

	// Generate new access token
	accessToken, err := utils.GenerateAccessToken(user.ID.String(), user.Username, user.Role)
	if err != nil {
		utils.InternalErrorResponse(c, "Failed to generate access token")
		return
	}

	// Delete old refresh token and create new one (token rotation)
	db.Delete(&refreshTokenRecord)

	// Generate UUID for the new refresh token record
	newTokenID := uuid.New()

	// Generate the refresh token with the predetermined ID
	newRefreshToken, err := utils.GenerateRefreshToken(newTokenID.String(), user.ID.String())
	if err != nil {
		utils.InternalErrorResponse(c, "Failed to generate refresh token")
		return
	}

	// Create the refresh token record with the token already set
	newRefreshTokenRecord := models.RefreshToken{
		ID:        newTokenID,
		UserID:    user.ID,
		Token:     newRefreshToken,
		ExpiresAt: time.Now().Add(utils.RefreshTokenExpiry),
	}

	if err := db.Create(&newRefreshTokenRecord).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to create refresh token")
		return
	}

	response := AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken,
		User: UserInfo{
			ID:                        user.ID.String(),
			Username:                  user.Username,
			Email:                     user.Email.String,
			Role:                      user.Role,
			TwoFactorEnabled:          user.TwoFactorEnabled,
			DisplayName:               user.DisplayName,
			ProfilePictureURL:         generateProfilePictureURL(user.ID.String(), user.UpdatedAt.Format("2006-01-02T15:04:05Z07:00")),
			HasProfilePicture:         len(user.ProfilePicture) > 0,
			EmailNotifications:        user.EmailNotifications,
			StationEmailNotifications: user.StationEmailNotifications,
		},
	}

	utils.SuccessResponse(c, http.StatusOK, "Tokens refreshed successfully", response)
}

// Logout handles user logout by invalidating refresh token
func Logout(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	db := config.GetDB()

	// Validate refresh token
	claims, err := utils.ValidateRefreshToken(req.RefreshToken)
	if err != nil {
		// Even if token is invalid, return success for security
		utils.SuccessResponse(c, http.StatusOK, "Logged out successfully", nil)
		return
	}

	// Delete refresh token from database
	db.Where("id = ? AND token = ?", claims.TokenID, req.RefreshToken).Delete(&models.RefreshToken{})

	// Get user information for logging
	var user models.User
	if err := db.Where("id = ?", claims.UserID).First(&user).Error; err == nil {
		// Set user ID in context for audit logging
		c.Set("user_id", user.ID.String())
		// Log logout action with user information
		utils.LogUserAction(c, models.ActionUserLogout, user.ID, models.AuditMetadata{
			"username": user.Username,
		})
	} else {
		// Fallback to system action if user lookup fails
		utils.LogSystemAction(c, models.ActionUserLogout, models.AuditMetadata{})
	}

	utils.SuccessResponse(c, http.StatusOK, "Logged out successfully", nil)
}

// UpdateProfileRequest represents the request body for updating user profile
type UpdateProfileRequest struct {
	Email                     string `json:"email,omitempty"`
	Password                  string `json:"password,omitempty"`
	DisplayName               string `json:"display_name,omitempty"`
	EmailNotifications        *bool  `json:"email_notifications,omitempty"`
	StationEmailNotifications *bool  `json:"station_email_notifications,omitempty"`
	Language                  string `json:"language,omitempty"`
}

// UpdateProfile handles updating current user profile
func UpdateProfile(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	// Validate email if provided
	if req.Email != "" {
		if !utils.IsValidEmail(req.Email) {
			utils.ValidationErrorResponse(c, "Invalid email format")
			return
		}
	}

	// Validate password if provided
	if req.Password != "" && len(req.Password) < 6 {
		utils.ValidationErrorResponse(c, "Password must be at least 6 characters long")
		return
	}

	db := config.GetDB()

	var user models.User
	if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "User not found")
			return
		}
		utils.InternalErrorResponse(c, "Database error")
		return
	}

	// Handle email change if provided
	if req.Email != "" {
		// Check if the new email is different from current email
		currentEmail := ""
		if user.Email.Valid {
			currentEmail = user.Email.String
		}

		if req.Email == currentEmail {
			utils.ValidationErrorResponse(c, "New email is the same as current email")
			return
		}

		// Check if new email is already taken by another user
		var existingUser models.User
		if err := db.Where("email = ? AND id != ?", req.Email, userID).First(&existingUser).Error; err == nil {
			utils.ValidationErrorResponse(c, "Email is already in use by another account")
			return
		}

		// Check if there's already a pending email change token
		var pendingToken models.EmailChangeToken
		if err := db.Where("user_id = ? AND used = ?", userID, false).First(&pendingToken).Error; err == nil {
			utils.ValidationErrorResponse(c, "You already have a pending email change request. Please complete or wait for it to expire before requesting another change.")
			return
		}

		// Check if user recently changed email (within last 30 minutes)
		thirtyMinutesAgo := time.Now().Add(-30 * time.Minute)
		var recentChange models.EmailChangeToken
		if err := db.Where("user_id = ? AND used = ? AND updated_at > ?", userID, true, thirtyMinutesAgo).First(&recentChange).Error; err == nil {
			utils.ValidationErrorResponse(c, "You can only change your email once every 30 minutes. Please wait before requesting another change.")
			return
		}

		// Invalidate any existing email change tokens for this user
		db.Where("user_id = ? AND used = ?", userID, false).Delete(&models.EmailChangeToken{})

		// Generate email change token
		changeToken := utils.GenerateRandomString(32)

		// Parse userID to UUID
		userUUID, err := uuid.Parse(userID)
		if err != nil {
			utils.InternalErrorResponse(c, "Invalid user ID")
			return
		}

		// Create email change token record
		changeTokenRecord := models.EmailChangeToken{
			UserID:    userUUID,
			NewEmail:  req.Email,
			Token:     changeToken,
			ExpiresAt: time.Now().Add(24 * time.Hour), // 24 hours
		}

		if err := db.Create(&changeTokenRecord).Error; err != nil {
			utils.InternalErrorResponse(c, "Failed to create email change token")
			return
		}

		// Send confirmation email to the NEW email address
		if err := utils.SendEmailChangeConfirmationEmail(req.Email, user.Username, req.Email, changeToken, user.Language); err != nil {
			utils.InternalErrorResponse(c, "Failed to send confirmation email")
			return
		}

		// Log email change request
		utils.LogUserAction(c, models.ActionUserEmailChange, user.ID, models.AuditMetadata{
			"old_email": currentEmail,
			"new_email": req.Email,
		})

		utils.SuccessResponse(c, http.StatusOK, "Email change confirmation sent. Please check your new email address to confirm the change.", nil)
		return
	}

	// Update password if provided
	if req.Password != "" {
		if err := user.HashPassword(req.Password); err != nil {
			utils.InternalErrorResponse(c, "Failed to process password")
			return
		}
		// Log password change
		utils.LogUserAction(c, models.ActionUserPasswordChange, user.ID, models.AuditMetadata{})
	}

	// Update display name if provided
	if req.DisplayName != "" {
		// Basic validation for display name
		if len(req.DisplayName) > 100 {
			utils.ValidationErrorResponse(c, "Display name must be 100 characters or less")
			return
		}
		oldDisplayName := user.DisplayName
		user.DisplayName = req.DisplayName
		// Log display name change
		utils.LogUserAction(c, models.ActionUserDisplayNameChange, user.ID, models.AuditMetadata{
			"old_display_name": oldDisplayName,
			"new_display_name": req.DisplayName,
		})
	}

	// Update email notifications preference if provided
	if req.EmailNotifications != nil {
		user.EmailNotifications = *req.EmailNotifications
	}

	// Update station email notifications preference if provided
	if req.StationEmailNotifications != nil {
		user.StationEmailNotifications = *req.StationEmailNotifications
	}

	// Update language preference if provided
	if req.Language != "" {
		// Basic validation for language code (should be 2-10 characters)
		if len(req.Language) < 2 || len(req.Language) > 10 {
			utils.ValidationErrorResponse(c, "Invalid language code")
			return
		}
		user.Language = req.Language
	}

	// Save changes if password, display name, email notifications, or language was updated
	if req.Password != "" || req.DisplayName != "" || req.EmailNotifications != nil || req.StationEmailNotifications != nil || req.Language != "" {
		if err := db.Save(&user).Error; err != nil {
			utils.InternalErrorResponse(c, "Failed to update profile")
			return
		}
	}

	utils.SuccessResponse(c, http.StatusOK, "Profile updated successfully", nil)
}

// GetProfile handles getting current user profile
func GetProfile(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	db := config.GetDB()

	var user models.User
	if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "User not found")
			return
		}
		utils.InternalErrorResponse(c, "Database error")
		return
	}

	userInfo := UserInfo{
		ID:                        user.ID.String(),
		Username:                  user.Username,
		Email:                     user.Email.String,
		Role:                      user.Role,
		TwoFactorEnabled:          user.TwoFactorEnabled,
		DisplayName:               user.DisplayName,
		ProfilePictureURL:         generateProfilePictureURL(user.ID.String(), user.UpdatedAt.Format("2006-01-02T15:04:05Z07:00")),
		HasProfilePicture:         len(user.ProfilePicture) > 0,
		EmailNotifications:        user.EmailNotifications,
		StationEmailNotifications: user.StationEmailNotifications,
		Language:                  user.Language,
	}

	utils.SuccessResponse(c, http.StatusOK, "Profile retrieved successfully", userInfo)
}

// UploadProfilePicture handles uploading a profile picture for the current user
func UploadProfilePicture(c *gin.Context) {
	// TODO: Consider implementing rate limiting to prevent abuse
	// Example: Allow max 10 uploads per user per hour

	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	// Get the uploaded file
	file, err := c.FormFile("picture")
	if err != nil {
		utils.ValidationErrorResponse(c, "No picture file provided")
		return
	}

	// Validate file size (max 5MB - reasonable for profile pictures)
	const maxSize = 5 * 1024 * 1024 // 5MB
	if file.Size > maxSize {
		utils.ValidationErrorResponse(c, fmt.Sprintf("Picture file too large (%d bytes). Maximum size is 5MB", file.Size))
		return
	}

	// Additional safety check - reject extremely small files (likely not real images)
	const minSize = 100 // 100 bytes minimum
	if file.Size < minSize {
		utils.ValidationErrorResponse(c, "Picture file too small. Please upload a valid image")
		return
	}

	// Validate file type from Content-Type header
	contentType := file.Header.Get("Content-Type")
	allowedTypes := map[string]bool{
		"image/jpeg": true,
		"image/jpg":  true,
		"image/png":  true,
		"image/gif":  true,
		"image/webp": true,
	}

	if !allowedTypes[contentType] {
		utils.ValidationErrorResponse(c, fmt.Sprintf("Invalid file type: %s. Only JPEG, PNG, GIF, and WebP images are allowed", contentType))
		return
	}

	// Read file data
	fileData, err := file.Open()
	if err != nil {
		utils.InternalErrorResponse(c, "Failed to read file")
		return
	}
	defer fileData.Close()

	data := make([]byte, file.Size)
	_, err = fileData.Read(data)
	if err != nil {
		utils.InternalErrorResponse(c, "Failed to read file data")
		return
	}

	// Validate file content by checking magic numbers (file signatures)
	if !isValidImageFile(data, contentType) {
		utils.ValidationErrorResponse(c, "Invalid image file. The file content doesn't match the declared type")
		return
	}

	db := config.GetDB()

	// Get current user
	var user models.User
	if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to find user")
		return
	}

	// Update user with picture data
	// Note: Storing images in database as BLOBs. For production with many users,
	// consider using cloud storage (S3, CloudFlare R2) with database storing only URLs
	user.ProfilePicture = data
	user.ProfilePictureType = contentType

	if err := db.Save(&user).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to update profile picture")
		return
	}

	// Log profile picture change
	utils.LogUserAction(c, models.ActionUserProfilePicture, user.ID, models.AuditMetadata{})

	response := map[string]interface{}{
		"profile_picture_url": generateProfilePictureURL(user.ID.String(), user.UpdatedAt.Format("2006-01-02T15:04:05Z07:00")),
		"has_profile_picture": true,
	}

	utils.SuccessResponse(c, http.StatusOK, "Profile picture uploaded successfully", response)
}

// GetProfilePicture serves user profile pictures from database BLOB
func GetProfilePicture(c *gin.Context) {
	userIDStr := c.Param("id")
	if userIDStr == "" {
		utils.ValidationErrorResponse(c, "Invalid user ID")
		return
	}

	// Parse user ID
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.ValidationErrorResponse(c, "Invalid user ID format")
		return
	}

	db := config.GetDB()
	var user models.User

	if err := db.First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "User not found")
			return
		}
		utils.InternalErrorResponse(c, "Failed to fetch user")
		return
	}

	// Check if user has a profile picture
	if len(user.ProfilePicture) == 0 {
		utils.NotFoundResponse(c, "No profile picture available")
		return
	}

	// Set appropriate content type
	contentType := user.ProfilePictureType
	if contentType == "" {
		contentType = "image/jpeg" // default
	}

	c.Header("Content-Type", contentType)
	c.Header("Cache-Control", "public, max-age=86400")
	c.Header("ETag", fmt.Sprintf(`"%x"`, user.UpdatedAt.Unix()))
	c.Data(http.StatusOK, contentType, user.ProfilePicture)
}

// DeleteProfilePicture handles removing a profile picture for the current user
func DeleteProfilePicture(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	db := config.GetDB()

	// Get current user
	var user models.User
	if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to find user")
		return
	}

	// Check if user has a profile picture to delete
	if len(user.ProfilePicture) == 0 {
		utils.ValidationErrorResponse(c, "No profile picture to delete")
		return
	}

	// Clear profile picture data
	user.ProfilePicture = nil
	user.ProfilePictureType = ""

	if err := db.Save(&user).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to delete profile picture")
		return
	}

	// Log profile picture deletion
	utils.LogUserAction(c, models.ActionUserProfilePicture, user.ID, models.AuditMetadata{})

	response := map[string]interface{}{
		"profile_picture_url": "",
		"has_profile_picture": false,
	}

	utils.SuccessResponse(c, http.StatusOK, "Profile picture deleted successfully", response)
}

// ForgotPasswordRequest represents the request body for forgot password
type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// ResetPasswordRequest represents the request body for reset password
type ResetPasswordRequest struct {
	Token    string `json:"token" binding:"required"`
	Password string `json:"password" binding:"required,min=6"`
}

// ForgotPassword handles password reset request
func ForgotPassword(c *gin.Context) {
	var req ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	db := config.GetDB()

	// Find user by email
	var user models.User
	if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Don't reveal if email exists or not for security
			utils.SuccessResponse(c, http.StatusOK, "If an account with that email exists, a password reset link has been sent.", nil)
			return
		}
		utils.InternalErrorResponse(c, "Database error")
		return
	}

	// Check if user has email set
	if !user.Email.Valid || user.Email.String == "" {
		// Don't reveal if email exists or not for security
		utils.SuccessResponse(c, http.StatusOK, "If an account with that email exists, a password reset link has been sent.", nil)
		return
	}

	// Invalidate any existing reset tokens for this user
	db.Where("user_id = ? AND used = ?", user.ID, false).Delete(&models.PasswordResetToken{})

	// Generate reset token
	resetToken := utils.GenerateRandomString(32)

	// Create password reset token record
	resetTokenRecord := models.PasswordResetToken{
		UserID:    user.ID,
		Token:     resetToken,
		ExpiresAt: time.Now().Add(time.Hour), // 1 hour expiry
	}

	if err := db.Create(&resetTokenRecord).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to create reset token")
		return
	}

	// Send password reset email
	if err := utils.SendPasswordResetEmail(user.Email.String, user.Username, resetToken, user.Language); err != nil {
		// Log error but don't fail the request
		// In production, you might want to retry or alert admins
		utils.InternalErrorResponse(c, "Failed to send reset email")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "If an account with that email exists, a password reset link has been sent.", nil)
}

// ResetPassword handles password reset with token
func ResetPassword(c *gin.Context) {
	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	db := config.GetDB()

	// Find reset token
	var resetTokenRecord models.PasswordResetToken
	if err := db.Where("token = ? AND used = ?", req.Token, false).First(&resetTokenRecord).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.ValidationErrorResponse(c, "Invalid or expired reset token")
			return
		}
		utils.InternalErrorResponse(c, "Database error")
		return
	}

	// Check if token is expired
	if resetTokenRecord.IsExpired() {
		db.Delete(&resetTokenRecord)
		utils.ValidationErrorResponse(c, "Reset token has expired")
		return
	}

	// Get user
	var user models.User
	if err := db.First(&user, resetTokenRecord.UserID).Error; err != nil {
		utils.InternalErrorResponse(c, "User not found")
		return
	}

	// Hash new password
	if err := user.HashPassword(req.Password); err != nil {
		utils.InternalErrorResponse(c, "Failed to process password")
		return
	}

	// Update user password
	if err := db.Save(&user).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to update password")
		return
	}

	// Mark token as used and clean up
	resetTokenRecord.Used = true
	db.Save(&resetTokenRecord)

	utils.SuccessResponse(c, http.StatusOK, "Password reset successfully", nil)
}

// ConfirmEmailRequest represents the request body for email confirmation
type ConfirmEmailRequest struct {
	Token string `json:"token" binding:"required"`
}

// ConfirmEmail handles email confirmation with token
func ConfirmEmail(c *gin.Context) {
	var req ConfirmEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	db := config.GetDB()

	// Find confirmation token
	var confirmTokenRecord models.EmailConfirmationToken
	if err := db.Where("token = ? AND used = ?", req.Token, false).First(&confirmTokenRecord).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.ValidationErrorResponse(c, "Invalid or expired confirmation token")
			return
		}
		utils.InternalErrorResponse(c, "Database error")
		return
	}

	// Check if token is expired
	if confirmTokenRecord.IsExpired() {
		utils.ValidationErrorResponse(c, "Confirmation token has expired")
		return
	}

	// Find user
	var user models.User
	if err := db.First(&user, confirmTokenRecord.UserID).Error; err != nil {
		utils.InternalErrorResponse(c, "User not found")
		return
	}

	// Update user email confirmed status
	user.EmailConfirmed = true
	if err := db.Save(&user).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to confirm email")
		return
	}

	// Mark token as used
	confirmTokenRecord.Used = true
	db.Save(&confirmTokenRecord)

	utils.SuccessResponse(c, http.StatusOK, "Email confirmed successfully", nil)
}

// ResendConfirmationRequest represents the request body for resending confirmation
type ResendConfirmationRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// ResendConfirmationEmail handles resending confirmation email
func ResendConfirmationEmail(c *gin.Context) {
	var req ResendConfirmationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	db := config.GetDB()

	// Find user by email
	var user models.User
	if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Don't reveal if email exists or not for security
			utils.SuccessResponse(c, http.StatusOK, "If an account with that email exists and is not confirmed, a confirmation email has been sent.", nil)
			return
		}
		utils.InternalErrorResponse(c, "Database error")
		return
	}

	// Check if email is already confirmed
	if user.EmailConfirmed {
		utils.SuccessResponse(c, http.StatusOK, "Email is already confirmed", nil)
		return
	}

	// Check if we recently sent a confirmation email (within last 5 minutes)
	var recentToken models.EmailConfirmationToken
	fiveMinutesAgo := time.Now().Add(-5 * time.Minute)
	if err := db.Where("user_id = ? AND created_at > ? AND used = ?", user.ID, fiveMinutesAgo, false).First(&recentToken).Error; err == nil {
		utils.ValidationErrorResponse(c, "A confirmation email was recently sent. Please wait 5 minutes before requesting another.")
		return
	}

	// Invalidate any existing unused confirmation tokens for this user
	db.Where("user_id = ? AND used = ?", user.ID, false).Delete(&models.EmailConfirmationToken{})

	// Generate new confirmation token
	confirmToken := utils.GenerateRandomString(32)

	// Create email confirmation token record
	confirmTokenRecord := models.EmailConfirmationToken{
		UserID:    user.ID,
		Token:     confirmToken,
		ExpiresAt: time.Now().Add(24 * time.Hour), // 24 hours
	}

	if err := db.Create(&confirmTokenRecord).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to create confirmation token")
		return
	}

	// Send confirmation email
	if err := utils.SendEmailConfirmationEmail(user.Email.String, user.Username, confirmToken, user.Language); err != nil {
		utils.InternalErrorResponse(c, "Failed to send confirmation email")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Confirmation email sent successfully", nil)
}

// ConfirmEmailChangeRequest represents the request body for email change confirmation
type ConfirmEmailChangeRequest struct {
	Token string `json:"token" binding:"required"`
}

// ConfirmEmailChange handles email change confirmation with token
func ConfirmEmailChange(c *gin.Context) {
	var req ConfirmEmailChangeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	db := config.GetDB()

	// Find email change token
	var changeTokenRecord models.EmailChangeToken
	if err := db.Where("token = ? AND used = ?", req.Token, false).First(&changeTokenRecord).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.ValidationErrorResponse(c, "Invalid or expired email change token")
			return
		}
		utils.InternalErrorResponse(c, "Database error")
		return
	}

	// Check if token is expired
	if changeTokenRecord.IsExpired() {
		utils.ValidationErrorResponse(c, "Email change token has expired")
		return
	}

	// Find user
	var user models.User
	if err := db.First(&user, changeTokenRecord.UserID).Error; err != nil {
		utils.InternalErrorResponse(c, "User not found")
		return
	}

	// Check if the new email is still available
	var existingUser models.User
	if err := db.Where("email = ? AND id != ?", changeTokenRecord.NewEmail, user.ID).First(&existingUser).Error; err == nil {
		utils.ValidationErrorResponse(c, "The new email address is no longer available")
		return
	}

	// Update user email
	user.Email = sql.NullString{String: changeTokenRecord.NewEmail, Valid: true}

	// Save changes
	if err := db.Save(&user).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to update email")
		return
	}

	// Mark token as used
	changeTokenRecord.Used = true
	db.Save(&changeTokenRecord)

	utils.SuccessResponse(c, http.StatusOK, "Email changed successfully", nil)
}

// generateProfilePictureURL creates a URL for accessing user profile pictures
func generateProfilePictureURL(userID string, updatedAt string) string {
	return fmt.Sprintf("/api/users/%s/profile-picture", userID)
}

// isValidImageFile validates file content using magic numbers (file signatures)
func isValidImageFile(data []byte, contentType string) bool {
	if len(data) < 12 {
		return false
	}

	switch contentType {
	case "image/jpeg", "image/jpg":
		// JPEG files start with FF D8 FF
		return len(data) >= 3 && data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF
	case "image/png":
		// PNG files start with 89 50 4E 47 0D 0A 1A 0A
		return len(data) >= 8 &&
			data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47 &&
			data[4] == 0x0D && data[5] == 0x0A && data[6] == 0x1A && data[7] == 0x0A
	case "image/gif":
		// GIF files start with "GIF87a" or "GIF89a"
		return len(data) >= 6 &&
			((string(data[0:6]) == "GIF87a") || (string(data[0:6]) == "GIF89a"))
	case "image/webp":
		// WebP files start with "RIFF" and have "WEBP" at bytes 8-11
		return len(data) >= 12 &&
			string(data[0:4]) == "RIFF" && string(data[8:12]) == "WEBP"
	default:
		return false
	}
}
