import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { LatLng } from 'leaflet';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Typography,
  Card,
  CardContent,
  Stack,
  IconButton,
  Modal,
  ModalDialog,
  ModalClose,
  Divider,
} from '@mui/joy';
import { LocationOn, Map as MapIcon } from '@mui/icons-material';
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

interface LocationPickerProps {
  value: string;
  onChange: (location: string, latitude?: number, longitude?: number) => void;
  latitude?: number;
  longitude?: number;
  placeholder?: string;
  required?: boolean;
}

interface LocationMarkerProps {
  position: LatLng | null;
  onPositionChange: (position: LatLng) => void;
}

// Component to handle map clicks and marker placement
const LocationMarker: React.FC<LocationMarkerProps> = ({ position, onPositionChange }) => {
  useMapEvents({
    click: (e) => {
      onPositionChange(e.latlng);
    },
  });

  return position ? <Marker position={position} /> : null;
};

const LocationPicker: React.FC<LocationPickerProps> = ({
  value,
  onChange,
  latitude,
  longitude,
  placeholder = "Enter location name",
  required = false,
}) => {
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [mapPosition, setMapPosition] = useState<LatLng | null>(
    latitude && longitude ? new LatLng(latitude, longitude) : null
  );
  const [mapCenter, setMapCenter] = useState<LatLng>(
    latitude && longitude ? new LatLng(latitude, longitude) : new LatLng(51.505, -0.09) // Default to London
  );
  const [isLocating, setIsLocating] = useState(false);

  // Update map position when props change
  useEffect(() => {
    if (latitude && longitude) {
      const newPos = new LatLng(latitude, longitude);
      setMapPosition(newPos);
      setMapCenter(newPos);
    }
  }, [latitude, longitude]);

  const handleLocationChange = (newValue: string) => {
    onChange(newValue, mapPosition?.lat, mapPosition?.lng);
  };

  const handleMapPositionChange = (position: LatLng) => {
    setMapPosition(position);
    
    // Reverse geocoding to get location name
    reverseGeocode(position.lat, position.lng);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      // Using OpenStreetMap Nominatim for reverse geocoding (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=en&zoom=12`
      );
      const data = await response.json();
      
      if (data && data.address) {
        // Extract meaningful location components
        const city = data.address.city || data.address.town || data.address.village || data.address.municipality;
        const state = data.address.state || data.address.province || data.address.county;
        const country = data.address.country;
        
        // Create a readable location string
        let locationName = '';
        if (city && state && country) {
          locationName = `${city}, ${state}, ${country}`;
        } else if (city && country) {
          locationName = `${city}, ${country}`;
        } else if (state && country) {
          locationName = `${state}, ${country}`;
        } else if (country) {
          locationName = country;
        } else {
          // Fallback to display name but clean it up
          const parts = data.display_name.split(',');
          locationName = parts.slice(0, 3).join(', ').trim();
        }
        
        onChange(locationName, lat, lng);
      } else if (data && data.display_name) {
        // Fallback to simplified display name
        const parts = data.display_name.split(',');
        const locationName = parts.slice(0, 3).join(', ').trim();
        onChange(locationName, lat, lng);
      }
    } catch (error) {
      console.error('Failed to reverse geocode:', error);
      // Fallback to coordinates with reduced precision
      const simpleLat = Math.round(lat * 1000) / 1000;
      const simpleLng = Math.round(lng * 1000) / 1000;
      onChange(`${simpleLat.toFixed(3)}, ${simpleLng.toFixed(3)}`, lat, lng);
    }
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Get city-level location instead of exact coordinates
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=en&zoom=10`
          );
          const data = await response.json();
          
          if (data && data.address) {
            // Extract city information with reduced precision
            const city = data.address.city || data.address.town || data.address.village || data.address.municipality;
            const state = data.address.state || data.address.province;
            const country = data.address.country;
            
            // Create a city-level location string
            let locationName = '';
            if (city && state && country) {
              locationName = `${city}, ${state}, ${country}`;
            } else if (city && country) {
              locationName = `${city}, ${country}`;
            } else if (state && country) {
              locationName = `${state}, ${country}`;
            } else if (country) {
              locationName = country;
            } else {
              locationName = data.display_name;
            }
            
            // Use the city's approximate center coordinates (reduced precision)
            const cityLat = Math.round(latitude * 100) / 100; // Round to ~1km precision
            const cityLng = Math.round(longitude * 100) / 100;
            
            const newPos = new LatLng(cityLat, cityLng);
            setMapPosition(newPos);
            setMapCenter(newPos);
            onChange(locationName, cityLat, cityLng);
          } else {
            // Fallback to reduced precision coordinates
            const cityLat = Math.round(latitude * 100) / 100;
            const cityLng = Math.round(longitude * 100) / 100;
            const newPos = new LatLng(cityLat, cityLng);
            setMapPosition(newPos);
            setMapCenter(newPos);
            onChange(`${cityLat.toFixed(2)}, ${cityLng.toFixed(2)}`, cityLat, cityLng);
          }
        } catch (error) {
          console.error('Failed to get city location:', error);
          // Fallback to reduced precision coordinates
          const cityLat = Math.round(latitude * 100) / 100;
          const cityLng = Math.round(longitude * 100) / 100;
          const newPos = new LatLng(cityLat, cityLng);
          setMapPosition(newPos);
          setMapCenter(newPos);
          onChange(`${cityLat.toFixed(2)}, ${cityLng.toFixed(2)}`, cityLat, cityLng);
        }
        
        setIsLocating(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Failed to get your location. Please try again or set location manually.');
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 } // Less precise, longer cache
    );
  };

  const handleOpenMap = () => {
    setIsMapOpen(true);
  };

  const handleCloseMap = () => {
    setIsMapOpen(false);
  };

  const clearLocation = () => {
    setMapPosition(null);
    onChange('', undefined, undefined);
  };

  return (
    <>
      <FormControl>
        <FormLabel>Location *</FormLabel>
        <Stack spacing={1}>
          <Input
            value={value}
            onChange={(e) => handleLocationChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            endDecorator={
              <Stack direction="row" spacing={1}>
                <IconButton
                  size="sm"
                  variant="outlined"
                  onClick={handleOpenMap}
                  title="Pick location on map"
                >
                  <MapIcon />
                </IconButton>
                <IconButton
                  size="sm"
                  variant="outlined"
                  onClick={handleCurrentLocation}
                  disabled={isLocating}
                  title="Use current city location"
                >
                  <LocationOn />
                </IconButton>
              </Stack>
            }
          />
          {mapPosition && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography level="body-xs" sx={{ color: 'success.500' }}>
                📍 Coordinates: {mapPosition.lat.toFixed(3)}, {mapPosition.lng.toFixed(3)}
              </Typography>
              <Button
                size="sm"
                variant="plain"
                color="neutral"
                onClick={clearLocation}
                sx={{ minHeight: 'auto', p: 0.5 }}
              >
                Clear
              </Button>
            </Box>
          )}
        </Stack>
      </FormControl>

      <Modal open={isMapOpen} onClose={handleCloseMap}>
        <ModalDialog
          size="lg"
          sx={{ 
            width: '90vw', 
            maxWidth: '800px', 
            height: '80vh',
            maxHeight: '600px',
            p: 0,
            overflow: 'hidden'
          }}
        >
          <ModalClose />
          <Box sx={{ p: 2, pb: 0 }}>
            <Typography level="h4">Select Location</Typography>
            <Typography level="body-sm" sx={{ color: 'neutral.600' }}>
              Click anywhere on the map to set your station location
            </Typography>
          </Box>
          
          <Divider sx={{ my: 1 }} />
          
          <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <MapContainer
              center={mapCenter}
              zoom={mapPosition ? 13 : 2}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationMarker
                position={mapPosition}
                onPositionChange={handleMapPositionChange}
              />
            </MapContainer>
          </Box>

          <Box sx={{ p: 2, pt: 1 }}>
            <Stack spacing={2}>
              {mapPosition && (
                <Card variant="soft" color="success">
                  <CardContent orientation="horizontal" sx={{ alignItems: 'center', gap: 1 }}>
                    <LocationOn color="success" />
                    <Box>
                      <Typography level="body-sm" fontWeight="bold">
                        Selected Location
                      </Typography>
                      <Typography level="body-xs">
                        {mapPosition.lat.toFixed(3)}, {mapPosition.lng.toFixed(3)}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              )}
              
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={handleCurrentLocation}
                  disabled={isLocating}
                  startDecorator={<LocationOn />}
                >
                  {isLocating ? 'Locating...' : 'Use City Location'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleCloseMap}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCloseMap}
                  disabled={!mapPosition}
                >
                  Confirm Location
                </Button>
              </Stack>
            </Stack>
          </Box>
        </ModalDialog>
      </Modal>
    </>
  );
};

export default LocationPicker;