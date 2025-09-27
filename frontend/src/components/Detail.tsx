import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Stack,
  CircularProgress,
  Alert,
  Skeleton,
  IconButton,
  Button,
  Chip,
} from '@mui/joy';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import type { DatabasePostDetail } from '../types';
import { getDatabasePostDetail, getPostImageBlob } from '../api';

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${day}-${month}-${year} ${hours}:${minutes}`;
};

const getImageCategory = (filename: string): string => {
  const lower = filename.toLowerCase();

  if (lower.includes('msu-mr')) {
    if (lower.includes('rgb')) {
      return 'MSU-MR RGB';
    } else if (lower.includes('ir') || lower.includes('infrared')) {
      return 'MSU-MR IR';
    } else {
      return 'MSU-MR';
    }
  }
  if (lower.includes('avhrr')) {
    return 'AVHRR';
  }
  if (lower.includes('msa')) {
    return 'MSA';
  }
  if (lower.includes('projected')) {
    return 'Projected';
  }
  if (lower.includes('rgb')) {
    return 'RGB';
  }
  if (lower.includes('ir') || lower.includes('infrared')) {
    return 'IR';
  }

  return 'Other';
};

const categorizeImages = (images: DatabasePostDetail['images']): string[] => {
  const categories = new Set<string>(['All']); // Always include 'All' first

  images.forEach(image => {
    categories.add(getImageCategory(image.filename));
  });

  // Remove 'All' and add it back at the beginning
  const sortedCategories = Array.from(categories).filter(cat => cat !== 'All').sort();
  return ['All', ...sortedCategories];
};

const sortImagesByCategory = (images: DatabasePostDetail['images']): DatabasePostDetail['images'] => {
  const categoryOrder = ['MSU-MR RGB', 'MSU-MR IR', 'MSU-MR', 'AVHRR', 'MSA', 'Projected', 'RGB', 'IR', 'Other'];

  return [...images].sort((a, b) => {
    const catA = getImageCategory(a.filename);
    const catB = getImageCategory(b.filename);

    const indexA = categoryOrder.indexOf(catA);
    const indexB = categoryOrder.indexOf(catB);

    if (indexA !== indexB) {
      return indexA - indexB;
    }

    // If same category, sort by filename
    return a.filename.localeCompare(b.filename);
  });
};

const groupImagesByCategory = (images: DatabasePostDetail['images']): Record<string, DatabasePostDetail['images']> => {
  const groups: Record<string, DatabasePostDetail['images']> = {};

  images.forEach(image => {
    const category = getImageCategory(image.filename);
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(image);
  });

  return groups;
};

const Detail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<DatabasePostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedImageInCategory, setSelectedImageInCategory] = useState<number>(0);
  const [imageBlobs, setImageBlobs] = useState<Record<number, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!id) return;

    const fetchPostDetail = async () => {
      try {
        setLoading(true);
        const data = await getDatabasePostDetail(id);
        // Sort images by category
        data.images = sortImagesByCategory(data.images);
        setDetail(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load post details');
      } finally {
        setLoading(false);
      }
    };

    fetchPostDetail();
  }, [id]);

  useEffect(() => {
    if (detail?.images && detail.images.length > 0 && selectedCategory === null) {
      // Always start with "All" category selected
      setSelectedCategory('All');
    }
  }, [detail, selectedCategory]);

  // Keyboard navigation for carousel
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!selectedCategory || !detail?.images) return;

      const images = selectedCategory === 'All'
        ? detail.images
        : groupImagesByCategory(detail.images)[selectedCategory];

      if (!images || images.length <= 1) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setSelectedImageInCategory(prev => {
          const newIndex = prev > 0 ? prev - 1 : images.length - 1;
          return Math.min(newIndex, images.length - 1); // Safety check
        });
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setSelectedImageInCategory(prev => {
          const newIndex = prev < images.length - 1 ? prev + 1 : 0;
          return Math.min(newIndex, images.length - 1); // Safety check
        });
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedCategory, detail?.images]);

  useEffect(() => {
    if (!detail?.images) return;

    const loadImages = async () => {
      for (const image of detail.images) {
        if (!imageBlobs[image.id]) {
          setLoadingImages(prev => ({ ...prev, [image.id]: true }));
          try {
            const blobUrl = await getPostImageBlob(detail.id, image.id);
            setImageBlobs(prev => ({ ...prev, [image.id]: blobUrl }));
          } catch (error) {
            console.error('Failed to load image:', image.id, error);
          } finally {
            setLoadingImages(prev => ({ ...prev, [image.id]: false }));
          }
        }
      }
    };

    loadImages();
  }, [detail]);

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
      <Typography level="h2" sx={{ mb: 3 }}>
        {detail.satellite_name}
      </Typography>

      <Grid container spacing={3}>
        {/* Gallery on the left */}
        <Grid xs={12} lg={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography level="h3">
                  Image Gallery ({detail.images.length} images)
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {categorizeImages(detail.images).map((category) => (
                    <Chip
                      key={category}
                      size="sm"
                      variant={selectedCategory === category ? "solid" : "soft"}
                      color="primary"
                      sx={{ cursor: 'pointer' }}
                      onClick={() => {
                        setSelectedCategory(category);
                        setSelectedImageInCategory(0); // Reset to first image when switching categories
                      }}
                    >
                      {category}
                    </Chip>
                  ))}
                </Box>
              </Box>

              {/* Selected Category Carousel */}
              <Box>
                {selectedCategory && (() => {
                  const images = selectedCategory === 'All'
                    ? detail.images
                    : groupImagesByCategory(detail.images)[selectedCategory];

                  if (!images) return null;

                  return (
                    <Box key={selectedCategory} sx={{ mb: 4 }}>
                      <Typography level="h4" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        {selectedCategory}
                        <Chip size="sm" variant="soft" color="primary">
                          {images.length} image{images.length !== 1 ? 's' : ''}
                        </Chip>
                      </Typography>

                    {/* Carousel for this category */}
                    <Box sx={{ position: 'relative' }}>
                      {/* Main image */}
                      <Card sx={{ overflow: 'hidden', mb: 2 }}>
                        <Box
                          sx={{
                            position: 'relative',
                            height: { xs: '300px', sm: '400px', lg: '500px' },
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'neutral.softBg'
                          }}
                        >
                          {images[selectedImageInCategory] && (
                            loadingImages[images[selectedImageInCategory].id] || !imageBlobs[images[selectedImageInCategory].id] ? (
                              <Box sx={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'neutral.softBg'
                              }}>
                                <CircularProgress />
                              </Box>
                            ) : (
                              <img
                                src={imageBlobs[images[selectedImageInCategory].id] || ''}
                                alt={images[selectedImageInCategory].filename}
                                style={{
                                  maxWidth: '100%',
                                  maxHeight: '100%',
                                  objectFit: 'contain'
                                }}
                              />
                            )
                          )}

                          {/* Navigation arrows */}
                          {images.length > 1 && (
                            <>
                              <IconButton
                                onClick={() => setSelectedImageInCategory(prev => prev > 0 ? prev - 1 : images.length - 1)}
                                sx={{
                                  position: 'absolute',
                                  left: 8,
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                                  color: 'white',
                                  '&:hover': {
                                    bgcolor: 'rgba(0, 0, 0, 0.7)'
                                  }
                                }}
                              >
                                <KeyboardArrowLeftIcon />
                              </IconButton>
                              <IconButton
                                onClick={() => setSelectedImageInCategory(prev => prev < images.length - 1 ? prev + 1 : 0)}
                                sx={{
                                  position: 'absolute',
                                  right: 8,
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                                  color: 'white',
                                  '&:hover': {
                                    bgcolor: 'rgba(0, 0, 0, 0.7)'
                                  }
                                }}
                              >
                                <KeyboardArrowRightIcon />
                              </IconButton>
                            </>
                          )}
                        </Box>
                        <CardContent>
                          <Typography level="body-lg" sx={{ textAlign: 'center' }}>
                            {images[selectedImageInCategory]?.filename || ''}
                          </Typography>
                          <Typography level="body-sm" sx={{ textAlign: 'center', color: 'neutral.500' }}>
                            {selectedImageInCategory + 1} of {images.length}
                          </Typography>
                        </CardContent>
                      </Card>

                      {/* Thumbnail previews as dots */}
                      {images.length > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                          {images.map((image, index) => (
                            <Box
                              key={image.id}
                              onClick={() => setSelectedImageInCategory(index)}
                              sx={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                overflow: 'hidden',
                                border: selectedImageInCategory === index ? '2px solid var(--joy-palette-primary-main)' : '2px solid transparent',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: loadingImages[image.id] ? 'neutral.softBg' : 'transparent',
                                '&:hover': {
                                  borderColor: 'var(--joy-palette-primary-main)',
                                  transform: 'scale(1.1)'
                                }
                              }}
                            >
                              {loadingImages[image.id] || !imageBlobs[image.id] ? (
                                <CircularProgress size="sm" />
                              ) : (
                                <img
                                  src={imageBlobs[image.id]}
                                  alt={image.filename}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                  }}
                                />
                              )}
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                  </Box>
                  );
                })()}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Station and Owner Info on the right */}
        <Grid xs={12} lg={4}>
          <Stack spacing={2}>
            {/* Station Info */}
            <Card>
              <CardContent>
                <Typography level="h3" sx={{ mb: 2 }}>Station</Typography>
                <Stack spacing={1}>
                  <Box>
                    <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Name:</Typography>
                    <Typography level="body-sm">{detail.station_name}</Typography>
                  </Box>
                  <Box>
                    <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>ID:</Typography>
                    <Typography level="body-sm">{detail.station_id}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* Owner Info */}
            {detail.station_user && (
              <Card>
                <CardContent>
                  <Typography level="h3" sx={{ mb: 2 }}>Owner</Typography>
                  <Stack spacing={1}>
                    <Box>
                      <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Username:</Typography>
                      <Typography level="body-sm">{detail.station_user.username}</Typography>
                    </Box>
                    <Box>
                      <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>User ID:</Typography>
                      <Typography level="body-sm">{detail.station_user.id}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Post Info */}
            <Card>
              <CardContent>
                <Typography level="h3" sx={{ mb: 2 }}>Post Details</Typography>
                <Stack spacing={1}>
                  <Box>
                    <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Satellite:</Typography>
                    <Typography level="body-sm">{detail.satellite_name}</Typography>
                  </Box>
                  <Box>
                    <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Timestamp:</Typography>
                    <Typography level="body-sm">{formatDate(detail.timestamp)}</Typography>
                  </Box>
                  <Box>
                    <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Created:</Typography>
                    <Typography level="body-sm">{formatDate(detail.created_at)}</Typography>
                  </Box>
                  <Box>
                    <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Images:</Typography>
                    <Typography level="body-sm">{detail.images.length}</Typography>
                  </Box>
                </Stack>
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
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Detail;