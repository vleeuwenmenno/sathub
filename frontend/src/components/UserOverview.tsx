import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  Tooltip,
  Stack,
  Avatar,
} from "@mui/joy";
import {
  getUserPosts,
  getUserStations,
  getStationPictureBlob,
  getUserLikedPosts,
  getUserActivities,
  getProfilePictureUrl,
  getUserAchievementsByID,
  type Station,
} from "../api";
import { useTranslation } from "../contexts/TranslationContext";
import type { Post, UserActivity, UserAchievement } from "../types";
import ReportButton from "./ReportButton";

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
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
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${day}.${month}.${year} ${hours}:${minutes}`;
};

const UserOverview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [imageBlobs, setImageBlobs] = useState<Record<string, string>>({});
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract user info from first station (they all belong to same user)
  const userInfo = stations.length > 0 ? stations[0].user : null;

  useEffect(() => {
    const fetchUserData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const [
          postsData,
          stationsData,
          likedPostsData,
          activitiesData,
          achievementsData,
        ] = await Promise.all([
          getUserPosts(id),
          getUserStations(id),
          getUserLikedPosts(id, 1, 20),
          getUserActivities(id),
          getUserAchievementsByID(id),
        ]);

        setPosts(postsData);
        setStations(stationsData);
        setLikedPosts(likedPostsData.posts);
        setActivities(activitiesData);
        setAchievements(achievementsData);
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

      // Load station images
      for (const station of stations) {
        if (station.has_picture && station.picture_url) {
          try {
            const blobUrl = await getStationPictureBlob(station.picture_url);
            newImageBlobs[`${station.id}-picture`] = blobUrl;
          } catch (error) {
            console.error(
              "Failed to load image for station",
              station.id,
              error
            );
          }
        }
      }

      // Load user profile picture using direct image loading
      if (
        stations.length > 0 &&
        stations[0].user?.has_profile_picture &&
        stations[0].user?.profile_picture_url
      ) {
        setProfilePictureUrl(
          getProfilePictureUrl(stations[0].user.profile_picture_url)
        );
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

  if (stations.length === 0 && posts.length === 0) {
    return (
      <Box sx={{ p: { xs: 1, md: 2 }, maxWidth: "1400px", mx: "auto" }}>
        <Typography level="h2" sx={{ mb: 3 }}>
          {t("user.overview.title")}
        </Typography>
        <Card>
          <CardContent sx={{ textAlign: "center", py: 6 }}>
            <Typography level="h4" color="neutral" sx={{ mb: 2 }}>
              {t("user.overview.noContent")}
            </Typography>
            <Typography level="body-md" color="neutral">
              {t("user.overview.noContentDescription")}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, maxWidth: "1400px", mx: "auto" }}>
      <Typography level="h2" sx={{ mb: 3 }}>
        {t("user.overview.profile")}
      </Typography>

      <Grid container spacing={3}>
        {/* Left Column: User Profile and Recent Posts */}
        <Grid xs={12} md={8}>
          <Stack spacing={3}>
            {/* User Profile Card */}
            {userInfo && (
              <Card>
                <CardContent>
                  <Stack direction="row" spacing={3} alignItems="center">
                    <Avatar
                      src={profilePictureUrl || undefined}
                      sx={{ width: 80, height: 80 }}
                    >
                      {(userInfo.display_name || userInfo.username)
                        ?.charAt(0)
                        .toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          mb: 0.5,
                        }}
                      >
                        <Typography level="h3">
                          {userInfo.display_name || userInfo.username}
                        </Typography>
                        <ReportButton
                          targetType="user"
                          targetId={userInfo.id}
                        />
                      </Box>
                      {userInfo.display_name && (
                        <Typography
                          level="body-md"
                          color="neutral"
                          sx={{ mb: 1 }}
                        >
                          @{userInfo.username}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
                        <Box>
                          <Typography
                            level="body-sm"
                            startDecorator={<span>📡</span>}
                          >
                            {stations.length}{" "}
                            {stations.length === 1
                              ? t("user.overview.publicStation")
                              : t("user.overview.publicStations")}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography
                            level="body-sm"
                            startDecorator={<span>📊</span>}
                          >
                            {posts.length}{" "}
                            {posts.length === 1
                              ? t("user.overview.publicPost")
                              : t("user.overview.publicPosts")}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Recent Posts Section - Compact */}
            {posts.length > 0 && (
              <Card>
                <CardContent>
                  <Typography level="h3" sx={{ mb: 3 }}>
                    {t("user.overview.recentPosts")} ({posts.length})
                  </Typography>
                  <Stack spacing={2}>
                    {posts.slice(0, 8).map((post) => (
                      <Card
                        key={post.id}
                        variant="outlined"
                        onClick={() => navigate(`/post/${post.id}`)}
                        sx={{
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          "&:hover": {
                            backgroundColor: "neutral.softHoverBg",
                            borderColor: "neutral.outlinedHoverBorder",
                            transform: "translateY(-1px)",
                          },
                        }}
                      >
                        <CardContent sx={{ py: 2 }}>
                          <Stack
                            direction="row"
                            spacing={2}
                            alignItems="center"
                          >
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography level="title-md" sx={{ mb: 0.5 }}>
                                {post.satellite_name}
                              </Typography>
                              <Typography level="body-sm" color="neutral">
                                📡 {post.station_name} • 📅{" "}
                                {formatDate(post.timestamp)}
                              </Typography>
                            </Box>
                            {post.images.length > 0 && (
                              <Chip size="sm" color="primary" variant="soft">
                                🖼️ {post.images.length}
                              </Chip>
                            )}
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                  {posts.length > 8 && (
                    <Typography
                      level="body-sm"
                      color="neutral"
                      sx={{ mt: 2, textAlign: "center" }}
                    >
                      {t("user.overview.showingPosts", {
                        count: 8,
                        total: posts.length,
                      })}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Recent Activities Section */}
            <Card sx={{ height: "fit-content" }}>
              <CardContent>
                <Typography level="h4" sx={{ mb: 3 }}>
                  {t("user.overview.recentActivities")}
                </Typography>
                {activities.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <Typography level="body-md" color="neutral">
                      {t("user.overview.noActivities")}
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={1}>
                    {activities.map((activity) => (
                      <Card
                        key={activity.id}
                        variant="outlined"
                        sx={{
                          cursor:
                            activity.data?.post_id ||
                            activity.data?.station_id ||
                            (activity.data?.comment_id &&
                              activity.data?.post_id)
                              ? "pointer"
                              : "default",
                          transition: "all 0.2s ease",
                          "&:hover":
                            activity.data?.post_id ||
                            activity.data?.station_id ||
                            (activity.data?.comment_id &&
                              activity.data?.post_id)
                              ? {
                                  backgroundColor: "neutral.softHoverBg",
                                  borderColor: "neutral.outlinedHoverBorder",
                                  transform: "translateY(-1px)",
                                }
                              : {},
                        }}
                        onClick={() => {
                          if (
                            activity.data?.comment_id &&
                            activity.data?.post_id
                          ) {
                            navigate(
                              `/post/${activity.data.post_id}#comment-${activity.data.comment_id}`
                            );
                          } else if (activity.data?.post_id) {
                            navigate(`/post/${activity.data.post_id}`);
                          } else if (activity.data?.station_id) {
                            navigate(`/station/${activity.data.station_id}`);
                          }
                        }}
                      >
                        <CardContent sx={{ py: 1, px: 1.5 }}>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ mb: 0.5 }}
                          >
                            <Typography
                              level="title-sm"
                              sx={{ flex: 1, minWidth: 0 }}
                            >
                              {activity.type === "posted" &&
                                `📡 ${t("user.activity.posted")}`}
                              {activity.type === "liked_post" &&
                                `❤️ ${t("user.activity.likedPost")}`}
                              {activity.type === "liked_comment" &&
                                `💬 ${t("user.activity.likedComment")}`}
                              {activity.type === "commented" &&
                                `💬 ${t("user.activity.commented")}`}
                              {activity.type === "achievement" &&
                                `🏆 ${t("user.activity.unlockedAchievement")}`}
                              {activity.type === "station" &&
                                `📡 ${t("user.activity.createdStation")}`}
                            </Typography>
                          </Stack>
                          <Typography
                            level="body-xs"
                            color="neutral"
                            sx={{ mb: 0.25 }}
                          >
                            {activity.type === "achievement"
                              ? activity.data?.achievement_name
                              : activity.data?.post_title ||
                                activity.data?.post_title_for_comment ||
                                activity.data?.station_name}
                          </Typography>
                          <Typography level="body-xs" color="neutral">
                            📅 {formatDate(activity.timestamp)}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Right Column: Liked Posts and Stations */}
        <Grid xs={12} md={4}>
          <Stack spacing={3}>
            {/* Liked Posts Section */}
            <Card sx={{ height: "fit-content" }}>
              <CardContent>
                <Typography level="h4" sx={{ mb: 3 }}>
                  {t("user.overview.likedPosts")} ({likedPosts.length})
                </Typography>
                {likedPosts.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <Typography level="body-md" color="neutral">
                      {t("user.overview.noLikedPosts")}
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={1}>
                    {likedPosts.slice(0, 10).map((post) => (
                      <Card
                        key={post.id}
                        variant="outlined"
                        onClick={() => navigate(`/post/${post.id}`)}
                        sx={{
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          "&:hover": {
                            backgroundColor: "neutral.softHoverBg",
                            borderColor: "neutral.outlinedHoverBorder",
                            transform: "translateY(-1px)",
                          },
                        }}
                      >
                        <CardContent sx={{ py: 1, px: 1.5 }}>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ mb: 0.5 }}
                          >
                            <Typography
                              level="title-sm"
                              sx={{ flex: 1, minWidth: 0 }}
                            >
                              {post.satellite_name}
                            </Typography>
                            {post.images.length > 0 && (
                              <Chip size="sm" variant="soft" color="primary">
                                {post.images.length}
                              </Chip>
                            )}
                          </Stack>
                          <Typography
                            level="body-xs"
                            color="neutral"
                            sx={{ mb: 0.25 }}
                          >
                            � {post.station_name}
                          </Typography>
                          <Typography level="body-xs" color="neutral">
                            � {formatDate(post.timestamp)}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                    {likedPosts.length > 10 && (
                      <Typography
                        level="body-xs"
                        color="neutral"
                        sx={{ textAlign: "center", mt: 1 }}
                      >
                        {t("user.overview.showingLikedPosts", {
                          count: 10,
                          total: likedPosts.length,
                        })}
                      </Typography>
                    )}
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Stations Section - Main Content */}
            <Card>
              <CardContent>
                <Typography level="h3" sx={{ mb: 3 }}>
                  {t("user.overview.publicStationsTitle")} ({stations.length})
                </Typography>
                {stations.length === 0 ? (
                  <Typography>{t("user.overview.noPublicStations")}</Typography>
                ) : (
                  <Grid container spacing={2}>
                    {stations.map((station) => (
                      <Grid key={station.id} xs={12}>
                        <Card
                          variant="outlined"
                          onClick={() => navigate(`/station/${station.id}`)}
                          sx={{
                            cursor: "pointer",
                            transition: "transform 0.2s, box-shadow 0.2s",
                            "&:hover": {
                              transform: "translateY(-2px)",
                              boxShadow: "lg",
                            },
                          }}
                        >
                          {imageBlobs[`${station.id}-picture`] && (
                            <Box
                              sx={{
                                position: "relative",
                                height: 140,
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
                            <Typography level="title-lg" sx={{ mb: 1 }}>
                              {station.name}
                            </Typography>
                            <Typography
                              level="body-sm"
                              color="neutral"
                              sx={{ mb: 2 }}
                            >
                              📍 {station.location}
                            </Typography>
                            {station.equipment && (
                              <Typography level="body-sm" sx={{ mb: 2 }}>
                                🔧 {station.equipment}
                              </Typography>
                            )}
                            <Box
                              sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}
                            >
                              <Chip size="sm" color="success">
                                Public
                              </Chip>
                              <Tooltip title={formatFullTimestamp(station)}>
                                <Chip
                                  size="sm"
                                  variant="soft"
                                  color={
                                    station.is_online
                                      ? "success"
                                      : station.last_seen
                                      ? "warning"
                                      : "neutral"
                                  }
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
              </CardContent>
            </Card>

            {/* Achievements Section */}
            <Card sx={{ height: "fit-content" }}>
              <CardContent>
                <Typography level="h4" sx={{ mb: 3 }}>
                  {t("user.overview.achievements")} ({achievements.length})
                </Typography>
                {achievements.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <Typography level="body-md" color="neutral">
                      {t("user.overview.noAchievements")}
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={1}>
                    {achievements.map((achievement) => (
                      <Card
                        key={achievement.achievement.id}
                        variant="outlined"
                        sx={{
                          transition: "all 0.2s ease",
                        }}
                      >
                        <CardContent sx={{ py: 1, px: 1.5 }}>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ mb: 0.5 }}
                          >
                            <Typography sx={{ fontSize: "1.2em" }}>
                              {achievement.achievement.icon}
                            </Typography>
                            <Typography
                              level="title-sm"
                              sx={{ flex: 1, minWidth: 0 }}
                            >
                              {achievement.achievement.name}
                            </Typography>
                          </Stack>
                          <Typography
                            level="body-xs"
                            color="neutral"
                            sx={{ mb: 0.25 }}
                          >
                            {achievement.achievement.description}
                          </Typography>
                          <Typography level="body-xs" color="neutral">
                            🏆 {formatDate(achievement.unlocked_at)}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UserOverview;
