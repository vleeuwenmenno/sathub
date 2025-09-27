package config

import (
	"strings"
)

type AppConfig struct {
	FrontendURL string
}

var appConfig *AppConfig

// GetAppConfig returns the application configuration
func GetAppConfig() *AppConfig {
	if appConfig == nil {
		frontendURL := getEnv("FRONTEND_URL", "http://localhost:5173")
		// Ensure the URL doesn't end with a slash
		frontendURL = strings.TrimSuffix(frontendURL, "/")
		appConfig = &AppConfig{
			FrontendURL: frontendURL,
		}
	}
	return appConfig
}