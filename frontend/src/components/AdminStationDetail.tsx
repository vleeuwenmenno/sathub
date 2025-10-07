import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Stack,
  CircularProgress,
  Alert,
  Button,
  Chip,
} from '@mui/joy';
import { ArrowBack as ArrowBackIcon, LocationOn as LocationOnIcon, Delete as DeleteIcon, VisibilityOff as VisibilityOffIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import type { Station } from '../api';
import { getStationDetails, getStationUptime, getStationPictureBlob, getProfilePictureUrl, adminHideStation, adminDeleteStation } from '../api';

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${day}.${month}.${year} ${hours}:${minutes}`;
};

const AdminStationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [station, setStation] = useState<Station | null>(null);
  const [uptimeData, setUptimeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stationImageBlob, setStationImageBlob] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchStationDetail = async () => {
      try {
        setLoading(true);
        const stationData = await getStationDetails(id);
        setStation(stationData);

        // Fetch uptime data
        try {
          const uptime = await getStationUptime(id);
          setUptimeData(uptime);
        } catch (uptimeErr) {
          console.warn('Could not load uptime data:', uptimeErr);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load station details');
      } finally {
        setLoading(false);
      }
    };

    fetchStationDetail();
  }, [id]);

  useEffect(() => {
    if (!station?.has_picture || !station?.picture_url) return;

    const loadStationPicture = async () => {
      try {
        const blobUrl = await getStationPictureBlob(station.picture_url!);
        setStationImageBlob(blobUrl);
      } catch (error) {
        console.error('Failed to load station picture:', error);
      }
    };

    loadStationPicture();
  }, [station]);

  const handleDeleteStation = async () => {
    if (!station || !window.confirm(`Are you sure you want to delete the station "${station.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(true);
      await adminDeleteStation(station.id);
      navigate('/admin/stations');
    } catch (err) {
      setError('Failed to delete station');
      console.error('Error deleting station:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleHideStation = async () => {
    if (!station) return;

    const action = station.hidden ? 'unhide this station' : 'hide this station';
    if (!window.confirm(`Are you sure you want to ${action}?`)) {
      return;
    }

    try {
      setHiding(true);
      await adminHideStation(station.id, !station.hidden);
      // Refresh station data
      const updatedStation = await getStationDetails(station.id);
      setStation(updatedStation);
    } catch (err) {
      setError(`Failed to ${action}`);
      console.error('Error hiding station:', err);
    } finally {
      setHiding(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !station) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert color="danger">
          {error || 'Station not found'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, maxWidth: '1400px', mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button
          variant="outlined"
          startDecorator={<ArrowBackIcon />}
          onClick={() => navigate('/admin/stations')}
        >
          Back to Stations
        </Button>
        <Typography level="h2">
          Station Details: {station.name}
        </Typography>
        <Chip size="sm" color="primary" variant="soft">
          ID: {station.id}
        </Chip>
      </Box>

      {error && (
        <Alert color="danger" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Station Information */}
        <Grid xs={12} lg={6}>
          <Stack spacing={2}>
            {/* Basic Station Info */}
            <Card>
              <CardContent>
                <Typography level="h3" sx={{ mb: 2 }}>
                  Station Information
                </Typography>
                <Stack spacing={1}>
                  <Box>
                    <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Station ID:</Typography>
                    <Typography level="body-sm" sx={{ fontFamily: 'monospace' }}>{station.id}</Typography>
                  </Box>
                  <Box>
                    <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Name:</Typography>
                    <Typography level="body-sm">{station.name}</Typography>
                  </Box>
                  <Box>
                    <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Location:</Typography>
                    <Typography level="body-sm">{station.location}</Typography>
                  </Box>
                  <Box>
                    <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Equipment:</Typography>
                    <Typography level="body-sm">{station.equipment}</Typography>
                  </Box>
                  <Box>
                    <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Created:</Typography>
                    <Typography level="body-sm">{formatDate(station.created_at)}</Typography>
                  </Box>
                  <Box>
                    <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Updated:</Typography>
                    <Typography level="body-sm">{formatDate(station.updated_at)}</Typography>
                  </Box>
                  <Box>
                    <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Visibility:</Typography>
                    <Typography level="body-sm" color={station.hidden ? "warning" : "success"}>
                      {station.hidden ? "Hidden" : "Visible"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Status:</Typography>
                    <Typography level="body-sm" color={station.is_online ? "success" : "danger"}>
                      {station.is_online ? "Online" : "Offline"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Online Threshold:</Typography>
                    <Typography level="body-sm">{station.online_threshold} minutes</Typography>
                  </Box>
                  {station.last_seen && (
                    <Box>
                      <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Last Seen:</Typography>
                      <Typography level="body-sm">{formatDate(station.last_seen)}</Typography>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Coordinates */}
            {(station.latitude && station.longitude) && (
              <Card>
                <CardContent>
                  <Typography level="h3" sx={{ mb: 2 }}>
                    Coordinates
                  </Typography>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOnIcon sx={{ color: 'primary.500' }} />
                      <Typography level="body-sm">
                        {station.latitude.toFixed(6)}, {station.longitude.toFixed(6)}
                      </Typography>
                    </Box>
                    <Typography level="body-xs" color="neutral">
                      {isRoughLocation(station.latitude, station.longitude) ? 'Approximate location' : 'Precise location'}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Station Owner */}
            {station.user && (
              <Card>
                <CardContent>
                  <Typography level="h3" sx={{ mb: 2 }}>
                    Station Owner
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        overflow: "hidden",
                        bgcolor: "neutral.softBg",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {station.user.has_profile_picture && station.user.profile_picture_url ? (
                        <img
                          src={getProfilePictureUrl(station.user.profile_picture_url)}
                          alt={`${station.user.username}'s profile`}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <Typography level="h3" color="neutral">
                          {station.user.username.charAt(0).toUpperCase()}
                        </Typography>
                      )}
                    </Box>
                    <Box>
                      <Typography level="body-lg" fontWeight="bold">
                        {station.user.display_name || station.user.username}
                      </Typography>
                      <Typography level="body-sm" color="neutral">
                        @{station.user.username}
                      </Typography>
                      <Typography level="body-sm" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                        UUID: {station.user.id}
                      </Typography>
                      <Button
                        size="sm"
                        variant="outlined"
                        sx={{ mt: 1 }}
                        onClick={() => navigate(`/admin/users/${station.user.id}`)}
                      >
                        View User Details
                      </Button>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Stack>
        </Grid>

        {/* Station Picture and Additional Info */}
        <Grid xs={12} lg={6}>
          <Stack spacing={2}>
            {/* Station Picture */}
            <Card>
              <CardContent>
                <Typography level="h3" sx={{ mb: 2 }}>
                  Station Picture
                </Typography>
                {station.has_picture && stationImageBlob ? (
                  <Box
                    sx={{
                      width: '100%',
                      height: 300,
                      borderRadius: '8px',
                      overflow: 'hidden',
                      bgcolor: 'neutral.softBg'
                    }}
                  >
                    <img
                      src={stationImageBlob}
                      alt={`${station.name} station`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </Box>
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      height: 200,
                      borderRadius: '8px',
                      bgcolor: 'neutral.softBg',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Typography level="body-lg" color="neutral">
                      No picture available
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Uptime Information */}
            {uptimeData && (
              <Card>
                <CardContent>
                  <Typography level="h3" sx={{ mb: 2 }}>
                    Uptime Information (Last {uptimeData.days} days)
                  </Typography>
                  <Stack spacing={1}>
                    <Typography level="body-md">
                      <strong>Station ID:</strong> {uptimeData.station_id}
                    </Typography>
                    <Typography level="body-md">
                      <strong>Online Threshold:</strong> {uptimeData.online_threshold} minutes
                    </Typography>
                    <Typography level="body-md">
                      <strong>Events:</strong> {uptimeData.data.length}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Admin Actions */}
            <Card>
              <CardContent>
                <Typography level="h3" sx={{ mb: 2 }}>Admin Actions</Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/admin/stations')}
                    startDecorator={<ArrowBackIcon />}
                  >
                    Back to List
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate(`/station/${station.id}`)}
                  >
                    View Public Station
                  </Button>
                  <Button
                    variant="soft"
                    color={station.hidden ? "success" : "warning"}
                    onClick={handleHideStation}
                    disabled={hiding}
                    startDecorator={station.hidden ? <VisibilityIcon /> : <VisibilityOffIcon />}
                  >
                    {hiding ? 'Updating...' : (station.hidden ? 'Unhide Station' : 'Hide Station')}
                  </Button>
                  <Button
                    color="danger"
                    variant="soft"
                    onClick={handleDeleteStation}
                    disabled={deleting}
                    startDecorator={<DeleteIcon />}
                  >
                    {deleting ? 'Deleting...' : 'Delete Station'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

// Helper function to check if coordinates are rough
const isRoughLocation = (lat: number, lng: number): boolean => {
  const latStr = lat.toString();
  const lngStr = lng.toString();

  const latDecimals = latStr.split('.')[1]?.length || 0;
  const lngDecimals = lngStr.split('.')[1]?.length || 0;

  return latDecimals <= 2 && lngDecimals <= 2;
};

export default AdminStationDetail;