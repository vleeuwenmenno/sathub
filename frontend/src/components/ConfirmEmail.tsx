import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Alert,
  Sheet,
  Stack,
  CircularProgress,
} from '@mui/joy';
import { confirmEmail } from '../api';

const ConfirmEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid confirmation link. No token provided.');
      setLoading(false);
      return;
    }

    const confirm = async () => {
      try {
        await confirmEmail(token);
        setSuccess(true);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to confirm email');
      } finally {
        setLoading(false);
      }
    };

    confirm();
  }, [token]);

  const handleLoginRedirect = () => {
    navigate('/login');
  };

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
          textAlign: 'center',
        }}
      >
        <Typography level="h3">
          Email Confirmation
        </Typography>

        {loading && (
          <Stack spacing={2} alignItems="center">
            <CircularProgress />
            <Typography>Confirming your email...</Typography>
          </Stack>
        )}

        {error && (
          <Alert color="danger" variant="soft">
            {error}
          </Alert>
        )}

        {success && (
          <Stack spacing={2}>
            <Alert color="success" variant="soft">
              Your email has been confirmed successfully! You can now log in to your account.
            </Alert>
            <Button onClick={handleLoginRedirect} fullWidth size="lg">
              Go to Login
            </Button>
          </Stack>
        )}
      </Sheet>
    </Box>
  );
};

export default ConfirmEmail;