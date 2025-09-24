import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Box,
  Stack,
} from '@mui/joy';
import type { PostOverview } from '../types';
import { getPosts, getImageUrl, getImageBlob } from '../api';

const Overview: React.FC = () => {
  const [posts, setPosts] = useState<PostOverview[]>([]);
  const [coverBlobs, setCoverBlobs] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  useEffect(() => {
    getPosts().then(setPosts);
  }, []);

  useEffect(() => {
    const loadCovers = async () => {
      for (const post of posts) {
        if (post.cover_image && !coverBlobs[post.id]) {
          try {
            const blobUrl = await getImageBlob(post.id, post.cover_image);
            setCoverBlobs(prev => ({ ...prev, [post.id]: blobUrl }));
          } catch (error) {
            console.error('Failed to load cover:', post.id, error);
          }
        }
      }
    };
    loadCovers();
  }, [posts]);

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, maxWidth: '1400px', mx: 'auto' }}>
      <Typography level="h2" sx={{ mb: 3, textAlign: 'center' }}>Satellite Dumps</Typography>
      <Grid container spacing={3}>
        {posts.map((post) => (
          <Grid key={post.id} xs={12} sm={6} lg={4} xl={3}>
            <Card sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 'lg'
              }
            }}>
              {post.cover_image && (
                <Box sx={{
                  position: 'relative',
                  height: 200,
                  overflow: 'hidden'
                }}>
                  <img
                    src={coverBlobs[post.id] || ''}
                    alt={post.description}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.3s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  />
                </Box>
              )}
              <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Typography level="h4" sx={{ mb: 1 }}>{post.description}</Typography>
                <Stack spacing={0.5} sx={{ mb: 2, flex: 1 }}>
                  <Typography level="body-sm" startDecorator={<span>📍</span>}>
                    {post.location}
                  </Typography>
                  <Typography level="body-sm" startDecorator={<span>👤</span>}>
                    {post.user}
                  </Typography>
                  <Typography level="body-sm" startDecorator={<span>🛰️</span>}>
                    {post.satellite}
                  </Typography>
                  <Typography level="body-sm" startDecorator={<span>📅</span>}>
                    {new Date(post.timestamp * 1000).toLocaleDateString()}
                  </Typography>
                </Stack>
                <Button
                  variant="solid"
                  fullWidth
                  onClick={() => navigate(`/post/${post.id}`)}
                  sx={{ mt: 'auto' }}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Overview;