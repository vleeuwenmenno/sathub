import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  IconButton,
  useColorScheme,
  Menu,
  MenuItem,
  MenuButton,
  Dropdown,
  Sheet,
  Avatar,
} from "@mui/joy";
import {
  DarkMode,
  LightMode,
  Satellite,
  ArrowBack,
  Logout,
  Settings,
  Person,
  Home,
  Router,
  Group,
  Build,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, setMode } = useColorScheme();
  const { isAuthenticated, user, logout } = useAuth();
  const isDetailPage = location.pathname.includes("/post/");

  const toggleColorScheme = () => {
    setMode(mode === "dark" ? "light" : "dark");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sheet
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        background: `linear-gradient(135deg, ${mode === "dark" ? "#0f0f23" : "#f8fafc"} 0%, ${mode === "dark" ? "#1a1a2e" : "#ffffff"} 100%)`,
        borderBottom: "1px solid",
        borderColor: "divider",
        boxShadow: "sm",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: { xs: 2, md: 4 },
          py: 2,
          maxWidth: "1400px",
          mx: "auto",
        }}
      >
        {/* Left side - Logo and Navigation */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
          {/* Logo */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              cursor: "pointer",
              "&:hover": {
                "& .logo-text": { color: "primary.main" },
                transform: "scale(1.02)",
              },
              transition: "all 0.2s ease",
            }}
            onClick={() => navigate("/")}
          >
            {isDetailPage && (
              <IconButton
                variant="soft"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/");
                }}
                sx={{ mr: 1 }}
              >
                <ArrowBack />
              </IconButton>
            )}
            <Satellite sx={{ fontSize: "1.8rem", color: "primary.main" }} />
            <Typography
              level="h4"
              className="logo-text"
              sx={{
                fontWeight: "bold",
                transition: "color 0.2s ease",
              }}
            >
              SatHub
            </Typography>
          </Box>

          {/* Navigation */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              variant={isActive("/") ? "solid" : "plain"}
              size="sm"
              onClick={() => navigate("/")}
              startDecorator={<Home />}
              sx={{
                borderRadius: "lg",
                transition: "all 0.2s ease",
                "&:hover": {
                  transform: "translateY(-1px)",
                  boxShadow: "sm",
                },
              }}
            >
              Home
            </Button>

            {isAuthenticated && (
              <>
                <Button
                  variant={isActive("/stations/global") ? "solid" : "plain"}
                  size="sm"
                  onClick={() => navigate("/stations/global")}
                  startDecorator={<Router />}
                  sx={{
                    borderRadius: "lg",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      transform: "translateY(-1px)",
                      boxShadow: "sm",
                    },
                  }}
                >
                  Stations
                </Button>

                <Button
                  variant={isActive("/users/global") ? "solid" : "plain"}
                  size="sm"
                  onClick={() => navigate("/users/global")}
                  startDecorator={<Group />}
                  sx={{
                    borderRadius: "lg",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      transform: "translateY(-1px)",
                      boxShadow: "sm",
                    },
                  }}
                >
                  Users
                </Button>

                <Button
                  variant={isActive("/stations") ? "solid" : "plain"}
                  size="sm"
                  onClick={() => navigate("/stations")}
                  startDecorator={<Build />}
                  sx={{
                    borderRadius: "lg",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      transform: "translateY(-1px)",
                      boxShadow: "sm",
                    },
                  }}
                >
                  My Stations
                </Button>
              </>
            )}
          </Box>
        </Box>

        {/* Right side - Theme and Account */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton
            variant="soft"
            size="sm"
            onClick={toggleColorScheme}
            sx={{
              borderRadius: "50%",
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "rotate(180deg) scale(1.1)",
                boxShadow: "md",
              },
            }}
          >
            {mode === "dark" ? <LightMode /> : <DarkMode />}
          </IconButton>

          {isAuthenticated ? (
            <Dropdown>
              <MenuButton
                variant="soft"
                size="sm"
                sx={{
                  borderRadius: "lg",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-1px)",
                    boxShadow: "sm",
                  },
                }}
              >
                <Avatar
                  size="sm"
                  sx={{ mr: 1 }}
                >
                  {user?.username?.charAt(0).toUpperCase()}
                </Avatar>
                <Typography level="body-sm" sx={{ fontWeight: "medium" }}>
                  {user?.username}
                </Typography>
              </MenuButton>
              <Menu sx={{ minWidth: 180 }}>
                <MenuItem onClick={() => navigate(`/user/${user?.id}`)}>
                  <Person sx={{ mr: 1 }} />
                  Overview
                </MenuItem>
                <MenuItem onClick={() => navigate("/user/settings")}>
                  <Settings sx={{ mr: 1 }} />
                  Settings
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <Logout sx={{ mr: 1 }} />
                  Logout
                </MenuItem>
              </Menu>
            </Dropdown>
          ) : (
            <Button
              variant="solid"
              size="sm"
              onClick={() => navigate("/login")}
              sx={{
                borderRadius: "lg",
                transition: "all 0.2s ease",
                "&:hover": {
                  transform: "translateY(-1px)",
                  boxShadow: "md",
                },
              }}
            >
              Login
            </Button>
          )}
        </Box>
      </Box>
    </Sheet>
  );
};

export default Navbar;
