import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Skeleton,
  Alert,
  FormControl,
  FormLabel,
  Checkbox,
  Select,
  Option,
} from "@mui/joy";
import { EmojiEvents, Lock, FilterList } from "@mui/icons-material";
import { getUserAchievements, getAllAchievements } from "../api";
import { useTranslation } from "../contexts/TranslationContext";
import type { UserAchievement, Achievement } from "../types";

const Achievements: React.FC = () => {
  const { t } = useTranslation();
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>(
    []
  );
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Filter states
  const [showUnlocked, setShowUnlocked] = useState(true);
  const [showLocked, setShowLocked] = useState(true);
  const [sortBy, setSortBy] = useState<"latest" | "alphabetical">("latest");

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        setLoading(true);
        const [userAchievementsData, allAchievementsData] = await Promise.all([
          getUserAchievements(),
          getAllAchievements(),
        ]);
        setUserAchievements(userAchievementsData);
        setAllAchievements(allAchievementsData);
      } catch (err) {
        setError(t("achievements.errors.loadFailed"));
        console.error("Error fetching achievements:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, []);

  // Handle hash-based scrolling to specific achievement
  useEffect(() => {
    if (!loading && window.location.hash) {
      const hash = window.location.hash.substring(1); // Remove #
      if (hash.startsWith("achievement-")) {
        const achievementId = hash.replace("achievement-", "");
        const element = document.getElementById(hash);
        if (element) {
          // Scroll to the achievement
          element.scrollIntoView({ behavior: "smooth", block: "center" });

          // Highlight the achievement
          setHighlightedId(achievementId);

          // Remove highlight after 3 seconds
          setTimeout(() => {
            setHighlightedId(null);
          }, 3000);
        }
      }
    }
  }, [loading, allAchievements]);

  // Create a map of unlocked achievements for quick lookup
  const unlockedMap = useMemo(
    () =>
      new Map(
        userAchievements.map((ua) => [ua.achievement.id, ua.unlocked_at])
      ),
    [userAchievements]
  );

  // Combine visible achievements with unlocked hidden achievements
  const allDisplayAchievements = useMemo(
    () => [
      ...allAchievements,
      ...userAchievements
        .filter(
          (ua) => !allAchievements.some((a) => a.id === ua.achievement.id)
        )
        .map((ua) => ua.achievement),
    ],
    [allAchievements, userAchievements]
  );

  // Filtered and sorted achievements
  const displayAchievements = useMemo(() => {
    let filtered = allDisplayAchievements.filter((achievement) => {
      const isUnlocked = unlockedMap.has(achievement.id);
      if (showUnlocked && showLocked) return true;
      if (showUnlocked && isUnlocked) return true;
      if (showLocked && !isUnlocked) return true;
      return false;
    });

    if (sortBy === "latest") {
      filtered.sort((a, b) => {
        const aUnlocked = unlockedMap.get(a.id);
        const bUnlocked = unlockedMap.get(b.id);
        if (aUnlocked && bUnlocked) {
          return new Date(bUnlocked).getTime() - new Date(aUnlocked).getTime();
        }
        if (aUnlocked) return -1;
        if (bUnlocked) return 1;
        return a.name.localeCompare(b.name);
      });
    } else {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [allDisplayAchievements, unlockedMap, showUnlocked, showLocked, sortBy]);

  // Handler to scroll to and highlight an achievement
  const handleAchievementClick = (achievementId: string) => {
    const element = document.getElementById(`achievement-${achievementId}`);
    if (element) {
      // Scroll to the achievement
      element.scrollIntoView({ behavior: "smooth", block: "center" });

      // Highlight the achievement
      setHighlightedId(achievementId);

      // Remove highlight after 3 seconds
      setTimeout(() => {
        setHighlightedId(null);
      }, 3000);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography level="h2" sx={{ mb: 3 }}>
          <EmojiEvents sx={{ mr: 1 }} />
          Achievements
        </Typography>
        <Grid container spacing={3}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Grid key={index} xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={24} />
                  <Skeleton
                    variant="text"
                    width="100%"
                    height={16}
                    sx={{ mt: 1 }}
                  />
                  <Skeleton
                    variant="text"
                    width="80%"
                    height={16}
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert color="danger">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography level="h2" sx={{ mb: 3 }}>
        <EmojiEvents sx={{ mr: 1 }} />
        {t("achievements.title")}
      </Typography>

      <Typography level="body-lg" sx={{ mb: 4, color: "text.secondary" }}>
        {t("achievements.subtitle")}
      </Typography>

      {/* Filters Section */}
      <Box
        sx={{
          mb: 4,
          p: 3,
          bgcolor: "background.surface",
          borderRadius: "lg",
          display: "flex",
          flexWrap: "wrap",
          gap: 3,
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <FilterList />
          <Typography level="h4">
            {t("achievements.filters") || "Filters"}
          </Typography>
        </Box>
        <FormControl>
          <FormLabel>{t("achievements.show") || "Show"}</FormLabel>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Checkbox
              label={t("achievements.unlocked") || "Unlocked"}
              checked={showUnlocked}
              onChange={(e) => setShowUnlocked(e.target.checked)}
            />
            <Checkbox
              label={t("achievements.locked") || "Locked"}
              checked={showLocked}
              onChange={(e) => setShowLocked(e.target.checked)}
            />
          </Box>
        </FormControl>
        <FormControl>
          <FormLabel>{t("achievements.sortBy") || "Sort by"}</FormLabel>
          <Select
            value={sortBy}
            onChange={(_, value) =>
              setSortBy(value as "latest" | "alphabetical")
            }
            sx={{ minWidth: 150 }}
          >
            <Option value="latest">
              {t("achievements.latestUnlocked") || "Latest Unlocked"}
            </Option>
            <Option value="alphabetical">
              {t("achievements.alphabetical") || "Alphabetical"}
            </Option>
          </Select>
        </FormControl>
      </Box>

      {userAchievements.length > 0 && (
        <Box
          sx={{
            mb: 4,
            p: 3,
            bgcolor: "background.surface",
            borderRadius: "lg",
          }}
        >
          <Typography level="h3" sx={{ mb: 2 }}>
            {t("achievements.recentAchievements")}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {userAchievements.slice(0, 5).map((ua) => (
              <Chip
                key={ua.achievement.id}
                variant="soft"
                color="success"
                startDecorator={<span>{ua.achievement.icon}</span>}
                onClick={() => handleAchievementClick(ua.achievement.id)}
                sx={{
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "sm",
                  },
                }}
              >
                {ua.achievement.name}
              </Chip>
            ))}
          </Box>
        </Box>
      )}

      <Grid container spacing={3} sx={{ mt: 3 }}>
        {displayAchievements.map((achievement) => {
          const isUnlocked = unlockedMap.has(achievement.id);
          const unlockedAt = unlockedMap.get(achievement.id);

          return (
            <Grid key={achievement.id} xs={12} sm={6} md={4}>
              <Card
                id={`achievement-${achievement.id}`}
                variant="outlined"
                color={isUnlocked ? "success" : "neutral"}
                sx={{
                  height: "100%",
                  opacity: isUnlocked ? 1 : 0.7,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "lg",
                  },
                  // Highlight animation when coming from notification
                  ...(highlightedId === achievement.id && {
                    animation: "highlight-pulse 1.5s ease-in-out 2",
                    "@keyframes highlight-pulse": {
                      "0%, 100%": {
                        boxShadow:
                          "0 0 0 0 rgba(var(--joy-palette-primary-mainChannel) / 0)",
                        transform: "scale(1)",
                      },
                      "50%": {
                        boxShadow:
                          "0 0 0 8px rgba(var(--joy-palette-primary-mainChannel) / 0.4)",
                        transform: "scale(1.02)",
                      },
                    },
                  }),
                }}
              >
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <Typography sx={{ fontSize: "2rem", mr: 2 }}>
                      {achievement.icon}
                    </Typography>
                    <Box sx={{ flex: 1 }}>
                      <Typography level="title-lg" sx={{ mb: 1 }}>
                        {achievement.name}
                      </Typography>
                      {isUnlocked ? (
                        <Chip
                          size="sm"
                          color="success"
                          variant="soft"
                          startDecorator={<EmojiEvents />}
                        >
                          {t("achievements.unlocked")}
                        </Chip>
                      ) : (
                        <Chip
                          size="sm"
                          color="neutral"
                          variant="outlined"
                          startDecorator={<Lock />}
                        >
                          {t("achievements.locked")}
                        </Chip>
                      )}
                    </Box>
                  </Box>

                  <Typography level="body-sm" sx={{ mb: 2 }}>
                    {achievement.description}
                  </Typography>

                  {isUnlocked && unlockedAt && (
                    <Typography
                      level="body-xs"
                      sx={{ color: "text.secondary" }}
                    >
                      {t("achievements.unlockedOn")}{" "}
                      {new Date(unlockedAt).toLocaleDateString()}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default Achievements;
