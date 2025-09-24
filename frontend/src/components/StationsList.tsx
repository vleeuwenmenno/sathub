import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/joy';
import { Delete, Edit, Add, VpnKey, Refresh } from '@mui/icons-material';
import type { Station } from '../api';
import { getStations, deleteStation, getStationToken, regenerateStationToken, updateStation, getStationPictureBlob } from '../api';

const StationsList: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; station: Station | null; confirmationText: string }>({
    open: false,
    station: null,
    confirmationText: '',
  });
  const [tokenDialog, setTokenDialog] = useState<{ open: boolean; station: Station | null; token: string }>({
    open: false,
    station: null,
    token: '',
  });
  const navigate = useNavigate();

  const loadStations = async () => {
    try {
      setLoading(true);
      const data = await getStations();
      setStations(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load stations');
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
            console.error('Failed to load image for station', station.id, error);
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
      setStations(stations.filter(s => s.id !== station.id));
      setDeleteDialog({ open: false, station: null, confirmationText: '' });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete station');
    }
  };

  const handleShowToken = async (station: Station) => {
    try {
      const token = await getStationToken(station.id);
      setTokenDialog({ open: true, station, token });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to get station token');
    }
  };

  const handleRegenerateToken = async (station: Station) => {
    try {
      const newToken = await regenerateStationToken(station.id);
      setTokenDialog({ open: true, station, token: newToken });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to regenerate token');
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
      setStations(stations.map(s =>
        s.id === station.id ? { ...s, is_public: !s.is_public } : s
      ));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update station visibility');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) return <Typography>Loading stations...</Typography>;
  if (error) return <Alert color="danger">{error}</Alert>;

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, maxWidth: '1400px', mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography level="h2">My Stations</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/stations/global')}
            size="lg"
          >
            View All Stations
          </Button>
          <Button
            startDecorator={<Add />}
            onClick={() => navigate('/stations/new')}
            size="lg"
          >
            Add Station
          </Button>
        </Box>
      </Box>

      {stations.length === 0 ? (
        <Card>
          <CardContent>
            <Typography level="body-lg" sx={{ textAlign: 'center', py: 4 }}>
              No stations found. Create your first station to get started.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {stations.map((station) => (
            <Grid key={station.id} xs={12} sm={6} lg={4}>
              <Card sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 'lg'
                }
              }}>
                {imageBlobs[`${station.id}-picture`] && (
                  <Box sx={{
                    position: 'relative',
                    height: 200,
                    overflow: 'hidden'
                  }}>
                    <img
                      src={imageBlobs[`${station.id}-picture`]}
                      alt={station.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </Box>
                )}
                <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Typography level="h4" sx={{ mb: 1 }}>{station.name}</Typography>
                  <Stack spacing={0.5} sx={{ mb: 2, flex: 1 }}>
                    <Typography level="body-sm" startDecorator={<span>📍</span>}>
                      {station.location}
                    </Typography>
                    {station.equipment && (
                      <Typography level="body-sm" startDecorator={<span>🔧</span>}>
                        {station.equipment.length > 50 ? `${station.equipment.substring(0, 50)}...` : station.equipment}
                      </Typography>
                    )}
                    <Typography level="body-sm" startDecorator={<span>📅</span>}>
                      Created {new Date(station.created_at).toLocaleDateString()}
                    </Typography>
                    <Typography level="body-sm" startDecorator={station.is_public ? <span>🌐</span> : <span>🔒</span>}>
                      {station.is_public ? 'Public' : 'Private'}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ mt: 'auto' }}>
                    <Tooltip title={station.is_public ? "Make Private" : "Make Public"}>
                      <IconButton
                        size="sm"
                        variant="outlined"
                        color={station.is_public ? "success" : "neutral"}
                        onClick={() => handleToggleVisibility(station)}
                      >
                        {station.is_public ? <span>🌐</span> : <span>🔒</span>}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View Token">
                      <IconButton
                        size="sm"
                        variant="outlined"
                        onClick={() => handleShowToken(station)}
                      >
                        <VpnKey />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Regenerate Token">
                      <IconButton
                        size="sm"
                        variant="outlined"
                        color="warning"
                        onClick={() => handleRegenerateToken(station)}
                      >
                        <Refresh />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Station">
                      <IconButton
                        size="sm"
                        variant="outlined"
                        onClick={() => navigate(`/stations/${station.id}/edit`)}
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Station">
                      <IconButton
                        size="sm"
                        variant="outlined"
                        color="danger"
                        onClick={() => setDeleteDialog({ open: true, station, confirmationText: '' })}
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
      <Modal open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, station: null, confirmationText: '' })}>
        <ModalDialog>
          <ModalClose />
          <Typography level="h4">Delete Station</Typography>
          <Typography>
            Are you sure you want to delete "{deleteDialog.station?.name}"? This action cannot be undone.
          </Typography>
          <Typography level="body-sm" sx={{ mt: 2, mb: 1 }}>
            To confirm deletion, type the station name: <strong>{deleteDialog.station?.name}</strong>
          </Typography>
          <Input
            fullWidth
            placeholder="Type station name here"
            value={deleteDialog.confirmationText}
            onChange={(e) => setDeleteDialog({ ...deleteDialog, confirmationText: e.target.value })}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', pt: 2 }}>
            <Button variant="plain" onClick={() => setDeleteDialog({ open: false, station: null, confirmationText: '' })}>
              Cancel
            </Button>
            <Button
              color="danger"
              disabled={deleteDialog.confirmationText !== deleteDialog.station?.name}
              onClick={() => deleteDialog.station && handleDelete(deleteDialog.station)}
            >
              Delete
            </Button>
          </Box>
        </ModalDialog>
      </Modal>

      {/* Token Display Dialog */}
      <Modal open={tokenDialog.open} onClose={() => setTokenDialog({ open: false, station: null, token: '' })}>
        <ModalDialog>
          <ModalClose />
          <Typography level="h4">Station Token - {tokenDialog.station?.name}</Typography>
          <Typography level="body-sm" sx={{ mb: 2 }}>
            This token can be used to authenticate external applications with your station.
            Keep it secure and regenerate if compromised.
          </Typography>
          <Input
            fullWidth
            value={tokenDialog.token}
            readOnly
            sx={{ mb: 2 }}
          />
          <Button
            fullWidth
            onClick={() => copyToClipboard(tokenDialog.token)}
            sx={{ mb: 2 }}
          >
            Copy to Clipboard
          </Button>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button onClick={() => setTokenDialog({ open: false, station: null, token: '' })}>
              Close
            </Button>
          </Box>
        </ModalDialog>
      </Modal>
    </Box>
  );
};

export default StationsList;