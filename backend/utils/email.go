package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html/template"
	"os"
	"sathub-ui-backend/config"

	"gopkg.in/gomail.v2"
)

type EmailData struct {
	Subject  string
	To       string
	Template string
	Language string
	Data     map[string]interface{}
}

// loadEmailTranslations loads email translations for the specified language
func loadEmailTranslations(language string) (map[string]interface{}, error) {
	// Default to English if language is empty or unsupported
	if language == "" {
		language = "en"
	}

	// Map of supported languages
	supportedLanguages := map[string]bool{
		"en": true,
		"de": true,
		"nl": true,
	}

	if !supportedLanguages[language] {
		language = "en" // fallback to English
	}

	filePath := fmt.Sprintf("translations/emails.%s.json", language)
	file, err := os.Open(filePath)
	if err != nil {
		// If translation file doesn't exist, try English as fallback
		if language != "en" {
			return loadEmailTranslations("en")
		}
		return nil, fmt.Errorf("failed to open translation file: %w", err)
	}
	defer file.Close()

	var translations map[string]interface{}
	decoder := json.NewDecoder(file)
	if err := decoder.Decode(&translations); err != nil {
		return nil, fmt.Errorf("failed to decode translation file: %w", err)
	}

	return translations, nil
}

// SendEmail sends an email using the configured SMTP settings
func SendEmail(data EmailData) error {
	smtpConfig := config.GetSMTPConfig()

	m := gomail.NewMessage()
	m.SetHeader("From", fmt.Sprintf("%s <%s>", smtpConfig.FromName, smtpConfig.FromEmail))
	m.SetHeader("To", data.To)
	m.SetHeader("Subject", data.Subject)

	// Load translations for the specified language
	translations, err := loadEmailTranslations(data.Language)
	if err != nil {
		// Log warning but continue with English translations
		Logger.Warn().Err(err).Str("language", data.Language).Msg("Failed to load email translations, using English fallback")
		translations, _ = loadEmailTranslations("en")
	}

	// Merge translations with data
	templateData := make(map[string]interface{})
	for k, v := range data.Data {
		templateData[k] = v
	}
	if translations != nil {
		templateData["t"] = translations
	}

	// Parse and execute template
	tmpl, err := template.ParseFiles(fmt.Sprintf("templates/emails/%s.html", data.Template))
	if err != nil {
		return fmt.Errorf("failed to parse email template: %w", err)
	}

	var body bytes.Buffer
	if err := tmpl.Execute(&body, templateData); err != nil {
		return fmt.Errorf("failed to execute email template: %w", err)
	}

	m.SetBody("text/html", body.String())

	d := gomail.NewDialer(smtpConfig.Host, smtpConfig.Port, smtpConfig.Username, smtpConfig.Password)

	// Send the email
	if err := d.DialAndSend(m); err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}

// SendPasswordResetEmail sends a password reset email
func SendPasswordResetEmail(toEmail, username, resetToken, language string) error {
	appConfig := config.GetAppConfig()
	resetURL := fmt.Sprintf("%s/reset-password?token=%s", appConfig.FrontendURL, resetToken)

	data := EmailData{
		Subject:  "Password Reset Request",
		To:       toEmail,
		Template: "password_reset",
		Language: language,
		Data: map[string]interface{}{
			"Username":   username,
			"ResetURL":   resetURL,
			"ResetToken": resetToken,
		},
	}

	return SendEmail(data)
}

// SendCommentNotificationEmail sends a comment notification email
func SendCommentNotificationEmail(toEmail, username, commenterUsername, language string) error {
	data := EmailData{
		Subject:  "New Comment on Your Post",
		To:       toEmail,
		Template: "comment_notification",
		Language: language,
		Data: map[string]interface{}{
			"Username":          username,
			"CommenterUsername": commenterUsername,
		},
	}

	return SendEmail(data)
}

// SendLikeNotificationEmail sends a like notification email
func SendLikeNotificationEmail(toEmail, username, likerUsername, language string) error {
	data := EmailData{
		Subject:  "Someone Liked Your Post!",
		To:       toEmail,
		Template: "like_notification",
		Language: language,
		Data: map[string]interface{}{
			"Username":      username,
			"LikerUsername": likerUsername,
		},
	}

	return SendEmail(data)
}

// SendAchievementNotificationEmail sends an achievement notification email
func SendAchievementNotificationEmail(toEmail, username, achievementName, achievementDescription, language string) error {
	data := EmailData{
		Subject:  "Achievement Unlocked!",
		To:       toEmail,
		Template: "achievement_notification",
		Language: language,
		Data: map[string]interface{}{
			"Username":               username,
			"AchievementName":        achievementName,
			"AchievementDescription": achievementDescription,
		},
	}

	return SendEmail(data)
}

// SendEmailConfirmationEmail sends an email confirmation email
func SendEmailConfirmationEmail(toEmail, username, confirmToken, language string) error {
	appConfig := config.GetAppConfig()
	confirmURL := fmt.Sprintf("%s/confirm-email?token=%s", appConfig.FrontendURL, confirmToken)

	data := EmailData{
		Subject:  "Confirm Your SatHub Account",
		To:       toEmail,
		Template: "email_confirmation",
		Language: language,
		Data: map[string]interface{}{
			"Username":     username,
			"ConfirmURL":   confirmURL,
			"ConfirmToken": confirmToken,
		},
	}

	return SendEmail(data)
}

// SendEmailChangeConfirmationEmail sends an email change confirmation email
func SendEmailChangeConfirmationEmail(toEmail, username, newEmail, confirmToken, language string) error {
	appConfig := config.GetAppConfig()
	confirmURL := fmt.Sprintf("%s/confirm-email-change?token=%s", appConfig.FrontendURL, confirmToken)

	data := EmailData{
		Subject:  "Confirm Your Email Change",
		To:       toEmail,
		Template: "email_change_confirmation",
		Language: language,
		Data: map[string]interface{}{
			"Username":     username,
			"NewEmail":     newEmail,
			"ConfirmURL":   confirmURL,
			"ConfirmToken": confirmToken,
		},
	}

	return SendEmail(data)
}

// SendTwoFactorDisableEmail sends a 2FA disable confirmation email
func SendTwoFactorDisableEmail(toEmail, username, disableToken, language string) error {
	appConfig := config.GetAppConfig()
	disableURL := fmt.Sprintf("%s/confirm-disable-2fa?token=%s", appConfig.FrontendURL, disableToken)

	data := EmailData{
		Subject:  "Confirm Two-Factor Authentication Disable",
		To:       toEmail,
		Template: "two_factor_disable_confirmation",
		Language: language,
		Data: map[string]interface{}{
			"Username":     username,
			"ConfirmURL":   disableURL,
			"ConfirmToken": disableToken,
		},
	}

	return SendEmail(data)
}

// SendApprovalNotificationEmail sends an account approval notification email
func SendApprovalNotificationEmail(toEmail, username, language string) error {
	appConfig := config.GetAppConfig()
	loginURL := fmt.Sprintf("%s/login", appConfig.FrontendURL)

	data := EmailData{
		Subject:  "Your SatHub Account Has Been Approved",
		To:       toEmail,
		Template: "approval_notification",
		Language: language,
		Data: map[string]interface{}{
			"Username": username,
			"LoginURL": loginURL,
		},
	}

	return SendEmail(data)
}

// SendReportNotificationEmail sends a report notification email to admins
func SendReportNotificationEmail(toEmail, reporterUsername, targetType, title, message, language string) error {
	appConfig := config.GetAppConfig()
	adminURL := fmt.Sprintf("%s/admin/reports", appConfig.FrontendURL)

	data := EmailData{
		Subject:  "New Report Submitted",
		To:       toEmail,
		Template: "report_notification",
		Language: language,
		Data: map[string]interface{}{
			"ReporterUsername": reporterUsername,
			"TargetType":       targetType,
			"Title":            title,
			"Message":          message,
			"AdminURL":         adminURL,
		},
	}

	return SendEmail(data)
}
