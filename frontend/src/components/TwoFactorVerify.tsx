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
  ButtonGroup,
} from '@mui/joy';
import { useAuth } from '../contexts/AuthContext';

const TwoFactorVerify: React.FC = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<'totp' | 'recovery'>('totp');
  const { verifyTwoFactor, verifyRecoveryCode } = useAuth();
  const navigate = useNavigate();

  const username = sessionStorage.getItem('two_factor_username') || 'User';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const codeLength = method === 'totp' ? 6 : 16; // TOTP is 6 digits, recovery codes are 16 hex chars
    if (code.length !== codeLength) {
      setError(`Please enter a ${codeLength}-character ${method === 'totp' ? 'code' : 'recovery code'}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (method === 'totp') {
        await verifyTwoFactor(code);
      } else {
        await verifyRecoveryCode(code);
      }
      navigate('/'); // Redirect to home after successful verification
    } catch (err: any) {
      setError(err.response?.data?.message || `Invalid ${method === 'totp' ? '2FA code' : 'recovery code'}`);
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
            Hello {username}! Please enter your authentication code.
          </Typography>

          <Box sx={{ mb: 3 }}>
            <ButtonGroup sx={{ width: '100%', mb: 2 }}>
              <Button
                variant={method === 'totp' ? 'solid' : 'outlined'}
                onClick={() => setMethod('totp')}
                sx={{ flex: 1 }}
              >
                Authenticator App
              </Button>
              <Button
                variant={method === 'recovery' ? 'solid' : 'outlined'}
                onClick={() => setMethod('recovery')}
                sx={{ flex: 1 }}
              >
                Recovery Code
              </Button>
            </ButtonGroup>
          </Box>

          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 3 }}>
              <Input
                type="text"
                placeholder={method === 'totp' ? "000000" : "abcd1234efgh5678"}
                value={code}
                onChange={(e) => setCode(method === 'totp' 
                  ? e.target.value.replace(/\D/g, '').slice(0, 6)
                  : e.target.value.replace(/[^a-fA-F0-9]/g, '').slice(0, 16)
                )}
                slotProps={{ input: { maxLength: method === 'totp' ? 6 : 16 } }}
                fullWidth
                size="lg"
                autoFocus
              />
              <Typography level="body-sm" sx={{ mt: 1, textAlign: 'center', color: 'text.secondary' }}>
                {method === 'totp' 
                  ? "Enter the 6-digit code from your authenticator app"
                  : "Enter one of your 16-character recovery codes"
                }
              </Typography>
            </Box>

            {error && (
              <Alert color="danger" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              loading={loading}
              disabled={code.length !== (method === 'totp' ? 6 : 16)}
              fullWidth
              size="lg"
              sx={{ mb: 2 }}
            >
              Verify {method === 'totp' ? 'Code' : 'Recovery Code'}
            </Button>

            <Button
              variant="plain"
              onClick={handleCancel}
              fullWidth
            >
              Back to Login
            </Button>
          </form>

          {method === 'totp' ? (
            <Typography sx={{ mt: 2 }}>
              Use the code from your authenticator app.
            </Typography>
          ) : (
            <Typography sx={{ mt: 2 }}>
              Use your recovery code to access your account.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default TwoFactorVerify;