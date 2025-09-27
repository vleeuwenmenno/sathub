package utils

import (
	"bytes"
	"fmt"
	"html/template"
	"satdump-ui-backend/config"

	"gopkg.in/gomail.v2"
)

type EmailData struct {
	Subject  string
	To       string
	Template string
	Data     map[string]interface{}
}

// SendEmail sends an email using the configured SMTP settings
func SendEmail(data EmailData) error {
	smtpConfig := config.GetSMTPConfig()

	m := gomail.NewMessage()
	m.SetHeader("From", fmt.Sprintf("%s <%s>", smtpConfig.FromName, smtpConfig.FromEmail))
	m.SetHeader("To", data.To)
	m.SetHeader("Subject", data.Subject)

	// Parse and execute template
	tmpl, err := template.ParseFiles(fmt.Sprintf("templates/emails/%s.html", data.Template))
	if err != nil {
		return fmt.Errorf("failed to parse email template: %w", err)
	}

	var body bytes.Buffer
	if err := tmpl.Execute(&body, data.Data); err != nil {
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
func SendPasswordResetEmail(toEmail, username, resetToken string) error {
	appConfig := config.GetAppConfig()
	resetURL := fmt.Sprintf("%s/reset-password?token=%s", appConfig.FrontendURL, resetToken)

	data := EmailData{
		Subject:  "Password Reset Request",
		To:       toEmail,
		Template: "password_reset",
		Data: map[string]interface{}{
			"Username":   username,
			"ResetURL":   resetURL,
			"ResetToken": resetToken,
		},
	}

	return SendEmail(data)
}

// SendEmailConfirmationEmail sends an email confirmation email
func SendEmailConfirmationEmail(toEmail, username, confirmToken string) error {
	appConfig := config.GetAppConfig()
	confirmURL := fmt.Sprintf("%s/confirm-email?token=%s", appConfig.FrontendURL, confirmToken)

	data := EmailData{
		Subject:  "Confirm Your SatDump Account",
		To:       toEmail,
		Template: "email_confirmation",
		Data: map[string]interface{}{
			"Username":     username,
			"ConfirmURL":   confirmURL,
			"ConfirmToken": confirmToken,
		},
	}

	return SendEmail(data)
}

// SendEmailChangeConfirmationEmail sends an email change confirmation email
func SendEmailChangeConfirmationEmail(toEmail, username, newEmail, confirmToken string) error {
	appConfig := config.GetAppConfig()
	confirmURL := fmt.Sprintf("%s/confirm-email-change?token=%s", appConfig.FrontendURL, confirmToken)

	data := EmailData{
		Subject:  "Confirm Your Email Change",
		To:       toEmail,
		Template: "email_change_confirmation",
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
func SendTwoFactorDisableEmail(toEmail, username, disableToken string) error {
	appConfig := config.GetAppConfig()
	disableURL := fmt.Sprintf("%s/confirm-disable-2fa?token=%s", appConfig.FrontendURL, disableToken)

	data := EmailData{
		Subject:  "Confirm Two-Factor Authentication Disable",
		To:       toEmail,
		Template: "two_factor_disable_confirmation",
		Data: map[string]interface{}{
			"Username":     username,
			"ConfirmURL":   disableURL,
			"ConfirmToken": disableToken,
		},
	}

	return SendEmail(data)
}
