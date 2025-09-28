import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Menu,
  Badge,
  List,
  ListItem,
  ListItemButton,
  ListItemDecorator,
  Divider,
  CircularProgress,
} from "@mui/joy";
import { ClickAwayListener } from "@mui/material";
import {
  Notifications,
  EmojiEvents,
  Comment,
  Favorite,
  CheckCircle,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
} from "../api";
import type { Notification, NotificationResponse } from "../types";

const NotificationDropdown: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      // Fetch latest notifications when opening the dropdown
      fetchNotifications();
      fetchUnreadCount();
    }
  };

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const result: NotificationResponse = await getNotifications(1, 10);
      setNotifications(result.notifications);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!isAuthenticated) return;

    try {
      const result = await getUnreadNotificationCount();
      setUnreadCount(result.unread_count);
    } catch (err) {
      console.error("Failed to fetch unread count", err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      fetchUnreadCount();

      // Poll for updates every 5 seconds for live updates
      const interval = setInterval(() => {
        fetchUnreadCount();
        fetchNotifications();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAll(true);
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
    } finally {
      setMarkingAll(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'achievement':
        return <EmojiEvents color="primary" />;
      case 'comment':
        return <Comment color="info" />;
      case 'like':
        return <Favorite color="error" />;
      default:
        return <Notifications />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (!isAuthenticated) return null;

  return (
    <ClickAwayListener onClickAway={() => handleOpenChange(false)}>
      <Box>
        <IconButton
          ref={buttonRef}
          variant="soft"
          size="sm"
          onClick={() => handleOpenChange(!open)}
          sx={{
            borderRadius: "50%",
            transition: "all 0.2s ease",
            "&:hover": {
              transform: "scale(1.1)",
              boxShadow: "sm",
            },
          }}
        >
          <Badge badgeContent={unreadCount} color="danger" max={99}>
            <Notifications />
          </Badge>
        </IconButton>
        <Menu
          anchorEl={buttonRef.current}
          open={open}
          onClose={() => handleOpenChange(false)}
          sx={{ minWidth: 320, maxWidth: 400 }}
        >
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography level="title-md" sx={{ mb: 1 }}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="outlined"
              onClick={handleMarkAllAsRead}
              loading={markingAll}
              sx={{ fontSize: '0.75rem' }}
            >
              Mark all as read
            </Button>
          )}
        </Box>

        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size="sm" />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                No notifications yet
              </Typography>
            </Box>
          ) : (
            <List sx={{ gap: 0 }}>
              {notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem>
                    <ListItemButton
                      onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                      sx={{
                        py: 1.5,
                        px: 2,
                        bgcolor: notification.is_read ? 'transparent' : 'primary.softBg',
                        '&:hover': {
                          bgcolor: notification.is_read ? 'neutral.softHoverBg' : 'primary.softHoverBg',
                        },
                      }}
                    >
                      <ListItemDecorator sx={{ alignSelf: 'flex-start', mt: 0.5 }}>
                        {getNotificationIcon(notification.type)}
                      </ListItemDecorator>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          level="body-sm"
                          sx={{
                            fontWeight: notification.is_read ? 'normal' : 'bold',
                            mb: 0.5,
                          }}
                        >
                          {notification.message}
                        </Typography>
                        <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                          {formatTimeAgo(notification.created_at)}
                        </Typography>
                      </Box>
                      {!notification.is_read && (
                        <IconButton
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                          sx={{ ml: 1 }}
                        >
                          <CheckCircle sx={{ fontSize: 16 }} />
                        </IconButton>
                      )}
                    </ListItemButton>
                  </ListItem>
                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {notifications.length > 0 && (
          <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
            <Button
              size="sm"
              variant="plain"
              onClick={() => window.location.href = '/notifications'}
              sx={{ fontSize: '0.75rem' }}
            >
              View all notifications
            </Button>
          </Box>
        )}
      </Menu>
      </Box>
    </ClickAwayListener>
  );
};

export default NotificationDropdown;