import React from 'react';
import { TileLayer } from 'react-leaflet';
import { useColorScheme } from '@mui/joy/styles';

const ThemeAwareTileLayer: React.FC = () => {
  const { mode } = useColorScheme();
  
  const tileLayerConfig = mode === 'dark' 
    ? {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      }
    : {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      };
  
  return <TileLayer {...tileLayerConfig} />;
};

export default ThemeAwareTileLayer;