package handlers

import (
	"net/http"

	"sathub-ui-backend/utils"

	"github.com/gin-gonic/gin"
)

// GetTranslations handles fetching translations for a specific language
// This is a public endpoint that doesn't require authentication
func GetTranslations(c *gin.Context) {
	language := c.Query("lang")

	// Default to English if no language specified
	if language == "" {
		language = "en"
	}

	// Validate supported languages
	supportedLanguages := map[string]bool{
		"en": true,
		"de": true,
		"nl": true,
	}

	if !supportedLanguages[language] {
		language = "en" // fallback to English
	}

	translations, err := utils.LoadUnifiedTranslations(language)
	if err != nil {
		utils.Logger.Error().Err(err).Str("language", language).Msg("Failed to load unified translations")
		utils.InternalErrorResponse(c, "Failed to load translations")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Translations retrieved successfully", translations)
}
