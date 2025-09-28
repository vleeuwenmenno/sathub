package utils

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// JWT token durations
const (
	AccessTokenExpiry  = 15 * time.Minute
	RefreshTokenExpiry = 7 * 24 * time.Hour
)

// JWT Claims structures
type AccessTokenClaims struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

type RefreshTokenClaims struct {
	TokenID string `json:"token_id"`
	UserID  string `json:"user_id"`
	jwt.RegisteredClaims
}

// GetJWTSecrets returns the JWT secrets from environment variables
func GetJWTSecrets() (accessSecret, refreshSecret string) {
	accessSecret = os.Getenv("JWT_ACCESS_SECRET")
	refreshSecret = os.Getenv("JWT_REFRESH_SECRET")

	// Fallback secrets for development (should use env vars in production)
	if accessSecret == "" {
		accessSecret = "your-super-secret-access-key-change-in-production"
	}
	if refreshSecret == "" {
		refreshSecret = "your-super-secret-refresh-key-change-in-production"
	}

	return accessSecret, refreshSecret
}

// GenerateAccessToken creates a new JWT access token
func GenerateAccessToken(userID string, username, role string) (string, error) {
	accessSecret, _ := GetJWTSecrets()

	claims := AccessTokenClaims{
		UserID:   userID,
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(AccessTokenExpiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(accessSecret))
}

// GenerateRefreshToken creates a new JWT refresh token
func GenerateRefreshToken(tokenID string, userID string) (string, error) {
	_, refreshSecret := GetJWTSecrets()

	claims := RefreshTokenClaims{
		TokenID: tokenID,
		UserID:  userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(RefreshTokenExpiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(refreshSecret))
}

// ValidateAccessToken validates and parses an access token
func ValidateAccessToken(tokenString string) (*AccessTokenClaims, error) {
	accessSecret, _ := GetJWTSecrets()

	token, err := jwt.ParseWithClaims(tokenString, &AccessTokenClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("invalid signing method")
		}
		return []byte(accessSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*AccessTokenClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

// ValidateRefreshToken validates and parses a refresh token
func ValidateRefreshToken(tokenString string) (*RefreshTokenClaims, error) {
	_, refreshSecret := GetJWTSecrets()

	token, err := jwt.ParseWithClaims(tokenString, &RefreshTokenClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("invalid signing method")
		}
		return []byte(refreshSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*RefreshTokenClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}
