import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Alert,
  Sheet,
  Stack,
  FormControl,
  FormLabel,
  Input,
} from '@mui/joy';
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
            Check Your Email
          </Typography>

          <Alert color="success" variant="soft">
            If an account with that email exists, a password reset link has been sent.
          </Alert>

          <Typography textAlign="center">
            Didn't receive the email? Check your spam folder or{' '}
            <Button
              variant="plain"
              onClick={() => setSuccess(false)}
              sx={{ p: 0, minHeight: 'auto' }}
            >
              try again
            </Button>
          </Typography>

          <Button onClick={() => navigate('/login')} fullWidth>
            Back to Login
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
          Forgot Password
        </Typography>

        <Typography textAlign="center" sx={{ mb: 2 }}>
          Enter your email address and we'll send you a link to reset your password.
        </Typography>

        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <FormControl>
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                fullWidth
                placeholder="your@email.com"
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
              Send Reset Link
            </Button>
          </Stack>
        </form>

        <Typography textAlign="center">
          Remember your password?{' '}
          <Link to="/login" style={{ color: 'var(--joy-palette-primary-main)' }}>
            Back to Login
          </Link>
        </Typography>
      </Sheet>
    </Box>
  );
};

export default ForgotPassword;