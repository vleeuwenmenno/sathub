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

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
              SatDump
            </Typography>
            <Typography level="body-sm" sx={{ opacity: 0.9 }}>
              Email Sent
            </Typography>
          </Box>

          <CardContent sx={{ p: 4 }}>
            <Stack spacing={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography level="h3" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Check Your Email
                </Typography>
                <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                  We've sent you a password reset link
                </Typography>
              </Box>

              <Alert color="success" variant="soft" sx={{ borderRadius: 'lg' }}>
                If an account with that email exists, a password reset link has been sent.
              </Alert>

              <Typography level="body-sm" textAlign="center" sx={{ color: 'text.tertiary' }}>
                Didn't receive the email? Check your spam folder or{' '}
                <Button
                  variant="plain"
                  onClick={() => setSuccess(false)}
                  sx={{ p: 0, minHeight: 'auto', fontSize: 'inherit' }}
                >
                  try again
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
                Back to Login
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
            SatDump
          </Typography>
          <Typography level="body-sm" sx={{ opacity: 0.9 }}>
            Password Recovery
          </Typography>
        </Box>

        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography level="h3" sx={{ mb: 1, fontWeight: 'bold' }}>
                Forgot Password
              </Typography>
              <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                Enter your email address and we'll send you a link to reset your password.
              </Typography>
            </Box>

            <form onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <FormControl>
                  <FormLabel sx={{ fontWeight: 'bold' }}>
                    <EmailIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Email Address
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
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </Stack>
            </form>

            <Box sx={{ textAlign: 'center' }}>
              <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                Remember your password?{' '}
                <Link
                  to="/login"
                  style={{
                    color: 'var(--joy-palette-primary-main)',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                  }}
                >
                  Back to Login
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