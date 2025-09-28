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
  Select,
  Option,
  FormControl,
  FormLabel,
  Input,
  IconButton,
  Tooltip,
} from "@mui/joy";
import SearchIcon from "@mui/icons-material/Search";
import type { Station } from "../api";
import {
  getGlobalStations,
  getStationPictureBlob,
  getStationDetails,
} from "../api";
import PaginationControls from "./PaginationControls";
import { useAuth } from "../contexts/AuthContext";

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

  return `${day}-${month}-${year} ${hours}:${minutes}`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
};

const GlobalStations: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [stations, setStations] = useState<Station[]>([]);
  const [stationDetails, setStationDetails] = useState<Record<string, Station>>(
    {},
  );
  const [imageBlobs, setImageBlobs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("created_at");
  const [order, setOrder] = useState("desc");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Show loading while checking authentication
  if (authLoading) {
    return <Typography>Loading...</Typography>;
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  const loadStations = async () => {
    try {
      setLoading(true);
      const data = await getGlobalStations(limit, page, sort, order, search);
      setStations(data);

      // Fetch detailed information for each station to get owner info
      const details: Record<string, Station> = {};
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

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1); // Reset to first page when searching
  };

  useEffect(() => {
    loadStations();
  }, [limit, page, sort, order, search]);

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <FormControl size="sm">
          <FormLabel>Search stations</FormLabel>
          <Input
            placeholder="Enter station name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            endDecorator={
              <IconButton
                onClick={handleSearch}
                disabled={loading}
                size="sm"
              >
                <SearchIcon />
              </IconButton>
            }
            sx={{ minWidth: 250 }}
          />
        </FormControl>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'end' }}>
          <FormControl size="sm">
            <FormLabel>Sort by</FormLabel>
            <Select
              value={sort}
              onChange={(_, value) => setSort(value as string)}
              sx={{ minWidth: 150 }}
            >
              <Option value="created_at">Created Date</Option>
              <Option value="username">Username</Option>
              <Option value="name">Station Name</Option>
            </Select>
          </FormControl>
          <FormControl size="sm">
            <FormLabel>Order</FormLabel>
            <Select
              value={order}
              onChange={(_, value) => setOrder(value as string)}
              sx={{ minWidth: 120 }}
            >
              <Option value="desc">Descending</Option>
              <Option value="asc">Ascending</Option>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {stations.length >= limit && (
        <PaginationControls
          limit={limit}
          setLimit={setLimit}
          page={page}
          setPage={setPage}
          hasMore={stations.length >= limit}
          loading={loading}
        />
      )}

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
                      {formatDate(station.created_at)}
                    </Typography>
                    <Typography
                      level="body-sm"
                      startDecorator={<span>⏱️</span>}
                    >
                      Last seen: {formatLastSeen(station)}
                    </Typography>
                  </Stack>
                  <Box sx={{ mt: "auto" }}>
                    <Stack spacing={0.5}>
                      <Chip size="sm" variant="soft" color="primary">
                        Station {station.id.substring(0, 8)}
                      </Chip>
                      <Tooltip title={formatFullTimestamp(station)}>
                        <Chip
                          size="sm"
                          variant="soft"
                          color={station.is_online ? "success" : station.last_seen ? "warning" : "neutral"}
                        >
                          {formatLastSeen(station)}
                        </Chip>
                      </Tooltip>
                      {stationDetails[station.id]?.user && (
                        <Chip size="sm" variant="soft" color="primary">
                          @{stationDetails[station.id]?.user?.username}
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

      {stations.length > 0 && (
        <PaginationControls
          limit={limit}
          setLimit={setLimit}
          page={page}
          setPage={setPage}
          hasMore={stations.length >= limit}
          loading={loading}
        />
      )}
    </Box>
  );
};

export default GlobalStations;
