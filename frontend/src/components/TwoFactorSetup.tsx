import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  Modal,
  ModalDialog,
  Input,
} from '@mui/joy';
import { enableTwoFactor, verifyTwoFactorSetup } from '../api';

interface TwoFactorSetupProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ onSuccess, onCancel }) => {
  const [step, setStep] = useState<'setup' | 'verify'>('setup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupData, setSetupData] = useState<{
    secret: string;
    qrCodeUrl: string;
    issuer: string;
    accountName: string;
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');

  const handleEnable = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await enableTwoFactor();
      setSetupData({
        secret: data.secret,
        qrCodeUrl: data.qr_code_url,
        issuer: data.issuer,
        accountName: data.account_name,
      });
      setStep('verify');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to enable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await verifyTwoFactorSetup(verificationCode);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={true} onClose={onCancel}>
      <ModalDialog>
        <Typography sx={{ mb: 2 }}>
          Enable Two-Factor Authentication
        </Typography>
        <Box>
          {step === 'setup' && (
            <Box>
              <Typography level="body-md" sx={{ mb: 2 }}>
                Two-factor authentication adds an extra layer of security to your account.
                You'll need to use an authenticator app like Google Authenticator, Authy, or similar.
              </Typography>
              <Alert sx={{ mb: 2 }}>
                Make sure to save your backup codes in a safe place. You'll need them if you lose access to your authenticator app.
              </Alert>
              <Button
                onClick={handleEnable}
                loading={loading}
                fullWidth
                size="lg"
              >
                Enable 2FA
              </Button>
            </Box>
          )}

          {step === 'verify' && setupData && (
            <Box>
              <Typography level="body-md" sx={{ mb: 2 }}>
                Scan the QR code below with your authenticator app, or manually enter the secret key.
              </Typography>

              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.qrCodeUrl)}`}
                      alt="QR Code"
                      style={{ width: 200, height: 200 }}
                    />
                  </Box>
                  <Typography level="body-sm" sx={{ mb: 1 }}>
                    <strong>Secret Key:</strong> {setupData.secret}
                  </Typography>
                  <Typography level="body-sm">
                    <strong>Account:</strong> {setupData.accountName}
                  </Typography>
                </CardContent>
              </Card>

              <Typography level="body-md" sx={{ mb: 2 }}>
                Enter the 6-digit code from your authenticator app:
              </Typography>

              <Input
                type="text"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                slotProps={{ input: { maxLength: 6 } }}
                sx={{ mb: 2 }}
              />

              <Button
                onClick={handleVerify}
                loading={loading}
                disabled={verificationCode.length !== 6}
                fullWidth
                size="lg"
              >
                Verify & Enable 2FA
              </Button>
            </Box>
          )}

          {error && (
            <Alert color="danger" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>
      </ModalDialog>
    </Modal>
  );
};

export default TwoFactorSetup;