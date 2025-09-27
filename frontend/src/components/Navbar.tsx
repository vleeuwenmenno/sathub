import React, { useState, useEffect } from "react";
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
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemDecorator,
  Divider,
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
  Menu as MenuIcon,
  Close,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { getProfilePictureBlob } from "../api";

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, setMode } = useColorScheme();
  const { isAuthenticated, user, logout } = useAuth();
  const isDetailPage = location.pathname.includes("/post/");
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchProfilePicture = async () => {
      if (user?.has_profile_picture && user?.profile_picture_url) {
        try {
          const blobUrl = await getProfilePictureBlob(user.profile_picture_url);
          setProfilePictureUrl(blobUrl);
        } catch (err) {
          console.error("Failed to fetch profile picture", err);
          setProfilePictureUrl(null);
        }
      } else {
        setProfilePictureUrl(null);
      }
    };

    fetchProfilePicture();
  }, [user]);

  const toggleColorScheme = () => {
    setMode(mode === "dark" ? "light" : "dark");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
    setMobileMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const navigationItems = [
    { path: "/", label: "Home", icon: <Home />, show: true },
    { path: "/stations/global", label: "Stations", icon: <Router />, show: isAuthenticated },
    { path: "/users/global", label: "Users", icon: <Group />, show: isAuthenticated },
    { path: "/stations", label: "My Stations", icon: <Build />, show: isAuthenticated },
  ];

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
          py: 3,
          maxWidth: "1400px",
          mx: "auto",
          minHeight: "5rem",
        }}
      >
        {/* Left side - Logo and Mobile Menu */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {/* Mobile Menu Button */}
          <IconButton
            variant="soft"
            size="sm"
            onClick={() => setMobileMenuOpen(true)}
            sx={{
              display: { xs: "flex", md: "none" },
              borderRadius: "50%",
            }}
          >
            <MenuIcon />
          </IconButton>

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
            onClick={() => handleNavigate("/")}
          >
            {isDetailPage && (
              <IconButton
                variant="soft"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNavigate("/");
                }}
                sx={{ mr: 1 }}
              >
                <ArrowBack />
              </IconButton>
            )}
            <img
              src="/src/assets/logo.svg"
              alt="SatHub Logo"
              style={{ width: "2rem", height: "2rem" }}
            />
            <Typography
              level="h4"
              className="logo-text"
              sx={{
                fontWeight: "bold",
                transition: "color 0.2s ease",
                display: { xs: "none", sm: "block" },
              }}
            >
              SatHub
            </Typography>
          </Box>

          {/* Desktop Navigation */}
          <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 1, ml: 3 }}>
            {navigationItems
              .filter((item) => item.show)
              .map((item) => (
                <Button
                  key={item.path}
                  variant={isActive(item.path) ? "solid" : "plain"}
                  size="sm"
                  onClick={() => handleNavigate(item.path)}
                  startDecorator={item.icon}
                  sx={{
                    borderRadius: "lg",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      transform: "translateY(-1px)",
                      boxShadow: "sm",
                    },
                  }}
                >
                  {item.label}
                </Button>
              ))}
          </Box>
        </Box>

        {/* Right side - Theme and Account */}
        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 2 } }}>
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
                  minWidth: 0,
                  "&:hover": {
                    transform: "translateY(-1px)",
                    boxShadow: "sm",
                  },
                }}
              >
                <Avatar
                  size="sm"
                  src={profilePictureUrl || undefined}
                  sx={{ mr: { xs: 0, sm: 1 } }}
                >
                  {(user?.display_name || user?.username)?.charAt(0).toUpperCase()}
                </Avatar>
                <Typography 
                  level="body-sm" 
                  sx={{ 
                    fontWeight: "medium",
                    display: { xs: "none", sm: "block" }
                  }}
                >
                  {user?.display_name || user?.username}
                </Typography>
              </MenuButton>
              <Menu sx={{ minWidth: 180 }}>
                <MenuItem onClick={() => handleNavigate(`/user/${user?.id}`)}>
                  <Person sx={{ mr: 1 }} />
                  Overview
                </MenuItem>
                <MenuItem onClick={() => handleNavigate("/user/settings")}>
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
              onClick={() => handleNavigate("/login")}
              sx={{
                borderRadius: "lg",
                transition: "all 0.2s ease",
                "&:hover": {
                  transform: "translateY(-1px)",
                  boxShadow: "md",
                },
              }}
            >
              <Typography sx={{ display: { xs: "none", sm: "block" } }}>Login</Typography>
              <Person sx={{ display: { xs: "block", sm: "none" } }} />
            </Button>
          )}
        </Box>
      </Box>

      {/* Mobile Drawer */}
      <Drawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        anchor="left"
        sx={{
          display: { xs: "block", md: "none" },
        }}
      >
        <Box
          sx={{
            width: 280,
            p: 2,
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Drawer Header */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <img
                src="/src/assets/logo.svg"
                alt="SatHub Logo"
                style={{ width: "1.5rem", height: "1.5rem" }}
              />
              <Typography level="h4" sx={{ fontWeight: "bold" }}>
                SatHub
              </Typography>
            </Box>
            <IconButton
              variant="soft"
              size="sm"
              onClick={() => setMobileMenuOpen(false)}
              sx={{ borderRadius: "50%" }}
            >
              <Close />
            </IconButton>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Navigation Items */}
          <List sx={{ gap: 1, mb: 2 }}>
            {navigationItems
              .filter((item) => item.show)
              .map((item) => (
                <ListItem key={item.path}>
                  <ListItemButton
                    onClick={() => handleNavigate(item.path)}
                    selected={isActive(item.path)}
                    sx={{
                      borderRadius: "lg",
                      "&:hover": {
                        backgroundColor: "primary.softHoverBg",
                      },
                    }}
                  >
                    <ListItemDecorator>{item.icon}</ListItemDecorator>
                    {item.label}
                  </ListItemButton>
                </ListItem>
              ))}
          </List>

          {/* User Section */}
          {isAuthenticated && (
            <>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ mt: "auto" }}>
                <List sx={{ gap: 1 }}>
                  <ListItem>
                    <ListItemButton
                      onClick={() => handleNavigate(`/user/${user?.id}`)}
                      sx={{
                        borderRadius: "lg",
                        "&:hover": {
                          backgroundColor: "primary.softHoverBg",
                        },
                      }}
                    >
                      <ListItemDecorator>
                        <Avatar
                          size="sm"
                          src={profilePictureUrl || undefined}
                        >
                          {(user?.display_name || user?.username)?.charAt(0).toUpperCase()}
                        </Avatar>
                      </ListItemDecorator>
                      <Box sx={{ overflow: "hidden" }}>
                        <Typography level="body-sm" sx={{ fontWeight: "medium", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {user?.display_name || user?.username}
                        </Typography>
                        <Typography level="body-xs" sx={{ color: "text.tertiary", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          View Profile
                        </Typography>
                      </Box>
                    </ListItemButton>
                  </ListItem>
                  <ListItem>
                    <ListItemButton
                      onClick={() => handleNavigate("/user/settings")}
                      sx={{
                        borderRadius: "lg",
                        "&:hover": {
                          backgroundColor: "primary.softHoverBg",
                        },
                      }}
                    >
                      <ListItemDecorator>
                        <Settings />
                      </ListItemDecorator>
                      Settings
                    </ListItemButton>
                  </ListItem>
                  <ListItem>
                    <ListItemButton
                      onClick={handleLogout}
                      sx={{
                        borderRadius: "lg",
                        color: "danger.main",
                        "&:hover": {
                          backgroundColor: "danger.softHoverBg",
                        },
                      }}
                    >
                      <ListItemDecorator>
                        <Logout />
                      </ListItemDecorator>
                      Logout
                    </ListItemButton>
                  </ListItem>
                </List>
              </Box>
            </>
          )}

          {/* Login Button for Non-authenticated Users */}
          {!isAuthenticated && (
            <Box sx={{ mt: "auto", p: 2 }}>
              <Button
                variant="solid"
                fullWidth
                onClick={() => handleNavigate("/login")}
                startDecorator={<Person />}
                sx={{
                  borderRadius: "lg",
                  py: 1.5,
                }}
              >
                Login
              </Button>
            </Box>
          )}
        </Box>
      </Drawer>
    </Sheet>
  );
};

export default Navbar;
