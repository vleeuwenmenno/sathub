import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Alert,
  Stack,
  FormControl,
  FormLabel,
  Input,
  Sheet,
} from '@mui/joy';
import { resetPassword } from '../api';
import { useTranslation } from '../contexts/TranslationContext';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const [tokenValid, setTokenValid] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (!tokenFromUrl) {
      setTokenValid(false);
      setError(t('auth.resetPassword.errors.tokenInvalid'));
    } else {
      setToken(tokenFromUrl);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('auth.resetPassword.errors.passwordMismatch'));
      return;
    }

    if (password.length < 6) {
      setError(t('auth.resetPassword.errors.passwordTooShort'));
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, password);
      setSuccess(true);
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || t('auth.resetPassword.errors.failed');
      setError(errorMessage);

      // If token is invalid/expired, mark as invalid
      if (errorMessage.includes('token') || errorMessage.includes('expired')) {
        setTokenValid(false);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!tokenValid) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.body',
          p: 2,
        }}
      >
        <Sheet
          sx={{
            p: 4,
            width: '100%',
            maxWidth: 400,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Typography level="h3" textAlign="center">
            {t('auth.resetPassword.invalidLinkTitle')}
          </Typography>

          <Alert color="danger" variant="soft">
            {error || t('auth.resetPassword.invalidLinkMessage')}
          </Alert>

          <Typography textAlign="center">
            {t('auth.resetPassword.requestNewLink')}
          </Typography>

          <Button onClick={() => navigate('/forgot-password')} fullWidth>
            {t('auth.resetPassword.requestNewLinkButton')}
          </Button>

          <Typography textAlign="center">
            <Link to="/login" style={{ color: 'var(--joy-palette-primary-main)' }}>
              {t('auth.resetPassword.backToLogin')}
            </Link>
          </Typography>
        </Sheet>
      </Box>
    );
  }

  if (success) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.body',
          p: 2,
        }}
      >
        <Sheet
          sx={{
            p: 4,
            width: '100%',
            maxWidth: 400,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Typography level="h3" textAlign="center">
            {t('auth.resetPassword.successTitle')}
          </Typography>

          <Alert color="success" variant="soft">
            {t('auth.resetPassword.successMessage')}
          </Alert>

          <Typography textAlign="center">
            {t('auth.resetPassword.redirecting')}
          </Typography>

          <Button onClick={() => navigate('/login')} fullWidth>
            {t('auth.resetPassword.goToLogin')}
          </Button>
        </Sheet>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.body',
        p: 2,
      }}
    >
      <Sheet
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 400,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Typography level="h3" textAlign="center">
          {t('auth.resetPassword.title')}
        </Typography>

        <Typography textAlign="center" sx={{ mb: 2 }}>
          {t('auth.resetPassword.subtitle')}
        </Typography>

        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <FormControl>
              <FormLabel>{t('auth.resetPassword.password')}</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                fullWidth
                placeholder="Enter new password"
              />
            </FormControl>

            <FormControl>
              <FormLabel>{t('auth.resetPassword.confirmPassword')}</FormLabel>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                required
                fullWidth
                placeholder="Confirm new password"
              />
            </FormControl>

            {error && (
              <Alert color="danger" variant="soft">
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              loading={loading}
              fullWidth
              size="lg"
            >
              {t('auth.resetPassword.submit')}
            </Button>
          </Stack>
        </form>

        <Typography textAlign="center">
          <Link to="/login" style={{ color: 'var(--joy-palette-primary-main)' }}>
            {t('auth.resetPassword.backToLogin')}
          </Link>
        </Typography>
      </Sheet>
    </Box>
  );
};

export default ResetPassword;