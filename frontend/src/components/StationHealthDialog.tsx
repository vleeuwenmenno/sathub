import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Modal,
  ModalDialog,
  Typography,
  Box,
  Stack,
  Select,
  Option,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Divider,
  Table,
} from "@mui/joy";
import { Close as CloseIcon } from "@mui/icons-material";
import { LineChart } from "@mui/x-charts/LineChart";
import { getStationUptime, type StationUptimeData } from "../api";

interface StationHealthDialogProps {
  open: boolean;
  onClose: () => void;
  stationId: string;
  stationName: string;
}

const StationHealthDialog: React.FC<StationHealthDialogProps> = ({
  open,
  onClose,
  stationId,
  stationName,
}) => {
  const [uptimeData, setUptimeData] = useState<StationUptimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(1);
  const [chartWidth, setChartWidth] = useState(800);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate chart width based on container
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth - 40; // Account for padding
        setChartWidth(width);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [open]);

  useEffect(() => {
    if (!open) return;

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
  }, [stationId, days, open]);

  const calculateStats = (data: StationUptimeData) => {
    const totalEvents = data.data.length;
    const onlineEvents = data.data.filter((d) => d.event === "online").length;

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
        const lastEventTime = new Date(
          data.data[data.data.length - 1].timestamp
        ).getTime();
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

      uptimePercentage =
        totalPeriodMs > 0 ? (onlineTimeMs / totalPeriodMs) * 100 : 0;
    }

    // Calculate time since last check-in
    let timeSinceLastCheckIn = null;
    if (data.data.length > 0) {
      const lastEventTime = new Date(data.data[data.data.length - 1].timestamp).getTime();
      timeSinceLastCheckIn = new Date().getTime() - lastEventTime;
    }

    // Calculate average time between check-ins
    if (data.data.length < 2) {
      return { totalEvents, onlineEvents, uptimePercentage, timeSinceLastCheckIn, avgInterval: null };
    }

    const timestamps = data.data.map((d) => new Date(d.timestamp).getTime());
    const intervals = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }
    const avgInterval =
      intervals.reduce((a, b) => a + b, 0) / intervals.length;

    // Find longest gap
    const longestGap = Math.max(...intervals);

    return {
      totalEvents,
      onlineEvents,
      uptimePercentage,
      timeSinceLastCheckIn,
      avgInterval,
      longestGap,
    };
  };

  const formatInterval = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Prepare chart data for MUI X Charts
  const chartData = useMemo(() => {
    if (!uptimeData || uptimeData.data.length === 0) return null;

    // Create timeline data showing online/offline status over time
    const timelineData: { time: Date; status: number; label: string }[] = [];
    
    uptimeData.data.forEach((event) => {
      timelineData.push({
        time: new Date(event.timestamp),
        status: event.event === "online" ? 1 : 0,
        label: event.event,
      });
    });

    // Create interval data (time between check-ins)
    const intervalData: { time: Date; interval: number }[] = [];
    for (let i = 1; i < uptimeData.data.length; i++) {
      const currentTime = new Date(uptimeData.data[i].timestamp).getTime();
      const prevTime = new Date(uptimeData.data[i - 1].timestamp).getTime();
      const intervalMinutes = (currentTime - prevTime) / (1000 * 60); // Convert to minutes
      
      intervalData.push({
        time: new Date(uptimeData.data[i].timestamp),
        interval: intervalMinutes,
      });
    }

    return { timelineData, intervalData };
  }, [uptimeData]);

  const stats = uptimeData ? calculateStats(uptimeData) : null;

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        ref={containerRef}
        sx={{
          maxWidth: 900,
          width: "90vw",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography level="h3">Station Health Details</Typography>
          <IconButton variant="plain" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>

        <Typography level="body-md" color="neutral" sx={{ mb: 2 }}>
          {stationName}
        </Typography>

        <Divider sx={{ mb: 2 }} />

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert color="danger">{error}</Alert>
        ) : (
          <Stack spacing={3}>
            {/* Time Range Selector */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography level="title-md">Time Period</Typography>
              <Select
                value={days}
                onChange={(_, value) => value && setDays(value)}
                sx={{ minWidth: 150 }}
              >
                <Option value={1}>Last 24 hours</Option>
                <Option value={3}>Last 3 days</Option>
                <Option value={7}>Last 7 days</Option>
              </Select>
            </Box>

            {/* Statistics Cards */}
            {stats && (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2, bgcolor: "background.level1", borderRadius: "md" }}>
                  <Typography level="body-sm" color="neutral">
                    Check-ins
                  </Typography>
                  <Typography level="h3">{stats.totalEvents}</Typography>
                </Box>

                <Box sx={{ p: 2, bgcolor: "background.level1", borderRadius: "md" }}>
                  <Typography level="body-sm" color="neutral">
                    Uptime
                  </Typography>
                  <Typography level="h3">
                    <Chip
                      size="lg"
                      color={
                        stats.uptimePercentage > 80
                          ? "success"
                          : stats.uptimePercentage > 50
                          ? "warning"
                          : "danger"
                      }
                      variant="soft"
                    >
                      {stats.uptimePercentage.toFixed(1)}%
                    </Chip>
                  </Typography>
                </Box>

                {stats.timeSinceLastCheckIn && (
                  <Box sx={{ p: 2, bgcolor: "background.level1", borderRadius: "md" }}>
                    <Typography level="body-sm" color="neutral">
                      Time Since Last Check-in
                    </Typography>
                    <Typography level="h4" fontWeight="bold">
                      {formatInterval(stats.timeSinceLastCheckIn)}
                    </Typography>
                  </Box>
                )}

                {stats.avgInterval && (
                  <Box sx={{ p: 2, bgcolor: "background.level1", borderRadius: "md" }}>
                    <Typography level="body-sm" color="neutral">
                      Avg. Interval
                    </Typography>
                    <Typography level="h4" fontWeight="bold">
                      {formatInterval(stats.avgInterval)}
                    </Typography>
                  </Box>
                )}

                {stats.longestGap && (
                  <Box sx={{ p: 2, bgcolor: "background.level1", borderRadius: "md" }}>
                    <Typography level="body-sm" color="neutral">
                      Longest Gap
                    </Typography>
                    <Typography level="h4" fontWeight="bold">
                      {formatInterval(stats.longestGap)}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {/* Health Status Timeline Chart */}
            {chartData && chartData.timelineData.length > 0 && (
              <Box>
                <Typography level="title-md" sx={{ mb: 2 }}>
                  Health Status Timeline
                </Typography>
                <Box
                  sx={{
                    bgcolor: "background.level1",
                    borderRadius: "md",
                    p: 2,
                    width: "100%",
                  }}
                >
                  <Box sx={{ width: "100%", height: 300 }}>
                    <LineChart
                      width={chartWidth}
                      height={300}
                      series={[
                        {
                          data: chartData.timelineData.map((d) => d.status),
                          label: "Status",
                          color: "#2e7d32",
                          showMark: true,
                          curve: "stepAfter",
                        },
                      ]}
                      xAxis={[
                        {
                          data: chartData.timelineData.map((d) => d.time),
                          scaleType: "time",
                          valueFormatter: (value: Date) => {
                            const date = new Date(value);
                            return date.toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            });
                          },
                        },
                      ]}
                      yAxis={[
                        {
                          label: "Status",
                          min: -0.1,
                          max: 1.1,
                          valueFormatter: (value: number) => (value === 1 ? "Online" : "Offline"),
                        },
                      ]}
                      grid={{ horizontal: true }}
                      margin={{ left: 70, right: 30, top: 20, bottom: 80 }}
                    />
                  </Box>
                </Box>
              </Box>
            )}

            {/* Check-in Interval Chart */}
            {chartData && chartData.intervalData.length > 0 && (
              <Box>
                <Typography level="title-md" sx={{ mb: 2 }}>
                  Time Between Check-ins
                </Typography>
                <Typography level="body-sm" color="neutral" sx={{ mb: 1 }}>
                  Shows how frequently the station reports its health status
                </Typography>
                <Box
                  sx={{
                    bgcolor: "background.level1",
                    borderRadius: "md",
                    p: 2,
                    width: "100%",
                  }}
                >
                  <Box sx={{ width: "100%", height: 300 }}>
                    <LineChart
                      width={chartWidth}
                      height={300}
                      series={[
                        {
                          data: chartData.intervalData.map((d) => d.interval),
                          label: "Interval (minutes)",
                          color: "#1976d2",
                          showMark: true,
                          area: true,
                        },
                      ]}
                      xAxis={[
                        {
                          data: chartData.intervalData.map((d) => d.time),
                          scaleType: "time",
                          valueFormatter: (value: Date) => {
                            const date = new Date(value);
                            return date.toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            });
                          },
                        },
                      ]}
                      yAxis={[
                        {
                          label: "Interval (minutes)",
                        },
                      ]}
                      grid={{ horizontal: true }}
                      margin={{ left: 70, right: 30, top: 20, bottom: 80 }}
                    />
                  </Box>
                </Box>
              </Box>
            )}

            {/* Recent Events Table */}
            {uptimeData && uptimeData.data.length > 0 && (
              <Box>
                <Typography level="title-md" sx={{ mb: 2 }}>
                  Recent Events (Last 10)
                </Typography>
                <Box sx={{ overflowX: "auto" }}>
                  <Table>
                    <thead>
                      <tr>
                        <th style={{ width: "50%" }}>Timestamp</th>
                        <th style={{ width: "25%" }}>Status</th>
                        <th style={{ width: "25%" }}>Time Since Previous</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uptimeData.data
                        .slice(-10)
                        .reverse()
                        .map((event, i) => {
                          const reversedIndex = uptimeData.data.length - 1 - i;
                          const prevEvent =
                            reversedIndex > 0
                              ? uptimeData.data[reversedIndex - 1]
                              : null;
                          const timeDiff = prevEvent
                            ? new Date(event.timestamp).getTime() -
                              new Date(prevEvent.timestamp).getTime()
                            : null;

                          return (
                            <tr key={reversedIndex}>
                              <td>{formatDateTime(event.timestamp)}</td>
                              <td>
                                <Chip
                                  size="sm"
                                  color={
                                    event.event === "online" ? "success" : "danger"
                                  }
                                  variant="soft"
                                >
                                  {event.event}
                                </Chip>
                              </td>
                              <td>
                                {timeDiff ? formatInterval(timeDiff) : "—"}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </Table>
                </Box>
              </Box>
            )}

            {uptimeData && uptimeData.data.length === 0 && (
              <Alert color="neutral">No health check data available for this period.</Alert>
            )}
          </Stack>
        )}
      </ModalDialog>
    </Modal>
  );
};

export default StationHealthDialog;
