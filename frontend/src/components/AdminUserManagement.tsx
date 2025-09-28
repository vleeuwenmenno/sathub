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
  Input,
  IconButton,
} from "@mui/joy";
import { useMediaQuery, useTheme, Pagination } from "@mui/material";
import { Search as SearchIcon, Clear as ClearIcon } from "@mui/icons-material";
import { getAllUsers, updateUserRole, deleteUser, banUser, getUserDetails } from "../api";
import type { AdminUser, AdminUserDetails } from "../api";

const AdminUserManagement: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; pages: number }>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: AdminUser | null }>({
    open: false,
    user: null,
  });
  const [userDetailsModal, setUserDetailsModal] = useState<{ open: boolean; user: AdminUserDetails | null }>({
    open: false,
    user: null,
  });
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchUsers = async (page: number = 1, search: string = '') => {
    try {
      setLoading(true);
      const response = await getAllUsers(page, pagination.limit, search);
      setUsers(response.users.sort((a, b) => a.username.localeCompare(b.username)));
      setPagination(response.pagination);
      setError(null);
    } catch (err) {
      setError("Failed to load users");
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchUsers(pagination.page, searchQuery);
  }, []);

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when searching
    fetchUsers(1, searchQuery);
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    fetchUsers(newPage, searchQuery);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setUpdatingUserId(userId);
      await updateUserRole(userId, newRole);
      // Refresh the current page to get updated data from server
      await fetchUsers(pagination.page, searchQuery);
    } catch (err) {
      setError("Failed to update user role");
      console.error("Error updating user role:", err);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUser(userId);
      setDeleteDialog({ open: false, user: null });

      // Check if we need to adjust pagination after deletion
      const remainingUsers = users ? users.filter(user => user.id !== userId) : [];
      if (remainingUsers.length === 0 && pagination.page > 1) {
        // If this was the last user on the page and we're not on page 1, go to previous page
        handlePageChange(pagination.page - 1);
      } else {
        // Otherwise, refresh the current page
        await fetchUsers(pagination.page, searchQuery);
      }
    } catch (err) {
      setError("Failed to delete user");
      console.error("Error deleting user:", err);
    }
  };

  const handleBanUser = async (userId: string, banned: boolean) => {
    try {
      console.log(`Attempting to ${banned ? 'ban' : 'unban'} user ${userId}`);
      await banUser(userId, banned);
      console.log(`Successfully ${banned ? 'banned' : 'unbanned'} user ${userId}`);
      // Refresh the current page to get updated data from server
      await fetchUsers(pagination.page, searchQuery);
      console.log(`Refreshed user list after ${banned ? 'ban' : 'unban'} operation`);
    } catch (err) {
      console.error(`Error ${banned ? 'banning' : 'unbanning'} user:`, err);
      setError(`Failed to ${banned ? 'ban' : 'unban'} user`);
    }
  };

  const handleViewUserDetails = async (userId: string) => {
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

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={isMobile ? "column" : "row"} spacing={2} alignItems={isMobile ? "stretch" : "center"}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Input
                key="search-input" // Stable key to prevent recreation
                placeholder="Search by username or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                startDecorator={<SearchIcon />}
                endDecorator={
                  searchQuery && (
                    <IconButton
                      size="sm"
                      onClick={() => setSearchQuery('')}
                    >
                      <ClearIcon />
                    </IconButton>
                  )
                }
                sx={{ width: '100%' }}
              />
            </Box>
            <Button
              variant="solid"
              onClick={handleSearch}
              startDecorator={<SearchIcon />}
              sx={{ minWidth: isMobile ? '100%' : 'auto' }}
            >
              Search
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: { xs: 1, md: 2 } }}>
          {isMobile ? (
            // Mobile card layout
            <Stack spacing={2}>
              {users && users.map((user) => (
                <Card key={user.id} variant="outlined" sx={{ cursor: 'pointer' }} onClick={() => handleViewUserDetails(user.id)}>
                  <CardContent sx={{ p: 2 }}>
                    <Stack spacing={2}>
                      {/* Header with username and ID */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Typography level="body-lg" fontWeight="bold">
                            {user.display_name || user.username}
                          </Typography>
                          <Typography level="body-sm" color="neutral">
                            @{user.username}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Chip size="sm" color={getRoleColor(user.role)} variant="soft">
                            {user.role}
                          </Chip>
                          <Chip
                            size="sm"
                            color={user.banned ? "danger" : "success"}
                            variant="soft"
                          >
                            {user.banned ? "Banned" : "Active"}
                          </Chip>
                        </Stack>
                      </Box>

                      {/* Email */}
                      {user.email ? (
                        <Box>
                          <Typography level="body-sm">{user.email}</Typography>
                          <Chip
                            size="sm"
                            color={user.email_confirmed ? "success" : "warning"}
                            variant="soft"
                            sx={{ mt: 0.5 }}
                          >
                            {user.email_confirmed ? "Confirmed" : "Unconfirmed"}
                          </Chip>
                        </Box>
                      ) : (
                        <Typography level="body-sm" color="neutral">No email</Typography>
                      )}

                      {/* Role selector and 2FA status */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box onClick={(e) => e.stopPropagation()}>
                          <Select
                            size="sm"
                            value={user.role}
                            onChange={(_, value) => value && handleRoleChange(user.id, value)}
                            disabled={updatingUserId === user.id}
                            sx={{ minWidth: 100 }}
                          >
                            <Option value="user">User</Option>
                            <Option value="admin">Admin</Option>
                          </Select>
                        </Box>
                        {user.two_factor_enabled && (
                          <Chip size="sm" color="success" variant="outlined">
                            2FA
                          </Chip>
                        )}
                      </Box>

                      {/* Created date */}
                      <Typography level="body-xs" color="neutral">
                        Created: {new Date(user.created_at).toLocaleDateString('de-DE')}
                      </Typography>

                      {/* Action buttons */}
                      <Box onClick={(e) => e.stopPropagation()}>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                          <Button
                            size="sm"
                            color={user.banned ? "success" : "warning"}
                            variant="soft"
                            onClick={() => handleBanUser(user.id, !user.banned)}
                            fullWidth
                          >
                            {user.banned ? "Unban" : "Ban"}
                          </Button>
                          <Button
                            size="sm"
                            color="danger"
                            variant="soft"
                            onClick={() => setDeleteDialog({ open: true, user })}
                            fullWidth
                          >
                            Delete
                          </Button>
                        </Stack>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            // Desktop table layout
            <Table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users && users.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => handleViewUserDetails(user.id)}
                    style={{ cursor: 'pointer' }}
                  >
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
                        <Chip
                          size="sm"
                          color={user.banned ? "danger" : "success"}
                          variant="soft"
                        >
                          {user.banned ? "Banned" : "Active"}
                        </Chip>
                      </Stack>
                    </td>
                    <td>
                      <Typography level="body-sm">
                        {new Date(user.created_at).toLocaleDateString('de-DE')}
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
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 2, gap: 1 }}>
          <Button
            variant="outlined"
            disabled={pagination.page === 1}
            onClick={() => handlePageChange(pagination.page - 1)}
          >
            Previous
          </Button>
          <Typography sx={{ alignSelf: 'center', mx: 2 }}>
            Page {pagination.page} of {pagination.pages}
          </Typography>
          <Button
            variant="outlined"
            disabled={pagination.page === pagination.pages}
            onClick={() => handlePageChange(pagination.page + 1)}
          >
            Next
          </Button>
        </Box>
      )}

      {/* Results summary */}
      <Typography level="body-sm" color="neutral" sx={{ textAlign: 'center', mb: 3 }}>
        Showing {users ? users.length : 0} of {pagination.total} users
        {searchQuery && ` matching "${searchQuery}"`}
      </Typography>

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
                    src={userDetailsModal.user.profile_picture_url ? `/api/${userDetailsModal.user.profile_picture_url}` : undefined}
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography level="body-sm">
                        <strong>Email:</strong> {userDetailsModal.user.email || 'Not provided'}
                      </Typography>
                      {userDetailsModal.user.email && (
                        <Chip
                          size="sm"
                          color={userDetailsModal.user.email_confirmed ? "success" : "warning"}
                          variant="soft"
                        >
                          {userDetailsModal.user.email_confirmed ? "Confirmed" : "Unconfirmed"}
                        </Chip>
                      )}
                    </Box>
                    <Typography level="body-sm">
                      <strong>Two-Factor Auth:</strong>{' '}
                      {userDetailsModal.user.two_factor_enabled ? 'Enabled' : 'Disabled'}
                    </Typography>
                    <Typography level="body-sm">
                      <strong>Created:</strong> {new Date(userDetailsModal.user.created_at).toLocaleDateString('de-DE')}
                    </Typography>
                    {userDetailsModal.user.banned && userDetailsModal.user.banned_at && (
                      <Typography level="body-sm">
                        <strong>Banned At:</strong> {new Date(userDetailsModal.user.banned_at).toLocaleDateString('de-DE')}
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