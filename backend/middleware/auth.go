package middleware

import (
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
