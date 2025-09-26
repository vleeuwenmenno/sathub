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
import { confirmEmailChange } from '../api';

const ConfirmEmailChange: React.FC = () => {
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
        await confirmEmailChange(token);
        setSuccess(true);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to confirm email change');
      } finally {
        setLoading(false);
      }
    };

    confirm();
  }, [token]);

  const handleLoginRedirect = () => {
    navigate('/user/settings');
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
          Email Change Confirmation
        </Typography>

        {loading && (
          <Stack spacing={2} alignItems="center">
            <CircularProgress />
            <Typography>Confirming your email change...</Typography>
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
              Your email address has been changed successfully!
            </Alert>
            <Button onClick={handleLoginRedirect} fullWidth size="lg">
              Go to Settings
            </Button>
          </Stack>
        )}
      </Sheet>
    </Box>
  );
};

export default ConfirmEmailChange;