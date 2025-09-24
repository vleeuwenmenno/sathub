package utils

import (
	"crypto/rand"
	"encoding/hex"
)

// GenerateRandomString generates a random string of the specified length
func GenerateRandomString(length int) string {
	bytes := make([]byte, length/2+1)
	if _, err := rand.Read(bytes); err != nil {
		// Fallback to a simple string if crypto fails
		return "fallback"
	}
	return hex.EncodeToString(bytes)[:length]
}
