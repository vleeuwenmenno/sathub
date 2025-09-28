import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Typography,
  Box,
  Button,
  Sheet,
  Stack,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Alert,
  Card,
  CardContent,
  IconButton,
  Switch,
} from '@mui/joy';
import { ArrowBack, PhotoCamera } from '@mui/icons-material';
import { getStation, createStation, updateStation, uploadStationPicture, getStationPictureBlob } from '../api';
import type { Station } from '../api';
import LocationPicker from './LocationPicker';

interface StationFormProps {
  mode: 'create' | 'edit';
}

const StationForm: React.FC<StationFormProps> = ({ mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    equipment: '',
    online_threshold: 5, // default 5 minutes
  });
  const [isPublic, setIsPublic] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'edit' && id) {
      loadStation();
    }
  }, [mode, id]);

  const loadStation = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getStation(id);
      setFormData({
        name: data.name,
        location: data.location,
        latitude: data.latitude,
        longitude: data.longitude,
        equipment: data.equipment,
        online_threshold: data.online_threshold || 5,
      });
      setIsPublic(data.is_public);
      if (data.has_picture && data.picture_url) {
        try {
          const blobUrl = await getStationPictureBlob(data.picture_url);
          setPreviewUrl(blobUrl);
        } catch (error) {
          console.error('Failed to load station picture', error);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load station');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = field === 'online_threshold' ? parseInt(e.target.value) || 1 : e.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLocationChange = (location: string, latitude?: number, longitude?: number) => {
    setFormData(prev => ({
      ...prev,
      location,
      latitude,
      longitude,
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let stationData: Station;

      if (mode === 'create') {
        stationData = await createStation({ 
          name: formData.name,
          location: formData.location,
          latitude: formData.latitude,
          longitude: formData.longitude,
          equipment: formData.equipment,
          is_public: isPublic,
          online_threshold: formData.online_threshold,
        });
      } else {
        if (!id) throw new Error('Station ID is required');
        stationData = await updateStation(id, { 
          name: formData.name,
          location: formData.location,
          latitude: formData.latitude,
          longitude: formData.longitude,
          equipment: formData.equipment,
          is_public: isPublic,
          online_threshold: formData.online_threshold,
        });
      }

      // Upload picture if selected
      if (selectedFile && stationData.id) {
        await uploadStationPicture(stationData.id, selectedFile);
        // Reload station data to show the uploaded picture
        if (mode === 'edit') {
          await loadStation();
        }
      }

      navigate('/stations');
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to ${mode} station`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && mode === 'edit') return <Typography>Loading station...</Typography>;

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, maxWidth: '800px', mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/stations')} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography level="h2">
          {mode === 'create' ? 'Create New Station' : 'Edit Station'}
        </Typography>
      </Box>

      <Sheet sx={{ p: 4 }}>
        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            {error && (
              <Alert color="danger" variant="soft">
                {error}
              </Alert>
            )}

            {/* Picture Upload */}
            <Card>
              <CardContent>
                <Typography level="h4" sx={{ mb: 2 }}>Station Picture</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{
                    width: 120,
                    height: 120,
                    border: '2px dashed var(--joy-palette-neutral-outlinedBorder)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    bgcolor: 'neutral.softBg'
                  }}>
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Station preview"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <PhotoCamera sx={{ fontSize: 40, color: 'neutral.400' }} />
                    )}
                  </Box>
                  <Box>
                    <Button
                      component="label"
                      variant="outlined"
                      startDecorator={<PhotoCamera />}
                    >
                      Choose Picture
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={handleFileSelect}
                      />
                    </Button>
                    <Typography level="body-sm" sx={{ mt: 1, color: 'neutral.600' }}>
                      JPG, PNG up to 10MB
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <FormControl>
              <FormLabel>Station Name *</FormLabel>
              <Input
                value={formData.name}
                onChange={handleInputChange('name')}
                placeholder="Enter station name"
                required
              />
            </FormControl>

            <LocationPicker
              value={formData.location}
              onChange={handleLocationChange}
              latitude={formData.latitude}
              longitude={formData.longitude}
              placeholder="Enter station location"
              required
            />

            <FormControl>
              <FormLabel>Equipment & Description</FormLabel>
              <Textarea
                value={formData.equipment}
                onChange={handleInputChange('equipment')}
                placeholder="Describe your equipment and setup"
                minRows={3}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Online Time Threshold (minutes)</FormLabel>
              <Input
                type="number"
                value={formData.online_threshold}
                onChange={handleInputChange('online_threshold')}
                placeholder="5"
                slotProps={{
                  input: {
                    min: 1,
                    max: 60,
                  },
                }}
              />
              <Typography level="body-xs" sx={{ mt: 0.5, color: 'neutral.600' }}>
                Station is considered online if it has sent a health check within this time period (1-60 minutes)
              </Typography>
            </FormControl>

            <FormControl>
              <FormLabel>Visibility</FormLabel>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Switch
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <Typography level="body-sm">
                  {isPublic ? 'Public - Visible to everyone' : 'Private - Only visible to you'}
                </Typography>
              </Box>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 2, pt: 2 }}>
              <Button
                type="submit"
                loading={loading}
                size="lg"
                sx={{ flex: 1 }}
              >
                {mode === 'create' ? 'Create Station' : 'Update Station'}
              </Button>
              <Button
                variant="outlined"
                size="lg"
                onClick={() => navigate('/stations')}
                sx={{ flex: 1 }}
              >
                Cancel
              </Button>
            </Box>
          </Stack>
        </form>
      </Sheet>
    </Box>
  );
};

export default StationForm;