import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  FormControl,
  FormLabel,
  Select,
  Option,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
} from "@mui/joy";
import { sendTestEmail } from "../api";

const AdminDebug: React.FC = () => {
  const [selectedEmailType, setSelectedEmailType] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const emailTypes = [
    { value: "emailConfirmation", label: "Email Confirmation" },
    { value: "emailChangeConfirmation", label: "Email Change Confirmation" },
    { value: "passwordReset", label: "Password Reset" },
    { value: "achievementNotification", label: "Achievement Notification" },
    { value: "commentNotification", label: "Comment Notification" },
    { value: "likeNotification", label: "Like Notification" },
    { value: "twoFactorDisableConfirmation", label: "2FA Disable Confirmation" },
    { value: "approvalNotification", label: "Account Approval" },
  ];

  const languages = [
    { value: "en", label: "English" },
    { value: "de", label: "Deutsch" },
    { value: "nl", label: "Nederlands" },
  ];

  const handleSendTestEmail = async () => {
    if (!selectedEmailType) {
      setError("Please select an email type");
      return;
    }

    setSending(true);
    setError(null);
    setMessage(null);

    try {
      await sendTestEmail(selectedEmailType, selectedLanguage || undefined);
      const languageLabel = selectedLanguage ? ` (${languages.find(l => l.value === selectedLanguage)?.label})` : "";
      setMessage(`Test ${emailTypes.find(t => t.value === selectedEmailType)?.label} email${languageLabel} sent successfully!`);
    } catch (err) {
      setError("Failed to send test email");
      console.error("Error sending test email:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <Box sx={{ py: { xs: 1, md: 2 }, px: 0, maxWidth: "800px", mx: "auto" }}>
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <Button
          variant="outlined"
          onClick={() => navigate('/admin')}
          sx={{ minWidth: 'auto' }}
        >
          ← Back to Admin
        </Button>
        <Typography level="h2">
          Debug Tools
        </Typography>
      </Box>

      <Typography level="body-sm" color="neutral" sx={{ mb: 4 }}>
        These tools are only available in development mode for testing purposes.
      </Typography>

      <Accordion defaultExpanded>
        <AccordionSummary>
          <Typography level="h4">📧 Email Testing</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Card variant="outlined">
            <CardContent>
              <Typography level="body-sm" sx={{ mb: 3 }}>
                Send test emails to your admin email address to verify email templates and SMTP configuration.
              </Typography>

              {message && (
                <Alert color="success" variant="soft" sx={{ mb: 2 }}>
                  {message}
                </Alert>
              )}

              {error && (
                <Alert color="danger" variant="soft" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <FormControl sx={{ flex: 1, minWidth: '200px' }}>
                  <FormLabel>Email Type</FormLabel>
                  <Select
                    value={selectedEmailType}
                    onChange={(_, value) => setSelectedEmailType(value || "")}
                    placeholder="Select email type to test"
                  >
                    {emailTypes.map((type) => (
                      <Option key={type.value} value={type.value}>
                        {type.label}
                      </Option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ minWidth: '150px' }}>
                  <FormLabel>Language (Optional)</FormLabel>
                  <Select
                    value={selectedLanguage}
                    onChange={(_, value) => setSelectedLanguage(value || "")}
                    placeholder="User's default"
                  >
                    {languages.map((lang) => (
                      <Option key={lang.value} value={lang.value}>
                        {lang.label}
                      </Option>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  onClick={handleSendTestEmail}
                  disabled={!selectedEmailType || sending}
                  loading={sending}
                  sx={{ minWidth: '120px' }}
                >
                  {sending ? <CircularProgress size="sm" /> : "Send Test"}
                </Button>
              </Box>

              <Typography level="body-xs" color="neutral" sx={{ mt: 2 }}>
                Test emails will be sent to your admin email address. Check your inbox and spam folder.
              </Typography>
            </CardContent>
          </Card>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default AdminDebug;