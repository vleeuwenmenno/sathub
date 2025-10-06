import { useEffect, useState } from "react";
import { MapContainer, Polyline, Marker, Popup } from "react-leaflet";
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Dropdown,
  MenuButton,
  ListItemDecorator,
} from "@mui/joy";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteIcon from "@mui/icons-material/Delete";
import FlagIcon from "@mui/icons-material/Flag";
import { getPostGroundTrack } from "../api";
import type { GroundTrack } from "../types";
import ThemeAwareTileLayer from "./ThemeAwareTileLayer";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icons in Leaflet with Webpack/Vite
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Create a custom blue icon for the station
const StationIcon = L.divIcon({
  html: `<div style="background-color: #0B6BCB; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  className: "custom-station-marker",
});

L.Marker.prototype.options.icon = DefaultIcon;

interface GroundTrackMapProps {
  postId: string;
  satelliteName: string;
  timestamp: string;
  createdAt: string;
  imageCount: number;
  likeButton?: React.ReactNode;
  onDelete?: () => void;
  onReport?: () => void;
  canDelete?: boolean; // Whether user can delete (owner or admin)
  stationName?: string;
  stationLatitude?: number;
  stationLongitude?: number;
  onPassTimeUpdate?: (passStartTime: string) => void; // Callback to update pass time
}

interface OrbitalData {
  inclination: number;
  eccentricity: number;
  meanMotion: number;
  orbitalPeriod: number;
  noradId: number;
  altitude: { min: number; max: number; avg: number };
  apogee?: number;
  perigee?: number;
  swathWidth?: number;
  scanAngle?: number;
  passDuration: number;
  velocity?: number; // orbital velocity in km/s
}

const GroundTrackMap = ({
  postId,
  satelliteName,
  timestamp,
  createdAt,
  imageCount,
  likeButton,
  onDelete,
  onReport,
  canDelete,
  stationName,
  stationLatitude,
  stationLongitude,
  onPassTimeUpdate,
}: GroundTrackMapProps) => {
  const [groundTrack, setGroundTrack] = useState<GroundTrack | null>(null);
  const [orbitalData, setOrbitalData] = useState<OrbitalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actualPassTime, setActualPassTime] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroundTrack = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getPostGroundTrack(postId);
        setGroundTrack(data);

        // Calculate orbital statistics from track data
        const altitudes = data.track_points.map((p) => p.alt);
        const minAlt = Math.min(...altitudes);
        const maxAlt = Math.max(...altitudes);
        const avgAlt = altitudes.reduce((a, b) => a + b, 0) / altitudes.length;

        // Calculate pass duration
        const timestamps = data.track_points.map((p) => p.time);
        const passDuration = Math.max(...timestamps) - Math.min(...timestamps);

        // Calculate actual pass start time from ground track data
        const passStartTime = new Date(
          Math.min(...timestamps) * 1000
        ).toISOString();

        // Call callback to update pass time if provided
        if (onPassTimeUpdate) {
          onPassTimeUpdate(passStartTime);
        }

        // Fetch CBOR data for TLE information
        try {
          const cborResponse = await fetch(
            `${window.location.origin}/api/posts/${postId}/cbor?format=json`
          );
          const cborData = await cborResponse.json();

          if (cborData.tle && cborData.tle.line2) {
            // Calculate semi-major axis using Kepler's third law and mean motion from TLE
            // a = (GM / (n * 2π / 86400)^2)^(1/3), where n is mean motion in revs/day
            const n = meanMotion; // revs per day
            const GM = 398600.4418; // km^3/s^2
            const semiMajorAxis = Math.cbrt(GM / Math.pow((n * 2 * Math.PI) / 86400, 2));
            // Format: 2 NNNNN III.IIII RRR.RRRR EEEEEEE AAA.AAAA MMM.MMMM MM.MMMMMMMM RRRRR
            const line2 = cborData.tle.line2;
            const inclination = parseFloat(line2.substring(8, 16).trim());
            const eccentricity = parseFloat(
              "0." + line2.substring(26, 33).trim()
            );
            const meanMotion = parseFloat(line2.substring(52, 63).trim());
            const orbitalPeriod = 1440 / meanMotion; // minutes

            // Calculate apogee and perigee
            // Earth radius = 6371 km
            const earthRadius = 6371;
            const semiMajorAxis = avgAlt + earthRadius; // approximate
            const apogee = semiMajorAxis * (1 + eccentricity) - earthRadius;
            const perigee = semiMajorAxis * (1 - eccentricity) - earthRadius;

            // Calculate orbital velocity at average altitude
            // v = sqrt(GM / r) where GM = 398600.4418 km³/s² (Earth's standard gravitational parameter)
            const GM = 398600.4418;
            const velocity = Math.sqrt(GM / (avgAlt + earthRadius));

            setOrbitalData({
              inclination,
              eccentricity,
              meanMotion,
              orbitalPeriod,
              noradId: cborData.tle.norad,
              altitude: { min: minAlt, max: maxAlt, avg: avgAlt },
              apogee,
              perigee,
              velocity,
              swathWidth: cborData.projection_cfg?.corr_swath,
              scanAngle: cborData.projection_cfg?.scan_angle,
              passDuration,
            });
          }
        } catch (err) {
          console.warn("Could not fetch CBOR data for orbital info", err);
          // Still show basic altitude info even without TLE
          setOrbitalData({
            inclination: 0,
            eccentricity: 0,
            meanMotion: 0,
            orbitalPeriod: 0,
            noradId: 0,
            altitude: { min: minAlt, max: maxAlt, avg: avgAlt },
            passDuration,
          });
        }
      } catch (err) {
        console.error("Failed to fetch ground track:", err);
        setError("Ground track data not available for this post");
      } finally {
        setLoading(false);
      }
    };

    fetchGroundTrack();
  }, [postId]);

  useEffect(() => {
    if (groundTrack && groundTrack.track_points.length > 0) {
      // Calculate actual pass start time from ground track data
      const timestamps = groundTrack.track_points.map((p) => p.time);
      const passStartTime = new Date(
        Math.min(...timestamps) * 1000
      ).toISOString();
      setActualPassTime(passStartTime);

      // Call callback to update parent component if provided
      if (onPassTimeUpdate) {
        onPassTimeUpdate(passStartTime);
      }
    }
  }, [groundTrack, onPassTimeUpdate]);

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error || !groundTrack) {
    return null; // Don't show anything if no ground track available
  }

  // Normalize longitudes to -180 to 180 range for proper map display
  const normalizeCoordinates = (
    points: { lat: number; lon: number }[]
  ): [number, number][] => {
    return points.map(({ lat, lon }) => {
      // Normalize longitude to -180 to 180
      let normalizedLon = lon;
      while (normalizedLon > 180) normalizedLon -= 360;
      while (normalizedLon < -180) normalizedLon += 360;
      return [lat, normalizedLon];
    });
  };

  const trackCoordinates = normalizeCoordinates(groundTrack.track_points);
  const startPoint = trackCoordinates[0];
  const endPoint = trackCoordinates[trackCoordinates.length - 1];

  // Extract timestamps for markers
  const startTimestamp = groundTrack.track_points[0]?.time;
  const endTimestamp =
    groundTrack.track_points[groundTrack.track_points.length - 1]?.time;

  // Calculate bounds for the map
  const bounds = L.latLngBounds(trackCoordinates as [number, number][]);

  // Calculate distances from station to satellite if station coordinates are available
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    alt: number
  ): number => {
    // Haversine formula for great circle distance
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const groundDistance = R * c;

    // Calculate slant distance (3D distance including altitude)
    // Using Pythagorean theorem: slant_distance = sqrt(ground_distance^2 + altitude^2)
    const slantDistance = Math.sqrt(
      groundDistance * groundDistance + alt * alt
    );
    return slantDistance;
  };

  let stationDistances: { min: number; max: number } | null = null;
  if (stationLatitude !== undefined && stationLongitude !== undefined) {
    const distances = groundTrack.track_points.map((point) =>
      calculateDistance(
        stationLatitude,
        stationLongitude,
        point.lat,
        point.lon,
        point.alt
      )
    );
    stationDistances = {
      min: Math.min(...distances),
      max: Math.max(...distances),
    };
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp * 1000); // Convert Unix timestamp to milliseconds
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  // Use the actual pass time from ground track data if available
  const displayedPassTime =
    actualPassTime ||
    (groundTrack.track_points.length > 0
      ? new Date(groundTrack.track_points[0].time * 1000).toISOString()
      : null);

  return (
    <Card>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 2,
          }}
        >
          <Typography level="h3">Satellite Pass Information</Typography>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            {likeButton}
            {(canDelete || onReport) && (
              <Dropdown>
                <MenuButton
                  slots={{ root: IconButton }}
                  slotProps={{
                    root: { variant: "plain", color: "neutral", size: "sm" },
                  }}
                >
                  <MoreVertIcon />
                </MenuButton>
                <Menu placement="bottom-end">
                  {canDelete && onDelete && (
                    <MenuItem onClick={onDelete} color="danger">
                      <ListItemDecorator>
                        <DeleteIcon />
                      </ListItemDecorator>
                      Delete Post
                    </MenuItem>
                  )}
                  {onReport && (
                    <MenuItem onClick={onReport}>
                      <ListItemDecorator>
                        <FlagIcon />
                      </ListItemDecorator>
                      Report Post
                    </MenuItem>
                  )}
                </Menu>
              </Dropdown>
            )}
          </Box>
        </Box>

        {/* General Information */}
        <Box
          sx={{
            mb: 2,
            p: 2,
            bgcolor: "background.level1",
            borderRadius: "sm",
          }}
        >
          <Typography level="title-md" sx={{ mb: 1.5, fontWeight: "bold" }}>
            General Information
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr",
                md: "1fr 1fr 1fr 1fr",
              },
              gap: 2,
            }}
          >
            <Box>
              <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                Satellite
              </Typography>
              <Typography level="body-sm" sx={{ fontWeight: "bold" }}>
                {satelliteName}
              </Typography>
            </Box>

            <Box>
              <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                Pass Time
              </Typography>
              <Typography level="body-sm" sx={{ fontWeight: "bold" }}>
                {displayedPassTime
                  ? formatDate(displayedPassTime)
                  : formatDate(timestamp)}
              </Typography>
            </Box>

            <Box>
              <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                Uploaded
              </Typography>
              <Typography level="body-sm" sx={{ fontWeight: "bold" }}>
                {formatDate(createdAt)}
              </Typography>
            </Box>

            <Box>
              <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                Images
              </Typography>
              <Typography level="body-sm" sx={{ fontWeight: "bold" }}>
                {imageCount}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Orbital Information Grid */}
        {orbitalData && (
          <Box
            sx={{
              mb: 2,
              p: 2,
              bgcolor: "background.level1",
              borderRadius: "sm",
            }}
          >
            <Typography level="title-md" sx={{ mb: 1.5, fontWeight: "bold" }}>
              Orbital Parameters
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "1fr 1fr",
                  md: "1fr 1fr 1fr",
                },
                gap: 2,
              }}
            >
              {orbitalData.noradId > 0 && (
                <Box>
                  <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                    NORAD ID
                  </Typography>
                  <Typography level="body-sm" sx={{ fontWeight: "bold" }}>
                    {orbitalData.noradId}
                  </Typography>
                </Box>
              )}

              {orbitalData.inclination > 0 && (
                <Box>
                  <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                    Inclination
                  </Typography>
                  <Typography level="body-sm" sx={{ fontWeight: "bold" }}>
                    {orbitalData.inclination.toFixed(4)}°
                  </Typography>
                </Box>
              )}

              {orbitalData.eccentricity > 0 && (
                <Box>
                  <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                    Eccentricity
                  </Typography>
                  <Typography level="body-sm" sx={{ fontWeight: "bold" }}>
                    {orbitalData.eccentricity.toFixed(6)}
                  </Typography>
                </Box>
              )}

              {orbitalData.orbitalPeriod > 0 && (
                <Box>
                  <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                    Orbital Period
                  </Typography>
                  <Typography level="body-sm" sx={{ fontWeight: "bold" }}>
                    {orbitalData.orbitalPeriod.toFixed(2)} min
                  </Typography>
                </Box>
              )}

              {orbitalData.meanMotion > 0 && (
                <Box>
                  <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                    Revolutions/Day
                  </Typography>
                  <Typography level="body-sm" sx={{ fontWeight: "bold" }}>
                    {orbitalData.meanMotion.toFixed(5)}
                  </Typography>
                </Box>
              )}

              <Box>
                <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                  Altitude (Avg)
                </Typography>
                <Typography level="body-sm" sx={{ fontWeight: "bold" }}>
                  {orbitalData.altitude.avg.toFixed(1)} km
                </Typography>
              </Box>

              <Box>
                <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                  Altitude Range
                </Typography>
                <Typography level="body-sm" sx={{ fontWeight: "bold" }}>
                  {orbitalData.altitude.min.toFixed(1)} -{" "}
                  {orbitalData.altitude.max.toFixed(1)} km
                </Typography>
              </Box>

              {orbitalData.apogee && (
                <Box>
                  <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                    Apogee
                  </Typography>
                  <Typography level="body-sm" sx={{ fontWeight: "bold" }}>
                    {orbitalData.apogee.toFixed(1)} km
                  </Typography>
                </Box>
              )}

              {orbitalData.perigee && (
                <Box>
                  <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                    Perigee
                  </Typography>
                  <Typography level="body-sm" sx={{ fontWeight: "bold" }}>
                    {orbitalData.perigee.toFixed(1)} km
                  </Typography>
                </Box>
              )}

              {orbitalData.velocity && (
                <Box>
                  <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                    Orbital Velocity
                  </Typography>
                  <Typography level="body-sm" sx={{ fontWeight: "bold" }}>
                    {orbitalData.velocity.toFixed(2)} km/s
                  </Typography>
                </Box>
              )}

              {orbitalData.swathWidth && (
                <Box>
                  <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                    Swath Width
                  </Typography>
                  <Typography level="body-sm" sx={{ fontWeight: "bold" }}>
                    {orbitalData.swathWidth} km
                  </Typography>
                </Box>
              )}

              {orbitalData.scanAngle && (
                <Box>
                  <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                    Scan Angle
                  </Typography>
                  <Typography level="body-sm" sx={{ fontWeight: "bold" }}>
                    {orbitalData.scanAngle}°
                  </Typography>
                </Box>
              )}

              <Box>
                <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                  Pass Duration
                </Typography>
                <Typography level="body-sm" sx={{ fontWeight: "bold" }}>
                  {formatDuration(orbitalData.passDuration)}
                </Typography>
              </Box>

              <Box>
                <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                  Data Points
                </Typography>
                <Typography level="body-sm" sx={{ fontWeight: "bold" }}>
                  {groundTrack.point_count} scan lines
                </Typography>
              </Box>

              {stationDistances && (
                <>
                  <Box>
                    <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                      Closest Approach
                    </Typography>
                    <Typography level="body-sm" sx={{ fontWeight: "bold" }}>
                      {stationDistances.min.toFixed(1)} km
                    </Typography>
                  </Box>

                  <Box>
                    <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                      Furthest Distance
                    </Typography>
                    <Typography level="body-sm" sx={{ fontWeight: "bold" }}>
                      {stationDistances.max.toFixed(1)} km
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
          </Box>
        )}

        <Box sx={{ mb: 2 }}>
          <Typography level="body-sm" sx={{ mb: 0.5 }}>
            <strong>Start:</strong> {startPoint[0].toFixed(2)}°N,{" "}
            {startPoint[1].toFixed(2)}°E
            {startTimestamp && (
              <span> at {formatTimestamp(startTimestamp)}</span>
            )}
          </Typography>
          <Typography level="body-sm">
            <strong>End:</strong> {endPoint[0].toFixed(2)}°N,{" "}
            {endPoint[1].toFixed(2)}°E
            {endTimestamp && <span> at {formatTimestamp(endTimestamp)}</span>}
          </Typography>
        </Box>

        <Box
          sx={{
            height: 400,
            width: "100%",
            borderRadius: "sm",
            overflow: "hidden",
          }}
        >
          <MapContainer
            bounds={bounds}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={true}
          >
            <ThemeAwareTileLayer />

            {/* Satellite ground track */}
            <Polyline
              positions={trackCoordinates as [number, number][]}
              color="#ff5722"
              weight={3}
              opacity={0.8}
            />

            {/* Start marker */}
            <Marker position={startPoint as [number, number]}>
              <Popup>
                <strong>Pass Start</strong>
                <br />
                Lat: {startPoint[0].toFixed(4)}°
                <br />
                Lon: {startPoint[1].toFixed(4)}°
                {startTimestamp && (
                  <>
                    <br />
                    Time: {formatTimestamp(startTimestamp)}
                  </>
                )}
              </Popup>
            </Marker>

            {/* End marker */}
            <Marker position={endPoint as [number, number]}>
              <Popup>
                <strong>Pass End</strong>
                <br />
                Lat: {endPoint[0].toFixed(4)}°
                <br />
                Lon: {endPoint[1].toFixed(4)}°
                {endTimestamp && (
                  <>
                    <br />
                    Time: {formatTimestamp(endTimestamp)}
                  </>
                )}
              </Popup>
            </Marker>

            {/* Station marker */}
            {stationLatitude && stationLongitude && (
              <Marker
                position={[stationLatitude, stationLongitude]}
                icon={StationIcon}
              >
                <Popup>
                  <strong>Station: {stationName || "Ground Station"}</strong>
                  <br />
                  Lat: {stationLatitude.toFixed(4)}°
                  <br />
                  Lon: {stationLongitude.toFixed(4)}°
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default GroundTrackMap;
