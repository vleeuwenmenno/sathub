package utils

import (
	"os"
	"time"

	"github.com/rs/zerolog"
)

var Logger zerolog.Logger

// InitLogger initializes the global logger
func InitLogger() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix

	// Configure output format based on environment
	if os.Getenv("GIN_MODE") == "release" {
		// Production: JSON output
		Logger = zerolog.New(os.Stdout).With().Timestamp().Caller().Logger()
	} else {
		// Development: Pretty console output
		output := zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.RFC3339}
		Logger = zerolog.New(output).With().Timestamp().Caller().Logger()
	}
}
