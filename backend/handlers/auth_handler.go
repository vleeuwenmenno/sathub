package handlers

import (
	"net/http"
	"satdump-ui-backend/config"
	"satdump-ui-backend/middleware"
	"satdump-ui-backend/models"
	"satdump-ui-backend/utils"
	"strings"
	"time"

	"database/sql"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// RegisterRequest represents the request body for user registration
type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Email    string `json:"email" binding:"omitempty,email"`
	Password string `json:"password" binding:"required,min=6"`
	Role     string `json:"role" binding:"omitempty"`
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
	ID       uint   `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email,omitempty"`
	Role     string `json:"role"`
}

// Register handles user registration
func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	db := config.GetDB()

	// Check if username already exists
	var existingUser models.User
	if err := db.Where("username = ?", req.Username).First(&existingUser).Error; err == nil {
		utils.ValidationErrorResponse(c, "Username already exists")
		return
	}

	// Check if email already exists (if provided)
	if req.Email != "" {
		if err := db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
			utils.ValidationErrorResponse(c, "Email already exists")
			return
		}
	}

	// Validate and set role
	role := strings.ToLower(req.Role)
	if role == "" {
		role = "user"
	}
	if role != "user" && role != "admin" && role != "moderator" {
		utils.ValidationErrorResponse(c, "Invalid role. Must be 'user', 'moderator', or 'admin'")
		return
	}

	// Create new user
	user := models.User{
		Username: req.Username,
		Role:     role,
	}

	// Set email if provided
	if req.Email != "" {
		user.Email = sql.NullString{String: req.Email, Valid: true}
	} else {
		user.Email = sql.NullString{Valid: false}
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

	// Generate tokens
	accessToken, err := utils.GenerateAccessToken(user.ID, user.Username, user.Role)
	if err != nil {
		utils.InternalErrorResponse(c, "Failed to generate access token")
		return
	}

	// Create refresh token record
	refreshTokenRecord := models.RefreshToken{
		UserID:    user.ID,
		ExpiresAt: time.Now().Add(utils.RefreshTokenExpiry),
	}

	if err := db.Create(&refreshTokenRecord).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to create refresh token")
		return
	}

	refreshToken, err := utils.GenerateRefreshToken(refreshTokenRecord.ID, user.ID)
	if err != nil {
		utils.InternalErrorResponse(c, "Failed to generate refresh token")
		return
	}

	// Update refresh token record with the actual token
	refreshTokenRecord.Token = refreshToken
	db.Save(&refreshTokenRecord)

	response := AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User: UserInfo{
			ID:       user.ID,
			Username: user.Username,
			Email:    user.Email.String,
			Role:     user.Role,
		},
	}

	utils.SuccessResponse(c, http.StatusCreated, "User registered successfully", response)
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

	// Generate access token
	accessToken, err := utils.GenerateAccessToken(user.ID, user.Username, user.Role)
	if err != nil {
		utils.InternalErrorResponse(c, "Failed to generate access token")
		return
	}

	// Create refresh token record
	refreshTokenRecord := models.RefreshToken{
		UserID:    user.ID,
		ExpiresAt: time.Now().Add(utils.RefreshTokenExpiry),
	}

	if err := db.Create(&refreshTokenRecord).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to create refresh token")
		return
	}

	refreshToken, err := utils.GenerateRefreshToken(refreshTokenRecord.ID, user.ID)
	if err != nil {
		utils.InternalErrorResponse(c, "Failed to generate refresh token")
		return
	}

	// Update refresh token record with the actual token
	refreshTokenRecord.Token = refreshToken
	db.Save(&refreshTokenRecord)

	response := AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User: UserInfo{
			ID:       user.ID,
			Username: user.Username,
			Email:    user.Email.String,
			Role:     user.Role,
		},
	}

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
	accessToken, err := utils.GenerateAccessToken(user.ID, user.Username, user.Role)
	if err != nil {
		utils.InternalErrorResponse(c, "Failed to generate access token")
		return
	}

	// Delete old refresh token and create new one (token rotation)
	db.Delete(&refreshTokenRecord)

	newRefreshTokenRecord := models.RefreshToken{
		UserID:    user.ID,
		ExpiresAt: time.Now().Add(utils.RefreshTokenExpiry),
	}

	if err := db.Create(&newRefreshTokenRecord).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to create refresh token")
		return
	}

	newRefreshToken, err := utils.GenerateRefreshToken(newRefreshTokenRecord.ID, user.ID)
	if err != nil {
		utils.InternalErrorResponse(c, "Failed to generate refresh token")
		return
	}

	// Update refresh token record with the actual token
	newRefreshTokenRecord.Token = newRefreshToken
	db.Save(&newRefreshTokenRecord)

	response := AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken,
		User: UserInfo{
			ID:       user.ID,
			Username: user.Username,
			Email:    user.Email.String,
			Role:     user.Role,
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

	utils.SuccessResponse(c, http.StatusOK, "Logged out successfully", nil)
}

// UpdateProfileRequest represents the request body for updating user profile
type UpdateProfileRequest struct {
	Email    string `json:"email,omitempty"`
	Password string `json:"password,omitempty"`
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
	if err := db.First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "User not found")
			return
		}
		utils.InternalErrorResponse(c, "Database error")
		return
	}

	// Update email if provided
	if req.Email != "" {
		user.Email = sql.NullString{String: req.Email, Valid: true}
	}

	// Update password if provided
	if req.Password != "" {
		if err := user.HashPassword(req.Password); err != nil {
			utils.InternalErrorResponse(c, "Failed to process password")
			return
		}
	}

	// Save changes
	if err := db.Save(&user).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to update profile")
		return
	}

	userInfo := UserInfo{
		ID:       user.ID,
		Username: user.Username,
		Email:    user.Email.String,
		Role:     user.Role,
	}

	utils.SuccessResponse(c, http.StatusOK, "Profile updated successfully", userInfo)
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
	if err := db.First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "User not found")
			return
		}
		utils.InternalErrorResponse(c, "Database error")
		return
	}

	userInfo := UserInfo{
		ID:       user.ID,
		Username: user.Username,
		Email:    user.Email.String,
		Role:     user.Role,
	}

	utils.SuccessResponse(c, http.StatusOK, "Profile retrieved successfully", userInfo)
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
	if err := utils.SendPasswordResetEmail(user.Email.String, user.Username, resetToken); err != nil {
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
