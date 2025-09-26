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
import QRCode from 'qrcode';
import { enableTwoFactor, verifyTwoFactorSetup } from '../api';

interface TwoFactorSetupProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ onSuccess, onCancel }) => {
  const [step, setStep] = useState<'setup' | 'verify' | 'recovery-codes'>('setup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupData, setSetupData] = useState<{
    secret: string;
    qrCodeUrl: string;
    issuer: string;
    accountName: string;
    recoveryCodes?: string[];
  } | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');

  const generateQRCode = async (otpauthUrl: string) => {
    try {
      const dataUrl = await QRCode.toDataURL(otpauthUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeDataUrl(dataUrl);
    } catch (err) {
      console.error('Failed to generate QR code:', err);
      setError('Failed to generate QR code');
    }
  };

  const handleEnable = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await enableTwoFactor();
      const setupInfo = {
        secret: data.secret,
        qrCodeUrl: data.qr_code_url,
        issuer: data.issuer,
        accountName: data.account_name,
        recoveryCodes: data.recovery_codes,
      };
      setSetupData(setupInfo);
      
      // Generate QR code client-side for security
      await generateQRCode(setupInfo.qrCodeUrl);
      
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
      setStep('recovery-codes');
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
                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt="QR Code for Two-Factor Authentication"
                        style={{ width: 200, height: 200 }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 200,
                          height: 200,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'neutral.100',
                          borderRadius: 1,
                        }}
                      >
                        <Typography level="body-sm">Generating QR code...</Typography>
                      </Box>
                    )}
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

          {step === 'recovery-codes' && setupData && setupData.recoveryCodes && (
            <Box>
              <Typography level="body-md" sx={{ mb: 2 }}>
                Two-factor authentication has been successfully enabled! Here are your recovery codes:
              </Typography>

              <Alert sx={{ mb: 2 }}>
                <strong>Important:</strong> Save these recovery codes in a safe place. You can use them to access your account if you lose your authenticator device. Each code can only be used once.
              </Alert>

              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography level="body-sm" sx={{ mb: 1 }}>
                    <strong>Recovery Codes:</strong>
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                    {setupData.recoveryCodes.map((code, index) => (
                      <Typography
                        key={index}
                        level="body-sm"
                        sx={{
                          fontFamily: 'monospace',
                          bgcolor: 'neutral.100',
                          p: 1,
                          borderRadius: 1,
                          textAlign: 'center',
                        }}
                      >
                        {code}
                      </Typography>
                    ))}
                  </Box>
                </CardContent>
              </Card>

              <Alert color="warning" sx={{ mb: 2 }}>
                These codes will not be shown again. Make sure to copy them now.
              </Alert>

              <Button
                onClick={onSuccess}
                fullWidth
                size="lg"
              >
                I've Saved My Recovery Codes
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