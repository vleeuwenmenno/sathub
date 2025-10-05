import React, { useState } from "react";
import {
  Button,
  Modal,
  ModalDialog,
  ModalClose,
  Typography,
  Stack,
  Input,
  Textarea,
  Alert,
  CircularProgress,
} from "@mui/joy";
import ReportIcon from "@mui/icons-material/Report";
import { createReport } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../contexts/TranslationContext";

interface ReportButtonProps {
  targetType: 'post' | 'station' | 'user' | 'comment';
  targetId: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'plain' | 'outlined' | 'soft' | 'solid';
  color?: 'primary' | 'neutral' | 'danger' | 'success' | 'warning';
}

const ReportButton: React.FC<ReportButtonProps> = ({
  targetType,
  targetId,
  size = 'sm',
  variant = 'outlined',
  color = 'warning'
}) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !message.trim()) {
      setError(t('reports.fillTitleAndMessage'));
      return;
    }

    if (!user) {
      setError(t('reports.loginToReport'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createReport({
        target_type: targetType,
        target_id: targetId,
        title: title.trim(),
        message: message.trim(),
      });

      setSuccess(true);
      setTitle('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('reports.submitError'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    if (!user) {
      setError(t('reports.loginToReport'));
      return;
    }
    setOpen(true);
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    setOpen(false);
    setTitle('');
    setMessage('');
    setError(null);
    setSuccess(false);
  };

  return (
    <>
      <Button
        size={size}
        variant={variant}
        color={color}
        startDecorator={<ReportIcon />}
        onClick={handleOpen}
        disabled={!user}
      >
        {t('reports.reportButton')}
      </Button>

      <Modal open={open} onClose={handleClose}>
        <ModalDialog size="lg" sx={{ minWidth: { xs: '95vw', sm: '80vw', md: 800 }, maxWidth: 800 }}>
          <ModalClose />
          <Typography level="h4">{t('reports.reportModalTitle', { type: targetType.charAt(0).toUpperCase() + targetType.slice(1) })}</Typography>

          {error && (
            <Alert color="danger" variant="soft" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert color="success" variant="soft" sx={{ mb: 2 }}>
              {t('reports.submitSuccess')}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <Input
                placeholder={t('reports.titlePlaceholder')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={loading || success}
              />

              <Textarea
                placeholder={t('reports.messagePlaceholder')}
                minRows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                disabled={loading || success}
              />

              <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  color="neutral"
                  onClick={handleClose}
                  disabled={loading}
                >
                  {t('reports.cancel')}
                </Button>
                <Button
                  type="submit"
                  color="warning"
                  disabled={loading || success}
                  startDecorator={loading && <CircularProgress size="sm" />}
                >
                  {loading ? t('reports.submitting') : t('reports.submitReport')}
                </Button>
              </Stack>
            </Stack>
          </form>
        </ModalDialog>
      </Modal>
    </>
  );
};

export default ReportButton;