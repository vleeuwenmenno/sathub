import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Stack,
  CircularProgress,
  Alert,
  Skeleton,
  Box,
} from "@mui/joy";
import type { Post } from "../types";
import { getStationPosts, getPostImageBlob, getStationDetails } from "../api";
import type { Station } from "../api";
import StationMap from "./StationMap";

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
};

const StationPosts: React.FC = () => {
  const { stationId } = useParams<{ stationId: string }>();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [station, setStation] = useState<Station | null>(null);
  const [imageBlobs, setImageBlobs] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stationId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [stationData, stationPosts] = await Promise.all([
          getStationDetails(stationId),
          getStationPosts(stationId, 1, 50),
        ]);
        setStation(stationData);
        setPosts(stationPosts);
      } catch (err) {
        setError("Failed to load station or posts");
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [stationId]);

  useEffect(() => {
    const loadImages = async () => {
      if (!posts.length) return;

      const newImageBlobs: Record<string, string> = {};
      const newLoadingImages: Record<string, boolean> = {};

      // Set loading state for all images
      for (const post of posts) {
        if (post.images.length > 0) {
          newLoadingImages[`${post.id}-image`] = true;
        }
      }
      setLoadingImages(newLoadingImages);

      // Load images
      for (const post of posts) {
        if (post.images.length > 0) {
          try {
            const blobUrl = await getPostImageBlob(post.id, post.images[0].id);
            newImageBlobs[`${post.id}-image`] = blobUrl;
            // Keep loading state until image actually loads in the DOM
          } catch (error) {
            console.error(
              "Failed to load image for post",
              post.id,
              error,
            );
            // Mark as not loading if failed
            setLoadingImages(prev => ({
              ...prev,
              [`${post.id}-image`]: false
            }));
          }
        }
      }

      setImageBlobs(newImageBlobs);

      setImageBlobs(newImageBlobs);
    };

    loadImages();
  }, [posts]);

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: { xs: 1, md: 2 }, maxWidth: "1400px", mx: "auto" }}>
        <Alert color="danger">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      {station && (
        <Grid container spacing={3}>
          {/* Left Column: Station Info and Posts */}
          <Grid xs={12} md={8}>
            <Box sx={{ mb: 3 }}>
              <Card>
                <CardContent>
                  <Typography level="h3" sx={{ mb: 2 }}>
                    {station.name}
                  </Typography>
                  <Stack spacing={1}>
                    <Typography level="body-md" startDecorator={<span>📍</span>}>
                      {station.location}
                    </Typography>
                    {station.equipment && (
                      <Typography level="body-md" startDecorator={<span>🔧</span>}>
                        {station.equipment}
                      </Typography>
                    )}
                    <Typography level="body-md" startDecorator={<span>📅</span>}>
                      Created {formatDate(station.created_at)}
                    </Typography>
                    <Typography
                      level="body-md"
                      startDecorator={
                        station.is_public ? <span>🌐</span> : <span>🔒</span>
                      }
                    >
                      {station.is_public ? "Public Station" : "Private Station"}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Box>

            {/* Posts Section */}
            {posts.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography level="h4" color="neutral">
                  No posts found for this station.
                </Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ mb: 2 }}>
                  <Typography level="body-sm" color="neutral">
                    Showing {posts.length} posts
                  </Typography>
                </Box>

                <Grid container spacing={3}>
                  {posts.map((post) => (
                    <Grid key={post.id} xs={12} sm={6} lg={4} xl={3}>
                      <Card
                        sx={{
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          transition: "transform 0.2s, box-shadow 0.2s",
                          "&:hover": {
                            transform: "translateY(-4px)",
                            boxShadow: "lg",
                          },
                        }}
                      >
                        {post.images.length > 0 && (
                          <Box
                            sx={{
                              position: "relative",
                              height: 200,
                              overflow: "hidden",
                            }}
                          >
                            <Skeleton loading={!loadedImages[`${post.id}-image`]}>
                              <img
                                src={imageBlobs[`${post.id}-image`] || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='}
                                alt={post.satellite_name}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  transition: "transform 0.3s",
                                }}
                                onLoad={() => {
                                  setLoadedImages(prev => ({
                                    ...prev,
                                    [`${post.id}-image`]: true
                                  }));
                                  setLoadingImages(prev => ({
                                    ...prev,
                                    [`${post.id}-image`]: false
                                  }));
                                }}
                                onError={() => {
                                  setLoadedImages(prev => ({
                                    ...prev,
                                    [`${post.id}-image`]: true
                                  }));
                                  setLoadingImages(prev => ({
                                    ...prev,
                                    [`${post.id}-image`]: false
                                  }));
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.transform = "scale(1.05)")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.transform = "scale(1)")
                                }
                              />
                            </Skeleton>
                          </Box>
                        )}
                        <CardContent
                          sx={{ flex: 1, display: "flex", flexDirection: "column" }}
                        >
                          <Typography level="h4" sx={{ mb: 1 }}>
                            {post.satellite_name}
                          </Typography>
                          <Stack spacing={0.5} sx={{ mb: 2, flex: 1 }}>
                            <Typography
                              level="body-sm"
                              startDecorator={<span>📅</span>}
                            >
                              {formatDate(post.timestamp)}
                            </Typography>
                            <Typography
                              level="body-sm"
                              startDecorator={<span>🖼️</span>}
                            >
                              {post.images.length} image
                              {post.images.length !== 1 ? "s" : ""}
                            </Typography>
                            <Typography
                              level="body-sm"
                              startDecorator={<span>📝</span>}
                            >
                              {formatDate(post.created_at)}
                            </Typography>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </>
            )}
          </Grid>
          
          {/* Right Column: Map and Owner */}
          <Grid xs={12} md={4}>
            <Stack spacing={3}>
              <StationMap
                stationName={station.name}
                location={station.location}
                latitude={station.latitude}
                longitude={station.longitude}
                height={280}
              />
              
              {/* Station Owner */}
              {station.user && (
                <Card
                  sx={{
                    cursor: "pointer",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "lg",
                    },
                  }}
                  onClick={() => navigate(`/user/${station.user!.id}`)}
                >
                  <CardContent>
                    <Typography level="title-md" sx={{ mb: 2 }}>
                      Station Owner
                    </Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          overflow: "hidden",
                          bgcolor: "neutral.softBg",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {station.user.has_profile_picture && station.user.profile_picture_url ? (
                          <img
                            src={station.user.profile_picture_url}
                            alt={`${station.user.username}'s profile`}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <Typography level="h3" color="neutral">
                            {station.user.username.charAt(0).toUpperCase()}
                          </Typography>
                        )}
                      </Box>
                      <Box>
                        <Typography level="body-lg" fontWeight="bold">
                          {station.user.display_name || station.user.username}
                        </Typography>
                        {station.user.display_name && (
                          <Typography level="body-sm" color="neutral">
                            @{station.user.username}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              )}
            </Stack>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default StationPosts;
