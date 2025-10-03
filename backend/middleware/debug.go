package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// DebugModeOnly middleware ensures that the endpoint is only accessible in debug mode
func DebugModeOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check if we're in debug mode
		if gin.Mode() != gin.DebugMode {
			// Return 404 to obscure the existence of debug endpoints in production
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Endpoint not found",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}
