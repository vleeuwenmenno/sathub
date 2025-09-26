import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  Input,
} from '@mui/joy';
import { useAuth } from '../contexts/AuthContext';

const TwoFactorVerify: React.FC = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { verifyTwoFactor } = useAuth();
  const navigate = useNavigate();

  const username = sessionStorage.getItem('two_factor_username') || 'User';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await verifyTwoFactor(code);
      navigate('/'); // Redirect to home after successful verification
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid 2FA code');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Clear session data and redirect to login
    sessionStorage.removeItem('two_factor_user_id');
    sessionStorage.removeItem('two_factor_username');
    navigate('/login');
  };

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
            Two-Factor Authentication
          </Typography>
          
          <Typography sx={{ mb: 3, textAlign: 'center' }}>
            Hello {username}! Please enter the 6-digit code from your authenticator app.
          </Typography>

          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 3 }}>
              <Input
                type="text"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                slotProps={{ input: { maxLength: 6 } }}
                fullWidth
                size="lg"
                autoFocus
              />
            </Box>

            {error && (
              <Alert color="danger" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              loading={loading}
              disabled={code.length !== 6}
              fullWidth
              size="lg"
              sx={{ mb: 2 }}
            >
              Verify
            </Button>

            <Button
              variant="plain"
              onClick={handleCancel}
              fullWidth
            >
              Back to Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default TwoFactorVerify;