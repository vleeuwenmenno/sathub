import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  IconButton,
  useColorScheme,
} from '@mui/joy';
import { DarkMode, LightMode, Satellite, ArrowBack, Logout } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, setMode } = useColorScheme();
  const { isAuthenticated, user, logout } = useAuth();
  const isDetailPage = location.pathname.includes('/post/');

  const toggleColorScheme = () => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.surface',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
      }}
    >
      {/* Left side - Logo and title */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {isDetailPage && (
          <IconButton
            variant="outlined"
            size="sm"
            onClick={() => navigate('/')}
            sx={{ mr: 1 }}
          >
            <ArrowBack />
          </IconButton>
        )}
        <Satellite sx={{ fontSize: '1.5rem', color: 'primary.main' }} />
        <Typography
          level="h3"
          sx={{
            fontWeight: 'bold',
            cursor: 'pointer',
            '&:hover': { color: 'primary.main' }
          }}
          onClick={() => navigate('/')}
        >
          SatHub
        </Typography>
      </Box>

      {/* Right side - Auth and theme toggle */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button
          variant="plain"
          size="sm"
          onClick={() => navigate('/stations/global')}
          sx={{ mr: 1 }}
        >
          Stations
        </Button>
        {isAuthenticated ? (
          <>
            <Button
              variant="plain"
              size="sm"
              onClick={() => navigate('/stations')}
              sx={{ mr: 1 }}
            >
              My Stations
            </Button>
            <Typography level="body-sm">
              Welcome, {user?.username}
            </Typography>
            <IconButton
              variant="outlined"
              size="sm"
              onClick={handleLogout}
              sx={{
                '&:hover': {
                  bgcolor: mode === 'dark' ? 'neutral.800' : 'neutral.100'
                }
              }}
            >
              <Logout />
            </IconButton>
          </>
        ) : (
          <Button
            variant="outlined"
            size="sm"
            onClick={() => navigate('/login')}
          >
            Login
          </Button>
        )}

        <IconButton
          variant="outlined"
          size="sm"
          onClick={toggleColorScheme}
          sx={{
            '&:hover': {
              bgcolor: mode === 'dark' ? 'neutral.800' : 'neutral.100'
            }
          }}
        >
          {mode === 'dark' ? <LightMode /> : <DarkMode />}
        </IconButton>
      </Box>
    </Box>
  );
};

export default Navbar;