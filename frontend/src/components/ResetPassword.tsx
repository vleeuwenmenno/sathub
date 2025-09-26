import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
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
import { resetPassword } from '../api';

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

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (!tokenFromUrl) {
      setTokenValid(false);
      setError('Invalid reset link. No token provided.');
    } else {
      setToken(tokenFromUrl);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
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
      const errorMessage = err.response?.data?.error || 'Failed to reset password';
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
            Invalid Reset Link
          </Typography>

          <Alert color="danger" variant="soft">
            {error || 'This password reset link is invalid or has expired.'}
          </Alert>

          <Typography textAlign="center">
            Please request a new password reset link.
          </Typography>

          <Button onClick={() => navigate('/forgot-password')} fullWidth>
            Request New Reset Link
          </Button>

          <Typography textAlign="center">
            <Link to="/login" style={{ color: 'var(--joy-palette-primary-main)' }}>
              Back to Login
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
            Password Reset Successful
          </Typography>

          <Alert color="success" variant="soft">
            Your password has been successfully reset. You can now log in with your new password.
          </Alert>

          <Typography textAlign="center">
            Redirecting to login page...
          </Typography>

          <Button onClick={() => navigate('/login')} fullWidth>
            Go to Login
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
          Reset Your Password
        </Typography>

        <Typography textAlign="center" sx={{ mb: 2 }}>
          Enter your new password below.
        </Typography>

        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <FormControl>
              <FormLabel>New Password</FormLabel>
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
              <FormLabel>Confirm New Password</FormLabel>
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
              Reset Password
            </Button>
          </Stack>
        </form>

        <Typography textAlign="center">
          <Link to="/login" style={{ color: 'var(--joy-palette-primary-main)' }}>
            Back to Login
          </Link>
        </Typography>
      </Sheet>
    </Box>
  );
};

export default ResetPassword;