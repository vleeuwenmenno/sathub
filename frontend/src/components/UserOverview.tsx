import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Avatar,
  Divider,
  CircularProgress,
} from "@mui/joy";
import { getUserPosts, getUserStations, type Station } from "../api";
import type { Post } from "../types";

const UserOverview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
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

        const [postsData, stationsData] = await Promise.all([
          getUserPosts(userId),
          getUserStations(userId),
        ]);

        setPosts(postsData);
        setStations(stationsData);
      } catch (err) {
        setError("Failed to load user data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [id]);

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
    <Box sx={{ p: 3 }}>
      <Typography level="h2" sx={{ mb: 3 }}>
        User Overview
      </Typography>

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
                <Card variant="outlined">
                  <CardContent>
                    <Typography level="title-md" sx={{ mb: 1 }}>
                      {post.satellite_name}
                    </Typography>
                    <Typography level="body-sm" sx={{ mb: 1 }}>
                      Station: {post.station_name}
                    </Typography>
                    <Typography level="body-xs" color="neutral">
                      {new Date(post.timestamp).toLocaleDateString()}
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
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                      <Avatar
                        src={station.picture_url}
                        alt={station.name}
                        sx={{ mr: 2, width: 40, height: 40 }}
                      >
                        {station.name.charAt(0).toUpperCase()}
                      </Avatar>
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
                    <Chip size="sm" color="success">
                      Public
                    </Chip>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  );
};

export default UserOverview;