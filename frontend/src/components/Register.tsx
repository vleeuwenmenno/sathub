import React, { useState, useEffect } from 'react';
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
  IconButton,
  Divider,
  Chip,
} from '@mui/joy';
import {
  PersonAdd as RegisterIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Key as KeyIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { register as apiRegister, getCaptcha } from '../api';
import { useTranslation } from '../contexts/TranslationContext';
import logo from '../assets/logo.svg';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const fetchCaptcha = async () => {
    try {
      const res = await getCaptcha();
      setCaptchaId(res.captcha_id);
      setCaptchaAnswer('');
    } catch (err) {
      console.error('Failed to load captcha', err);
    }
  };

  useEffect(() => {
    fetchCaptcha();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError(t('auth.register.errors.passwordMismatch'));
      return;
    }

    if (!captchaAnswer) {
      setError(t('auth.register.errors.captchaRequired'));
      return;
    }

    setLoading(true);

    try {
      await apiRegister(email, username, password, captchaId, captchaAnswer);
      setSuccess(t('auth.register.successMessage'));
      setTimeout(() => navigate('/login'), 5000);
    } catch (err: any) {
      setError(err.response?.data?.error || t('auth.register.errors.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '80vh',
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
          <Box
            component="img"
            src={logo}
            alt="SatHub Logo"
            sx={{
              height: 48,
              mb: 1,
            }}
          />
          <Typography level="h2" sx={{ mb: 1, fontWeight: 'bold' }}>
            SatHub
          </Typography>
          <Typography level="body-sm" sx={{ opacity: 0.9 }}>
            {t('auth.register.title')}
          </Typography>
        </Box>

        <CardContent sx={{ p: 2 }}>
          <Stack spacing={3}>
            {/* Register Form */}
            <form onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <FormControl>
                  <FormLabel sx={{ fontWeight: 'bold' }}>
                    <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    {t('auth.register.username')}
                  </FormLabel>
                  <Input
                    value={username}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                    required
                    fullWidth
                    size="lg"
                    placeholder={t('auth.register.usernamePlaceholder')}
                    sx={{ borderRadius: 'lg' }}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel sx={{ fontWeight: 'bold' }}>
                    <EmailIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    {t('auth.register.email')}
                  </FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    required
                    fullWidth
                    size="lg"
                    placeholder={t('auth.register.emailPlaceholder')}
                    sx={{ borderRadius: 'lg' }}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel sx={{ fontWeight: 'bold' }}>
                    <LockIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    {t('auth.register.password')}
                  </FormLabel>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    required
                    fullWidth
                    size="lg"
                    placeholder={t('auth.register.passwordPlaceholder')}
                    sx={{ borderRadius: 'lg' }}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel sx={{ fontWeight: 'bold' }}>
                    <LockIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    {t('auth.register.confirmPassword')}
                  </FormLabel>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                    required
                    fullWidth
                    size="lg"
                    placeholder={t('auth.register.confirmPasswordPlaceholder')}
                    sx={{ borderRadius: 'lg' }}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel sx={{ fontWeight: 'bold' }}>
                    <KeyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    {t('auth.register.captcha')}
                  </FormLabel>
                  {captchaId && (
                    <Box sx={{ mb: 1, p: 2, bgcolor: 'background.surface', borderRadius: 'lg', border: '1px solid', borderColor: 'divider', position: 'relative' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <img src={`/captcha/${captchaId}.png`} alt="Captcha" />
                      </Box>
                      <IconButton onClick={fetchCaptcha} size="sm" sx={{ position: 'absolute', top: 8, right: 8 }}>
                        <RefreshIcon />
                      </IconButton>
                    </Box>
                  )}
                  <Input
                    value={captchaAnswer}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCaptchaAnswer(e.target.value)}
                    required
                    fullWidth
                    size="lg"
                    placeholder={t('auth.register.captchaPlaceholder')}
                    sx={{ borderRadius: 'lg' }}
                  />
                </FormControl>

                <Button
                  type="submit"
                  loading={loading}
                  disabled={!!success}
                  fullWidth
                  size="lg"
                  startDecorator={<RegisterIcon />}
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
                  {loading ? t('common.loading') : t('auth.register.submit')}
                </Button>
              </Stack>
            </form>
            
            {/* Error/Success Alerts */}
            {error && (
              <Alert color="danger" variant="soft" sx={{ borderRadius: 'lg' }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert color="success" variant="soft" sx={{ borderRadius: 'lg' }}>
                {success}
              </Alert>
            )}

            <Divider sx={{ my: 1 }}>
              <Chip variant="soft" size="sm">
                {t('common.or')}
              </Chip>
            </Divider>

            {/* Login Link */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                {t('auth.register.haveAccount')}{' '}
                <Link
                  to="/login"
                  style={{
                    color: 'var(--joy-palette-primary-main)',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                  }}
                >
                  {t('auth.register.signIn')}
                </Link>
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Register;