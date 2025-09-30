import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  Select,
  Option,
  CircularProgress,
  Alert,
  Chip,
  Button,
} from "@mui/joy";
import { BarChart as BarChartIcon, Notifications as NotificationsIcon } from "@mui/icons-material";
import { getStationUptime, type StationUptimeData } from "../api";
import StationHealthDialog from "./StationHealthDialog";
import StationNotificationSettingsDialog from "./StationNotificationSettingsDialog";

interface StationHealthGraphProps {
  stationId: string;
  stationName?: string;
}

const StationHealthGraph: React.FC<StationHealthGraphProps> = ({ stationId, stationName }) => {
  const [uptimeData, setUptimeData] = useState<StationUptimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);

  useEffect(() => {
    const loadUptimeData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getStationUptime(stationId, days);
        setUptimeData(data);
      } catch (err) {
        setError("Failed to load station health data");
        console.error("Error loading uptime data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadUptimeData();
  }, [stationId, days]);

  const calculateStats = (data: StationUptimeData) => {
    const totalEvents = data.data.length;
    const onlineEvents = data.data.filter(d => d.event === 'online').length;

    // Calculate proper uptime percentage based on time periods and online threshold
    let uptimePercentage = 0;
    if (data.data.length > 0) {
      const now = new Date().getTime();
      const startTime = new Date(data.data[0].timestamp).getTime();
      const totalPeriodMs = now - startTime;
      
      let onlineTimeMs = 0;
      
      // Calculate online time between consecutive events
      for (let i = 0; i < data.data.length - 1; i++) {
        const currentTime = new Date(data.data[i].timestamp).getTime();
        const nextTime = new Date(data.data[i + 1].timestamp).getTime();
        const gapMs = nextTime - currentTime;
        const thresholdMs = data.online_threshold * 60 * 1000; // Convert minutes to milliseconds
        
        if (gapMs <= thresholdMs) {
          // Station was online for the entire gap
          onlineTimeMs += gapMs;
        } else {
          // Station was online for threshold minutes, then offline
          onlineTimeMs += thresholdMs;
        }
      }
      
      // Handle the current period from last event to now
      if (data.data.length > 0) {
        const lastEventTime = new Date(data.data[data.data.length - 1].timestamp).getTime();
        const timeSinceLastEvent = now - lastEventTime;
        const thresholdMs = data.online_threshold * 60 * 1000;
        
        if (timeSinceLastEvent <= thresholdMs) {
          // Station is currently online
          onlineTimeMs += timeSinceLastEvent;
        } else {
          // Station went offline after threshold
          onlineTimeMs += thresholdMs;
        }
      }
      
      uptimePercentage = totalPeriodMs > 0 ? (onlineTimeMs / totalPeriodMs) * 100 : 0;
    }

    // Calculate average time between check-ins
    if (data.data.length < 2) {
      return { totalEvents, onlineEvents, uptimePercentage, avgInterval: null };
    }

    const timestamps = data.data.map(d => new Date(d.timestamp).getTime());
    const intervals = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    return { totalEvents, onlineEvents, uptimePercentage, avgInterval };
  };

  const formatInterval = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography level="title-md" sx={{ mb: 2 }}>
            Station Health
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <CircularProgress size="sm" />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography level="title-md" sx={{ mb: 2 }}>
            Station Health
          </Typography>
          <Alert color="warning" size="sm">
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const stats = uptimeData ? calculateStats(uptimeData) : null;

  return (
    <>
      <StationHealthDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        stationId={stationId}
        stationName={stationName || "Station"}
      />
      <StationNotificationSettingsDialog
        open={notificationDialogOpen}
        onClose={() => setNotificationDialogOpen(false)}
        stationId={stationId}
        stationName={stationName || "Station"}
      />
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography level="title-md">
                Station Health
              </Typography>
              <Select
                size="sm"
                value={days}
                onChange={(_: any, value: number | null) => value && setDays(value)}
                sx={{ minWidth: 120 }}
              >
                <Option value={1}>Last 24h</Option>
                <Option value={3}>Last 3 days</Option>
                <Option value={7}>Last 7 days</Option>
              </Select>
            </Box>

          {stats && (
            <Stack spacing={1.5}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography level="body-sm">Check-ins:</Typography>
                <Typography level="body-sm" fontWeight="bold">
                  {stats.totalEvents}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography level="body-sm">Uptime:</Typography>
                <Chip
                  size="sm"
                  color={stats.uptimePercentage > 80 ? "success" : stats.uptimePercentage > 50 ? "warning" : "danger"}
                  variant="soft"
                >
                  {stats.uptimePercentage.toFixed(1)}%
                </Chip>
              </Box>

              {stats.avgInterval && (
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography level="body-sm">Avg. interval:</Typography>
                  <Typography level="body-sm" fontWeight="bold">
                    {formatInterval(stats.avgInterval)}
                  </Typography>
                </Box>
              )}

              {/* Simple timeline visualization */}
              <Box sx={{ mt: 2 }}>
                <Typography level="body-sm" sx={{ mb: 1 }}>
                  Recent Activity:
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {uptimeData.data.slice(-20).map((event: { timestamp: string; event: string }, index: number) => (
                    <Box
                      key={index}
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: event.event === 'online' ? 'success.solidBg' : 'danger.solidBg',
                        flexShrink: 0,
                      }}
                      title={`${event.event} at ${new Date(event.timestamp).toLocaleString()}`}
                    />
                  ))}
                </Box>
                {uptimeData.data.length > 20 && (
                  <Typography level="body-xs" color="neutral" sx={{ mt: 0.5 }}>
                    Showing last 20 events
                  </Typography>
                )}
              </Box>

              {/* Action Buttons */}
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  fullWidth
                  variant="soft"
                  color="primary"
                  startDecorator={<BarChartIcon />}
                  onClick={() => setDialogOpen(true)}
                >
                  View Detailed Health Graph
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  color="neutral"
                  startDecorator={<NotificationsIcon />}
                  onClick={() => setNotificationDialogOpen(true)}
                >
                  Notification Settings
                </Button>
              </Box>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
    </>
  );
};

export default StationHealthGraph;