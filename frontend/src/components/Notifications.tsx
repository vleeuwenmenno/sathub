import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemDecorator,
  Divider,
  CircularProgress,
  Chip,
} from "@mui/joy";
import {
  Notifications as NotificationsIcon,
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
} from "../api";
import type { Notification, NotificationResponse } from "../types";

const Notifications: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalNotifications, setTotalNotifications] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = async (page: number = 1) => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const result: NotificationResponse = await getNotifications(page, 20);
      setNotifications(result.notifications);
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
      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAll(true);
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'achievement':
        return <EmojiEvents color="primary" />;
      case 'comment':
        return <Comment color="info" />;
      case 'like':
        return <Favorite color="error" />;
      case 'test':
        return <NotificationsIcon color="warning" />;
      default:
        return <NotificationsIcon />;
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

  if (!isAuthenticated) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography level="h4">Please log in to view notifications</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: '800px', mx: 'auto', py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography level="h2">Notifications</Typography>
        {totalNotifications > 0 && (
          <Button
            variant="outlined"
            onClick={handleMarkAllAsRead}
            loading={markingAll}
            disabled={notifications.every(n => n.is_read)}
          >
            Mark all as read
          </Button>
        )}
      </Box>

      {totalNotifications > 0 && (
        <Box sx={{ mb: 2 }}>
          <Chip
            variant="soft"
            color="primary"
            size="sm"
          >
            {notifications.filter(n => !n.is_read).length} unread notification{notifications.filter(n => !n.is_read).length !== 1 ? 's' : ''}
          </Chip>
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : notifications.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <NotificationsIcon sx={{ fontSize: 64, color: 'text.tertiary', mb: 2 }} />
          <Typography level="h4" sx={{ color: 'text.tertiary' }}>
            No notifications yet
          </Typography>
          <Typography level="body-sm" sx={{ color: 'text.tertiary', mt: 1 }}>
            When you receive notifications, they'll appear here.
          </Typography>
        </Box>
      ) : (
        <>
          <List sx={{ gap: 2 }}>
            {notifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem>
                  <ListItemButton
                    onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                    sx={{
                      py: 2,
                      px: 3,
                      bgcolor: notification.is_read ? 'transparent' : 'primary.softBg',
                      '&:hover': {
                        bgcolor: notification.is_read ? 'neutral.softHoverBg' : 'primary.softHoverBg',
                      },
                      borderRadius: 'md',
                    }}
                  >
                    <ListItemDecorator sx={{ alignSelf: 'flex-start', mt: 0.5 }}>
                      {getNotificationIcon(notification.type)}
                    </ListItemDecorator>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        level="body-lg"
                        sx={{
                          fontWeight: notification.is_read ? 'normal' : 'bold',
                          mb: 1,
                        }}
                      >
                        {notification.message}
                      </Typography>
                      <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                        {formatTimeAgo(notification.created_at)}
                      </Typography>
                    </Box>
                    {!notification.is_read && (
                      <CheckCircle sx={{ color: 'primary.main', ml: 1 }} />
                    )}
                  </ListItemButton>
                </ListItem>
                {index < notifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
              <Button
                variant="outlined"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </Button>
              <Typography sx={{ alignSelf: 'center' }}>
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