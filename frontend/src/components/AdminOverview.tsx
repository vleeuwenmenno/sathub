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
import { getAdminOverview, getApprovalSettings } from "../api";
import AdminRegistrationSettings from "./AdminRegistrationSettings";

interface AdminStats {
  total_users: number;
  pending_users: number;
  total_posts: number;
  total_stations: number;
  system_health: string;
}

const AdminOverview: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsData, approvalData] = await Promise.all([
          getAdminOverview(),
          getApprovalSettings()
        ]);
        setStats(statsData);
        setApprovalRequired(approvalData.required);
        setError(null);
      } catch (err) {
        setError("Failed to load admin data");
        console.error("Error fetching admin data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
        <Grid xs={12} sm={6} md={4} lg={2.4}>
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

        {approvalRequired && (
          <Grid xs={12} sm={6} md={4} lg={2.4}>
            <Card
              onClick={() => navigate('/admin/pending-users')}
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
                  <Typography level="h4" color="warning">
                    ⏳ Pending
                  </Typography>
                  <Typography level="h1">
                    {stats?.pending_users.toLocaleString() || 0}
                  </Typography>
                  <Typography level="body-sm" color="neutral">
                    Users awaiting approval
                  </Typography>
                  <Typography level="body-xs" color="warning" sx={{ mt: 1 }}>
                    Click to review →
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        <Grid xs={12} sm={6} md={4} lg={2.4}>
          <Card
            onClick={() => navigate('/admin/posts')}
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
                  🖼️ Posts
                </Typography>
                <Typography level="h1">
                  {stats?.total_posts.toLocaleString() || 0}
                </Typography>
                <Typography level="body-sm" color="neutral">
                  Total satellite images posted
                </Typography>
                <Typography level="body-xs" color="primary" sx={{ mt: 1 }}>
                  Click to manage posts →
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={4} lg={2.4}>
          <Card
            onClick={() => navigate('/admin/stations')}
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
                  📍 Stations
                </Typography>
                <Typography level="h1">
                  {stats?.total_stations.toLocaleString() || 0}
                </Typography>
                <Typography level="body-sm" color="neutral">
                  Total registered stations
                </Typography>
                <Typography level="body-xs" color="primary" sx={{ mt: 1 }}>
                  Click to view map →
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={4} lg={2.4}>
          <Card
            onClick={() => navigate('/admin/audit-logs')}
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
                  📋 Audit Logs
                </Typography>
                <Typography level="h1">
                  View
                </Typography>
                <Typography level="body-sm" color="neutral">
                  System activity logs
                </Typography>
                <Typography level="body-xs" color="primary" sx={{ mt: 1 }}>
                  Click to view logs →
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {import.meta.env.DEV && (
        <Grid xs={12} sm={6} md={4} lg={2.4}>
          <Card
            onClick={() => navigate('/admin/debug')}
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
                <Typography level="h4" color="warning">
                  🛠️ Debug Tools
                </Typography>
                <Typography level="h1">
                  Dev
                </Typography>
                <Typography level="body-sm" color="neutral">
                  Development testing tools
                </Typography>
                <Typography level="body-xs" color="warning" sx={{ mt: 1 }}>
                  Click to access debug tools →
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      )}

      <Box sx={{ mt: 4 }}>
        <AdminRegistrationSettings />
      </Box>
    </Box>
  );
};

export default AdminOverview;