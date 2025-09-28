import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Switch,
  Box,
  Alert,
  CircularProgress,
  Divider,
} from "@mui/joy";
import { getRegistrationSettings, updateRegistrationSettings, getApprovalSettings, updateApprovalSettings } from "../api";

const AdminRegistrationSettings: React.FC = () => {
  const [disabled, setDisabled] = useState(false);
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updatingApproval, setUpdatingApproval] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const [registrationData, approvalData] = await Promise.all([
          getRegistrationSettings(),
          getApprovalSettings()
        ]);
        setDisabled(registrationData.disabled);
        setApprovalRequired(approvalData.required);
        setError(null);
        setApprovalError(null);
      } catch (err) {
        setError("Failed to load settings");
        setApprovalError("Failed to load approval settings");
        console.error("Error fetching settings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleToggle = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const switchChecked = event.target.checked;
    const newDisabled = !switchChecked; // If switch is checked, registration is enabled (not disabled)
    setUpdating(true);
    setError(null);

    try {
      await updateRegistrationSettings(newDisabled);
      setDisabled(newDisabled);
    } catch (err) {
      setError("Failed to update registration settings");
      console.error("Error updating registration settings:", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleApprovalToggle = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const switchChecked = event.target.checked;
    const newRequired = switchChecked; // If switch is checked, approval is required
    setUpdatingApproval(true);
    setApprovalError(null);

    try {
      await updateApprovalSettings(newRequired);
      setApprovalRequired(newRequired);
    } catch (err) {
      setApprovalError("Failed to update approval settings");
      console.error("Error updating approval settings:", err);
    } finally {
      setUpdatingApproval(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
            <CircularProgress size="sm" />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography level="h4" sx={{ mb: 2 }}>
          Registration Settings
        </Typography>

        {error && (
          <Alert color="danger" variant="soft" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Switch
            checked={!disabled}
            onChange={handleToggle}
            disabled={updating}
            color={disabled ? "danger" : "success"}
          />

          <Box>
            <Typography level="body-md">
              New user registrations
            </Typography>
            <Typography level="body-sm" color="neutral">
              {disabled ? "Disabled" : "Enabled"}
            </Typography>
          </Box>

          {updating && <CircularProgress size="sm" />}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Switch
            checked={approvalRequired}
            onChange={handleApprovalToggle}
            disabled={updatingApproval}
            color={approvalRequired ? "warning" : "success"}
          />

          <Box>
            <Typography level="body-md">
              Admin approval required
            </Typography>
            <Typography level="body-sm" color="neutral">
              {approvalRequired ? "Enabled - New users need approval" : "Disabled - New users auto-approved"}
            </Typography>
          </Box>

          {updatingApproval && <CircularProgress size="sm" />}
        </Box>

        {approvalError && (
          <Alert color="danger" variant="soft" sx={{ mt: 1 }}>
            {approvalError}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminRegistrationSettings;