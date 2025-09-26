import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
} from "@mui/joy";
import {
  updateProfile,
  getTwoFactorStatus,
  disableTwoFactor,
} from "../api";
import { useAuth } from "../contexts/AuthContext";
import TwoFactorSetup from "./TwoFactorSetup";

const UserSettings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [twoFactorSuccess, setTwoFactorSuccess] = useState<string | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.two_factor_enabled || false);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [disableCode, setDisableCode] = useState("");

  useEffect(() => {
    const fetchTwoFactorStatus = async () => {
      try {
        const status = await getTwoFactorStatus();
        setTwoFactorEnabled(status.enabled);
      } catch (err) {
        console.error("Failed to fetch 2FA status", err);
      }
    };

    fetchTwoFactorStatus();
  }, []);

  const handleUpdateEmail = async () => {
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (email.trim() === user?.email) {
      setError("New email is the same as current email");
      return;
    }

    try {
      setEmailLoading(true);
      setError(null);
      setPasswordSuccess(null);
      setTwoFactorSuccess(null);
      setEmailSuccess(null);
      await updateProfile({ email: email.trim() });
      setEmailSuccess(
        "Email change confirmation sent. Please check your new email address to confirm the change."
      );
      // Clear the email field to show it's not updated yet
      setEmail(user?.email || "");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to request email change");
      console.error(err);
    } finally {
      setEmailLoading(false);
    }
  };

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
      setError(null);
      setEmailSuccess(null);
      setTwoFactorSuccess(null);
      setPasswordSuccess(null);
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
    setError(null);
    setEmailSuccess(null);
    setPasswordSuccess(null);
    setTwoFactorSuccess(null);
    setShowTwoFactorSetup(true);
  };

  const handleTwoFactorSetupSuccess = () => {
    setShowTwoFactorSetup(false);
    setTwoFactorEnabled(true);
    setError(null);
    setEmailSuccess(null);
    setPasswordSuccess(null);
    setTwoFactorSuccess("Two-factor authentication enabled successfully");
  };

  const handleDisableTwoFactor = async () => {
    if (!disableCode.trim()) {
      setError("2FA code is required");
      return;
    }

    try {
      setTwoFactorLoading(true);
      setError(null);
      setEmailSuccess(null);
      setPasswordSuccess(null);
      setTwoFactorSuccess(null);
      await disableTwoFactor(disableCode);
      setTwoFactorSuccess("2FA disable confirmation sent. Please check your email to complete the process.");
      setDisableCode("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to disable 2FA");
    } finally {
      setTwoFactorLoading(false);
    }
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

      {/* Email Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography level="h3" sx={{ mb: 2 }}>
            Email Address
          </Typography>
          {emailSuccess && (
            <Alert color="success" sx={{ mb: 2 }}>
              {emailSuccess}
            </Alert>
          )}
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
            onClick={handleUpdateEmail}
            loading={emailLoading}
            disabled={!email.trim() || email === user?.email}
          >
            Update Email
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