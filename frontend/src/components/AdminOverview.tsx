import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  CircularProgress,
  Alert,
  Stack,
} from "@mui/joy";
import { getAdminOverview } from "../api";

interface AdminStats {
  total_users: number;
  total_posts: number;
  total_stations: number;
  system_health: string;
}

const AdminOverview: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await getAdminOverview();
        setStats(data);
        setError(null);
      } catch (err) {
        setError("Failed to load admin statistics");
        console.error("Error fetching admin overview:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 3 }}>
        <Alert color="danger" variant="soft">
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ py: { xs: 1, md: 2 }, px: 0, maxWidth: "1400px", mx: "auto" }}>
      <Typography level="h2" sx={{ mb: 3, textAlign: "center" }}>
        Admin Overview
      </Typography>

      <Grid container spacing={3}>
        <Grid xs={12} sm={6} md={3}>
          <Card
            onClick={() => navigate('/admin/users')}
            sx={{
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 'lg',
              },
            }}
          >
            <CardContent>
              <Stack spacing={1}>
                <Typography level="h4" color="primary">
                  👥 Users
                </Typography>
                <Typography level="h1">
                  {stats?.total_users.toLocaleString() || 0}
                </Typography>
                <Typography level="body-sm" color="neutral">
                  Total registered users
                </Typography>
                <Typography level="body-xs" color="primary" sx={{ mt: 1 }}>
                  Click to manage users →
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography level="h4" color="primary">
                  🖼️ Posts
                </Typography>
                <Typography level="h1">
                  {stats?.total_posts.toLocaleString() || 0}
                </Typography>
                <Typography level="body-sm" color="neutral">
                  Total satellite images posted
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography level="h4" color="primary">
                  🛰️ Stations
                </Typography>
                <Typography level="h1">
                  {stats?.total_stations.toLocaleString() || 0}
                </Typography>
                <Typography level="body-sm" color="neutral">
                  Total ground stations
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography level="h4" color="primary">
                  ❤️ System Health
                </Typography>
                <Typography
                  level="h3"
                  color={stats?.system_health === "healthy" ? "success" : "warning"}
                >
                  {stats?.system_health || "Unknown"}
                </Typography>
                <Typography level="body-sm" color="neutral">
                  Current system status
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Alert color="primary" variant="soft">
          <Typography level="body-sm">
            Welcome to the admin panel. Use the navigation above to manage users, view system statistics, and configure invites.
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default AdminOverview;