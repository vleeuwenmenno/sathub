import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
} from '@mui/joy';
import { confirmDisableTwoFactor } from '../api';

const ConfirmDisableTwoFactor: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid confirmation link');
    }
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      await confirmDisableTwoFactor(token);
      setSuccess(true);
      // Redirect to settings after a delay
      setTimeout(() => {
        navigate('/user/settings');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to confirm 2FA disable');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          p: 2,
        }}
      >
        <Card sx={{ maxWidth: 400, width: '100%' }}>
          <CardContent>
            <Typography level="h4" sx={{ mb: 2, textAlign: 'center' }}>
              Two-Factor Authentication Disabled
            </Typography>
            
            <Alert color="success" sx={{ mb: 2 }}>
              Your two-factor authentication has been successfully disabled.
            </Alert>
            
            <Typography sx={{ textAlign: 'center' }}>
              You will be redirected to your settings page shortly...
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent>
          <Typography level="h4" sx={{ mb: 2, textAlign: 'center' }}>
            Confirm Disable Two-Factor Authentication
          </Typography>
          
          <Typography sx={{ mb: 3, textAlign: 'center' }}>
            Are you sure you want to disable two-factor authentication for your account? 
            This will make your account less secure.
          </Typography>

          {error && (
            <Alert color="danger" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            onClick={handleConfirm}
            loading={loading}
            disabled={!token}
            fullWidth
            size="lg"
            color="danger"
            sx={{ mb: 2 }}
          >
            Yes, Disable 2FA
          </Button>

          <Button
            variant="plain"
            onClick={() => navigate('/user/settings')}
            fullWidth
          >
            Cancel
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ConfirmDisableTwoFactor;