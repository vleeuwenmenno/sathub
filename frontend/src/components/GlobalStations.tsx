import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Stack,
  Chip,
} from "@mui/joy";
import type { Station } from "../api";
import {
  getGlobalStations,
  getUserStations,
  getStationPictureBlob,
  getStationDetails,
} from "../api";

const GlobalStations: React.FC = () => {
  const navigate = useNavigate();
  const [stations, setStations] = useState<Station[]>([]);
  const [stationDetails, setStationDetails] = useState<Record<number, Station>>(
    {},
  );
  const [imageBlobs, setImageBlobs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStations = async () => {
    try {
      setLoading(true);
      const data = await getGlobalStations();
      setStations(data);

      // Fetch detailed information for each station to get owner info
      const details: Record<number, Station> = {};
      for (const station of data) {
        try {
          const stationDetail = await getStationDetails(station.id);
          details[station.id] = stationDetail;
        } catch (err) {
          console.error(
            `Failed to load details for station ${station.id}`,
            err,
          );
        }
      }
      setStationDetails(details);

      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load stations");
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) return <Typography>Loading stations...</Typography>;
  if (error) return <Typography color="danger">Error: {error}</Typography>;

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, maxWidth: "1400px", mx: "auto" }}>
      {stations.length === 0 ? (
        <Card>
          <CardContent>
            <Typography level="body-lg" sx={{ textAlign: "center", py: 4 }}>
              No stations found.
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
                      {new Date(station.created_at).toLocaleDateString()}
                    </Typography>
                  </Stack>
                  <Box sx={{ mt: "auto" }}>
                    <Stack spacing={0.5}>
                      <Chip size="sm" variant="soft" color="primary">
                        Station {station.id.substring(0, 8)}
                      </Chip>
                      {stationDetails[station.id]?.user && (
                        <Chip size="sm" variant="soft" color="info">
                          @{stationDetails[station.id].user.username}
                        </Chip>
                      )}
                    </Stack>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default GlobalStations;
