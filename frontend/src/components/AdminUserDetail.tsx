import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
  Stack,
  Avatar,
  Divider,
  Chip,
  Select,
  Option,
  Modal,
  ModalDialog,
  ModalClose,
  Input,
  Textarea,
} from "@mui/joy";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import {
  getUserDetails,
  updateUserRole,
  deleteUser,
  banUser,
  approveUser,
  getProfilePictureUrl,
  clearUserProfilePicture,
} from "../api";
import type { AdminUserDetails } from "../api";

const AdminUserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState<AdminUserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [clearPictureDialog, setClearPictureDialog] = useState<{
    open: boolean;
    reason: string;
  }>({
    open: false,
    reason: "",
  });

  const getBackNavigation = () => {
    const from = (location.state as any)?.from;
    if (from === "posts") {
      return { path: "/admin/posts", label: "Back to Post Management" };
    } else if (from === "users") {
      return { path: "/admin/users", label: "Back to User Management" };
    }
    return { path: "/admin/users", label: "Back to User Management" };
  };

  const fetchUserDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const userDetails = await getUserDetails(id);
      setUser(userDetails);
      setError(null);
    } catch (err) {
      setError("Failed to load user details");
      console.error("Error loading user details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, [id]);

  const handleRoleChange = async (newRole: string) => {
    if (!user) return;

    try {
      setUpdating(true);
      await updateUserRole(user.id, newRole);
      // Refresh user details
      await fetchUserDetails();
    } catch (err) {
      setError("Failed to update user role");
      console.error("Error updating user role:", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleApproveUser = async (approved: boolean) => {
    if (!user) return;

    try {
      setUpdating(true);
      await approveUser(user.id, approved);
      // Refresh user details
      await fetchUserDetails();
    } catch (err) {
      setError(`Failed to ${approved ? "approve" : "reject"} user`);
      console.error(`Error ${approved ? "approving" : "rejecting"} user:`, err);
    } finally {
      setUpdating(false);
    }
  };

  const handleBanUser = async (banned: boolean) => {
    if (!user) return;

    try {
      setUpdating(true);
      await banUser(user.id, banned);
      // Refresh user details
      await fetchUserDetails();
    } catch (err) {
      setError(`Failed to ${banned ? "ban" : "unban"} user`);
      console.error(`Error ${banned ? "banning" : "unbanning"} user:`, err);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!user) return;

    if (
      !window.confirm(
        `Are you sure you want to delete user "${user.username}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setUpdating(true);
      await deleteUser(user.id);
      // Navigate back to user management
      navigate("/admin/users");
    } catch (err) {
      setError("Failed to delete user");
      console.error("Error deleting user:", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleClearProfilePicture = async () => {
    if (!user) return;

    try {
      setUpdating(true);
      await clearUserProfilePicture(
        user.id,
        clearPictureDialog.reason.trim() || undefined
      );
      setClearPictureDialog({ open: false, reason: "" });
      // Refresh user details
      await fetchUserDetails();
    } catch (err) {
      setError("Failed to clear profile picture");
      console.error("Error clearing profile picture:", err);
    } finally {
      setUpdating(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "danger";
      case "user":
        return "primary";
      default:
        return "neutral";
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "200px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !user) {
    return (
      <Box sx={{ py: { xs: 1, md: 2 }, px: 0, maxWidth: "1400px", mx: "auto" }}>
        <Typography level="h2" sx={{ mb: 3, textAlign: "center" }}>
          User Details
        </Typography>

        {error && (
          <Alert color="danger" variant="soft" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Button
          startDecorator={<ArrowBackIcon />}
          onClick={() => navigate(getBackNavigation().path)}
          sx={{ mb: 3 }}
        >
          {getBackNavigation().label}
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ py: { xs: 1, md: 2 }, px: 0, maxWidth: "1400px", mx: "auto" }}>
      <Typography level="h2" sx={{ mb: 3, textAlign: "center" }}>
        User Details
      </Typography>

      {error && (
        <Alert color="danger" variant="soft" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Button
        startDecorator={<ArrowBackIcon />}
        onClick={() => navigate(getBackNavigation().path)}
        sx={{ mb: 3 }}
      >
        {getBackNavigation().label}
      </Button>

      <Card>
        <CardContent sx={{ p: { xs: 2, md: 4 } }}>
          <Stack spacing={3}>
            {/* Profile Section */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Box
                sx={{
                  position: "relative",
                  "&:hover .clear-overlay": {
                    opacity: 1,
                  },
                }}
              >
                <Avatar
                  size="lg"
                  src={
                    user.profile_picture_url
                      ? getProfilePictureUrl(user.profile_picture_url)
                      : undefined
                  }
                  sx={{
                    width: 100,
                    height: 100,
                    cursor: user.has_profile_picture ? "pointer" : "default",
                  }}
                  onClick={() => {
                    if (user.has_profile_picture) {
                      setClearPictureDialog({ open: true, reason: "" });
                    }
                  }}
                >
                  {user.display_name?.charAt(0) || user.username.charAt(0)}
                </Avatar>
                {user.has_profile_picture && (
                  <Box
                    className="clear-overlay"
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: "rgba(220, 53, 69, 0.8)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: 0,
                      transition: "opacity 0.2s",
                      borderRadius: "50%",
                      cursor: "pointer",
                    }}
                    onClick={() =>
                      setClearPictureDialog({ open: true, reason: "" })
                    }
                  >
                    <Typography
                      level="body-sm"
                      sx={{ color: "white", fontWeight: "bold" }}
                    >
                      Clear
                    </Typography>
                  </Box>
                )}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography level="h3">
                  {user.display_name || user.username}
                </Typography>
                <Typography level="body-lg" color="neutral">
                  @{user.username}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Chip
                    size="md"
                    color={getRoleColor(user.role)}
                    variant="soft"
                  >
                    {user.role}
                  </Chip>
                  <Chip
                    size="md"
                    color={user.approved ? "success" : "warning"}
                    variant="soft"
                  >
                    {user.approved ? "Approved" : "Pending"}
                  </Chip>
                  <Chip
                    size="md"
                    color={user.banned ? "danger" : "success"}
                    variant="soft"
                  >
                    {user.banned ? "Banned" : "Active"}
                  </Chip>
                </Stack>
              </Box>
            </Box>

            <Divider />

            {/* Account Information */}
            <Box>
              <Typography level="h4" sx={{ mb: 2 }}>
                Account Information
              </Typography>
              <Stack spacing={2}>
                <Typography level="body-lg">
                  <strong>User ID:</strong> <code>{user.id}</code>
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography level="body-lg">
                    <strong>Email:</strong> {user.email || "Not provided"}
                  </Typography>
                  {user.email && (
                    <Chip
                      size="sm"
                      color={user.email_confirmed ? "success" : "warning"}
                      variant="soft"
                    >
                      {user.email_confirmed ? "Confirmed" : "Unconfirmed"}
                    </Chip>
                  )}
                </Box>
                <Typography level="body-lg">
                  <strong>Two-Factor Auth:</strong>{" "}
                  {user.two_factor_enabled ? "Enabled" : "Disabled"}
                </Typography>
                <Typography level="body-lg">
                  <strong>Created:</strong>{" "}
                  {new Date(user.created_at).toLocaleDateString("de-DE")}
                </Typography>
                {user.banned && user.banned_at && (
                  <Typography level="body-lg">
                    <strong>Banned At:</strong>{" "}
                    {new Date(user.banned_at).toLocaleDateString("de-DE")}
                  </Typography>
                )}
              </Stack>
            </Box>

            <Divider />

            {/* Activity Statistics */}
            <Box>
              <Typography level="h4" sx={{ mb: 2 }}>
                Activity Statistics
              </Typography>
              <Stack spacing={1}>
                <Typography level="body-lg">
                  <strong>Stations:</strong> {user.station_count}
                </Typography>
                <Typography level="body-lg">
                  <strong>Posts:</strong> {user.post_count}
                </Typography>
              </Stack>
            </Box>

            <Divider />

            {/* Actions */}
            <Box>
              <Typography level="h4" sx={{ mb: 3 }}>
                Actions
              </Typography>
              <Stack
                spacing={2}
                direction={{ xs: "column", sm: "row" }}
                sx={{ flexWrap: "wrap" }}
              >
                {/* Role Change */}
                <Box>
                  <Typography level="body-sm" sx={{ mb: 1 }}>
                    Change Role:
                  </Typography>
                  <Select
                    value={user.role}
                    onChange={(_, newValue) =>
                      handleRoleChange(newValue as string)
                    }
                    disabled={updating}
                    size="sm"
                  >
                    <Option value="user">User</Option>
                    <Option value="admin">Admin</Option>
                  </Select>
                </Box>

                {/* Approval Actions */}
                {!user.approved && (
                  <Button
                    variant="outlined"
                    color="success"
                    onClick={() => handleApproveUser(true)}
                    disabled={updating}
                  >
                    Approve User
                  </Button>
                )}
                {user.approved && (
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={() => handleApproveUser(false)}
                    disabled={updating}
                  >
                    Reject User
                  </Button>
                )}

                {/* Ban/Unban */}
                <Button
                  variant="outlined"
                  color={user.banned ? "success" : "warning"}
                  onClick={() => handleBanUser(!user.banned)}
                  disabled={updating}
                >
                  {user.banned ? "Unban User" : "Ban User"}
                </Button>

                {/* Delete */}
                <Button
                  variant="outlined"
                  color="danger"
                  onClick={handleDeleteUser}
                  disabled={updating}
                >
                  Delete User
                </Button>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Clear Profile Picture Confirmation Modal */}
      <Modal
        open={clearPictureDialog.open}
        onClose={() => setClearPictureDialog({ open: false, reason: "" })}
      >
        <ModalDialog>
          <ModalClose />
          <Typography level="h4" sx={{ mb: 2 }}>
            Clear Profile Picture
          </Typography>
          <Typography sx={{ mb: 3 }}>
            Are you sure you want to clear the profile picture for user "
            {user.username}"? This action will remove their current profile
            picture and cannot be undone.
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography level="body-sm" sx={{ mb: 1 }}>
              Reason (optional):
            </Typography>
            <Textarea
              placeholder="Provide a reason for clearing the profile picture..."
              value={clearPictureDialog.reason}
              onChange={(e) =>
                setClearPictureDialog((prev) => ({
                  ...prev,
                  reason: e.target.value,
                }))
              }
              minRows={3}
              maxRows={5}
            />
          </Box>

          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
            <Button
              variant="plain"
              color="neutral"
              onClick={() => setClearPictureDialog({ open: false, reason: "" })}
            >
              Cancel
            </Button>
            <Button
              color="danger"
              onClick={handleClearProfilePicture}
              disabled={updating}
            >
              {updating ? "Clearing..." : "Clear Profile Picture"}
            </Button>
          </Box>
        </ModalDialog>
      </Modal>
    </Box>
  );
};

export default AdminUserDetail;
