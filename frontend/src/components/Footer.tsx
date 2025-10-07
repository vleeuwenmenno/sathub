import React from "react";
import { Box, Typography, IconButton, Link, Chip, Tooltip } from "@mui/joy";
import GitHubIcon from "@mui/icons-material/GitHub";
import MonitorIcon from "@mui/icons-material/Monitor";
import { VERSION } from "../version";
import { isDebugMode } from "../utils/debug";
import { useTranslation } from "../contexts/TranslationContext";
import { Link as RouterLink } from "react-router-dom";

const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Box
      component="footer"
      sx={{
        mt: "auto",
        py: 3,
        px: 2,
        bgcolor: "background.surface",
        borderTop: "1px solid",
        borderColor: "divider",
        textAlign: "center",
      }}
    >
      <Typography level="body-sm" sx={{ mb: 1 }}>
        Built with ❤️ for the satellite community
      </Typography>
      <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mb: 1 }}>
        <RouterLink
          to="/terms-of-service"
          style={{
            color: "var(--joy-palette-text-tertiary)",
            textDecoration: "none",
            fontSize: "0.875rem",
          }}
        >
          {t("footer.termsOfService")}
        </RouterLink>
        <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
          •
        </Typography>
        <RouterLink
          to="/privacy-policy"
          style={{
            color: "var(--joy-palette-text-tertiary)",
            textDecoration: "none",
            fontSize: "0.875rem",
          }}
        >
          {t("footer.privacyPolicy")}
        </RouterLink>
      </Box>
      <Typography level="body-xs" sx={{ mb: 2, color: "text.tertiary" }}>
        Version {VERSION}
      </Typography>
      <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mb: 1 }}>
        <Tooltip title="View source code on GitHub">
          <IconButton
            component={Link}
            href="https://github.com/vleeuwenmenno/sathub"
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
            variant="plain"
            sx={{ color: "text.secondary" }}
          >
            <GitHubIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Check service status">
          <IconButton
            component={Link}
            href="https://updown.io/p/itf3y"
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
            variant="plain"
            sx={{ color: "text.secondary" }}
          >
            <MonitorIcon />
          </IconButton>
        </Tooltip>
      </Box>
      {isDebugMode() && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
          <Chip
            variant="soft"
            color="warning"
            size="sm"
            sx={{
              fontSize: "0.75rem",
              fontWeight: "md",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Development Environment
          </Chip>
        </Box>
      )}
    </Box>
  );
};

export default Footer;
