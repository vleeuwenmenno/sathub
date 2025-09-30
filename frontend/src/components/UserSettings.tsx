import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Input,
  FormControl,
  FormLabel,
  Alert,
  Avatar,
  Checkbox,
} from "@mui/joy";
import {
  updateProfile,
  getTwoFactorStatus,
  disableTwoFactor,
  regenerateRecoveryCodes,
  uploadProfilePicture,
  deleteProfilePicture,
  getProfilePictureBlob,
} from "../api";
import { useAuth } from "../contexts/AuthContext";
import TwoFactorSetup from "./TwoFactorSetup";

const UserSettings: React.FC = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Profile section states
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  
  // Password section states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Loading states
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [recoveryCodesLoading, setRecoveryCodesLoading] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  
  // Success/Error states
  const [error, setError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [twoFactorSuccess, setTwoFactorSuccess] = useState<string | null>(null);
  const [notificationSuccess, setNotificationSuccess] = useState<string | null>(null);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  
  // 2FA states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.two_factor_enabled || false);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  // Notification settings states
  const [emailNotifications, setEmailNotifications] = useState(user?.email_notifications || false);

  useEffect(() => {
    const fetchTwoFactorStatus = async () => {
      try {
        const status = await getTwoFactorStatus();
        setTwoFactorEnabled(status.enabled);
      } catch (err) {
        console.error("Failed to fetch 2FA status", err);
      }
    };

    const fetchProfilePicture = async () => {
      if (user?.has_profile_picture && user?.profile_picture_url) {
        try {
          // Remove /api/ prefix if it exists since the api client already includes it
          const cleanUrl = user.profile_picture_url.startsWith('/api/')
            ? user.profile_picture_url.substring(5) // Remove '/api/'
            : user.profile_picture_url;
          const blobUrl = await getProfilePictureBlob(cleanUrl);
          setProfilePictureUrl(blobUrl);
        } catch (err) {
          console.error("Failed to fetch profile picture", err);
        }
      } else {
        // Clear profile picture if user doesn't have one
        setProfilePictureUrl(null);
      }
    };

    fetchTwoFactorStatus();
    fetchProfilePicture();
  }, [user]);

  // Update form fields when user data becomes available
  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || "");
      setEmail(user.email || "");
      setTwoFactorEnabled(user.two_factor_enabled || false);
      setEmailNotifications(user.email_notifications || false);
    }
  }, [user]);

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All password fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long");
      return;
    }

    try {
      setPasswordLoading(true);
      clearMessages();
      await updateProfile({ password: newPassword });
      setPasswordSuccess("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError("Failed to update password");
      console.error(err);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleEnableTwoFactor = () => {
    clearMessages();
    setShowTwoFactorSetup(true);
  };

  const handleTwoFactorSetupSuccess = () => {
    setShowTwoFactorSetup(false);
    setTwoFactorEnabled(true);
    clearMessages();
    setTwoFactorSuccess("Two-factor authentication enabled successfully");
  };

  const handleDisableTwoFactor = async () => {
    if (!disableCode.trim()) {
      setError("2FA code is required");
      return;
    }

    try {
      setTwoFactorLoading(true);
      clearMessages();
      await disableTwoFactor(disableCode);
      setTwoFactorSuccess("2FA disable confirmation sent. Please check your email to complete the process.");
      setDisableCode("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to disable 2FA");
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleRegenerateRecoveryCodes = async () => {
    try {
      setRecoveryCodesLoading(true);
      clearMessages();
      const result = await regenerateRecoveryCodes();
      setRecoveryCodes(result.recovery_codes);
      setShowRecoveryCodes(true);
      setTwoFactorSuccess("New recovery codes generated successfully");
    } catch (err) {
      setError("Failed to regenerate recovery codes");
      console.error(err);
    } finally {
      setRecoveryCodesLoading(false);
    }
  };

  const clearMessages = () => {
    setError(null);
    setProfileSuccess(null);
    setPasswordSuccess(null);
    setTwoFactorSuccess(null);
  };

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProfilePictureFile(file);
      const previewUrl = URL.createObjectURL(file);
      setProfilePicturePreview(previewUrl);
    }
  };

  const getCurrentProfilePicture = () => {
    if (profilePicturePreview) return profilePicturePreview;
    if (profilePictureUrl) return profilePictureUrl;
    return undefined;
  };

  const handleUpdateProfile = async () => {
    const updates: { display_name?: string; email?: string } = {};
    let hasProfileUpdates = false;
    let hasPictureUpdate = !!profilePictureFile;

    if (displayName.trim() !== (user?.display_name || "")) {
      updates.display_name = displayName.trim();
      hasProfileUpdates = true;
    }

    if (email.trim() !== (user?.email || "")) {
      if (!email.trim()) {
        setError("Email is required");
        return;
      }
      updates.email = email.trim();
      hasProfileUpdates = true;
    }

    if (!hasProfileUpdates && !hasPictureUpdate) {
      setError("No changes to save");
      return;
    }

    try {
      setProfileLoading(true);
      clearMessages();

      // Upload profile picture first if one is selected
      if (hasPictureUpdate && profilePictureFile) {
        const uploadResult = await uploadProfilePicture(profilePictureFile);

        // Update the profile picture URL immediately from the upload response
        if (uploadResult.profile_picture_url) {
          // Remove /api/ prefix if it exists since the api client already includes it
          const cleanUrl = uploadResult.profile_picture_url.startsWith('/api/')
            ? uploadResult.profile_picture_url.substring(5) // Remove '/api/'
            : uploadResult.profile_picture_url;
          const blobUrl = await getProfilePictureBlob(cleanUrl);
          setProfilePictureUrl(blobUrl);
        }

        setProfilePictureFile(null);
        setProfilePicturePreview(null);
      }

      // Update profile info if there are changes
      if (hasProfileUpdates) {
        await updateProfile(updates);
      }

      // Set appropriate success message
      if (hasPictureUpdate && hasProfileUpdates) {
        setProfileSuccess("Profile updated successfully");
      } else if (hasPictureUpdate) {
        setProfileSuccess("Profile picture uploaded successfully");
      } else if (updates.email) {
        setProfileSuccess(
          "Email change confirmation sent. Please check your new email address to confirm the change."
        );
        setEmail(user?.email || ""); // Reset to current email
      } else {
        setProfileSuccess("Profile updated successfully");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleClearProfilePicture = async () => {
    try {
      setProfileLoading(true);
      clearMessages();

      await deleteProfilePicture();

      // Clear the profile picture from state
      setProfilePictureUrl(null);
      setProfilePictureFile(null);
      setProfilePicturePreview(null);

      setProfileSuccess("Profile picture cleared successfully");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to clear profile picture");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdateNotificationSettings = async (enabled: boolean) => {
    try {
      setNotificationLoading(true);
      // Clear notification-specific messages
      setNotificationSuccess(null);
      setNotificationError(null);

      await updateProfile({ email_notifications: enabled });
      setEmailNotifications(enabled);
      setNotificationSuccess("Notification settings updated successfully");
    } catch (err: any) {
      setNotificationError(err.response?.data?.error || "Failed to update notification settings");
      // Revert the checkbox state on error
      setEmailNotifications(!enabled);
    } finally {
      setNotificationLoading(false);
    }
  };

  const handleNotificationToggle = (checked: boolean) => {
    handleUpdateNotificationSettings(checked);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: "auto" }}>
      <Typography level="h2" sx={{ mb: 3 }}>
        Account Settings
      </Typography>

      {error && (
        <Alert color="danger" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Profile Settings - Combined Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography level="h3" sx={{ mb: 2 }}>
            Profile Information
          </Typography>
          
          {profileSuccess && (
            <Alert color="success" sx={{ mb: 2 }}>
              {profileSuccess}
            </Alert>
          )}

          {/* Profile Picture Section */}
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Avatar
              src={getCurrentProfilePicture()}
              size="lg"
              sx={{ 
                width: 100, 
                height: 100, 
                mx: 'auto', 
                mb: 2,
                cursor: 'pointer',
                position: 'relative',
                '&:hover': {
                  opacity: 0.8,
                  '&::after': {
                    content: '"Click to change"',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    fontSize: '12px',
                    borderRadius: '50%',
                  }
                }
              }}
              onClick={handleProfilePictureClick}
            >
              {user?.username?.[0]?.toUpperCase()}
            </Avatar>
            
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleProfilePictureChange}
            />
            
            {profilePictureFile && (
              <Box sx={{ textAlign: 'center', mt: 1 }}>
                <Typography level="body-sm">
                  Selected: {profilePictureFile.name}
                </Typography>
              </Box>
            )}

            {/* Clear Profile Picture Button - only show if user has a profile picture */}
            {(profilePictureUrl || user?.has_profile_picture) && !profilePictureFile && (
              <Box sx={{ textAlign: 'center', mt: 1 }}>
                <Button
                  size="sm"
                  color="danger"
                  variant="outlined"
                  onClick={handleClearProfilePicture}
                  loading={profileLoading}
                >
                  Clear Profile Picture
                </Button>
              </Box>
            )}
          </Box>

          {/* Display Name */}
          <FormControl sx={{ mb: 2 }}>
            <FormLabel>Display Name</FormLabel>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
            />
          </FormControl>

          {/* Email */}
          <FormControl sx={{ mb: 2 }}>
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </FormControl>

          <Button
            onClick={handleUpdateProfile}
            loading={profileLoading}
            disabled={
              displayName.trim() === (user?.display_name || "") &&
              email.trim() === (user?.email || "") &&
              !profilePictureFile
            }
          >
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Password Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography level="h3" sx={{ mb: 2 }}>
            Change Password
          </Typography>
          {passwordSuccess && (
            <Alert color="success" sx={{ mb: 2 }}>
              {passwordSuccess}
            </Alert>
          )}
          <FormControl sx={{ mb: 2 }}>
            <FormLabel>Current Password</FormLabel>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </FormControl>
          <FormControl sx={{ mb: 2 }}>
            <FormLabel>New Password</FormLabel>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </FormControl>
          <FormControl sx={{ mb: 2 }}>
            <FormLabel>Confirm New Password</FormLabel>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </FormControl>
          <Button
            onClick={handleUpdatePassword}
            loading={passwordLoading}
            disabled={!currentPassword || !newPassword || !confirmPassword}
          >
            Update Password
          </Button>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}

      {/* Two-Factor Authentication Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography level="h3" sx={{ mb: 2 }}>
            Two-Factor Authentication
          </Typography>
          {twoFactorSuccess && (
            <Alert color="success" sx={{ mb: 2 }}>
              {twoFactorSuccess}
            </Alert>
          )}
          
          {twoFactorEnabled ? (
            <>
              <Typography sx={{ mb: 2 }}>
                To disable 2FA, you'll need to enter a code from your authenticator app and confirm via email.
              </Typography>
              <FormControl sx={{ mb: 2 }}>
                <FormLabel>Enter 2FA Code</FormLabel>
                <Input
                  type="text"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  slotProps={{ input: { maxLength: 6 } }}
                />
              </FormControl>
              <Button
                onClick={handleDisableTwoFactor}
                loading={twoFactorLoading}
                disabled={disableCode.length !== 6}
                color="danger"
              >
                Disable 2FA
              </Button>
            </>
          ) : (
            <>
              <Typography sx={{ mb: 2 }}>
                Add an extra layer of security to your account by enabling two-factor authentication.
              </Typography>
              <Button
                onClick={handleEnableTwoFactor}
                loading={twoFactorLoading}
              >
                Enable 2FA
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recovery Codes Settings */}
      {twoFactorEnabled && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography level="h3" sx={{ mb: 2 }}>
              Recovery Codes
            </Typography>
            <Typography sx={{ mb: 2 }}>
              Recovery codes can be used to access your account if you lose your authenticator device. 
              Each code can only be used once.
            </Typography>
            
            {showRecoveryCodes && recoveryCodes.length > 0 && (
              <Alert color="warning" sx={{ mb: 2 }}>
                <strong>Important:</strong> Save these recovery codes in a safe place. They will not be shown again.
              </Alert>
            )}
            
            {showRecoveryCodes && recoveryCodes.length > 0 ? (
              <>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mb: 2 }}>
                  {recoveryCodes.map((code, index) => (
                    <Typography
                      key={index}
                      level="body-sm"
                      sx={{
                        fontFamily: 'monospace',
                        bgcolor: 'neutral.100',
                        p: 1,
                        borderRadius: 1,
                        textAlign: 'center',
                      }}
                    >
                      {code}
                    </Typography>
                  ))}
                </Box>
                <Button
                  onClick={() => setShowRecoveryCodes(false)}
                  variant="outlined"
                  sx={{ mr: 1 }}
                >
                  I've Saved These Codes
                </Button>
              </>
            ) : (
              <Button
                onClick={handleRegenerateRecoveryCodes}
                loading={recoveryCodesLoading}
              >
                Generate New Recovery Codes
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notification Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography level="h3" sx={{ mb: 2 }}>
            Notification Settings
          </Typography>
          
          {notificationSuccess && (
            <Alert color="success" sx={{ mb: 2 }}>
              {notificationSuccess}
            </Alert>
          )}
          
          {notificationError && (
            <Alert color="danger" sx={{ mb: 2 }}>
              {notificationError}
            </Alert>
          )}
          
          <Typography sx={{ mb: 2 }}>
            Choose how you want to be notified about activity on your posts and achievements.
          </Typography>
          <FormControl>
            <Checkbox
              label="Receive email notifications for achievements, comments, and likes"
              checked={emailNotifications}
              onChange={(e) => handleNotificationToggle(e.target.checked)}
              disabled={notificationLoading}
            />
          </FormControl>
        </CardContent>
      </Card>

      {showTwoFactorSetup && (
        <TwoFactorSetup
          onSuccess={handleTwoFactorSetupSuccess}
          onCancel={() => setShowTwoFactorSetup(false)}
        />
      )}
    </Box>
  );
};

export default UserSettings;