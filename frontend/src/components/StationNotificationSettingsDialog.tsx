import React, { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Modal,
  ModalDialog,
  ModalClose,
  Typography,
  Box,
  Stack,
  Button,
  FormControl,
  FormLabel,
  Input,
  Switch,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  IconButton,
  Chip,
} from "@mui/joy";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import {
  getStationNotificationSettings,
  updateStationNotificationSettings,
  type StationNotificationRule,
} from "../api";
import { useAuth } from "../contexts/AuthContext";

interface StationNotificationSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  stationId: string;
  stationName: string;
}

const StationNotificationSettingsDialog: React.FC<
  StationNotificationSettingsDialogProps
> = ({ open, onClose, stationId, stationName }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Form state - array of rules
  const [rules, setRules] = useState<StationNotificationRule[]>([]);

  useEffect(() => {
    if (open && stationId) {
      loadSettings();
    } else if (!open) {
      // Reset state when dialog closes
      setRules([]);
      setError(null);
      setHasChanges(false);
    }
  }, [open, stationId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStationNotificationSettings(stationId);

      // Initialize form state with existing rules
      setRules(data.rules || []);
      setHasChanges(false);
    } catch (err: any) {
      setError(
        err.response?.data?.error || "Failed to load notification settings"
      );
    } finally {
      setLoading(false);
    }
  };

  const addRule = (type: "down_minutes" | "back_online" | "low_uptime") => {
    // Only check for existing back_online rules (limit to one)
    if (type === "back_online") {
      const existingBackOnline = rules.find(
        (rule: StationNotificationRule) => rule.type === "back_online"
      );
      if (existingBackOnline) {
        setError("Only one Back Online notification is allowed per station");
        return;
      }
    }

    // Clear any previous errors
    setError(null);

    const newRule: StationNotificationRule = {
      id: `temp-${Date.now()}`,
      type,
      enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Set default thresholds
    if (type === "down_minutes") {
      newRule.threshold = 30;
    } else if (type === "low_uptime") {
      newRule.threshold = 80;
    }

    setRules([...rules, newRule]);
    setHasChanges(true);
  };

  const updateRule = (
    index: number,
    updates: Partial<StationNotificationRule>
  ) => {
    const updatedRules = [...rules];
    updatedRules[index] = { ...updatedRules[index], ...updates };
    setRules(updatedRules);
    setHasChanges(true);
  };

  const removeRule = (index: number) => {
    const updatedRules = rules.filter((_, i) => i !== index);
    setRules(updatedRules);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Validate rules
      for (const rule of rules) {
        if (
          rule.type === "down_minutes" &&
          (!rule.threshold || rule.threshold < 1)
        ) {
          setError("Down notification minutes must be at least 1");
          return;
        }
        if (
          rule.type === "low_uptime" &&
          (!rule.threshold || rule.threshold < 1 || rule.threshold > 100)
        ) {
          setError("Low uptime percentage must be between 1 and 100");
          return;
        }
      }

      // Remove temp IDs for new rules
      const cleanRules: StationNotificationRule[] = rules.map(
        (rule: StationNotificationRule) => {
          if (rule.id?.startsWith("temp-")) {
            const { id, ...ruleWithoutId } = rule;
            return ruleWithoutId as StationNotificationRule;
          }
          return rule;
        }
      );

      const updatedSettings = await updateStationNotificationSettings(
        stationId,
        cleanRules
      );
      setRules(updatedSettings.rules);
      setHasChanges(false);
    } catch (err: any) {
      setError(
        err.response?.data?.error || "Failed to save notification settings"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      if (
        window.confirm(
          "You have unsaved changes. Are you sure you want to close?"
        )
      ) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const getRuleTypeLabel = (type: string) => {
    switch (type) {
      case "down_minutes":
        return "Station Down";
      case "back_online":
        return "Back Online";
      case "low_uptime":
        return "Low Uptime";
      default:
        return type;
    }
  };

  const getRuleDescription = (type: string) => {
    switch (type) {
      case "down_minutes":
        return "Notify when station is down for X minutes";
      case "back_online":
        return "Notify when station comes back online";
      case "low_uptime":
        return "Notify when 24h uptime drops below X%";
      default:
        return "";
    }
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <ModalDialog
        sx={{
          maxWidth: 600,
          width: "90vw",
          maxHeight: "80vh",
          overflow: "auto",
        }}
      >
        <ModalClose />
        <Typography level="h4" sx={{ mb: 1 }}>
          Notification Settings
        </Typography>
        <Typography level="body-sm" color="neutral" sx={{ mb: 3 }}>
          Configure alerts for station "{stationName}"
        </Typography>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert color="danger" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : (
          <Stack spacing={3}>
            {/* Warning for disabled email notifications */}
            {user && user.station_email_notifications === false && (
              <Alert color="warning">
                <Typography>
                  <strong>Note:</strong> Station email notifications are
                  currently disabled in your profile settings. You will only
                  receive in-app notifications for station health alerts. You
                  can enable email notifications in your{" "}
                  <RouterLink
                    to="/user/settings"
                    style={{
                      fontWeight: "bold",
                      color: "var(--joy-palette-primary-main)",
                    }}
                  >
                    Account Settings
                  </RouterLink>
                  .
                </Typography>
              </Alert>
            )}

            {/* Existing Rules */}
            {rules.map((rule, index) => (
              <Card key={rule.id} variant="outlined">
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      mb: 2,
                    }}
                  >
                    <Box>
                      <Typography level="title-sm">
                        {getRuleTypeLabel(rule.type)}
                      </Typography>
                      <Typography level="body-xs" color="neutral">
                        {getRuleDescription(rule.type)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Chip
                        size="sm"
                        color={rule.enabled ? "success" : "neutral"}
                        variant="soft"
                      >
                        {rule.enabled ? "Enabled" : "Disabled"}
                      </Chip>
                      <IconButton
                        size="sm"
                        color="danger"
                        onClick={() => removeRule(index)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  <Stack spacing={2}>
                    {/* Enable/Disable Switch */}
                    <FormControl>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <FormLabel>Enable this notification</FormLabel>
                        <Switch
                          checked={rule.enabled}
                          onChange={(e) =>
                            updateRule(index, { enabled: e.target.checked })
                          }
                        />
                      </Box>
                    </FormControl>

                    {/* Threshold Input for applicable rules */}
                    {(rule.type === "down_minutes" ||
                      rule.type === "low_uptime") && (
                      <FormControl>
                        <FormLabel>
                          {rule.type === "down_minutes"
                            ? "Minutes down:"
                            : "Uptime threshold (%):"}
                        </FormLabel>
                        <Input
                          type="number"
                          value={rule.threshold || ""}
                          onChange={(e) =>
                            updateRule(index, {
                              threshold: parseInt(e.target.value) || undefined,
                            })
                          }
                          slotProps={{
                            input: {
                              min: 1,
                              max: rule.type === "low_uptime" ? 100 : undefined,
                            },
                          }}
                        />
                      </FormControl>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            ))}

            {/* Add New Rule */}
            <Card variant="soft">
              <CardContent>
                <Typography level="title-sm" sx={{ mb: 2 }}>
                  Add New Notification
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Button
                    size="sm"
                    variant="outlined"
                    startDecorator={<AddIcon />}
                    onClick={() => addRule("down_minutes")}
                  >
                    Station Down Alert
                  </Button>
                  <Button
                    size="sm"
                    variant="outlined"
                    startDecorator={<AddIcon />}
                    onClick={() => addRule("back_online")}
                  >
                    Back Online Alert
                  </Button>
                  <Button
                    size="sm"
                    variant="outlined"
                    startDecorator={<AddIcon />}
                    onClick={() => addRule("low_uptime")}
                  >
                    Low Uptime Alert
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Box
              sx={{
                display: "flex",
                gap: 2,
                justifyContent: "flex-end",
                pt: 2,
              }}
            >
              <Button variant="plain" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="solid"
                color="primary"
                loading={saving}
                disabled={!hasChanges}
                onClick={handleSave}
              >
                Save Settings
              </Button>
            </Box>
          </Stack>
        )}
      </ModalDialog>
    </Modal>
  );
};

export default StationNotificationSettingsDialog;
