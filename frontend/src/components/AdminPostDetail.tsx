import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Stack,
  CircularProgress,
  Alert,
  Button,
  Chip,
} from '@mui/joy';
import { ArrowBack as ArrowBackIcon, Delete as DeleteIcon, OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import type { DatabasePostDetail } from '../types';
import type { Station } from '../api';
import { getDatabasePostDetail, getStationDetails, getStationPictureBlob, getProfilePictureUrl, getPostCBOR, adminDeletePost, adminHidePost } from '../api';

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${day}.${month}.${year} ${hours}:${minutes}`;
};

const AdminPostDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<DatabasePostDetail | null>(null);
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stationImageBlob, setStationImageBlob] = useState<string | null>(null);
  const [cborData, setCborData] = useState<any>(null);
  const [loadingCBOR, setLoadingCBOR] = useState(false);
  const [hiding, setHiding] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchPostDetail = async () => {
      try {
        setLoading(true);
        const data = await getDatabasePostDetail(id);
        setDetail(data);

        // Also fetch station details for picture
        try {
          const stationData = await getStationDetails(data.station_id);
          setStation(stationData);
        } catch (stationErr) {
          console.warn('Could not load station details:', stationErr);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load post details');
      } finally {
        setLoading(false);
      }
    };

    fetchPostDetail();
  }, [id]);

  useEffect(() => {
    if (!station?.has_picture || !station?.picture_url) return;

    const loadStationPicture = async () => {
      try {
        const blobUrl = await getStationPictureBlob(station.picture_url!);
        setStationImageBlob(blobUrl);
      } catch (error) {
        console.error('Failed to load station picture:', error);
      }
    };

    loadStationPicture();
  }, [station]);

  useEffect(() => {
    if (!detail?.id) return;

    const loadCBOR = async () => {
      setLoadingCBOR(true);
      try {
        const cborJson = await getPostCBOR(detail.id);
        setCborData(cborJson);
      } catch (error) {
        console.error('Failed to load CBOR data:', error);
        // CBOR might not exist for this post, which is fine
      } finally {
        setLoadingCBOR(false);
      }
    };

    loadCBOR();
  }, [detail?.id]);

  const handleHidePost = async (hidden: boolean) => {
    if (!detail) return;

    try {
      setHiding(true);
      await adminHidePost(detail.id, hidden);
      // Refresh the post data
      const data = await getDatabasePostDetail(detail.id.toString());
      setDetail(data);
    } catch (err) {
      setError(`Failed to ${hidden ? 'hide' : 'unhide'} post`);
      console.error(`Error ${hidden ? 'hiding' : 'unhiding'} post:`, err);
    } finally {
      setHiding(false);
    }
  };

  const handleDeletePost = async () => {
    if (!detail || !window.confirm(`Are you sure you want to delete the post "${detail.satellite_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(true);
      await adminDeletePost(detail.id);
      navigate('/admin/posts');
    } catch (err) {
      setError('Failed to delete post');
      console.error('Error deleting post:', err);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !detail) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert color="danger">
          {error || 'Post not found'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, maxWidth: '1400px', mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button
          variant="outlined"
          startDecorator={<ArrowBackIcon />}
          onClick={() => navigate('/admin/posts')}
        >
          Back to Posts
        </Button>
        <Typography level="h2">
          Post Details: {detail.satellite_name}
        </Typography>
        <Chip size="sm" color="primary" variant="soft">
          UUID: {detail.id}
        </Chip>
      </Box>

      {error && (
        <Alert color="danger" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Post Information */}
        <Grid xs={12} lg={6}>
          <Stack spacing={2}>
            {/* Basic Post Info */}
            <Card>
              <CardContent>
                <Typography level="h3" sx={{ mb: 2 }}>
                  Post Information
                </Typography>
                <Stack spacing={1}>
                  <Box>
                    <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Post ID:</Typography>
                    <Typography level="body-sm" sx={{ fontFamily: 'monospace' }}>{detail.id}</Typography>
                  </Box>
                  <Box>
                    <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Satellite:</Typography>
                    <Typography level="body-sm">{detail.satellite_name}</Typography>
                  </Box>
                  <Box>
                    <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Station:</Typography>
                    <Typography level="body-sm">{detail.station_name}</Typography>
                  </Box>
                  <Box>
                    <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Station ID:</Typography>
                    <Typography level="body-sm" sx={{ fontFamily: 'monospace' }}>{detail.station_id}</Typography>
                  </Box>
                  <Box>
                    <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Created:</Typography>
                    <Typography level="body-sm">{formatDate(detail.created_at)}</Typography>
                  </Box>
                  <Box>
                    <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Updated:</Typography>
                    <Typography level="body-sm">{formatDate(detail.updated_at)}</Typography>
                  </Box>
                  <Box>
                    <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Images:</Typography>
                    <Typography level="body-sm">{detail.images.length}</Typography>
                  </Box>
                  <Box>
                    <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Status:</Typography>
                    <Typography level="body-sm" color={detail.hidden ? "warning" : "success"}>
                      {detail.hidden ? "Hidden" : "Visible"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Likes:</Typography>
                    <Typography level="body-sm">{detail.likes_count}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* Station Owner */}
            {detail.station_user && (
              <Card>
                <CardContent>
                  <Typography level="h3" sx={{ mb: 2 }}>
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
                      {detail.station_user.has_profile_picture && detail.station_user.profile_picture_url ? (
                        <img
                          src={getProfilePictureUrl(detail.station_user.profile_picture_url)}
                          alt={`${detail.station_user.username}'s profile`}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <Typography level="h3" color="neutral">
                          {detail.station_user.username.charAt(0).toUpperCase()}
                        </Typography>
                      )}
                    </Box>
                    <Box>
                      <Typography level="body-lg" fontWeight="bold">
                        {detail.station_user.display_name || detail.station_user.username}
                      </Typography>
                      <Typography level="body-sm" color="neutral">
                        @{detail.station_user.username}
                      </Typography>
                      <Typography level="body-sm" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                        UUID: {detail.station_user.id}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Images List */}
            <Card>
              <CardContent>
                <Typography level="h3" sx={{ mb: 2 }}>
                  Images ({detail.images.length})
                </Typography>
                {detail.images.length > 0 ? (
                  <Stack spacing={1}>
                    {detail.images.map((image) => (
                      <Box key={image.id} sx={{ p: 1, bgcolor: 'neutral.softBg', borderRadius: 'sm' }}>
                        <Typography level="body-sm" sx={{ fontFamily: 'monospace' }}>
                          ID: {image.id}
                        </Typography>
                        <Typography level="body-sm">
                          {image.filename}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography level="body-sm" color="neutral">
                    No images attached to this post
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Station and Additional Info */}
        <Grid xs={12} lg={6}>
          <Stack spacing={2}>
            {/* Station Information */}
            <Card>
              <CardContent>
                <Typography level="h3" sx={{ mb: 2 }}>
                  Station: {detail.station_name}
                </Typography>

                {/* Station Picture */}
                {station?.has_picture && stationImageBlob && (
                  <Box sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        width: '100%',
                        height: 200,
                        borderRadius: '8px',
                        overflow: 'hidden',
                        bgcolor: 'neutral.softBg'
                      }}
                    >
                      <img
                        src={stationImageBlob}
                        alt={`${detail.station_name} station`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    </Box>
                  </Box>
                )}

                {station && (
                  <Stack spacing={1}>
                    <Typography level="body-md" startDecorator={<span>📍</span>}>
                      Location: {station.location}
                    </Typography>
                    <Typography level="body-md" startDecorator={<span>📅</span>}>
                      Created: {formatDate(station.created_at)}
                    </Typography>
                    <Typography level="body-md" startDecorator={<span>📊</span>}>
                      Equipment: {station.equipment}
                    </Typography>
                    <Box>
                      <Typography level="body-md" startDecorator={<span>🌐</span>}>
                        Public: {station.is_public ? 'Yes' : 'No'}
                      </Typography>
                    </Box>
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Metadata */}
            {detail.metadata && (
              <Card>
                <CardContent>
                  <Typography level="h3" sx={{ mb: 2 }}>Metadata</Typography>
                  <Box sx={{
                    maxHeight: '200px',
                    overflow: 'auto',
                    bgcolor: 'neutral.softBg',
                    p: 1,
                    borderRadius: 'sm'
                  }}>
                    <pre style={{ fontSize: '0.7rem', margin: 0, whiteSpace: 'pre-wrap' }}>
                      {detail.metadata}
                    </pre>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* CBOR Data */}
            <Card>
              <CardContent>
                <Typography level="h3" sx={{ mb: 2 }}>CBOR Data</Typography>
                {loadingCBOR ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                    <CircularProgress size="sm" />
                  </Box>
                ) : cborData ? (
                  <Box sx={{
                    maxHeight: '300px',
                    overflow: 'auto',
                    bgcolor: 'neutral.softBg',
                    p: 1,
                    borderRadius: 'sm'
                  }}>
                    <pre style={{ fontSize: '0.7rem', margin: 0, whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(cborData, null, 2)}
                    </pre>
                  </Box>
                ) : (
                  <Typography level="body-sm" color="neutral">
                    No CBOR data available for this post
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* Admin Actions */}
            <Card>
              <CardContent>
                <Typography level="h3" sx={{ mb: 2 }}>Admin Actions</Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/admin/posts')}
                    startDecorator={<ArrowBackIcon />}
                  >
                    Back to List
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate(`/post/${detail.id}`)}
                    startDecorator={<OpenInNewIcon />}
                  >
                    View Post
                  </Button>
                  <Button
                    color={detail.hidden ? "success" : "warning"}
                    variant="soft"
                    onClick={() => handleHidePost(!detail.hidden)}
                    disabled={hiding}
                  >
                    {hiding ? 'Updating...' : (detail.hidden ? 'Unhide Post' : 'Hide Post')}
                  </Button>
                  <Button
                    color="danger"
                    variant="soft"
                    onClick={handleDeletePost}
                    disabled={deleting}
                    startDecorator={<DeleteIcon />}
                  >
                    {deleting ? 'Deleting...' : 'Delete Post'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminPostDetail;