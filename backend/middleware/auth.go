package middleware

import (
	"satdump-ui-backend/config"
	"satdump-ui-backend/models"
	"satdump-ui-backend/utils"
	"strings"

	"github.com/gin-gonic/gin"
)

// AuthRequired middleware validates JWT access tokens
func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			utils.UnauthorizedResponse(c, "Authorization header required")
			c.Abort()
			return
		}

		// Check if the header starts with "Bearer "
		tokenParts := strings.SplitN(authHeader, " ", 2)
		if len(tokenParts) != 2 || strings.ToLower(tokenParts[0]) != "bearer" {
			utils.UnauthorizedResponse(c, "Invalid authorization header format")
			c.Abort()
			return
		}

		token := tokenParts[1]
		claims, err := utils.ValidateAccessToken(token)
		if err != nil {
			utils.UnauthorizedResponse(c, "Invalid or expired token")
			c.Abort()
			return
		}

		// Check if user is banned
		db := config.GetDB()
		var user models.User
		if err := db.Select("banned").First(&user, claims.UserID).Error; err != nil {
			utils.UnauthorizedResponse(c, "User not found")
			c.Abort()
			return
		}

		if user.Banned {
			utils.UnauthorizedResponse(c, "Your account has been banned")
			c.Abort()
			return
		}

		// Store user information in context for use in handlers
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)
		c.Set("claims", claims)

		c.Next()
	}
}

// RequireRole middleware checks if the user has the required role
func RequireRole(requiredRole string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists {
			utils.ForbiddenResponse(c, "User role not found")
			c.Abort()
			return
		}

		userRole, ok := role.(string)
		if !ok {
			utils.ForbiddenResponse(c, "Invalid user role")
			c.Abort()
			return
		}

		// Check if user has the required role or is an admin (admin can access everything)
		if userRole != requiredRole && userRole != "admin" {
			utils.ForbiddenResponse(c, "Insufficient permissions")
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireAnyRole middleware checks if the user has any of the specified roles
func RequireAnyRole(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists {
			utils.ForbiddenResponse(c, "User role not found")
			c.Abort()
			return
		}

		userRole, ok := role.(string)
		if !ok {
			utils.ForbiddenResponse(c, "Invalid user role")
			c.Abort()
			return
		}

		// Admin can access everything
		if userRole == "admin" {
			c.Next()
			return
		}

		// Check if user has any of the allowed roles
		for _, allowedRole := range allowedRoles {
			if userRole == allowedRole {
				c.Next()
				return
			}
		}

		utils.ForbiddenResponse(c, "Insufficient permissions")
		c.Abort()
	}
}

// OptionalAuth middleware validates JWT tokens but doesn't require them
func OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		tokenParts := strings.SplitN(authHeader, " ", 2)
		if len(tokenParts) != 2 || strings.ToLower(tokenParts[0]) != "bearer" {
			c.Next()
			return
		}

		token := tokenParts[1]
		claims, err := utils.ValidateAccessToken(token)
		if err != nil {
			c.Next()
			return
		}

		// Check if user is banned
		db := config.GetDB()
		var user models.User
		if err := db.Select("banned").First(&user, claims.UserID).Error; err != nil {
			// If user not found, treat as unauthenticated
			c.Next()
			return
		}

		if user.Banned {
			// If user is banned, treat as unauthenticated
			c.Next()
			return
		}

		// Store user information in context
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)
		c.Set("claims", claims)

		c.Next()
	}
}

// GetCurrentUserID extracts the current user ID from the context
func GetCurrentUserID(c *gin.Context) (uint, bool) {
	userID, exists := c.Get("user_id")
	if !exists {
		return 0, false
	}

	id, ok := userID.(uint)
	return id, ok
}

// GetCurrentUsername extracts the current username from the context
func GetCurrentUsername(c *gin.Context) (string, bool) {
	username, exists := c.Get("username")
	if !exists {
		return "", false
	}

	name, ok := username.(string)
	return name, ok
}

// GetCurrentUserRole extracts the current user role from the context
func GetCurrentUserRole(c *gin.Context) (string, bool) {
	role, exists := c.Get("role")
	if !exists {
		return "", false
	}

	userRole, ok := role.(string)
	return userRole, ok
}

// StationTokenAuth middleware validates station tokens
func StationTokenAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			utils.UnauthorizedResponse(c, "Authorization header required")
			c.Abort()
			return
		}

		// Check if the header starts with "Station "
		tokenParts := strings.SplitN(authHeader, " ", 2)
		if len(tokenParts) != 2 || strings.ToLower(tokenParts[0]) != "station" {
			utils.UnauthorizedResponse(c, "Invalid authorization header format")
			c.Abort()
			return
		}

		token := tokenParts[1]

		// Validate station token
		db := config.GetDB()
		var station models.Station
		if err := db.Where("token = ?", token).First(&station).Error; err != nil {
			utils.UnauthorizedResponse(c, "Invalid station token")
			c.Abort()
			return
		}

		// Store station information in context
		c.Set("station_id", station.ID)
		c.Set("station_user_id", station.UserID)

		c.Next()
	}
}

// GetCurrentStationID extracts the current station ID from the context
func GetCurrentStationID(c *gin.Context) (string, bool) {
	stationID, exists := c.Get("station_id")
	if !exists {
		return "", false
	}

	id, ok := stationID.(string)
	return id, ok
}

// GetCurrentStationUserID extracts the user ID of the current station from the context
func GetCurrentStationUserID(c *gin.Context) (uint, bool) {
	userID, exists := c.Get("station_user_id")
	if !exists {
		return 0, false
	}

	id, ok := userID.(uint)
	return id, ok
}

// TwoFactorRequired middleware validates that 2FA verification is in progress
// This is used for the 2FA verification endpoint
func TwoFactorRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			UserID uint   `json:"user_id" binding:"required"`
			Code   string `json:"code" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			utils.ValidationErrorResponse(c, "Invalid request format for 2FA verification")
			c.Abort()
			return
		}

		// Verify the user exists and has 2FA enabled
		db := config.GetDB()
		var user models.User
		if err := db.First(&user, req.UserID).Error; err != nil {
			utils.UnauthorizedResponse(c, "Invalid user session")
			c.Abort()
			return
		}

		if !user.TwoFactorEnabled {
			utils.UnauthorizedResponse(c, "Two-factor authentication not enabled")
			c.Abort()
			return
		}

		// Store user ID and code in context for the handler
		c.Set("two_factor_user_id", req.UserID)
		c.Set("two_factor_code", req.Code)

		c.Next()
	}
}
