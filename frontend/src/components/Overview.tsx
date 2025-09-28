import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Stack,
  CircularProgress,
  Alert,
} from "@mui/joy";
import type { Post } from "../types";
import { getLatestPosts, getPostImageUrl } from "../api";
import PaginationControls from "./PaginationControls";
import { useAuth } from "../contexts/AuthContext";
import LikeButton from "./LikeButton";

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
};

const Overview: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    setLoading(true);
    getLatestPosts(limit, page)
      .then((fetchedPosts) => {
        setPosts(fetchedPosts || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch posts:", error);
        setPosts([]);
        setLoading(false);
      });
  }, [limit, page]);

  return (
    <Box sx={{ py: { xs: 1, md: 2 }, px: 0, maxWidth: "1400px", mx: "auto" }}>
      <Typography level="h2" sx={{ mb: 3, textAlign: "center" }}>
        Recent Posts
      </Typography>

      {!loading && posts && posts.length > 0 && isAuthenticated && (
        <PaginationControls
          limit={limit}
          setLimit={setLimit}
          page={page}
          setPage={setPage}
          hasMore={posts.length >= limit}
          loading={loading}
        />
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {posts && posts.map((post) => (
            <Grid key={post.id} xs={12} sm={6} lg={4} xl={3}>
              <Card
                onClick={() => navigate(`/post/${post.id}`)}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  cursor: "pointer",
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
                    <img
                      src={getPostImageUrl(post.id, post.images[0].id)}
                      alt={post.satellite_name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transition: "transform 0.3s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.transform = "scale(1.05)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.transform = "scale(1)")
                      }
                    />
                  </Box>
                )}
                <CardContent
                  sx={{ flex: 1, display: "flex", flexDirection: "column" }}
                >
                  <Typography level="h4" sx={{ mb: 1 }}>
                    {post.satellite_name}
                  </Typography>
                  <Stack spacing={0.5} sx={{ mb: 2, flex: 1 }}>
                    <Typography level="body-sm" startDecorator={<span>🏠</span>}>
                      {post.station_name}
                    </Typography>
                    <Typography level="body-sm" startDecorator={<span>🛰️</span>}>
                      {post.satellite_name}
                    </Typography>
                    <Typography level="body-sm" startDecorator={<span>📅</span>}>
                      {formatDate(post.timestamp)}
                    </Typography>
                    <Typography level="body-sm" startDecorator={<span>🖼️</span>}>
                      {post.images.length} image
                      {post.images.length !== 1 ? "s" : ""}
                    </Typography>
                  </Stack>
                  <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", mt: "auto" }}>
                    <LikeButton
                      postId={post.id}
                      initialLikesCount={post.likes_count}
                      initialIsLiked={post.is_liked}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {!loading && posts && posts.length > 0 && isAuthenticated && (
        <PaginationControls
          limit={limit}
          setLimit={setLimit}
          page={page}
          setPage={setPage}
          hasMore={posts.length >= limit}
          loading={loading}
        />
      )}

      {!loading && posts && posts.length > 0 && !isAuthenticated && (
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Alert color="primary" variant="soft">
            Please login to browse further.
          </Alert>
        </Box>
      )}

      {!loading && (!posts || posts.length === 0) && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Alert color="neutral" variant="soft">
            No posts available yet.
          </Alert>
        </Box>
      )}
    </Box>
  );
};

export default Overview;
