package config

import (
	"os"
	"strconv"
)

type SMTPConfig struct {
	Host      string
	Port      int
	Username  string
	Password  string
	FromEmail string
	FromName  string
}

var smtpConfig *SMTPConfig

// GetSMTPConfig returns the SMTP configuration
func GetSMTPConfig() *SMTPConfig {
	if smtpConfig == nil {
		smtpConfig = &SMTPConfig{
			Host:      getEnv("SMTP_HOST", "localhost"),
			Port:      getEnvAsInt("SMTP_PORT", 1025),
			Username:  getEnv("SMTP_USERNAME", ""),
			Password:  getEnv("SMTP_PASSWORD", ""),
			FromEmail: getEnv("SMTP_FROM_EMAIL", "noreply@satdump.local"),
			FromName:  getEnv("SMTP_FROM_NAME", "SatDump"),
		}
	}
	return smtpConfig
}

// getEnv gets an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvAsInt gets an environment variable as int or returns a default value
func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}
