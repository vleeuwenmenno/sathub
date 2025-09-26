package handlers

import (
	"net/http"
	"satdump-ui-backend/config"
	"satdump-ui-backend/middleware"
	"satdump-ui-backend/models"
	"satdump-ui-backend/utils"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pquerna/otp/totp"
	"gorm.io/gorm"
)

// TwoFactorSetupResponse represents the response for 2FA setup
type TwoFactorSetupResponse struct {
	Secret      string `json:"secret"`
	QRCodeURL   string `json:"qr_code_url"`
	Issuer      string `json:"issuer"`
	AccountName string `json:"account_name"`
}

// TwoFactorDisableRequest represents the request body for disabling 2FA
type TwoFactorDisableRequest struct {
	Code string `json:"code" binding:"required,len=6"`
}

// EnableTwoFactor generates a TOTP secret and returns QR code data
func EnableTwoFactor(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	db := config.GetDB()

	var user models.User
	if err := db.First(&user, userID).Error; err != nil {
		utils.InternalErrorResponse(c, "User not found")
		return
	}

	// Check if 2FA is already enabled
	if user.TwoFactorEnabled {
		utils.ValidationErrorResponse(c, "Two-factor authentication is already enabled")
		return
	}

	// Generate TOTP key
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "SatHub",
		AccountName: user.Username,
		SecretSize:  32,
	})
	if err != nil {
		utils.InternalErrorResponse(c, "Failed to generate 2FA secret")
		return
	}

	// Encrypt the secret before storing
	encryptedSecret, err := utils.EncryptSecret(key.Secret())
	if err != nil {
		utils.InternalErrorResponse(c, "Failed to encrypt 2FA secret")
		return
	}

	// Store the encrypted secret temporarily (not enabled yet)
	user.TwoFactorSecret = encryptedSecret
	if err := db.Save(&user).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to save 2FA secret")
		return
	}

	response := TwoFactorSetupResponse{
		Secret:      key.Secret(),
		QRCodeURL:   key.URL(),
		Issuer:      "SatHub",
		AccountName: user.Username,
	}

	utils.SuccessResponse(c, http.StatusOK, "2FA setup initiated. Please verify with a code from your authenticator app.", response)
}

// VerifyTwoFactorSetup verifies the 2FA setup and enables it
func VerifyTwoFactorSetup(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	var req struct {
		Code string `json:"code" binding:"required,len=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	db := config.GetDB()

	var user models.User
	if err := db.First(&user, userID).Error; err != nil {
		utils.InternalErrorResponse(c, "User not found")
		return
	}

	// Check if 2FA is already enabled
	if user.TwoFactorEnabled {
		utils.ValidationErrorResponse(c, "Two-factor authentication is already enabled")
		return
	}

	// Check if secret exists
	if user.TwoFactorSecret == "" {
		utils.ValidationErrorResponse(c, "2FA setup not initiated. Please enable 2FA first.")
		return
	}

	// Decrypt the secret
	decryptedSecret, err := utils.DecryptSecret(user.TwoFactorSecret)
	if err != nil {
		utils.InternalErrorResponse(c, "Failed to decrypt 2FA secret")
		return
	}

	if !totp.Validate(req.Code, decryptedSecret) {
		utils.ValidationErrorResponse(c, "Invalid 2FA code")
		return
	}

	// Enable 2FA
	user.TwoFactorEnabled = true
	if err := db.Save(&user).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to enable 2FA")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Two-factor authentication enabled successfully", nil)
}

// DisableTwoFactor disables 2FA (requires 2FA code verification)
func DisableTwoFactor(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	var req TwoFactorDisableRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	db := config.GetDB()

	var user models.User
	if err := db.First(&user, userID).Error; err != nil {
		utils.InternalErrorResponse(c, "User not found")
		return
	}

	// Check if 2FA is enabled
	if !user.TwoFactorEnabled {
		utils.ValidationErrorResponse(c, "Two-factor authentication is not enabled")
		return
	}

	// Verify the 2FA code before disabling
	decryptedSecret, err := utils.DecryptSecret(user.TwoFactorSecret)
	if err != nil {
		utils.InternalErrorResponse(c, "Failed to decrypt 2FA secret")
		return
	}

	if !totp.Validate(req.Code, decryptedSecret) {
		utils.ValidationErrorResponse(c, "Invalid 2FA code")
		return
	}

	// Generate disable token for email confirmation
	disableToken := utils.GenerateRandomString(32)

	// Create a temporary token record (we'll use the existing email confirmation token model for this)
	disableTokenRecord := models.EmailConfirmationToken{
		UserID:    userID,
		Token:     disableToken,
		ExpiresAt: time.Now().Add(24 * time.Hour), // 24 hours
	}

	if err := db.Create(&disableTokenRecord).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to create disable token")
		return
	}

	// Send confirmation email
	if err := utils.SendTwoFactorDisableEmail(user.Email.String, user.Username, disableToken); err != nil {
		utils.InternalErrorResponse(c, "Failed to send confirmation email")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "2FA disable confirmation sent. Please check your email to complete the process.", nil)
}

// ConfirmDisableTwoFactor confirms 2FA disable via email token
func ConfirmDisableTwoFactor(c *gin.Context) {
	var req struct {
		Token string `json:"token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	db := config.GetDB()

	// Find the disable token
	var disableTokenRecord models.EmailConfirmationToken
	if err := db.Where("token = ? AND used = ?", req.Token, false).First(&disableTokenRecord).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.ValidationErrorResponse(c, "Invalid or expired disable token")
			return
		}
		utils.InternalErrorResponse(c, "Database error")
		return
	}

	// Check if token is expired
	if disableTokenRecord.IsExpired() {
		utils.ValidationErrorResponse(c, "Disable token has expired")
		return
	}

	// Get user
	var user models.User
	if err := db.First(&user, disableTokenRecord.UserID).Error; err != nil {
		utils.InternalErrorResponse(c, "User not found")
		return
	}

	// Check if 2FA is still enabled
	if !user.TwoFactorEnabled {
		utils.ValidationErrorResponse(c, "Two-factor authentication is already disabled")
		return
	}

	// Disable 2FA
	user.TwoFactorEnabled = false
	user.TwoFactorSecret = ""
	if err := db.Save(&user).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to disable 2FA")
		return
	}

	// Mark token as used
	disableTokenRecord.Used = true
	db.Save(&disableTokenRecord)

	utils.SuccessResponse(c, http.StatusOK, "Two-factor authentication disabled successfully", nil)
}

// VerifyTwoFactorCode verifies a 2FA code for login
func VerifyTwoFactorCode(c *gin.Context) {
	// Get user ID and code from context (set by middleware)
	userIDInterface, exists := c.Get("two_factor_user_id")
	if !exists {
		utils.UnauthorizedResponse(c, "Invalid session")
		return
	}

	codeInterface, exists := c.Get("two_factor_code")
	if !exists {
		utils.UnauthorizedResponse(c, "Invalid session")
		return
	}

	userID, ok := userIDInterface.(uint)
	if !ok {
		utils.UnauthorizedResponse(c, "Invalid session")
		return
	}

	code, ok := codeInterface.(string)
	if !ok {
		utils.UnauthorizedResponse(c, "Invalid session")
		return
	}

	db := config.GetDB()

	var user models.User
	if err := db.First(&user, userID).Error; err != nil {
		utils.InternalErrorResponse(c, "User not found")
		return
	}

	// Verify the code
	decryptedSecret, err := utils.DecryptSecret(user.TwoFactorSecret)
	if err != nil {
		utils.InternalErrorResponse(c, "Failed to decrypt 2FA secret")
		return
	}

	if !totp.Validate(code, decryptedSecret) {
		utils.ValidationErrorResponse(c, "Invalid 2FA code")
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
			ID:               user.ID,
			Username:         user.Username,
			Email:            user.Email.String,
			Role:             user.Role,
			TwoFactorEnabled: user.TwoFactorEnabled,
		},
	}

	utils.SuccessResponse(c, http.StatusOK, "Login successful", response)
}

// GetTwoFactorStatus returns the current 2FA status for the user
func GetTwoFactorStatus(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	db := config.GetDB()

	var user models.User
	if err := db.First(&user, userID).Error; err != nil {
		utils.InternalErrorResponse(c, "User not found")
		return
	}

	status := struct {
		Enabled bool `json:"enabled"`
	}{
		Enabled: user.TwoFactorEnabled,
	}

	utils.SuccessResponse(c, http.StatusOK, "2FA status retrieved successfully", status)
}
