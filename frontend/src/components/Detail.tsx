import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Grid,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Stack,
  Dropdown,
  Menu,
  MenuButton,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/joy';
import type { PostDetail } from '../types';
import { getPostDetail, getImageUrl, getImageBlob } from '../api';

const Detail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<PostDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [imageBlobs, setImageBlobs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) {
      getPostDetail(id)
        .then(setDetail)
        .catch((err) => setError(err.message));
    }
  }, [id]);

  useEffect(() => {
    if (detail?.imageGroups && detail.imageGroups.length > 0) {
      const group = detail.imageGroups[currentTab];
      if (group && group.images.length > 0) {
        setSelectedImage(group.images[0]);
      }
    }
  }, [detail, currentTab]);

  useEffect(() => {
    if (detail?.imageGroups && detail.imageGroups[currentTab]) {
      const group = detail.imageGroups[currentTab];
      const loadImages = async () => {
        for (const img of group.images) {
          if (!imageBlobs[img]) {
            try {
              const blobUrl = await getImageBlob(detail.id, img);
              setImageBlobs(prev => ({ ...prev, [img]: blobUrl }));
            } catch (error) {
              console.error('Failed to load image:', img, error);
            }
          }
        }
      };
      loadImages();
    }
  }, [detail, currentTab]);

  if (error) return <Typography color="danger">Error: {error}</Typography>;
  if (!detail) return <Typography>Loading...</Typography>;

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, maxWidth: '1400px', mx: 'auto' }}>
      <Typography level="h2" sx={{ mb: 3 }}>Post Details</Typography>

      <Grid container spacing={3}>
        {/* Images on the left */}
        <Grid xs={12} lg={8}>
          {detail.imageGroups && detail.imageGroups.length > 0 && (
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography level="h3">Images</Typography>
                  {/* Metadata dropdown button */}
                  <Dropdown>
                    <MenuButton variant="outlined" size="sm">
                      View Metadata
                    </MenuButton>
                    <Menu placement="bottom-end" sx={{ minWidth: 300, maxHeight: 400, overflow: 'auto' }}>
                      <MenuItem>
                        <Box sx={{ width: '100%' }}>
                          <Typography level="title-sm" sx={{ mb: 1 }}>Raw Metadata</Typography>
                          <Box sx={{ maxHeight: '200px', overflow: 'auto', bgcolor: 'neutral.softBg', p: 1, borderRadius: 'sm' }}>
                            <pre style={{ fontSize: '0.7rem', margin: 0, whiteSpace: 'pre-wrap' }}>
                              {JSON.stringify(detail.metadata, null, 2)}
                            </pre>
                          </Box>
                        </Box>
                      </MenuItem>
                    </Menu>
                  </Dropdown>
                </Box>

                <Tabs defaultValue={0} sx={{ mb: 2 }} onChange={(_, value) => setCurrentTab(value as number)}>
                  <TabList sx={{ flexWrap: 'wrap' }}>
                    {detail.imageGroups.map((group, index) => (
                      <Tab key={group.type} value={index} sx={{ minWidth: 'auto' }}>
                        {group.type} ({group.images.length})
                      </Tab>
                    ))}
                  </TabList>
                  {detail.imageGroups.map((group, index) => (
                    <TabPanel key={group.type} value={index}>
                      {group.images.length > 0 && (
                        <Box>
                          {/* Large selected image */}
                          <Card sx={{ mb: 3, overflow: 'hidden' }}>
                            <Box sx={{
                              position: 'relative',
                              height: { xs: '300px', sm: '400px', lg: '500px' },
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: 'neutral.softBg'
                            }}>
                              <img
                                src={imageBlobs[selectedImage || group.images[0]] || ''}
                                alt={selectedImage || group.images[0]}
                                style={{
                                  maxWidth: '100%',
                                  maxHeight: '100%',
                                  objectFit: 'contain'
                                }}
                              />
                            </Box>
                            <CardContent>
                              <Typography level="body-lg" sx={{ textAlign: 'center' }}>
                                {(selectedImage || group.images[0]).split('/').pop()}
                              </Typography>
                            </CardContent>
                          </Card>

                          {/* Thumbnails */}
                          <Typography level="h4" sx={{ mb: 2 }}>Thumbnails</Typography>
                          <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                              xs: 'repeat(3, 1fr)',
                              sm: 'repeat(4, 1fr)',
                              md: 'repeat(5, 1fr)',
                              lg: 'repeat(6, 1fr)'
                            },
                            gap: 1
                          }}>
                            {group.images.map((img) => (
                              <Card
                                key={img}
                                sx={{
                                  cursor: 'pointer',
                                  border: selectedImage === img ? '2px solid var(--joy-palette-primary-main)' : '1px solid var(--joy-palette-neutral-outlinedBorder)',
                                  transition: 'all 0.2s',
                                  '&:hover': {
                                    borderColor: 'var(--joy-palette-primary-main)',
                                    transform: 'scale(1.02)'
                                  }
                                }}
                                onClick={() => setSelectedImage(img)}
                              >
                                <Box sx={{ aspectRatio: '1', overflow: 'hidden' }}>
                                  <img
                                    src={imageBlobs[img] || ''}
                                    alt={img}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover'
                                    }}
                                  />
                                </Box>
                                <CardContent sx={{ p: 1 }}>
                                  <Typography
                                    level="body-xs"
                                    sx={{
                                      fontSize: '0.65rem',
                                      textAlign: 'center',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {img.split('/').pop()}
                                  </Typography>
                                </CardContent>
                              </Card>
                            ))}
                          </Box>
                        </Box>
                      )}
                    </TabPanel>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Info on the right */}
        <Grid xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography level="h3" sx={{ mb: 2 }}>Info</Typography>
              <Stack spacing={1}>
                <Box>
                  <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Description:</Typography>
                  <Typography level="body-sm">{detail.info.description || 'N/A'}</Typography>
                </Box>
                <Box>
                  <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Location:</Typography>
                  <Typography level="body-sm">{detail.info.location || 'N/A'}</Typography>
                </Box>
                <Box>
                  <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>User:</Typography>
                  <Typography level="body-sm">{detail.info.user || 'N/A'}</Typography>
                </Box>
                <Box>
                  <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Station:</Typography>
                  <Typography level="body-sm">{detail.info.station_name || 'N/A'}</Typography>
                </Box>
                <Box>
                  <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Uploaded:</Typography>
                  <Typography level="body-sm">
                    {detail.info.uploaded_at ? new Date(detail.info.uploaded_at).toLocaleString() : 'N/A'}
                  </Typography>
                </Box>
                {detail.info.koordinaten && (
                  <Box>
                    <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Coordinates:</Typography>
                    <Typography level="body-sm">
                      {Array.isArray(detail.info.koordinaten)
                        ? `${detail.info.koordinaten[0]}, ${detail.info.koordinaten[1]}`
                        : 'N/A'
                      }
                    </Typography>
                  </Box>
                )}
                {detail.metadata.sample_json && (
                  <>
                    <Box>
                      <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Satellite:</Typography>
                      <Typography level="body-sm">{detail.metadata.sample_json.satellite || 'N/A'}</Typography>
                    </Box>
                    <Box>
                      <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>Products:</Typography>
                      <Typography level="body-sm">
                        {Array.isArray(detail.metadata.sample_json.products)
                          ? detail.metadata.sample_json.products.join(', ')
                          : 'N/A'
                        }
                      </Typography>
                    </Box>
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* CBOR section below both panels */}
      <Box sx={{ mt: 3 }}>
        <Accordion>
          <AccordionSummary>
            <Typography level="h3">CBOR Data (JSON)</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {detail.cbor ? (
              <Box sx={{
                maxHeight: '400px',
                overflow: 'auto',
                bgcolor: 'neutral.softBg',
                p: 2,
                borderRadius: 'sm'
              }}>
                <pre style={{ fontSize: '0.8rem', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(detail.cbor, null, 2)}
                </pre>
              </Box>
            ) : (
              <Typography level="body-sm">CBOR parsing failed or not available</Typography>
            )}
          </AccordionDetails>
        </Accordion>
      </Box>

    </Box>
  );
};

export default Detail;