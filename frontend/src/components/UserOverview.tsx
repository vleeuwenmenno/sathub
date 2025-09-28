import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  CircularProgress,
  Tooltip,
} from "@mui/joy";
import { getUserPosts, getUserStations, getStationPictureBlob, getUserLikedPosts, type Station } from "../api";
import type { Post } from "../types";

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
};

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

const UserOverview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [imageBlobs, setImageBlobs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const userId = parseInt(id, 10);
        if (isNaN(userId)) {
          setError("Invalid user ID");
          return;
        }

        const [postsData, stationsData, likedPostsData] = await Promise.all([
          getUserPosts(userId),
          getUserStations(userId),
          getUserLikedPosts(userId, 1, 20),
        ]);

        setPosts(postsData);
        setStations(stationsData);
        setLikedPosts(likedPostsData.posts);
      } catch (err) {
        setError("Failed to load user data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [id]);

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

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography level="h4" color="danger">
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, maxWidth: '1400px', mx: 'auto' }}>
      <Typography level="h2" sx={{ mb: 3 }}>
        User Overview
      </Typography>

      <Card>
        <CardContent>
          {/* Recent Posts Section */}
          <Box sx={{ mb: 4 }}>
            <Typography level="h3" sx={{ mb: 2 }}>
              Recent Posts ({posts.length})
            </Typography>
            {posts.length === 0 ? (
              <Typography>No public posts available</Typography>
            ) : (
              <Grid container spacing={2}>
                {posts.slice(0, 6).map((post) => (
                  <Grid key={post.id} xs={12} sm={6} md={4}>
                    <Card
                      variant="outlined"
                      onClick={() => navigate(`/post/${post.id}`)}
                      sx={{ cursor: "pointer" }}
                    >
                      <CardContent>
                        <Typography level="title-md" sx={{ mb: 1 }}>
                          {post.satellite_name}
                        </Typography>
                        <Typography level="body-sm" sx={{ mb: 1 }}>
                          Station: {post.station_name}
                        </Typography>
                        <Typography level="body-xs" color="neutral">
                          {formatDate(post.timestamp)}
                        </Typography>
                        {post.images.length > 0 && (
                          <Chip size="sm" sx={{ mt: 1 }}>
                            {post.images.length} image{post.images.length !== 1 ? "s" : ""}
                          </Chip>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Liked Posts Section */}
          <Box sx={{ mb: 4 }}>
            <Typography level="h3" sx={{ mb: 2 }}>
              Liked Posts ({likedPosts.length})
            </Typography>
            {likedPosts.length === 0 ? (
              <Typography>No liked posts yet</Typography>
            ) : (
              <Grid container spacing={2}>
                {likedPosts.slice(0, 6).map((post) => (
                  <Grid key={post.id} xs={12} sm={6} md={4}>
                    <Card
                      variant="outlined"
                      onClick={() => navigate(`/post/${post.id}`)}
                      sx={{ cursor: "pointer" }}
                    >
                      <CardContent>
                        <Typography level="title-md" sx={{ mb: 1 }}>
                          {post.satellite_name}
                        </Typography>
                        <Typography level="body-sm" sx={{ mb: 1 }}>
                          Station: {post.station_name}
                        </Typography>
                        <Typography level="body-xs" color="neutral">
                          {formatDate(post.timestamp)}
                        </Typography>
                        {post.images.length > 0 && (
                          <Chip size="sm" sx={{ mt: 1 }}>
                            {post.images.length} image{post.images.length !== 1 ? "s" : ""}
                          </Chip>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Stations Section */}
          <Box>
            <Typography level="h3" sx={{ mb: 2 }}>
              Public Stations ({stations.length})
            </Typography>
            {stations.length === 0 ? (
              <Typography>No public stations available</Typography>
            ) : (
              <Grid container spacing={2}>
                {stations.map((station) => (
                  <Grid key={station.id} xs={12} sm={6} md={4}>
                    <Card 
                      variant="outlined"
                      onClick={() => navigate(`/station/${station.id}`)}
                      sx={{ 
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 'lg',
                        }
                      }}
                    >
                      {imageBlobs[`${station.id}-picture`] && (
                        <Box
                          sx={{
                            position: "relative",
                            height: 120,
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
                      <CardContent>
                        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                          <Box>
                            <Typography level="title-md">{station.name}</Typography>
                            <Typography level="body-sm" color="neutral">
                              {station.location}
                            </Typography>
                          </Box>
                        </Box>
                        {station.equipment && (
                          <Typography level="body-sm" sx={{ mb: 1 }}>
                            Equipment: {station.equipment}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Chip size="sm" color="success">
                            Public
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
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default UserOverview;