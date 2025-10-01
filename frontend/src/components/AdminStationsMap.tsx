import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { LatLngBounds, LatLng } from 'leaflet';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/joy';
import { LocationOn } from '@mui/icons-material';
import { getGlobalStations } from '../api';
import type { Station } from '../api';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React Leaflet
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const AdminStationsMap: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if coordinates appear to be rounded/rough vs precise
  const isRoughLocation = (lat: number, lng: number): boolean => {
    // Convert to strings and check decimal places
    const latStr = lat.toString();
    const lngStr = lng.toString();

    // If coordinates have very few decimal places or are at whole numbers, consider them rough
    const latDecimals = latStr.split('.')[1]?.length || 0;
    const lngDecimals = lngStr.split('.')[1]?.length || 0;

    // Rough if both coordinates have 2 or fewer decimal places
    return latDecimals <= 2 && lngDecimals <= 2;
  };

  useEffect(() => {
    const fetchStations = async () => {
      try {
        setLoading(true);
        const data = await getGlobalStations();
        setStations(data);
        setError(null);
      } catch (err) {
        setError('Failed to load stations');
        console.error('Error fetching stations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStations();
  }, []);

  // Filter stations with coordinates
  const stationsWithCoords = stations.filter(station => station.latitude && station.longitude);

  // Calculate bounds to fit all markers
  const getBounds = () => {
    if (stationsWithCoords.length === 0) return undefined;

    const bounds = new LatLngBounds(
      stationsWithCoords.map(station => new LatLng(station.latitude!, station.longitude!))
    );
    return bounds;
  };

  // Default center if no stations with coordinates
  const defaultCenter: [number, number] = [20, 0]; // Roughly center of the world
  const defaultZoom = 2;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 3 }}>
        <Alert color="danger" variant="soft">
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ py: { xs: 1, md: 2 }, px: 0, maxWidth: "1400px", mx: "auto" }}>
      <Typography level="h2" sx={{ mb: 3, textAlign: "center" }}>
        Stations Map
      </Typography>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocationOn sx={{ color: 'primary.500' }} />
              <Typography level="h4">
                Station Locations ({stationsWithCoords.length} of {stations.length} stations)
              </Typography>
            </Box>

            <Typography level="body-sm" color="neutral">
              This map shows the rough locations of all registered stations that have coordinate data.
              Stations without coordinates are not displayed.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ overflow: 'hidden' }}>
        <Box sx={{ height: '600px', position: 'relative' }}>
          <MapContainer
            center={stationsWithCoords.length > 0 ? undefined : defaultCenter}
            zoom={stationsWithCoords.length > 0 ? undefined : defaultZoom}
            bounds={getBounds()}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {stationsWithCoords.map((station) => {
              const roughLocation = isRoughLocation(station.latitude!, station.longitude!);
              return (
                <React.Fragment key={station.id}>
                  {roughLocation && (
                    <Circle
                      center={[station.latitude!, station.longitude!]}
                      radius={2000}
                      pathOptions={{
                        color: station.is_online ? '#10b981' : '#ef4444',
                        fillColor: station.is_online ? '#10b981' : '#ef4444',
                        fillOpacity: 0.1,
                        weight: 1,
                      }}
                    />
                  )}
                  <Marker
                    position={[station.latitude!, station.longitude!]}
                  >
                    <Popup>
                      <Box sx={{ textAlign: 'center', minWidth: '200px' }}>
                        <Typography level="title-sm" fontWeight="bold" sx={{ color: 'common.black' }}>
                          {station.name}
                        </Typography>
                        <Typography level="body-xs" sx={{ mt: 0.5, color: 'common.black' }}>
                          {station.location}
                        </Typography>
                        <Typography level="body-xs" sx={{ color: 'neutral.600', mt: 0.5 }}>
                          {station.latitude!.toFixed(4)}, {station.longitude!.toFixed(4)}
                        </Typography>
                        {station.user && (
                          <Typography level="body-xs" sx={{ color: 'primary.600', mt: 0.5 }}>
                            Owner: {station.user.display_name || station.user.username}
                          </Typography>
                        )}
                        <Typography level="body-xs" sx={{ color: station.is_online ? 'success.600' : 'danger.600', mt: 0.5 }}>
                          Status: {station.is_online ? 'Online' : 'Offline'}
                        </Typography>
                        <Typography level="body-xs" sx={{ color: 'neutral.500', mt: 0.5, fontSize: '0.7rem' }}>
                          {roughLocation ? 'Approximate location' : 'Precise location'}
                        </Typography>
                      </Box>
                    </Popup>
                  </Marker>
                </React.Fragment>
              );
            })}
          </MapContainer>
        </Box>
      </Card>
    </Box>
  );
};

export default AdminStationsMap;