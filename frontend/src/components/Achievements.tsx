import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Skeleton,
  Alert,
} from "@mui/joy";
import { EmojiEvents, Lock } from "@mui/icons-material";
import { getUserAchievements, getAllAchievements } from "../api";
import type { UserAchievement, Achievement } from "../types";

const Achievements: React.FC = () => {
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setError("Failed to load achievements");
        console.error("Error fetching achievements:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, []);

  // Create a map of unlocked achievements for quick lookup
  const unlockedMap = new Map(
    userAchievements.map((ua) => [ua.achievement.id, ua.unlocked_at])
  );

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
                  <Skeleton variant="text" width="100%" height={16} sx={{ mt: 1 }} />
                  <Skeleton variant="text" width="80%" height={16} sx={{ mt: 1 }} />
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
        Achievements
      </Typography>

      <Typography level="body-lg" sx={{ mb: 4, color: "text.secondary" }}>
        Track your progress and unlock achievements as you explore the world of satellite data!
      </Typography>

      {userAchievements.length > 0 && (
        <Box sx={{ mt: 4, p: 3, bgcolor: "background.surface", borderRadius: "lg" }}>
          <Typography level="h3" sx={{ mb: 2 }}>
            Recent Achievements
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {userAchievements.slice(0, 5).map((ua) => (
              <Chip
                key={ua.achievement.id}
                variant="soft"
                color="success"
                startDecorator={<span>{ua.achievement.icon}</span>}
              >
                {ua.achievement.name}
              </Chip>
            ))}
          </Box>
        </Box>
      )}

      <Grid container spacing={3} sx={{ mt: 3 }}>
        {allAchievements.map((achievement) => {
          const isUnlocked = unlockedMap.has(achievement.id);
          const unlockedAt = unlockedMap.get(achievement.id);

          return (
            <Grid key={achievement.id} xs={12} sm={6} md={4}>
              <Card
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
                          Unlocked
                        </Chip>
                      ) : (
                        <Chip
                          size="sm"
                          color="neutral"
                          variant="outlined"
                          startDecorator={<Lock />}
                        >
                          Locked
                        </Chip>
                      )}
                    </Box>
                  </Box>

                  <Typography level="body-sm" sx={{ mb: 2 }}>
                    {achievement.description}
                  </Typography>

                  {isUnlocked && unlockedAt && (
                    <Typography level="body-xs" sx={{ color: "text.secondary" }}>
                      Unlocked on {new Date(unlockedAt).toLocaleDateString()}
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