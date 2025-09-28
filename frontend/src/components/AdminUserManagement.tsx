import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Table,
  Button,
  Select,
  Option,
  Chip,
  Stack,
  Modal,
  ModalDialog,
  ModalClose,
  Avatar,
  Divider,
} from "@mui/joy";
import { getAllUsers, updateUserRole, deleteUser, banUser, getUserDetails } from "../api";
import type { AdminUser, AdminUserDetails } from "../api";

const AdminUserManagement: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: AdminUser | null }>({
    open: false,
    user: null,
  });
  const [userDetailsModal, setUserDetailsModal] = useState<{ open: boolean; user: AdminUserDetails | null }>({
    open: false,
    user: null,
  });
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllUsers();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError("Failed to load users");
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      setUpdatingUserId(userId);
      await updateUserRole(userId, newRole);
      // Refresh the user list to get updated data from server
      await fetchUsers();
    } catch (err) {
      setError("Failed to update user role");
      console.error("Error updating user role:", err);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      await deleteUser(userId);
      // Remove from local state
      setUsers(users.filter(user => user.id !== userId));
      setDeleteDialog({ open: false, user: null });
    } catch (err) {
      setError("Failed to delete user");
      console.error("Error deleting user:", err);
    }
  };

  const handleBanUser = async (userId: number, banned: boolean) => {
    try {
      console.log(`Attempting to ${banned ? 'ban' : 'unban'} user ${userId}`);
      await banUser(userId, banned);
      console.log(`Successfully ${banned ? 'banned' : 'unbanned'} user ${userId}`);
      // Refresh the user list to get updated data from server
      await fetchUsers();
      console.log(`Refreshed user list after ${banned ? 'ban' : 'unban'} operation`);
    } catch (err) {
      console.error(`Error ${banned ? 'banning' : 'unbanning'} user:`, err);
      setError(`Failed to ${banned ? 'ban' : 'unban'} user`);
    }
  };

  const handleViewUserDetails = async (userId: number) => {
    try {
      setLoadingDetails(true);
      const userDetails = await getUserDetails(userId);
      setUserDetailsModal({ open: true, user: userDetails });
    } catch (err) {
      setError("Failed to load user details");
      console.error("Error loading user details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin": return "danger";
      case "user": return "primary";
      default: return "neutral";
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ py: { xs: 1, md: 2 }, px: 0, maxWidth: "1400px", mx: "auto" }}>
      <Typography level="h2" sx={{ mb: 3, textAlign: "center" }}>
        User Management
      </Typography>

      {error && (
        <Alert color="danger" variant="soft" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Banned</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => handleViewUserDetails(user.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{user.id}</td>
                  <td>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography level="body-sm">{user.username}</Typography>
                      {user.display_name && (
                        <Typography level="body-xs" color="neutral">
                          ({user.display_name})
                        </Typography>
                      )}
                    </Stack>
                  </td>
                  <td>
                    {user.email ? (
                      <Stack spacing={0.5}>
                        <Typography level="body-sm">{user.email}</Typography>
                        {user.email_confirmed ? (
                          <Chip size="sm" color="success" variant="soft">Confirmed</Chip>
                        ) : (
                          <Chip size="sm" color="warning" variant="soft">Unconfirmed</Chip>
                        )}
                      </Stack>
                    ) : (
                      <Typography level="body-sm" color="neutral">No email</Typography>
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <Select
                      size="sm"
                      value={user.role}
                      onChange={(_, value) => value && handleRoleChange(user.id, value)}
                      disabled={updatingUserId === user.id}
                      sx={{ minWidth: 120 }}
                    >
                      <Option value="user">User</Option>
                      <Option value="admin">Admin</Option>
                    </Select>
                  </td>
                  <td>
                    <Stack spacing={0.5}>
                      <Chip size="sm" color={getRoleColor(user.role)} variant="soft">
                        {user.role}
                      </Chip>
                      {user.two_factor_enabled && (
                        <Chip size="sm" color="success" variant="outlined">
                          2FA
                        </Chip>
                      )}
                    </Stack>
                  </td>
                  <td>
                    <Chip
                      size="sm"
                      color={user.banned ? "danger" : "success"}
                      variant="soft"
                    >
                      {user.banned ? "Banned" : "Active"}
                    </Chip>
                  </td>
                  <td>
                    <Typography level="body-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </Typography>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="sm"
                        color={user.banned ? "success" : "warning"}
                        variant="soft"
                        onClick={() => handleBanUser(user.id, !user.banned)}
                      >
                        {user.banned ? "Unban" : "Ban"}
                      </Button>
                      <Button
                        size="sm"
                        color="danger"
                        variant="soft"
                        onClick={() => setDeleteDialog({ open: true, user })}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, user: null })}
      >
        <ModalDialog>
          <ModalClose />
          <Typography level="h4" sx={{ mb: 2 }}>
            Confirm User Deletion
          </Typography>
          <Typography sx={{ mb: 3 }}>
            Are you sure you want to delete user "{deleteDialog.user?.username}"?
            This action cannot be undone.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button
              variant="plain"
              color="neutral"
              onClick={() => setDeleteDialog({ open: false, user: null })}
            >
              Cancel
            </Button>
            <Button
              color="danger"
              onClick={() => deleteDialog.user && handleDeleteUser(deleteDialog.user.id)}
            >
              Delete User
            </Button>
          </Box>
        </ModalDialog>
      </Modal>

      {/* User Details Modal */}
      <Modal
        open={userDetailsModal.open}
        onClose={() => setUserDetailsModal({ open: false, user: null })}
      >
        <ModalDialog sx={{ maxWidth: 600, width: '90%' }}>
          <ModalClose />
          {loadingDetails ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : userDetailsModal.user ? (
            <>
              <Typography level="h4" sx={{ mb: 3 }}>
                User Details: {userDetailsModal.user.username}
              </Typography>

              <Stack spacing={3}>
                {/* Profile Section */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    size="lg"
                    src={userDetailsModal.user.profile_picture_url}
                    sx={{ width: 80, height: 80 }}
                  >
                    {userDetailsModal.user.display_name?.charAt(0) || userDetailsModal.user.username.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography level="h4">
                      {userDetailsModal.user.display_name || userDetailsModal.user.username}
                    </Typography>
                    <Typography level="body-sm" color="neutral">
                      @{userDetailsModal.user.username}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Chip size="sm" color={getRoleColor(userDetailsModal.user.role)} variant="soft">
                        {userDetailsModal.user.role}
                      </Chip>
                      <Chip
                        size="sm"
                        color={userDetailsModal.user.banned ? "danger" : "success"}
                        variant="soft"
                      >
                        {userDetailsModal.user.banned ? "Banned" : "Active"}
                      </Chip>
                    </Stack>
                  </Box>
                </Box>

                <Divider />

                {/* Account Information */}
                <Box>
                  <Typography level="body-lg" sx={{ mb: 2, fontWeight: 'bold' }}>Account Information</Typography>
                  <Stack spacing={1}>
                    <Typography level="body-sm">
                      <strong>User ID:</strong> {userDetailsModal.user.id}
                    </Typography>
                    <Typography level="body-sm">
                      <strong>Email:</strong> {userDetailsModal.user.email || 'Not provided'}
                      {userDetailsModal.user.email && (
                        <Chip
                          size="sm"
                          color={userDetailsModal.user.email_confirmed ? "success" : "warning"}
                          variant="soft"
                          sx={{ ml: 1 }}
                        >
                          {userDetailsModal.user.email_confirmed ? "Confirmed" : "Unconfirmed"}
                        </Chip>
                      )}
                    </Typography>
                    <Typography level="body-sm">
                      <strong>Two-Factor Auth:</strong>{' '}
                      {userDetailsModal.user.two_factor_enabled ? 'Enabled' : 'Disabled'}
                    </Typography>
                    <Typography level="body-sm">
                      <strong>Created:</strong> {new Date(userDetailsModal.user.created_at).toLocaleString()}
                    </Typography>
                    {userDetailsModal.user.banned && userDetailsModal.user.banned_at && (
                      <Typography level="body-sm">
                        <strong>Banned At:</strong> {new Date(userDetailsModal.user.banned_at).toLocaleString()}
                      </Typography>
                    )}
                  </Stack>
                </Box>

                <Divider />

                {/* Activity Statistics */}
                <Box>
                  <Typography level="body-lg" sx={{ mb: 2, fontWeight: 'bold' }}>Activity Statistics</Typography>
                  <Stack spacing={1}>
                    <Typography level="body-sm">
                      <strong>Stations:</strong> {userDetailsModal.user.station_count}
                    </Typography>
                    <Typography level="body-sm">
                      <strong>Posts:</strong> {userDetailsModal.user.post_count}
                    </Typography>
                  </Stack>
                </Box>

                <Divider />

                {/* Actions */}
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    color={userDetailsModal.user.banned ? "success" : "warning"}
                    onClick={() => {
                      handleBanUser(userDetailsModal.user!.id, !userDetailsModal.user!.banned);
                      setUserDetailsModal({ open: false, user: null });
                    }}
                  >
                    {userDetailsModal.user.banned ? "Unban User" : "Ban User"}
                  </Button>
                  <Button
                    variant="outlined"
                    color="danger"
                    onClick={() => {
                      setDeleteDialog({ open: true, user: userDetailsModal.user });
                      setUserDetailsModal({ open: false, user: null });
                    }}
                  >
                    Delete User
                  </Button>
                </Box>
              </Stack>
            </>
          ) : null}
        </ModalDialog>
      </Modal>
    </Box>
  );
};

export default AdminUserManagement;