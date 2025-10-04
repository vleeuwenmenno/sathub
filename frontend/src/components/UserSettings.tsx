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
  Select,
  Option,
} from "@mui/joy";
import {
  updateProfile,
  getTwoFactorStatus,
  disableTwoFactor,
  regenerateRecoveryCodes,
  uploadProfilePicture,
  deleteProfilePicture,
  getProfilePictureUrl,
} from "../api";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../contexts/TranslationContext";
import { getSupportedLanguages } from "../utils/translations";
import TwoFactorSetup from "./TwoFactorSetup";

const UserSettings: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile section states
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(
    null
  );
  const [profilePicturePreview, setProfilePicturePreview] = useState<
    string | null
  >(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(
    null
  );

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
  const [notificationSuccess, setNotificationSuccess] = useState<string | null>(
    null
  );
  const [notificationError, setNotificationError] = useState<string | null>(
    null
  );

  // 2FA states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(
    user?.two_factor_enabled || false
  );
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  // Notification settings states
  const [emailNotifications, setEmailNotifications] = useState(
    user?.email_notifications || false
  );
  const [stationEmailNotifications, setStationEmailNotifications] = useState(
    user?.station_email_notifications ?? true
  );

  // Language settings states
  const [language, setLanguage] = useState(user?.language || "en");

  useEffect(() => {
    const fetchTwoFactorStatus = async () => {
      try {
        const status = await getTwoFactorStatus();
        setTwoFactorEnabled(status.enabled);
      } catch (err) {
        console.error("Failed to fetch 2FA status", err);
      }
    };

    const fetchProfilePicture = () => {
      if (user?.has_profile_picture && user?.profile_picture_url) {
        // Use direct image loading instead of fetch/XHR to avoid CORS issues
        setProfilePictureUrl(getProfilePictureUrl(user.profile_picture_url));
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
      setStationEmailNotifications(user.station_email_notifications ?? true);
      setLanguage(user.language || "en");
    }
  }, [user]);

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t("user.settings.errors.allPasswordFieldsRequired"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("user.settings.errors.passwordsDoNotMatch"));
      return;
    }

    if (newPassword.length < 6) {
      setError(t("user.settings.errors.passwordTooShort"));
      return;
    }

    try {
      setPasswordLoading(true);
      clearMessages();
      await updateProfile({ password: newPassword });
      setPasswordSuccess(t("user.settings.success.passwordUpdated"));
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
    setTwoFactorSuccess(t("user.settings.success.twoFactorEnabled"));
  };

  const handleDisableTwoFactor = async () => {
    if (!disableCode.trim()) {
      setError(t("user.settings.errors.twoFactorCodeRequired"));
      return;
    }

    try {
      setTwoFactorLoading(true);
      clearMessages();
      await disableTwoFactor(disableCode);
      setTwoFactorSuccess(
        t("user.settings.success.twoFactorDisableConfirmationSent")
      );
      setDisableCode("");
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          t("user.settings.errors.twoFactorDisableFailed")
      );
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
      setTwoFactorSuccess(t("user.settings.success.recoveryCodesGenerated"));
    } catch (err) {
      setError(t("user.settings.errors.recoveryCodesRegenerateFailed"));
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

  const handleProfilePictureChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
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
    const hasPictureUpdate = !!profilePictureFile;

    if (displayName.trim() !== (user?.display_name || "")) {
      updates.display_name = displayName.trim();
      hasProfileUpdates = true;
    }

    if (email.trim() !== (user?.email || "")) {
      if (!email.trim()) {
        setError(t("user.settings.errors.emailRequired"));
        return;
      }
      updates.email = email.trim();
      hasProfileUpdates = true;
    }

    if (!hasProfileUpdates && !hasPictureUpdate) {
      setError(t("user.settings.errors.noChanges"));
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
          setProfilePictureUrl(
            getProfilePictureUrl(uploadResult.profile_picture_url)
          );
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
        setProfileSuccess(t("user.settings.success.profileUpdated"));
      } else if (hasPictureUpdate) {
        setProfileSuccess(t("user.settings.success.profilePictureUploaded"));
      } else if (updates.email) {
        setProfileSuccess(
          t("user.settings.success.emailChangeConfirmationSent")
        );
        setEmail(user?.email || ""); // Reset to current email
      } else {
        setProfileSuccess(t("user.settings.success.profileUpdated"));
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          t("user.settings.errors.profileUpdateFailed")
      );
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

      setProfileSuccess(t("user.settings.success.profilePictureCleared"));
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          t("user.settings.errors.profilePictureClearFailed")
      );
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
      setNotificationSuccess(t("user.settings.success.notificationsUpdated"));
    } catch (err: any) {
      setNotificationError(
        err.response?.data?.error ||
          t("user.settings.errors.notificationsUpdateFailed")
      );
      // Revert the checkbox state on error
      setEmailNotifications(!enabled);
    } finally {
      setNotificationLoading(false);
    }
  };

  const handleNotificationToggle = (checked: boolean) => {
    handleUpdateNotificationSettings(checked);
  };

  const handleStationNotificationToggle = async (checked: boolean) => {
    try {
      setNotificationLoading(true);
      // Clear notification-specific messages
      setNotificationSuccess(null);
      setNotificationError(null);

      await updateProfile({ station_email_notifications: checked });
      setStationEmailNotifications(checked);
      setNotificationSuccess(
        t("user.settings.success.stationNotificationsUpdated")
      );
      // Refresh user data in context
      await refreshUser();
    } catch (err: any) {
      setNotificationError(
        err.response?.data?.error ||
          t("user.settings.errors.stationNotificationsUpdateFailed")
      );
      // Revert the checkbox state on error
      setStationEmailNotifications(!checked);
    } finally {
      setNotificationLoading(false);
    }
  };

  const handleLanguageChange = async (newLanguage: string) => {
    try {
      setNotificationLoading(true);
      // Clear notification-specific messages
      setNotificationSuccess(null);
      setNotificationError(null);

      await updateProfile({ language: newLanguage });
      setLanguage(newLanguage);
      setNotificationSuccess(t("user.settings.success.languageUpdated"));
      // Refresh user data in context
      await refreshUser();
    } catch (err: any) {
      setNotificationError(
        err.response?.data?.error ||
          t("user.settings.errors.languageUpdateFailed")
      );
      // Revert the select state on error
      setLanguage(user?.language || "en");
    } finally {
      setNotificationLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: "auto" }}>
      <Typography level="h2" sx={{ mb: 3 }}>
        {t("user.settings.title")}
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
            {t("user.settings.profileSection")}
          </Typography>

          {profileSuccess && (
            <Alert color="success" sx={{ mb: 2 }}>
              {profileSuccess}
            </Alert>
          )}

          {/* Profile Picture Section */}
          <Box sx={{ mb: 3, textAlign: "center" }}>
            <Avatar
              src={getCurrentProfilePicture()}
              size="lg"
              sx={{
                width: 100,
                height: 100,
                mx: "auto",
                mb: 2,
                cursor: "pointer",
                position: "relative",
                "&:hover": {
                  opacity: 0.8,
                  "&::after": {
                    content: `"${t(
                      "user.settings.profilePicture.clickToChange"
                    )}"`,
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    color: "white",
                    fontSize: "12px",
                    borderRadius: "50%",
                  },
                },
              }}
              onClick={handleProfilePictureClick}
            >
              {user?.username?.[0]?.toUpperCase()}
            </Avatar>

            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept="image/*"
              onChange={handleProfilePictureChange}
            />

            {profilePictureFile && (
              <Box sx={{ textAlign: "center", mt: 1 }}>
                <Typography level="body-sm">
                  {t("user.settings.profilePicture.selected")}{" "}
                  {profilePictureFile.name}
                </Typography>
              </Box>
            )}

            {/* Clear Profile Picture Button - only show if user has a profile picture */}
            {(profilePictureUrl || user?.has_profile_picture) &&
              !profilePictureFile && (
                <Box sx={{ textAlign: "center", mt: 1 }}>
                  <Button
                    size="sm"
                    color="danger"
                    variant="outlined"
                    onClick={handleClearProfilePicture}
                    loading={profileLoading}
                  >
                    {t("user.settings.profilePicture.clear")}
                  </Button>
                </Box>
              )}
          </Box>

          {/* Display Name */}
          <FormControl sx={{ mb: 2 }}>
            <FormLabel>{t("user.settings.displayName")}</FormLabel>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("user.settings.displayNamePlaceholder")}
            />
          </FormControl>

          {/* Email */}
          <FormControl sx={{ mb: 2 }}>
            <FormLabel>{t("user.settings.email")}</FormLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("user.settings.emailPlaceholder")}
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
            {t("user.settings.saveChanges")}
          </Button>
        </CardContent>
      </Card>

      {/* Password Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography level="h3" sx={{ mb: 2 }}>
            {t("user.settings.passwordSection")}
          </Typography>
          {passwordSuccess && (
            <Alert color="success" sx={{ mb: 2 }}>
              {passwordSuccess}
            </Alert>
          )}
          <FormControl sx={{ mb: 2 }}>
            <FormLabel>{t("user.settings.currentPassword")}</FormLabel>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={t("user.settings.currentPasswordPlaceholder")}
            />
          </FormControl>
          <FormControl sx={{ mb: 2 }}>
            <FormLabel>{t("user.settings.newPassword")}</FormLabel>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t("user.settings.newPasswordPlaceholder")}
            />
          </FormControl>
          <FormControl sx={{ mb: 2 }}>
            <FormLabel>{t("user.settings.confirmPassword")}</FormLabel>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("user.settings.confirmPasswordPlaceholder")}
            />
          </FormControl>
          <Button
            onClick={handleUpdatePassword}
            loading={passwordLoading}
            disabled={!currentPassword || !newPassword || !confirmPassword}
          >
            {t("user.settings.updatePassword")}
          </Button>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}

      {/* Two-Factor Authentication Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography level="h3" sx={{ mb: 2 }}>
            {t("user.settings.twoFactorSection")}
          </Typography>
          {twoFactorSuccess && (
            <Alert color="success" sx={{ mb: 2 }}>
              {twoFactorSuccess}
            </Alert>
          )}

          {twoFactorEnabled ? (
            <>
              <Typography sx={{ mb: 2 }}>
                {t("user.settings.twoFactorDisableInstructions")}
              </Typography>
              <FormControl sx={{ mb: 2 }}>
                <FormLabel>{t("user.settings.twoFactorCode")}</FormLabel>
                <Input
                  type="text"
                  value={disableCode}
                  onChange={(e) =>
                    setDisableCode(
                      e.target.value.replace(/\D/g, "").slice(0, 6)
                    )
                  }
                  placeholder={t("user.settings.twoFactorCodePlaceholder")}
                  slotProps={{ input: { maxLength: 6 } }}
                />
              </FormControl>
              <Button
                onClick={handleDisableTwoFactor}
                loading={twoFactorLoading}
                disabled={disableCode.length !== 6}
                color="danger"
              >
                {t("user.settings.disable2FA")}
              </Button>
            </>
          ) : (
            <>
              <Typography sx={{ mb: 2 }}>
                {t("user.settings.twoFactorEnableDescription")}
              </Typography>
              <Button
                onClick={handleEnableTwoFactor}
                loading={twoFactorLoading}
              >
                {t("user.settings.enable2FA")}
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
              {t("user.settings.recoveryCodesSection")}
            </Typography>
            <Typography sx={{ mb: 2 }}>
              {t("user.settings.recoveryCodesDescription")}
            </Typography>

            {showRecoveryCodes && recoveryCodes.length > 0 && (
              <Alert color="warning" sx={{ mb: 2 }}>
                <strong>{t("user.settings.recoveryCodesImportant")}</strong>{" "}
                {t("user.settings.recoveryCodesSaveWarning")}
              </Alert>
            )}

            {showRecoveryCodes && recoveryCodes.length > 0 ? (
              <>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 1,
                    mb: 2,
                  }}
                >
                  {recoveryCodes.map((code, index) => (
                    <Typography
                      key={index}
                      level="body-sm"
                      sx={{
                        fontFamily: "monospace",
                        bgcolor: "neutral.100",
                        p: 1,
                        borderRadius: 1,
                        textAlign: "center",
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
                  {t("user.settings.recoveryCodesSaved")}
                </Button>
              </>
            ) : (
              <Button
                onClick={handleRegenerateRecoveryCodes}
                loading={recoveryCodesLoading}
              >
                {t("user.settings.generateRecoveryCodes")}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notification Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography level="h3" sx={{ mb: 2 }}>
            {t("user.settings.notificationsSection")}
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
            {t("user.settings.notificationsDescription")}
          </Typography>
          <FormControl sx={{ mb: 2 }}>
            <Checkbox
              label={t("user.settings.emailNotificationsAchievements")}
              checked={emailNotifications}
              onChange={(e) => handleNotificationToggle(e.target.checked)}
              disabled={notificationLoading}
            />
          </FormControl>
          <FormControl>
            <Checkbox
              label={t("user.settings.emailNotificationsStations")}
              checked={stationEmailNotifications}
              onChange={(e) =>
                handleStationNotificationToggle(e.target.checked)
              }
              disabled={notificationLoading}
            />
          </FormControl>
        </CardContent>
      </Card>

      {/* Language Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography level="h3" sx={{ mb: 2 }}>
            {t("user.settings.languageSection")}
          </Typography>

          <Typography sx={{ mb: 2 }}>
            {t("user.settings.languageDescription")}
          </Typography>

          <FormControl>
            <FormLabel>{t("user.settings.language")}</FormLabel>
            <Select
              value={language}
              onChange={(_, value) => value && handleLanguageChange(value)}
              disabled={notificationLoading}
            >
              {getSupportedLanguages().map((lang) => (
                <Option key={lang.code} value={lang.code}>
                  {lang.name}
                </Option>
              ))}
            </Select>
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
