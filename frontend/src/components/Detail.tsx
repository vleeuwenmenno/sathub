import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Stack,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
} from "@mui/joy";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import type { DatabasePostDetail } from "../types";
import type { Station } from "../api";
import {
  getDatabasePostDetail,
  getPostImageBlob,
  getStationDetails,
  getStationPictureBlob,
  getProfilePictureUrl,
  getPostCBOR,
} from "../api";
import LikeButton from "./LikeButton";
import DeletePostButton from "./DeletePostButton";
import ReportButton from "./ReportButton";
import CommentSection from "./CommentSection";
import ImageViewer from "./ImageViewer";
import { useAuth } from "../contexts/AuthContext";

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${day}.${month}.${year} ${hours}:${minutes}`;
};

const getImageCategory = (filename: string): string => {
  const lower = filename.toLowerCase();

  if (lower.includes("msu-mr")) {
    if (lower.includes("rgb")) {
      return "MSU-MR RGB";
    } else if (lower.includes("ir") || lower.includes("infrared")) {
      return "MSU-MR IR";
    } else {
      return "MSU-MR";
    }
  }
  if (lower.includes("avhrr")) {
    return "AVHRR";
  }
  if (lower.includes("msa")) {
    return "MSA";
  }
  if (lower.includes("projected")) {
    return "Projected";
  }
  if (lower.includes("rgb")) {
    return "RGB";
  }
  if (lower.includes("ir") || lower.includes("infrared")) {
    return "IR";
  }

  return "Other";
};

const categorizeImages = (images: DatabasePostDetail["images"]): string[] => {
  const categories = new Set<string>();

  images.forEach((image) => {
    categories.add(getImageCategory(image.filename));
  });

  return Array.from(categories).sort();
};

const sortImagesByCategory = (
  images: DatabasePostDetail["images"]
): DatabasePostDetail["images"] => {
  const categoryOrder = [
    "MSU-MR RGB",
    "MSU-MR IR",
    "MSU-MR",
    "AVHRR",
    "MSA",
    "Projected",
    "RGB",
    "IR",
    "Other",
  ];

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

const groupImagesByCategory = (
  images: DatabasePostDetail["images"]
): Record<string, DatabasePostDetail["images"]> => {
  const groups: Record<string, DatabasePostDetail["images"]> = {};

  images.forEach((image) => {
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [detail, setDetail] = useState<DatabasePostDetail | null>(null);
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedImageInCategory, setSelectedImageInCategory] =
    useState<number>(0);
  const [imageBlobs, setImageBlobs] = useState<Record<number, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<number, boolean>>(
    {}
  );
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [stationImageBlob, setStationImageBlob] = useState<string | null>(null);
  const [highlightedCommentId, setHighlightedCommentId] = useState<
    string | null
  >(null);
  const [cborData, setCborData] = useState<any>(null);
  const [loadingCBOR, setLoadingCBOR] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImageForViewer, setSelectedImageForViewer] = useState<{
    url: string;
    alt: string;
    filename: string;
  } | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchPostDetail = async () => {
      try {
        setLoading(true);
        const data = await getDatabasePostDetail(id);
        // Sort images by category
        data.images = sortImagesByCategory(data.images);
        setDetail(data);

        // Also fetch station details for picture
        try {
          const stationData = await getStationDetails(data.station_id);
          setStation(stationData);
        } catch (stationErr) {
          console.warn("Could not load station details:", stationErr);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load post details"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPostDetail();
  }, [id]);

  useEffect(() => {
    if (
      detail?.images &&
      detail.images.length > 0 &&
      selectedCategory === null
    ) {
      // Start with the first available category
      const categories = categorizeImages(detail.images);
      if (categories.length > 0) {
        setSelectedCategory(categories[0]);

        // Load the first image of the first category
        const firstCategoryImages = groupImagesByCategory(detail.images)[
          categories[0]
        ];
        if (firstCategoryImages && firstCategoryImages.length > 0) {
          loadImage(firstCategoryImages[0].id);
        }
      }
    }
  }, [detail, selectedCategory]);

  // Keyboard navigation for carousel
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!selectedCategory || !detail?.images) return;

      const images = groupImagesByCategory(detail.images)[selectedCategory];

      if (!images || images.length <= 1) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setSelectedImageInCategory((prev) => {
          const newIndex = prev > 0 ? prev - 1 : images.length - 1;
          // Load the new image
          loadImage(images[newIndex].id);
          return Math.min(newIndex, images.length - 1); // Safety check
        });
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setSelectedImageInCategory((prev) => {
          const newIndex = prev < images.length - 1 ? prev + 1 : 0;
          // Load the new image
          loadImage(images[newIndex].id);
          return Math.min(newIndex, images.length - 1); // Safety check
        });
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [selectedCategory, detail?.images]);

  // Function to load a single image on-demand
  const loadImage = async (imageId: number) => {
    if (!detail?.id || imageBlobs[imageId] || loadingImages[imageId]) {
      return; // Already loaded or currently loading
    }

    setLoadingImages((prev) => ({ ...prev, [imageId]: true }));
    // Clear any previous error for this image
    setImageErrors((prev) => ({ ...prev, [imageId]: false }));
    try {
      const blobUrl = await getPostImageBlob(detail.id, imageId);
      setImageBlobs((prev) => ({ ...prev, [imageId]: blobUrl }));
    } catch (error) {
      console.error("Failed to load image:", imageId, error);
      setImageErrors((prev) => ({ ...prev, [imageId]: true }));
    } finally {
      setLoadingImages((prev) => ({ ...prev, [imageId]: false }));
    }
  };

  // Function to preload adjacent images for smoother navigation
  const preloadAdjacentImages = (currentImageId: number) => {
    if (!detail?.images || !selectedCategory) return;

    const images = groupImagesByCategory(detail.images)[selectedCategory];
    if (!images || images.length <= 1) return;

    const currentIndex = images.findIndex((img) => img.id === currentImageId);
    if (currentIndex === -1) return;

    // Preload next image
    const nextIndex = (currentIndex + 1) % images.length;
    loadImage(images[nextIndex].id);

    // Preload previous image
    const prevIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    loadImage(images[prevIndex].id);
  };

  // Load the currently selected image and preload adjacent ones
  useEffect(() => {
    if (!selectedCategory || !detail?.images) return;

    const images = groupImagesByCategory(detail.images)[selectedCategory];
    if (!images || images.length === 0) return;

    const currentImage = images[selectedImageInCategory];
    if (currentImage) {
      loadImage(currentImage.id);
      // Preload adjacent images after a short delay to prioritize the current image
      setTimeout(() => preloadAdjacentImages(currentImage.id), 500);
    }
  }, [selectedCategory, selectedImageInCategory, detail?.images]);

  useEffect(() => {
    if (!station?.has_picture || !station?.picture_url) return;

    const loadStationPicture = async () => {
      try {
        const blobUrl = await getStationPictureBlob(station.picture_url!);
        setStationImageBlob(blobUrl);
      } catch (error) {
        console.error("Failed to load station picture:", error);
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
        console.error("Failed to load CBOR data:", error);
        // CBOR might not exist for this post, which is fine
      } finally {
        setLoadingCBOR(false);
      }
    };

    loadCBOR();
  }, [detail?.id]);

  // Handle hash-based scrolling to specific comment
  useEffect(() => {
    if (window.location.hash) {
      const hash = window.location.hash.substring(1); // Remove #
      if (hash.startsWith("comment-")) {
        const commentId = hash.replace("comment-", "");

        // Function to scroll and highlight when element is found
        const scrollToComment = () => {
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });

            // Set highlighted comment
            setHighlightedCommentId(commentId);

            // Remove highlight after 3 seconds
            setTimeout(() => {
              setHighlightedCommentId(null);
            }, 3000);
            return true;
          }
          return false;
        };

        // Try immediately first
        if (scrollToComment()) {
          return;
        }

        // If not found, poll every 100ms for up to 2 seconds
        let attempts = 0;
        const maxAttempts = 20; // 2 seconds / 100ms
        const interval = setInterval(() => {
          attempts++;
          if (scrollToComment() || attempts >= maxAttempts) {
            clearInterval(interval);
          }
        }, 100);

        return () => clearInterval(interval);
      }
    }
  }, []);

  const handleDeletePost = () => {
    navigate("/");
  };

  const handleImageClick = (imageId: number, filename: string) => {
    if (detail) {
      setSelectedImageForViewer({
        url: imageBlobs[imageId] || "",
        alt: `${detail.satellite_name} - ${filename}`,
        filename: filename,
      });
      setImageViewerOpen(true);
    }
  };

  const handleCloseImageViewer = () => {
    setImageViewerOpen(false);
    setSelectedImageForViewer(null);
  };

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

  if (error || !detail) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert color="danger">{error || "Post not found"}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, maxWidth: "1400px", mx: "auto" }}>
      <Typography level="h2" sx={{ mb: 3 }}>
        {detail.satellite_name}
      </Typography>

      <Grid container spacing={3}>
        {/* Gallery on the left */}
        <Grid xs={12} lg={8}>
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  mb: 2,
                }}
              >
                <Typography level="h3">
                  Image Gallery ({detail.images.length} images)
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {categorizeImages(detail.images).map((category) => (
                    <Chip
                      key={category}
                      size="sm"
                      variant={selectedCategory === category ? "solid" : "soft"}
                      color="primary"
                      sx={{ cursor: "pointer" }}
                      onClick={() => {
                        setSelectedCategory(category);
                        setSelectedImageInCategory(0); // Reset to first image when switching categories

                        // Load the first image of the new category
                        if (detail?.images) {
                          const categoryImages = groupImagesByCategory(
                            detail.images
                          )[category];
                          if (categoryImages && categoryImages.length > 0) {
                            loadImage(categoryImages[0].id);
                          }
                        }
                      }}
                    >
                      {category}
                    </Chip>
                  ))}
                </Box>
              </Box>

              {/* Selected Category Carousel */}
              <Box>
                {selectedCategory &&
                  (() => {
                    const images = groupImagesByCategory(detail.images)[
                      selectedCategory
                    ];

                    if (!images) return null;

                    return (
                      <Box key={selectedCategory} sx={{ mb: 4 }}>
                        <Typography
                          level="h4"
                          sx={{
                            mb: 2,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          {selectedCategory}
                          <Chip size="sm" variant="soft" color="primary">
                            {images.length} image
                            {images.length !== 1 ? "s" : ""}
                          </Chip>
                        </Typography>

                        {/* Carousel for this category */}
                        <Box sx={{ position: "relative" }}>
                          {/* Main image */}
                          <Card sx={{ overflow: "hidden", mb: 2 }}>
                            <Box
                              sx={{
                                position: "relative",
                                height: {
                                  xs: "300px",
                                  sm: "400px",
                                  lg: "500px",
                                },
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                bgcolor: "neutral.softBg",
                              }}
                            >
                              {images[selectedImageInCategory] &&
                                (loadingImages[
                                  images[selectedImageInCategory].id
                                ] ||
                                !imageBlobs[
                                  images[selectedImageInCategory].id
                                ] ? (
                                  <Box
                                    sx={{
                                      width: "100%",
                                      height: "100%",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      bgcolor: "neutral.softBg",
                                    }}
                                  >
                                    <CircularProgress />
                                  </Box>
                                ) : imageErrors[
                                    images[selectedImageInCategory].id
                                  ] ? (
                                  <Box
                                    sx={{
                                      width: "100%",
                                      height: "100%",
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      bgcolor: "neutral.softBg",
                                      p: 2,
                                      textAlign: "center",
                                    }}
                                  >
                                    <Typography level="body-sm" color="danger">
                                      Failed to load image
                                    </Typography>
                                    <Typography
                                      level="body-xs"
                                      color="neutral"
                                      sx={{ mt: 1 }}
                                    >
                                      {images[selectedImageInCategory].filename}
                                    </Typography>
                                  </Box>
                                ) : (
                                  <img
                                    src={
                                      imageBlobs[
                                        images[selectedImageInCategory].id
                                      ] || ""
                                    }
                                    alt={
                                      images[selectedImageInCategory].filename
                                    }
                                    style={{
                                      maxWidth: "100%",
                                      maxHeight: "100%",
                                      objectFit: "contain",
                                      cursor: "pointer",
                                    }}
                                    onClick={() =>
                                      handleImageClick(
                                        images[selectedImageInCategory].id,
                                        images[selectedImageInCategory].filename
                                      )
                                    }
                                    onError={() => {
                                      setImageErrors((prev) => ({
                                        ...prev,
                                        [images[selectedImageInCategory].id]:
                                          true,
                                      }));
                                    }}
                                  />
                                ))}

                              {/* Navigation arrows */}
                              {images.length > 1 && (
                                <>
                                  <IconButton
                                    onClick={() => {
                                      const newIndex =
                                        selectedImageInCategory > 0
                                          ? selectedImageInCategory - 1
                                          : images.length - 1;
                                      setSelectedImageInCategory(newIndex);
                                      // Load the new image
                                      loadImage(images[newIndex].id);
                                    }}
                                    sx={{
                                      position: "absolute",
                                      left: 8,
                                      top: "50%",
                                      transform: "translateY(-50%)",
                                      bgcolor: "rgba(0, 0, 0, 0.5)",
                                      color: "white",
                                      "&:hover": {
                                        bgcolor: "rgba(0, 0, 0, 0.7)",
                                      },
                                    }}
                                  >
                                    <KeyboardArrowLeftIcon />
                                  </IconButton>
                                  <IconButton
                                    onClick={() => {
                                      const newIndex =
                                        selectedImageInCategory <
                                        images.length - 1
                                          ? selectedImageInCategory + 1
                                          : 0;
                                      setSelectedImageInCategory(newIndex);
                                      // Load the new image
                                      loadImage(images[newIndex].id);
                                    }}
                                    sx={{
                                      position: "absolute",
                                      right: 8,
                                      top: "50%",
                                      transform: "translateY(-50%)",
                                      bgcolor: "rgba(0, 0, 0, 0.5)",
                                      color: "white",
                                      "&:hover": {
                                        bgcolor: "rgba(0, 0, 0, 0.7)",
                                      },
                                    }}
                                  >
                                    <KeyboardArrowRightIcon />
                                  </IconButton>
                                </>
                              )}
                            </Box>
                            <CardContent>
                              <Typography
                                level="body-lg"
                                sx={{ textAlign: "center" }}
                              >
                                {images[selectedImageInCategory]?.filename ||
                                  ""}
                              </Typography>
                              <Typography
                                level="body-sm"
                                sx={{
                                  textAlign: "center",
                                  color: "neutral.500",
                                }}
                              >
                                {selectedImageInCategory + 1} of {images.length}
                              </Typography>
                            </CardContent>
                          </Card>

                          {/* Thumbnail previews as dots */}
                          {images.length > 1 && (
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "center",
                                gap: 1,
                                mb: 2,
                                flexWrap: "wrap",
                              }}
                            >
                              {images.map((image, index) => (
                                <Box
                                  key={image.id}
                                  onClick={() => {
                                    setSelectedImageInCategory(index);
                                    // Load the image if not already loaded
                                    loadImage(image.id);
                                  }}
                                  sx={{
                                    width: "40px",
                                    height: "40px",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    overflow: "hidden",
                                    border:
                                      selectedImageInCategory === index
                                        ? "2px solid var(--joy-palette-primary-main)"
                                        : "2px solid transparent",
                                    transition: "all 0.2s",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    bgcolor: loadingImages[image.id]
                                      ? "neutral.softBg"
                                      : "transparent",
                                    "&:hover": {
                                      borderColor:
                                        "var(--joy-palette-primary-main)",
                                      transform: "scale(1.1)",
                                    },
                                  }}
                                >
                                  {loadingImages[image.id] ||
                                  !imageBlobs[image.id] ? (
                                    <CircularProgress size="sm" />
                                  ) : imageErrors[image.id] ? (
                                    <Box
                                      sx={{
                                        width: "100%",
                                        height: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        bgcolor: "danger.softBg",
                                      }}
                                    >
                                      <Typography
                                        level="body-xs"
                                        color="danger"
                                        sx={{ p: 1, textAlign: "center" }}
                                      >
                                        Error
                                      </Typography>
                                    </Box>
                                  ) : (
                                    <img
                                      src={imageBlobs[image.id]}
                                      alt={image.filename}
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                      }}
                                      onError={() => {
                                        setImageErrors((prev) => ({
                                          ...prev,
                                          [image.id]: true,
                                        }));
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
                        width: "100%",
                        height: 200,
                        borderRadius: "8px",
                        overflow: "hidden",
                        bgcolor: "neutral.softBg",
                      }}
                    >
                      <img
                        src={stationImageBlob}
                        alt={`${detail.station_name} station`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </Box>
                  </Box>
                )}

                <Stack spacing={1}>
                  <Typography level="body-md" startDecorator={<span>📍</span>}>
                    Location: {detail.station_name}
                  </Typography>
                  {station && (
                    <Typography
                      level="body-md"
                      startDecorator={<span>📅</span>}
                    >
                      Created: {formatDate(station.created_at)}
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Station Owner */}
            {detail.station_user && (
              <Card
                onClick={() => navigate(`/user/${detail.station_user!.id}`)}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  cursor: "pointer",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "lg",
                  },
                }}
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
                      {detail.station_user.has_profile_picture &&
                      detail.station_user.profile_picture_url ? (
                        <img
                          src={getProfilePictureUrl(
                            detail.station_user.profile_picture_url
                          )}
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
                        {detail.station_user.display_name ||
                          detail.station_user.username}
                      </Typography>
                      {detail.station_user.display_name && (
                        <Typography level="body-sm" color="neutral">
                          @{detail.station_user.username}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Post Info */}
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    mb: 2,
                  }}
                >
                  <Typography level="h3">Post Details</Typography>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <DeletePostButton
                      postId={detail.id}
                      postName={detail.satellite_name}
                      isOwner={user?.id === detail.station_user?.id}
                      isAdmin={user?.role === "admin"}
                      onDelete={handleDeletePost}
                    />
                    <LikeButton
                      postId={detail.id}
                      initialLikesCount={detail.likes_count}
                      initialIsLiked={detail.is_liked}
                    />
                    <ReportButton targetType="post" targetId={detail.id} />
                  </Box>
                </Box>
                <Stack spacing={1}>
                  <Box>
                    <Typography level="body-sm" sx={{ fontWeight: "bold" }}>
                      Satellite:
                    </Typography>
                    <Typography level="body-sm">
                      {detail.satellite_name}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography level="body-sm" sx={{ fontWeight: "bold" }}>
                      Created:
                    </Typography>
                    <Typography level="body-sm">
                      {formatDate(detail.created_at)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography level="body-sm" sx={{ fontWeight: "bold" }}>
                      Images:
                    </Typography>
                    <Typography level="body-sm">
                      {detail.images.length}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* Metadata */}
            {detail.metadata && (
              <Card>
                <CardContent>
                  <Typography level="h3" sx={{ mb: 2 }}>
                    Metadata
                  </Typography>
                  <Box
                    sx={{
                      maxHeight: "200px",
                      overflow: "auto",
                      bgcolor: "neutral.softBg",
                      p: 1,
                      borderRadius: "sm",
                    }}
                  >
                    <pre
                      style={{
                        fontSize: "0.7rem",
                        margin: 0,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {detail.metadata}
                    </pre>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* CBOR Data */}
            <Card>
              <CardContent>
                <Typography level="h3" sx={{ mb: 2 }}>
                  CBOR Data
                </Typography>
                {loadingCBOR ? (
                  <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                    <CircularProgress size="sm" />
                  </Box>
                ) : cborData ? (
                  <Box
                    sx={{
                      maxHeight: "300px",
                      overflow: "auto",
                      bgcolor: "neutral.softBg",
                      p: 1,
                      borderRadius: "sm",
                    }}
                  >
                    <pre
                      style={{
                        fontSize: "0.7rem",
                        margin: 0,
                        whiteSpace: "pre-wrap",
                      }}
                    >
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
          </Stack>
        </Grid>
      </Grid>

      {/* Comments Section */}
      <CommentSection
        postId={id!}
        highlightedCommentId={highlightedCommentId}
      />
      {/* Image Viewer */}
      {selectedImageForViewer && (
        <ImageViewer
          open={imageViewerOpen}
          onClose={handleCloseImageViewer}
          imageUrl={selectedImageForViewer.url}
          altText={selectedImageForViewer.alt}
          filename={selectedImageForViewer.filename}
        />
      )}
    </Box>
  );
};

export default Detail;
