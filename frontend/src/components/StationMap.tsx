import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { LatLng } from 'leaflet';
import {
  Box,
  Card,
  CardContent,
  Typography,
} from '@mui/joy';
import { LocationOn } from '@mui/icons-material';
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

interface StationMapProps {
  stationName: string;
  location: string;
  latitude?: number;
  longitude?: number;
  height?: number;
}

const StationMap: React.FC<StationMapProps> = ({
  stationName,
  location,
  latitude,
  longitude,
  height = 200,
}) => {
  // If no coordinates are provided, don't render the map
  if (!latitude || !longitude) {
    return (
      <Card variant="outlined">
        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height }}>
          <Box sx={{ textAlign: 'center' }}>
            <LocationOn sx={{ fontSize: 40, color: 'neutral.400', mb: 1 }} />
            <Typography level="body-sm" color="neutral">
              Location coordinates not available
            </Typography>
            <Typography level="body-xs" color="neutral">
              {location}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const position = new LatLng(latitude, longitude);

  return (
    <Card variant="outlined" sx={{ overflow: 'hidden' }}>
      <Box sx={{ height, position: 'relative' }}>
        <MapContainer
          center={position}
          zoom={10}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
          dragging={false}
          zoomControl={false}
          doubleClickZoom={false}
          touchZoom={false}
          boxZoom={false}
          keyboard={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={position}>
            <Popup>
              <Box sx={{ textAlign: 'center' }}>
                <Typography level="title-sm" fontWeight="bold">
                  {stationName}
                </Typography>
                <Typography level="body-xs" sx={{ mt: 0.5 }}>
                  {location}
                </Typography>
                <Typography level="body-xs" sx={{ color: 'neutral.600', mt: 0.5 }}>
                  {latitude.toFixed(4)}, {longitude.toFixed(4)}
                </Typography>
              </Box>
            </Popup>
          </Marker>
        </MapContainer>
      </Box>
      
      <CardContent sx={{ p: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationOn sx={{ fontSize: 16, color: 'primary.500' }} />
          <Typography level="body-sm" fontWeight="md">
            Station Location
          </Typography>
        </Box>
        <Typography level="body-xs" sx={{ color: 'neutral.600', mt: 0.5 }}>
          {location}
        </Typography>
        {latitude && longitude && (
          <Typography level="body-xs" sx={{ color: 'neutral.500', mt: 0.25 }}>
            {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default StationMap;