import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Alert,
  Card,
  CardContent,
  Stack,
  FormControl,
  FormLabel,
  Input,
} from '@mui/joy';
import { Email as EmailIcon } from '@mui/icons-material';
import { forgotPassword } from '../api';
import { useTranslation } from '../contexts/TranslationContext';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          p: 2,
        }}
      >
        <Card
          sx={{
            width: '100%',
            maxWidth: 420,
            boxShadow: 'lg',
            borderRadius: 'xl',
            overflow: 'hidden',
          }}
          variant="outlined"
        >
          <Box
            sx={{
              bgcolor: 'primary.main',
              p: 3,
              textAlign: 'center',
              color: 'white',
            }}
          >
            <Typography level="h2" sx={{ mb: 1, fontWeight: 'bold' }}>
              SatHub
            </Typography>
            <Typography level="body-sm" sx={{ opacity: 0.9 }}>
              {t('auth.forgotPassword.successTitle')}
            </Typography>
          </Box>

          <CardContent sx={{ p: 4 }}>
            <Stack spacing={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography level="h3" sx={{ mb: 1, fontWeight: 'bold' }}>
                  {t('auth.forgotPassword.checkEmailTitle')}
                </Typography>
                <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                  {t('auth.forgotPassword.checkEmailSubtitle')}
                </Typography>
              </Box>

              <Alert color="success" variant="soft" sx={{ borderRadius: 'lg' }}>
                {t('auth.forgotPassword.successMessage')}
              </Alert>

              <Typography level="body-sm" textAlign="center" sx={{ color: 'text.tertiary' }}>
                {t('auth.forgotPassword.didNotReceive')}{' '}
                <Button
                  variant="plain"
                  onClick={() => setSuccess(false)}
                  sx={{ p: 0, minHeight: 'auto', fontSize: 'inherit' }}
                >
                  {t('auth.forgotPassword.tryAgain')}
                </Button>
              </Typography>

              <Button
                onClick={() => navigate('/login')}
                fullWidth
                size="lg"
                sx={{
                  borderRadius: 'lg',
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 'bold',
                }}
              >
                {t('auth.forgotPassword.backToLogin')}
              </Button>
            </Stack>
          </CardContent>
        </Card>
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
        bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 2,
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 420,
          boxShadow: 'lg',
          borderRadius: 'xl',
          overflow: 'hidden',
        }}
        variant="outlined"
      >
        {/* Header */}
        <Box
          sx={{
            bgcolor: 'primary.main',
            p: 3,
            textAlign: 'center',
            color: 'white',
          }}
        >
          <Typography level="h2" sx={{ mb: 1, fontWeight: 'bold' }}>
            SatHub
          </Typography>
          <Typography level="body-sm" sx={{ opacity: 0.9 }}>
            {t('auth.forgotPassword.title')}
          </Typography>
        </Box>

        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography level="h3" sx={{ mb: 1, fontWeight: 'bold' }}>
                {t('auth.forgotPassword.formTitle')}
              </Typography>
              <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                {t('auth.forgotPassword.formSubtitle')}
              </Typography>
            </Box>

            <form onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <FormControl>
                  <FormLabel sx={{ fontWeight: 'bold' }}>
                    <EmailIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    {t('auth.forgotPassword.email')}
                  </FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    required
                    fullWidth
                    size="lg"
                    placeholder="your@email.com"
                    sx={{ borderRadius: 'lg' }}
                  />
                </FormControl>

                {error && (
                  <Alert color="danger" variant="soft" sx={{ borderRadius: 'lg' }}>
                    {error}
                  </Alert>
                )}

                <Button
                  type="submit"
                  loading={loading}
                  fullWidth
                  size="lg"
                  sx={{
                    borderRadius: 'lg',
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    bgcolor: 'primary.main',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                  }}
                >
                  {loading ? t('auth.forgotPassword.sending') : t('auth.forgotPassword.submit')}
                </Button>
              </Stack>
            </form>

            <Box sx={{ textAlign: 'center' }}>
              <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                {t('auth.forgotPassword.rememberPassword')}{' '}
                <Link
                  to="/login"
                  style={{
                    color: 'var(--joy-palette-primary-main)',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                  }}
                >
                  {t('auth.forgotPassword.loginLink')}
                </Link>
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ForgotPassword;