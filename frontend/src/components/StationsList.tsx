import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Box,
  Stack,
  Modal,
  ModalDialog,
  ModalClose,
  Input,
  Alert,
  IconButton,
  Tooltip,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  AccordionGroup,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Divider,
} from "@mui/joy";
import {
  Delete,
  Edit,
  Add,
  VpnKey,
  Refresh,
  ContentCopy,
  Download,
} from "@mui/icons-material";
import type { Station } from "../api";
import { getApiBaseUrl } from "../config";
import {
  getStations,
  deleteStation,
  getStationToken,
  regenerateStationToken,
  updateStation,
  getStationPictureBlob,
} from "../api";

const formatLastSeen = (station: Station): string => {
  if (station.is_online) {
    return "ONLINE";
  }
  if (!station.last_seen) {
    return "Never seen";
  }

  const lastSeen = new Date(station.last_seen);
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return "Just now";
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
};

const formatFullTimestamp = (station: Station): string => {
  if (!station.last_seen) {
    return "Never seen";
  }

  const date = new Date(station.last_seen);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${day}.${month}.${year} ${hours}:${minutes}`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
};

const StationsList: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    station: Station | null;
    confirmationText: string;
  }>({
    open: false,
    station: null,
    confirmationText: "",
  });
  const [tokenDialog, setTokenDialog] = useState<{
    open: boolean;
    station: Station | null;
    token: string;
    loading: boolean;
  }>({
    open: false,
    station: null,
    token: "",
    loading: false,
  });
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());

  const baseUrl = getApiBaseUrl();
  const isDevelopment = baseUrl.includes("sathub.local") || baseUrl.includes("localhost");
  const curlInsecureFlag = isDevelopment ? " --insecure" : "";

  const copyWithFeedback = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems((prev) => new Set(prev).add(itemId));
      setTimeout(() => {
        setCopiedItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }, 2000); // Remove feedback after 2 seconds
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const navigate = useNavigate();

  const loadStations = async () => {
    try {
      setLoading(true);
      const data = await getStations();
      setStations(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load stations");
    } finally {
      setLoading(false);
    }
  };

  const [imageBlobs, setImageBlobs] = useState<Record<string, string>>({});

  useEffect(() => {
    loadStations();
  }, []);

  useEffect(() => {
    const loadImages = async () => {
      if (!stations.length) return;

      const newImageBlobs: Record<string, string> = {};

      for (const station of stations) {
        if (station.has_picture && station.picture_url) {
          try {
            const blobUrl = await getStationPictureBlob(station.picture_url);
            newImageBlobs[`${station.id}-picture`] = blobUrl;
          } catch (error) {
            console.error(
              "Failed to load image for station",
              station.id,
              error,
            );
          }
        }
      }

      setImageBlobs(newImageBlobs);
    };

    loadImages();
  }, [stations]);

  const handleDelete = async (station: Station) => {
    try {
      await deleteStation(station.id);
      setStations(stations.filter((s) => s.id !== station.id));
      setDeleteDialog({ open: false, station: null, confirmationText: "" });
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to delete station");
    }
  };

  const handleShowToken = async (station: Station) => {
    try {
      const token = await getStationToken(station.id);
      setTokenDialog({ open: true, station, token, loading: false });
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to get station token");
    }
  };

  const handleRegenerateToken = async () => {
    if (!tokenDialog.station) return;
    try {
      setTokenDialog({ ...tokenDialog, loading: true });
      // Add artificial delay to make it look like processing
      await new Promise((resolve) => setTimeout(resolve, 500));
      const newToken = await regenerateStationToken(tokenDialog.station.id);
      setTokenDialog({ ...tokenDialog, token: newToken, loading: false });
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to regenerate token");
      setTokenDialog({ ...tokenDialog, loading: false });
    }
  };

  const handleToggleVisibility = async (station: Station) => {
    try {
      await updateStation(station.id, {
        name: station.name,
        location: station.location,
        equipment: station.equipment,
        is_public: !station.is_public,
      });
      // Update local state
      setStations(
        stations.map((s) =>
          s.id === station.id ? { ...s, is_public: !s.is_public } : s,
        ),
      );
    } catch (err: any) {
      setError(
        err.response?.data?.error || "Failed to update station visibility",
      );
    }
  };

  if (loading) return <Typography>Loading stations...</Typography>;
  if (error) return <Alert color="danger">{error}</Alert>;

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, maxWidth: "1400px", mx: "auto" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography level="h2">My Stations</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => navigate("/stations/global")}
            size="lg"
          >
            View All Stations
          </Button>
          <Button
            startDecorator={<Add />}
            onClick={() => navigate("/stations/new")}
            size="lg"
          >
            Add Station
          </Button>
        </Box>
      </Box>

      {stations.length === 0 ? (
        <Card>
          <CardContent>
            <Typography level="body-lg" sx={{ textAlign: "center", py: 4 }}>
              No stations found. Create your first station to get started.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {stations.map((station) => (
            <Grid key={station.id} xs={12} sm={6} lg={4}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "lg",
                    cursor: "pointer",
                  },
                }}
                onClick={() => navigate(`/station/${station.id}`)}
              >
                {imageBlobs[`${station.id}-picture`] && (
                  <Box
                    sx={{
                      position: "relative",
                      height: 200,
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={imageBlobs[`${station.id}-picture`]}
                      alt={station.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </Box>
                )}
                <CardContent
                  sx={{ flex: 1, display: "flex", flexDirection: "column" }}
                >
                  <Typography level="h4" sx={{ mb: 1 }}>
                    {station.name}
                  </Typography>
                  <Stack spacing={0.5} sx={{ mb: 2, flex: 1 }}>
                    <Typography
                      level="body-sm"
                      startDecorator={<span>📍</span>}
                    >
                      {station.location}
                    </Typography>
                    {station.equipment && (
                      <Typography
                        level="body-sm"
                        startDecorator={<span>🔧</span>}
                      >
                        {station.equipment.length > 50
                          ? `${station.equipment.substring(0, 50)}...`
                          : station.equipment}
                      </Typography>
                    )}
                    <Typography
                      level="body-sm"
                      startDecorator={<span>📅</span>}
                    >
                      Created{" "}
                      {formatDate(station.created_at)}
                    </Typography>
                    <Typography
                      level="body-sm"
                      startDecorator={
                        station.is_public ? <span>🌐</span> : <span>🔒</span>
                      }
                    >
                      {station.is_public ? "Public" : "Private"}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography
                        level="body-sm"
                        startDecorator={<span>📡</span>}
                      >
                        Status:
                      </Typography>
                      <Tooltip title={formatFullTimestamp(station)}>
                        <Chip
                          size="sm"
                          variant="soft"
                          color={
                            station.is_online
                              ? "success"
                              : station.last_seen
                              ? "warning"
                              : "neutral"
                          }
                        >
                          {formatLastSeen(station)}
                        </Chip>
                      </Tooltip>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ mt: "auto" }}>
                    <Tooltip
                      title={station.is_public ? "Make Private" : "Make Public"}
                    >
                      <IconButton
                        size="sm"
                        variant="outlined"
                        color={station.is_public ? "success" : "neutral"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleVisibility(station);
                        }}
                      >
                        {station.is_public ? <span>🌐</span> : <span>🔒</span>}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Station API Token">
                      <IconButton
                        size="sm"
                        variant="outlined"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShowToken(station);
                        }}
                      >
                        <VpnKey />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Edit Station">
                      <IconButton
                        size="sm"
                        variant="outlined"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/stations/${station.id}/edit`);
                        }}
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Station">
                      <IconButton
                        size="sm"
                        variant="outlined"
                        color="danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteDialog({
                            open: true,
                            station,
                            confirmationText: "",
                          });
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Delete Confirmation Dialog */}
      <Modal
        open={deleteDialog.open}
        onClose={() =>
          setDeleteDialog({ open: false, station: null, confirmationText: "" })
        }
      >
        <ModalDialog>
          <ModalClose />
          <Typography level="h4">Delete Station</Typography>
          <Typography>
            Are you sure you want to delete "{deleteDialog.station?.name}"? This
            action cannot be undone.
          </Typography>
          <Typography level="body-sm" sx={{ mt: 2, mb: 1 }}>
            To confirm deletion, type the station name:{" "}
            <strong>{deleteDialog.station?.name}</strong>
          </Typography>
          <Input
            fullWidth
            placeholder="Type station name here"
            value={deleteDialog.confirmationText}
            onChange={(e) =>
              setDeleteDialog({
                ...deleteDialog,
                confirmationText: e.target.value,
              })
            }
            sx={{ mb: 2 }}
          />
          <Box
            sx={{ display: "flex", gap: 1, justifyContent: "flex-end", pt: 2 }}
          >
            <Button
              variant="plain"
              onClick={() =>
                setDeleteDialog({
                  open: false,
                  station: null,
                  confirmationText: "",
                })
              }
            >
              Cancel
            </Button>
            <Button
              color="danger"
              disabled={
                deleteDialog.confirmationText !== deleteDialog.station?.name
              }
              onClick={() =>
                deleteDialog.station && handleDelete(deleteDialog.station)
              }
            >
              Delete
            </Button>
          </Box>
        </ModalDialog>
      </Modal>

      {/* Token Display Dialog */}
      <Modal
        open={tokenDialog.open}
        onClose={() =>
          setTokenDialog({
            open: false,
            station: null,
            token: "",
            loading: false,
          })
        }
      >
        <ModalDialog sx={{ maxWidth: 700, maxHeight: "90vh", overflow: "auto" }}>
          <ModalClose />
          <Typography level="h4">
            Station API Token - {tokenDialog.station?.name}
          </Typography>
          
          <Tabs defaultValue={0} sx={{ mt: 2 }}>
            <TabList>
              <Tab>🚀 Quick Start</Tab>
              <Tab>⚙️ Developer API</Tab>
            </TabList>
            
            <TabPanel value={0} sx={{ p: 3 }}>
              <Typography level="body-lg" sx={{ mb: 2 }}>
                Get started with the SatHub client to automatically upload satellite data from your ground station.
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography level="title-md" sx={{ mb: 1 }}>
                📥 Step 1: Download the SatHub Client
              </Typography>
              <Typography level="body-sm" sx={{ mb: 2 }}>
                Download the latest client for your platform:
              </Typography>
              <Button
                component="a"
                href="https://github.com/vleeuwenmenno/sathub/releases"
                target="_blank"
                startDecorator={<Download />}
                fullWidth
                sx={{ mb: 3 }}
              >
                Download from GitHub Releases
              </Button>

              <Divider sx={{ my: 2 }} />

              <Typography level="title-md" sx={{ mb: 1 }}>
                🔑 Step 2: Your Station API Token
              </Typography>
              <Typography level="body-sm" sx={{ mb: 1 }}>
                Copy your unique station token. You'll need this to connect the client to your station.
              </Typography>
              <Alert color="warning" sx={{ mb: 2 }}>
                <Typography level="body-sm">
                  ⚠️ Keep this token secure! Anyone with this token can upload data to your station.
                </Typography>
              </Alert>
              <Input
                fullWidth
                value={tokenDialog.token}
                readOnly
                disabled={tokenDialog.loading}
                onClick={(e: any) => e.target.select()}
                endDecorator={
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Tooltip title={copiedItems.has('quickstart-token') ? "Copied!" : "Copy to Clipboard"}>
                      <IconButton
                        size="sm"
                        color={copiedItems.has('quickstart-token') ? "success" : "neutral"}
                        onClick={() => copyWithFeedback(tokenDialog.token, 'quickstart-token')}
                      >
                        {copiedItems.has('quickstart-token') ? <span>✓</span> : <ContentCopy />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Regenerate Token">
                      <IconButton
                        size="sm"
                        color="warning"
                        loading={tokenDialog.loading}
                        onClick={handleRegenerateToken}
                      >
                        <Refresh />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
                sx={{ mb: 3 }}
              />

              <Divider sx={{ my: 2 }} />

              <Typography level="title-md" sx={{ mb: 1 }}>
                🚀 Step 3: Run the Client
              </Typography>
              <Typography level="body-sm" sx={{ mb: 1 }}>
                For detailed setup instructions and configuration options, visit:
              </Typography>
              <Button
                component="a"
                href="https://github.com/vleeuwenmenno/sathub?tab=readme-ov-file#quick-setup"
                target="_blank"
                variant="outlined"
                fullWidth
              >
                📖 View Setup Guide on GitHub
              </Button>
            </TabPanel>

            <TabPanel value={1} sx={{ p: 3 }}>
              <Typography level="body-sm" sx={{ mb: 2 }}>
                This API token allows external applications and satellite ground stations to authenticate with your station for uploading data and health monitoring. Keep it secure and regenerate if compromised.
              </Typography>

              <Typography level="title-md" sx={{ mb: 1 }}>
                Available API Endpoints
              </Typography>
              <AccordionGroup sx={{ mb: 2 }}>
                <Accordion>
                  <AccordionSummary>
                    <Typography level="body-sm" fontWeight="bold">
                      POST {baseUrl}/api/posts
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography level="body-xs" sx={{ color: "text.secondary", mb: 1 }}>
                      Create new satellite data posts. Send JSON payload with satellite data.
                    </Typography>
                    <Typography level="body-xs" fontWeight="bold" sx={{ mb: 0.5 }}>
                      cURL Example:
                    </Typography>
                    <Box sx={{ position: "relative" }}>
                      <Box
                        component="pre"
                        sx={{
                          backgroundColor: "background.level1",
                          padding: 1,
                          borderRadius: 1,
                          fontSize: "0.75rem",
                          overflow: "auto",
                          mb: 1,
                          pr: 4,
                        }}
                      >
{`curl${curlInsecureFlag} -X POST \\
  -H "Authorization: Station ${tokenDialog.token}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "timestamp": "2024-01-01T12:00:00Z",
    "satellite_name": "NOAA 19",
    "metadata": "{\\"frequency\\": 137.1}",
    "data": {
      "cbor_path": "/path/to/data.cbor",
      "info": { "key": "value" }
    }
  }' \\
  ${baseUrl}/api/posts`}
                      </Box>
                      <IconButton
                        size="sm"
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          backgroundColor: "background.surface",
                          "&:hover": { backgroundColor: "background.level2" },
                        }}
                        onClick={() => copyWithFeedback(`curl${curlInsecureFlag} -X POST \\
  -H "Authorization: Station ${tokenDialog.token}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "timestamp": "2024-01-01T12:00:00Z",
    "satellite_name": "NOAA 19",
    "metadata": "{\\"frequency\\": 137.1}",
    "data": {
      "cbor_path": "/path/to/data.cbor",
      "info": { "key": "value" }
    }
  }' \\
  ${baseUrl}/api/posts`, 'posts-curl')}
                      >
                        {copiedItems.has('posts-curl') ? <span>✓</span> : <ContentCopy fontSize="small" />}
                      </IconButton>
                    </Box>
                  </AccordionDetails>
                </Accordion>

                <Accordion>
                  <AccordionSummary>
                    <Typography level="body-sm" fontWeight="bold">
                      POST {baseUrl}/api/posts/{"{postId}"}/images
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography level="body-xs" sx={{ color: "text.secondary", mb: 1 }}>
                      Upload images for existing posts. Use multipart/form-data with 'image' field.
                    </Typography>
                    <Typography level="body-xs" fontWeight="bold" sx={{ mb: 0.5 }}>
                      cURL Example:
                    </Typography>
                    <Box sx={{ position: "relative" }}>
                      <Box
                        component="pre"
                        sx={{
                          backgroundColor: "background.level1",
                          padding: 1,
                          borderRadius: 1,
                          fontSize: "0.75rem",
                          overflow: "auto",
                          mb: 1,
                          pr: 4,
                        }}
                      >
{`curl${curlInsecureFlag} -X POST \\
  -H "Authorization: Station ${tokenDialog.token}" \\
  -F "image=@/path/to/image.png" \\
  ${baseUrl}/api/posts/123/images`}
                      </Box>
                      <IconButton
                        size="sm"
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          backgroundColor: "background.surface",
                          "&:hover": { backgroundColor: "background.level2" },
                        }}
                        onClick={() => copyWithFeedback(`curl${curlInsecureFlag} -X POST \\
  -H "Authorization: Station ${tokenDialog.token}" \\
  -F "image=@/path/to/image.png" \\
  ${baseUrl}/api/posts/123/images`, 'images-curl')}
                      >
                        {copiedItems.has('images-curl') ? <span>✓</span> : <ContentCopy fontSize="small" />}
                      </IconButton>
                    </Box>
                    <Typography level="body-xs" sx={{ color: "text.secondary" }}>
                      <strong>Content-Type:</strong> multipart/form-data
                    </Typography>
                  </AccordionDetails>
                </Accordion>

                <Accordion>
                  <AccordionSummary>
                    <Typography level="body-sm" fontWeight="bold">
                      POST {baseUrl}/api/stations/health
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography level="body-xs" sx={{ color: "text.secondary", mb: 1 }}>
                      Health check endpoint. Call periodically to indicate station is online.
                    </Typography>
                    <Typography level="body-xs" fontWeight="bold" sx={{ mb: 0.5 }}>
                      cURL Example:
                    </Typography>
                    <Box sx={{ position: "relative" }}>
                      <Box
                        component="pre"
                        sx={{
                          backgroundColor: "background.level1",
                          padding: 1,
                          borderRadius: 1,
                          fontSize: "0.75rem",
                          overflow: "auto",
                          mb: 1,
                          pr: 4,
                        }}
                      >
{`curl${curlInsecureFlag} -X POST \\
  -H "Authorization: Station ${tokenDialog.token}" \\
  ${baseUrl}/api/stations/health`}
                      </Box>
                      <IconButton
                        size="sm"
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          backgroundColor: "background.surface",
                          "&:hover": { backgroundColor: "background.level2" },
                        }}
                        onClick={() => copyWithFeedback(`curl${curlInsecureFlag} -X POST \\
  -H "Authorization: Station ${tokenDialog.token}" \\
  ${baseUrl}/api/stations/health`, 'health-curl')}
                      >
                        {copiedItems.has('health-curl') ? <span>✓</span> : <ContentCopy fontSize="small" />}
                      </IconButton>
                    </Box>
                    <Typography level="body-xs" fontWeight="bold" sx={{ mb: 0.5 }}>
                      Cron Job Example (every 5 minutes):
                    </Typography>
                    <Box sx={{ position: "relative" }}>
                      <Box
                        component="pre"
                        sx={{
                          backgroundColor: "background.level1",
                          padding: 1,
                          borderRadius: 1,
                          fontSize: "0.75rem",
                          overflow: "auto",
                          mb: 1,
                          pr: 4,
                        }}
                      >
{`*/5 * * * * curl${curlInsecureFlag} -X POST \\
  -H "Authorization: Station ${tokenDialog.token}" \\
  ${baseUrl}/api/stations/health`}
                      </Box>
                      <IconButton
                        size="sm"
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          backgroundColor: "background.surface",
                          "&:hover": { backgroundColor: "background.level2" },
                        }}
                        onClick={() => copyWithFeedback(`*/5 * * * * curl${curlInsecureFlag} -X POST \\
  -H "Authorization: Station ${tokenDialog.token}" \\
  ${baseUrl}/api/stations/health`, 'health-cron')}
                      >
                        {copiedItems.has('health-cron') ? <span>✓</span> : <ContentCopy fontSize="small" />}
                      </IconButton>
                    </Box>
                    <Typography level="body-xs" sx={{ color: "text.secondary" }}>
                      This updates the station's "last seen" timestamp. Stations are considered online if last seen within the configured threshold (default: 5 minutes).
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              </AccordionGroup>

              <Typography level="title-md" sx={{ mb: 1 }}>
                Environment Variables (Bash)
              </Typography>
              <Typography level="body-sm" sx={{ mb: 1 }}>
                Copy these export statements to set up your station scripts:
              </Typography>
              <Box sx={{ position: "relative", mb: 2 }}>
                <Box
                  component="pre"
                  sx={{
                    backgroundColor: "background.level1",
                    padding: 1,
                    borderRadius: 1,
                    fontSize: "0.75rem",
                    overflow: "auto",
                    mb: 1,
                    pr: 4,
                  }}
                >
{`export STATION_TOKEN="${tokenDialog.token}"
export API_URL="${baseUrl}"
export HEALTH_CHECK_INTERVAL="300"
export WATCH_PATHS="./data"
export PROCESS_DELAY="10"`}
                </Box>
                <IconButton
                  size="sm"
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    backgroundColor: "background.surface",
                    "&:hover": { backgroundColor: "background.level2" },
                  }}
                  onClick={() => copyWithFeedback(`export STATION_TOKEN="${tokenDialog.token}"
export API_URL="${baseUrl}"
export HEALTH_CHECK_INTERVAL="300"
export WATCH_PATHS="./data"
export PROCESS_DELAY="10"`, 'env-vars')}
                >
                  {copiedItems.has('env-vars') ? <span>✓</span> : <ContentCopy fontSize="small" />}
                </IconButton>
              </Box>

              <Typography level="title-md" sx={{ mb: 1 }}>
                Authentication
              </Typography>
              <Typography level="body-sm" sx={{ mb: 2 }}>
                Include the token in the Authorization header:{" "}
                <code>Station {tokenDialog.token}</code>
              </Typography>

              <Input
                fullWidth
                value={tokenDialog.token}
                readOnly
                disabled={tokenDialog.loading}
                onClick={(e: any) => e.target.select()}
                endDecorator={
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Tooltip title={copiedItems.has('developer-token') ? "Copied!" : "Copy to Clipboard"}>
                      <IconButton
                        size="sm"
                        color={copiedItems.has('developer-token') ? "success" : "neutral"}
                        onClick={() => copyWithFeedback(tokenDialog.token, 'developer-token')}
                      >
                        {copiedItems.has('developer-token') ? <span>✓</span> : <ContentCopy />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Regenerate Token">
                      <IconButton
                        size="sm"
                        color="warning"
                        loading={tokenDialog.loading}
                        onClick={handleRegenerateToken}
                      >
                        <Refresh />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
                sx={{ mb: 2 }}
              />
            </TabPanel>
          </Tabs>
        </ModalDialog>
      </Modal>
    </Box>
  );
};

export default StationsList;
