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
  Divider,
  Chip,
} from '@mui/joy';
import {
  Login as LoginIcon,
  Email as EmailIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { resendConfirmationEmail, getPublicRegistrationSettings } from '../api';
import logo from '../assets/logo.svg';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [registrationDisabled, setRegistrationDisabled] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkRegistrationSettings = async () => {
      try {
        const settings = await getPublicRegistrationSettings();
        setRegistrationDisabled(settings.disabled);
      } catch (err) {
        // If we can't fetch settings, assume registration is enabled
        console.error('Failed to fetch registration settings:', err);
      }
    };

    checkRegistrationSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResendMessage('');
    setShowResendConfirmation(false);
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      // Check if 2FA is required
      if (err.message === 'REQUIRES_2FA') {
        navigate('/verify-2fa');
        return;
      }

      const errorMessage = err.response?.data?.error || 'Login failed';
      setError(errorMessage);
      
      // Check if the error is about unconfirmed email
      if (errorMessage.includes('confirm your email')) {
        setShowResendConfirmation(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setResendMessage('');
    setResendLoading(true);

    try {
      await resendConfirmationEmail(username);
      setResendMessage('Confirmation email sent successfully! Please check your email.');
    } catch (err: any) {
      setResendMessage(err.response?.data?.error || 'Failed to send confirmation email');
    } finally {
      setResendLoading(false);
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
              filter: 'brightness(0) invert(1)', // Make logo white on dark background
            }}
          />
          <Typography level="h2" sx={{ mb: 1, fontWeight: 'bold' }}>
            SatDump
          </Typography>
          <Typography level="body-sm" sx={{ opacity: 0.9 }}>
            Satellite Data Management
          </Typography>
        </Box>

        <CardContent sx={{ p: 2 }}>
          <Stack spacing={3}>
            {/* Login Form */}
            <form onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <FormControl>
                  <FormLabel sx={{ fontWeight: 'bold' }}>
                    <EmailIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Username or Email
                  </FormLabel>
                  <Input
                    value={username}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                    required
                    fullWidth
                    size="lg"
                    placeholder="Enter your username or email"
                    sx={{ borderRadius: 'lg' }}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel sx={{ fontWeight: 'bold' }}>
                    <LockIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Password
                  </FormLabel>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    required
                    fullWidth
                    size="lg"
                    placeholder="Enter your password"
                    sx={{ borderRadius: 'lg' }}
                  />
                </FormControl>

                <Button
                  type="submit"
                  loading={loading}
                  fullWidth
                  size="lg"
                  startDecorator={<LoginIcon />}
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
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </Stack>
            </form>
            
            {/* Error Alert */}
            {error && (
              <Alert color="danger" variant="soft" sx={{ borderRadius: 'lg' }}>
                {error}
              </Alert>
            )}

            {/* Resend Confirmation Button */}
            {showResendConfirmation && (
              <Button
                onClick={handleResendConfirmation}
                loading={resendLoading}
                variant="outlined"
                fullWidth
                size="sm"
                sx={{ borderRadius: 'lg', mt: 1 }}
              >
                {resendLoading ? 'Sending...' : 'Resend Confirmation Email'}
              </Button>
            )}

            {/* Resend Confirmation Message */}
            {resendMessage && (
              <Alert
                color={resendMessage.includes('successfully') ? 'success' : 'danger'}
                variant="soft"
                sx={{ borderRadius: 'lg', mt: 2 }}
              >
                {resendMessage}
              </Alert>
            )}

            {/* Forgot Password Link */}
            <Box sx={{ textAlign: 'center' }}>
              <Link
                to="/forgot-password"
                style={{
                  color: 'var(--joy-palette-primary-main)',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                }}
              >
                Forgot your password?
              </Link>
            </Box>

            {!registrationDisabled && (
              <>
                <Divider sx={{ my: 1 }}>
                  <Chip variant="soft" size="sm">
                    or
                  </Chip>
                </Divider>

                {/* Register Link */}
                <Box sx={{ textAlign: 'center' }}>
                  <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                    New to SatDump?{' '}
                    <Link
                      to="/register"
                      style={{
                        color: 'var(--joy-palette-primary-main)',
                        textDecoration: 'none',
                        fontWeight: 'bold',
                      }}
                    >
                      Create an account
                    </Link>
                  </Typography>
                </Box>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;