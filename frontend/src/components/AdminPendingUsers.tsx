import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Table,
  Button,
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
import { useMediaQuery, useTheme } from "@mui/material";
import { Search as SearchIcon, Clear as ClearIcon } from "@mui/icons-material";
import { getAllUsers, approveUser, getUserDetails, getApprovalSettings } from "../api";
import type { AdminUser, AdminUserDetails } from "../api";

const AdminPendingUsers: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

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
  const [userDetailsModal, setUserDetailsModal] = useState<{ open: boolean; user: AdminUserDetails | null }>({
    open: false,
    user: null,
  });
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [approvalRequired, setApprovalRequired] = useState(true);

  const fetchUsers = async (page: number = 1, search: string = '') => {
    try {
      setLoading(true);
      const response = await getAllUsers(page, pagination.limit, search);
      // Filter for only unapproved users
      const pendingUsers = response.users.filter(user => !user.approved);
      setUsers(pendingUsers.sort((a, b) => a.username.localeCompare(b.username)));
      setPagination({
        ...response.pagination,
        total: pendingUsers.length, // Update total to reflect filtered count
        pages: Math.ceil(pendingUsers.length / pagination.limit)
      });
      setError(null);
    } catch (err) {
      setError("Failed to load pending users");
      console.error("Error fetching pending users:", err);
    } finally {
      setLoading(false);
    }
  };

  // Check if approval is required
  useEffect(() => {
    const checkApprovalSettings = async () => {
      try {
        const approvalData = await getApprovalSettings();
        setApprovalRequired(approvalData.required);
        if (!approvalData.required) {
          // Redirect to admin overview if approval is not required
          navigate('/admin');
        }
      } catch (err) {
        console.error("Error checking approval settings:", err);
        // Default to allowing access if we can't check settings
        setApprovalRequired(true);
      }
    };

    checkApprovalSettings();
  }, [navigate]);

  // Initial load
  useEffect(() => {
    if (approvalRequired) {
      fetchUsers(pagination.page, searchQuery);
    }
  }, [approvalRequired]);

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when searching
    fetchUsers(1, searchQuery);
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    fetchUsers(newPage, searchQuery);
  };

  const handleApproveUser = async (userId: string) => {
    try {
      setUpdatingUserId(userId);
      await approveUser(userId, true);
      // Refresh the current page to get updated data from server
      await fetchUsers(pagination.page, searchQuery);
    } catch (err) {
      setError("Failed to approve user");
      console.error("Error approving user:", err);
    } finally {
      setUpdatingUserId(null);
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
        Pending User Approvals
      </Typography>

      {error && (
        <Alert color="danger" variant="soft" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Search */}
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
          {users.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography level="h4" color="neutral">
                No pending approvals
              </Typography>
              <Typography level="body-sm" color="neutral">
                All users have been approved or there are no unapproved registrations.
              </Typography>
            </Box>
          ) : isMobile ? (
            // Mobile card layout
            <Stack spacing={2}>
              {users.map((user) => (
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
                        <Chip size="sm" color="warning" variant="soft">
                          Pending
                        </Chip>
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

                      {/* Created date */}
                      <Typography level="body-xs" color="neutral">
                        Created: {new Date(user.created_at).toLocaleDateString('de-DE')}
                      </Typography>

                      {/* Action buttons */}
                      <Box onClick={(e) => e.stopPropagation()}>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                          <Button
                            size="sm"
                            color="success"
                            variant="soft"
                            onClick={() => handleApproveUser(user.id)}
                            disabled={updatingUserId === user.id}
                            fullWidth
                          >
                            {updatingUserId === user.id ? "Approving..." : "Approve"}
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
                  <th>Status</th>
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
                    <td>
                      <Chip size="sm" color="warning" variant="soft">
                        Pending Approval
                      </Chip>
                    </td>
                    <td>
                      <Typography level="body-sm">
                        {new Date(user.created_at).toLocaleDateString('de-DE')}
                      </Typography>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        color="success"
                        variant="soft"
                        onClick={() => handleApproveUser(user.id)}
                        disabled={updatingUserId === user.id}
                      >
                        {updatingUserId === user.id ? "Approving..." : "Approve"}
                      </Button>
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
        Showing {users.length} pending users
        {searchQuery && ` matching "${searchQuery}"`}
      </Typography>

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
                    src={userDetailsModal.user.profile_picture_url || undefined}
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
                      <Chip size="sm" color="warning" variant="soft">
                        Pending Approval
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
                    color="success"
                    onClick={() => {
                      handleApproveUser(userDetailsModal.user!.id);
                      setUserDetailsModal({ open: false, user: null });
                    }}
                  >
                    Approve User
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

export default AdminPendingUsers;