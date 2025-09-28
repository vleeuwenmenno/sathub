import React, { useState, useEffect, useCallback } from "react";
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
  AdminPanelSettings,
  EmojiEvents,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { getProfilePictureBlob } from "../api";
import NotificationDropdown from "./NotificationDropdown";
import logo from "../assets/logo.svg";

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, setMode } = useColorScheme();
  const { isAuthenticated, user, logout } = useAuth();
  const isDetailPage = location.pathname.includes("/post/");
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);

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

  // Handle responsive sidebar visibility
  const checkViewportWidth = useCallback(() => {
    const width = window.innerWidth;
    // Hide sidebar if viewport is too narrow (less than 900px)
    setSidebarHidden(width < 900);
  }, []);

  useEffect(() => {
    checkViewportWidth();
    window.addEventListener('resize', checkViewportWidth);
    return () => window.removeEventListener('resize', checkViewportWidth);
  }, [checkViewportWidth]);


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
    { path: "/admin", label: "Admin", icon: <AdminPanelSettings />, show: isAuthenticated && user?.role === "admin" },
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
              display: { xs: "flex", sm: sidebarHidden ? "flex" : "none" },
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
              src={logo}
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

          {isAuthenticated && <NotificationDropdown />}

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
                <MenuItem onClick={() => handleNavigate("/user/achievements")}>
                  <EmojiEvents sx={{ mr: 1 }} />
                  Achievements
                </MenuItem>
                <MenuItem onClick={() => handleNavigate("/user/settings")}>
                  <Settings sx={{ mr: 1 }} />
                  Settings
                </MenuItem>
                {user?.role === "admin" && (
                  <>
                    <Divider />
                    <MenuItem onClick={() => handleNavigate("/admin")}>
                      <AdminPanelSettings sx={{ mr: 1 }} />
                      Admin Panel
                    </MenuItem>
                  </>
                )}
                <Divider />
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

      {/* Permanent Sidebar */}
      {!sidebarHidden && (
        <Box
          sx={{
            display: { xs: "none", sm: "block" },
            position: "fixed",
            top: "5.5rem", // Account for navbar height + padding
            left: 0,
            width: 280,
            height: "calc(100vh - 5rem)",
            background: `linear-gradient(135deg, ${mode === "dark" ? "#0f0f23" : "#f8fafc"} 0%, ${mode === "dark" ? "#1a1a2e" : "#ffffff"} 100%)`,
            borderRight: "1px solid",
            borderTop: "none",
            borderColor: "divider",
            boxShadow: "sm",
            zIndex: 1000,
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
            {/* Sidebar Header - Hidden on desktop since logo is in navbar */}
            <Box sx={{ display: { xs: "flex", sm: "none" }, alignItems: "center", gap: 1, mb: 2 }}>
              <img
                src={logo}
                alt="SatHub Logo"
                style={{ width: "1.5rem", height: "1.5rem" }}
              />
              <Typography level="h4" sx={{ fontWeight: "bold" }}>
                SatHub
              </Typography>
            </Box>

            <Divider sx={{ mb: 2, display: { xs: "block", sm: "none" } }} />

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

            {/* Admin Section */}
            {isAuthenticated && user?.role === "admin" && (
              <>
                <Divider sx={{ mb: 2 }} />
                <Typography level="body-sm" sx={{ mb: 1, px: 2, fontWeight: "bold", color: "primary.main" }}>
                  Admin
                </Typography>
                <List sx={{ gap: 1, mb: 2 }}>
                  <ListItem>
                    <ListItemButton
                      onClick={() => handleNavigate("/admin")}
                      selected={isActive("/admin")}
                      sx={{
                        borderRadius: "lg",
                        "&:hover": {
                          backgroundColor: "primary.softHoverBg",
                        },
                      }}
                    >
                      <ListItemDecorator>
                        <AdminPanelSettings />
                      </ListItemDecorator>
                      Admin Panel
                    </ListItemButton>
                  </ListItem>
                </List>
              </>
            )}

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
                        onClick={() => handleNavigate("/user/achievements")}
                        sx={{
                          borderRadius: "lg",
                          "&:hover": {
                            backgroundColor: "primary.softHoverBg",
                          },
                        }}
                      >
                        <ListItemDecorator>
                          <EmojiEvents />
                        </ListItemDecorator>
                        Achievements
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
        </Box>
      )}

      {/* Mobile Drawer */}
      <Drawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        anchor="left"
        sx={{
          display: { xs: "block", sm: sidebarHidden ? "block" : "none" },
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
                src={logo}
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

          {/* Admin Section */}
          {isAuthenticated && user?.role === "admin" && (
            <>
              <Divider sx={{ mb: 2 }} />
              <Typography level="body-sm" sx={{ mb: 1, px: 2, fontWeight: "bold", color: "primary.main" }}>
                Admin
              </Typography>
              <List sx={{ gap: 1, mb: 2 }}>
                <ListItem>
                  <ListItemButton
                    onClick={() => handleNavigate("/admin")}
                    selected={isActive("/admin")}
                    sx={{
                      borderRadius: "lg",
                      "&:hover": {
                        backgroundColor: "primary.softHoverBg",
                      },
                    }}
                  >
                    <ListItemDecorator>
                      <AdminPanelSettings />
                    </ListItemDecorator>
                    Admin Panel
                  </ListItemButton>
                </ListItem>
              </List>
            </>
          )}

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
                      onClick={() => handleNavigate("/user/achievements")}
                      sx={{
                        borderRadius: "lg",
                        "&:hover": {
                          backgroundColor: "primary.softHoverBg",
                        },
                      }}
                    >
                      <ListItemDecorator>
                        <EmojiEvents />
                      </ListItemDecorator>
                      Achievements
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
