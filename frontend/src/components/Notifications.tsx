import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemDecorator,
  Divider,
  CircularProgress,
  Chip,
  Stack,
} from "@mui/joy";
import {
  Notifications as NotificationsIcon,
  EmojiEvents,
  Comment,
  Favorite,
  CheckCircle,
  OpenInNew,
  Report,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../contexts/TranslationContext";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../api";
import type { Notification, NotificationResponse } from "../types";

const Notifications: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalNotifications, setTotalNotifications] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);

  // Helper function to sort notifications: unread first, then by newest
  const sortNotifications = (notifs: Notification[]) => {
    return [...notifs].sort((a, b) => {
      // Unread notifications first
      if (a.is_read !== b.is_read) {
        return a.is_read ? 1 : -1; // Unread (false) comes first
      }
      // Within same read status, sort by newest first
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  };

  const fetchNotifications = async (page: number = 1) => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const result: NotificationResponse = await getNotifications(page, 20);
      setNotifications(sortNotifications(result.notifications));
      setTotalPages(result.pagination.pages);
      setTotalNotifications(result.pagination.total);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(currentPage);
  }, [isAuthenticated, currentPage]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      // Update local state and re-sort
      setNotifications((prev) =>
        sortNotifications(
          prev.map((n) =>
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        )
      );
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAll(true);
      await markAllNotificationsAsRead();
      setNotifications((prev) =>
        sortNotifications(prev.map((n) => ({ ...n, is_read: true })))
      );
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNavigate = (notification: Notification) => {
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
          navigate(`/admin/reports?reportId=${notification.related_id}`);
          break;
        default:
          // No navigation for unknown types
          break;
      }
    }
  };

  const handleMarkAsReadAndOpen = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }
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
        return <Report color="warning" />;
      case "test":
        return <NotificationsIcon color="warning" />;
      default:
        return <NotificationsIcon />;
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
      const achievementName = t(achievementKey);
      return `You unlocked the achievement: ${achievementName}`;
    }
    return message;
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography level="h4">Please log in to view notifications</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: "800px", mx: "auto", py: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography level="h2">Notifications</Typography>
        {totalNotifications > 0 && (
          <Button
            variant="outlined"
            onClick={handleMarkAllAsRead}
            loading={markingAll}
            disabled={notifications.every((n) => n.is_read)}
          >
            Mark all as read
          </Button>
        )}
      </Box>

      {totalNotifications > 0 && (
        <Box sx={{ mb: 2 }}>
          <Chip variant="soft" color="primary" size="sm">
            {notifications.filter((n) => !n.is_read).length} unread notification
            {notifications.filter((n) => !n.is_read).length !== 1 ? "s" : ""}
          </Chip>
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : notifications.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <NotificationsIcon
            sx={{ fontSize: 64, color: "text.tertiary", mb: 2 }}
          />
          <Typography level="h4" sx={{ color: "text.tertiary" }}>
            No notifications yet
          </Typography>
          <Typography level="body-sm" sx={{ color: "text.tertiary", mt: 1 }}>
            When you receive notifications, they'll appear here.
          </Typography>
        </Box>
      ) : (
        <>
          <List sx={{ gap: 2 }}>
            {notifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  sx={{
                    py: 2,
                    px: 3,
                    bgcolor: notification.is_read
                      ? "transparent"
                      : "primary.softBg",
                    borderRadius: "md",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 2,
                  }}
                >
                  <ListItemDecorator sx={{ alignSelf: "flex-start", mt: 0.5 }}>
                    {getNotificationIcon(notification.type)}
                  </ListItemDecorator>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      level="body-lg"
                      sx={{
                        fontWeight: notification.is_read ? "normal" : "bold",
                        mb: 1,
                      }}
                    >
                      {formatNotificationMessage(notification.message)}
                    </Typography>
                    <Typography
                      level="body-sm"
                      sx={{ color: "text.tertiary", mb: 1.5 }}
                    >
                      {formatTimeAgo(notification.created_at)}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      {!notification.is_read ? (
                        <>
                          <Button
                            size="sm"
                            variant="outlined"
                            color="neutral"
                            startDecorator={<CheckCircle />}
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            Mark as Read
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
                            >
                              Open
                            </Button>
                          )}
                        </>
                      ) : (
                        notification.related_id && (
                          <Button
                            size="sm"
                            variant="outlined"
                            color="primary"
                            startDecorator={<OpenInNew />}
                            onClick={() => handleNavigate(notification)}
                          >
                            Open
                          </Button>
                        )
                      )}
                    </Stack>
                  </Box>
                </ListItem>
                {index < notifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>

          {totalPages > 1 && (
            <Box
              sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 4 }}
            >
              <Button
                variant="outlined"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </Button>
              <Typography sx={{ alignSelf: "center" }}>
                Page {currentPage} of {totalPages}
              </Typography>
              <Button
                variant="outlined"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default Notifications;
