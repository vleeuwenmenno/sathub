import React, { useState, useEffect } from 'react';
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
import { register as apiRegister, getCaptcha } from '../api';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCaptcha = async () => {
      try {
        const res = await getCaptcha();
        setCaptchaId(res.captcha_id);
      } catch (err) {
        console.error('Failed to load captcha', err);
      }
    };
    fetchCaptcha();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!captchaAnswer) {
      setError('Please complete the captcha');
      return;
    }

    setLoading(true);

    try {
      await apiRegister(email, username, password, captchaId, captchaAnswer);
      setSuccess('Registration successful! Please check your email to confirm your account before logging in.');
      setTimeout(() => navigate('/login'), 5000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
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
        }}
      >
        <Typography level="h3" textAlign="center">
          Register
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
              />
            </FormControl>

            <FormControl>
              <FormLabel>Username</FormLabel>
              <Input
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                required
                fullWidth
              />
            </FormControl>

            <FormControl>
              <FormLabel>Password</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                fullWidth
              />
            </FormControl>

            <FormControl>
              <FormLabel>Confirm Password</FormLabel>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                required
                fullWidth
              />
            </FormControl>

            <FormControl>
              <FormLabel>Captcha</FormLabel>
              {captchaId && (
                <Box sx={{ mb: 1 }}>
                  <img src={`/captcha/${captchaId}.png`} alt="Captcha" />
                </Box>
              )}
              <Input
                value={captchaAnswer}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCaptchaAnswer(e.target.value)}
                required
                fullWidth
                placeholder="Enter the text shown above"
              />
            </FormControl>

            {error && (
              <Alert color="danger" variant="soft">
                {error}
              </Alert>
            )}

            {success && (
              <Alert color="success" variant="soft">
                {success}
              </Alert>
            )}

            <Button
              type="submit"
              loading={loading}
              disabled={!!success}
              fullWidth
              size="lg"
            >
              Register
            </Button>
          </Stack>
        </form>

        <Typography textAlign="center">
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--joy-palette-primary-main)' }}>
            Login here
          </Link>
        </Typography>
      </Sheet>
    </Box>
  );
};

export default Register;