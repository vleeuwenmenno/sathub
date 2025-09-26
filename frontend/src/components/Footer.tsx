import React from 'react';
import { Box, Typography, IconButton, Link } from '@mui/joy';
import GitHubIcon from '@mui/icons-material/GitHub';

const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        py: 3,
        px: 2,
        bgcolor: 'background.surface',
        borderTop: '1px solid',
        borderColor: 'divider',
        textAlign: 'center',
      }}
    >
      <Typography level="body-sm" sx={{ mb: 1 }}>
        Built with ❤️ for the satellite community
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
        <IconButton
          component={Link}
          href="https://github.com/vleeuwenmenno/sathub"
          target="_blank"
          rel="noopener noreferrer"
          size="sm"
          variant="plain"
          sx={{ color: 'text.secondary' }}
        >
          <GitHubIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

export default Footer;