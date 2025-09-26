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
	resetURL := fmt.Sprintf("http://localhost:5173/reset-password?token=%s", resetToken)

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
