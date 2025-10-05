import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Menu,
  Badge,
  List,
  ListItem,
  ListItemDecorator,
  Divider,
  CircularProgress,
  Stack,
} from "@mui/joy";
import { ClickAwayListener } from "@mui/material";
import {
  Notifications,
  EmojiEvents,
  Comment,
  Favorite,
  CheckCircle,
  OpenInNew,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../contexts/TranslationContext";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
} from "../api";
import type { Notification, NotificationResponse } from "../types";

const NotificationDropdown: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  const fetchNotifications = async (showLoading: boolean = true) => {
    if (!isAuthenticated) return;

    try {
      if (showLoading) {
        setLoading(true);
      }
      const result: NotificationResponse = await getNotifications(1, 10);
      // Filter for unread notifications only and sort by newest first
      const unreadNotifications = result.notifications
        .filter((n) => !n.is_read)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      setNotifications(unreadNotifications);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
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
      fetchUnreadCount();

      // Poll for updates every 5 seconds
      const interval = setInterval(() => {
        fetchUnreadCount();
        // Fetch notifications silently (without loading spinner) to avoid flicker
        // This keeps the list updated even when dropdown is open
        fetchNotifications(false);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      // Remove the notification from the dropdown (since we only show unread)
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAll(true);
      await markAllNotificationsAsRead();
      // Clear all notifications from dropdown (since we only show unread)
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNavigate = (notification: Notification) => {
    // Close the dropdown
    setOpen(false);

    // Navigate based on notification type
    if (notification.related_id) {
      switch (notification.type) {
        case "achievement":
          navigate(`/user/achievements#achievement-${notification.related_id}`);
          break;
        case "comment":
          // RelatedID format: "postId:commentId"
          const [postId, commentId] = notification.related_id.split(":");
          if (postId && commentId) {
            navigate(`/post/${postId}#comment-${commentId}`);
          }
          break;
        case "like":
          navigate(`/post/${notification.related_id}`);
          break;
        case "report":
          // Navigate to admin reports page with specific report ID
          navigate(`/admin/reports?reportId=${notification.related_id}`);
          break;
        default:
          // No navigation for unknown types
          break;
      }
    }
  };

  const handleMarkAsReadAndOpen = async (notification: Notification) => {
    // Mark as read (will remove from dropdown)
    await handleMarkAsRead(notification.id);
    // Navigate to the related page
    handleNavigate(notification);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "achievement":
        return <EmojiEvents color="primary" />;
      case "comment":
        return <Comment color="info" />;
      case "like":
        return <Favorite color="error" />;
      case "report":
        return <Notifications color="warning" />;
      default:
        return <Notifications />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const formatNotificationMessage = (message: string) => {
    if (message.startsWith("achievement_unlocked:")) {
      const achievementKey = message.substring("achievement_unlocked:".length);
      // Extract achievement slug from key like "achievements.welcomeAboard.name"
      const parts = achievementKey.split(".");
      if (parts.length >= 3 && parts[0] === "achievements" && parts[2] === "name") {
        const achievementSlug = parts[1];
        const achievementName = t(`achievementData.${achievementSlug}.name`);
        return `You unlocked the achievement: ${achievementName}`;
      }
      // Fallback to trying the key directly
      const achievementName = t(achievementKey);
      return `You unlocked the achievement: ${achievementName}`;
    }
    return message;
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
          <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography level="title-md" sx={{ mb: 1 }}>
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="outlined"
                onClick={handleMarkAllAsRead}
                loading={markingAll}
                sx={{ fontSize: "0.75rem" }}
              >
                Mark all as read
              </Button>
            )}
          </Box>

          <Box sx={{ maxHeight: 400, overflow: "auto" }}>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                <CircularProgress size="sm" />
              </Box>
            ) : notifications.length === 0 ? (
              <Box sx={{ p: 2, textAlign: "center" }}>
                <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
                  No unread notifications
                </Typography>
              </Box>
            ) : (
              <List sx={{ gap: 0 }}>
                {notifications.map((notification, index) => (
                  <React.Fragment key={notification.id}>
                    <ListItem
                      sx={{
                        py: 1.5,
                        px: 2,
                        bgcolor: "primary.softBg",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 1,
                      }}
                    >
                      <Box sx={{ display: "flex", gap: 1.5, width: "100%" }}>
                        <ListItemDecorator
                          sx={{ alignSelf: "flex-start", mt: 0.5 }}
                        >
                          {getNotificationIcon(notification.type)}
                        </ListItemDecorator>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            level="body-sm"
                            sx={{
                              fontWeight: "bold",
                              mb: 0.5,
                            }}
                          >
                            {formatNotificationMessage(notification.message)}
                          </Typography>
                          <Typography
                            level="body-xs"
                            sx={{ color: "text.tertiary" }}
                          >
                            {formatTimeAgo(notification.created_at)}
                          </Typography>
                        </Box>
                      </Box>
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ width: "100%", pl: 4 }}
                      >
                        <Button
                          size="sm"
                          variant="outlined"
                          color="neutral"
                          startDecorator={<CheckCircle />}
                          onClick={() => handleMarkAsRead(notification.id)}
                          sx={{ flex: 1 }}
                        >
                          Mark Read
                        </Button>
                        {notification.related_id && (
                          <Button
                            size="sm"
                            variant="solid"
                            color="primary"
                            startDecorator={<OpenInNew />}
                            onClick={() =>
                              handleMarkAsReadAndOpen(notification)
                            }
                            sx={{ flex: 1 }}
                          >
                            Open
                          </Button>
                        )}
                      </Stack>
                    </ListItem>
                    {index < notifications.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>

          <Box
            sx={{
              p: 1,
              borderTop: "1px solid",
              borderColor: "divider",
              textAlign: "center",
            }}
          >
            <Button
              size="sm"
              variant="plain"
              onClick={() => {
                setOpen(false);
                window.location.href = "/notifications";
              }}
              sx={{ fontSize: "0.75rem" }}
            >
              View all notifications
            </Button>
          </Box>
        </Menu>
      </Box>
    </ClickAwayListener>
  );
};

export default NotificationDropdown;
