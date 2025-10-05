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
import { useTranslation } from "../contexts/TranslationContext";

interface AdminStats {
  total_users: number;
  pending_users: number;
  total_posts: number;
  total_stations: number;
  pending_reports: number;
  system_health: string;
}

const AdminOverview: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

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
        {t("admin.overview.title")}
      </Typography>

      <Grid container spacing={3}>
        <Grid xs={12} sm={6} md={4} lg={2.4}>
          <Card
            onClick={() => navigate('/admin/users')}
            sx={{
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minHeight: 160,
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 'lg',
              },
            }}
          >
            <CardContent>
              <Stack spacing={1}>
                <Typography level="h4" color="primary">
                  {t("admin.overview.usersTitle")}
                </Typography>
                <Typography level="h1">
                  {stats?.total_users.toLocaleString() || 0}
                </Typography>
                <Typography level="body-sm" color="neutral">
                  {t("admin.overview.totalUsers")}
                </Typography>
                <Typography level="body-xs" color="primary" sx={{ mt: 1 }}>
                  {t("admin.overview.clickToManageUsers")}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {approvalRequired && (
          <Grid xs={12} sm={6} md={4} lg={2.4}>
            <Card
              onClick={() => navigate('/admin/users?approved=false')}
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minHeight: 160,
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 'lg',
                },
              }}
            >
              <CardContent>
                <Stack spacing={1}>
                  <Typography level="h4" color="warning">
                    {t("admin.overview.pendingTitle")}
                  </Typography>
                  <Typography level="h1">
                    {stats?.pending_users.toLocaleString() || 0}
                  </Typography>
                  <Typography level="body-sm" color="neutral">
                    {t("admin.overview.pendingUsers")}
                  </Typography>
                  <Typography level="body-xs" color="warning" sx={{ mt: 1 }}>
                    {t("admin.overview.clickToReview")}
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
              minHeight: 160,
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 'lg',
              },
            }}
          >
            <CardContent>
              <Stack spacing={1}>
                <Typography level="h4" color="primary">
                  {t("admin.overview.postsTitle")}
                </Typography>
                <Typography level="h1">
                  {stats?.total_posts.toLocaleString() || 0}
                </Typography>
                <Typography level="body-sm" color="neutral">
                  {t("admin.overview.totalPosts")}
                </Typography>
                <Typography level="body-xs" color="primary" sx={{ mt: 1 }}>
                  {t("admin.overview.clickToManagePosts")}
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
              minHeight: 160,
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 'lg',
              },
            }}
          >
            <CardContent>
              <Stack spacing={1}>
                <Typography level="h4" color="primary">
                  {t("admin.overview.stationsTitle")}
                </Typography>
                <Typography level="h1">
                  {stats?.total_stations.toLocaleString() || 0}
                </Typography>
                <Typography level="body-sm" color="neutral">
                  {t("admin.overview.totalStations")}
                </Typography>
                <Typography level="body-xs" color="primary" sx={{ mt: 1 }}>
                  {t("admin.overview.clickToViewMap")}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={4} lg={2.4}>
           <Card
             onClick={() => navigate('/admin/reports')}
             sx={{
               cursor: 'pointer',
               transition: 'all 0.2s ease',
               minHeight: 160,
               '&:hover': {
                 transform: 'translateY(-2px)',
                 boxShadow: 'lg',
               },
             }}
           >
             <CardContent>
               <Stack spacing={1}>
                 <Typography level="h4" color="warning">
                   {t("admin.overview.reportsTitle")}
                 </Typography>
                 <Typography level="h1">
                   {stats?.pending_reports.toLocaleString() || 0}
                 </Typography>
                 <Typography level="body-sm" color="neutral">
                   {t("admin.overview.pendingReports")}
                 </Typography>
                 <Typography level="body-xs" color="warning" sx={{ mt: 1 }}>
                   {t("admin.overview.clickToReview")}
                 </Typography>
               </Stack>
             </CardContent>
           </Card>
         </Grid>

         <Grid xs={12}>
           <Card
             onClick={() => navigate('/admin/audit-logs')}
             sx={{
               cursor: 'pointer',
               transition: 'all 0.2s ease',
               minHeight: 160,
               '&:hover': {
                 transform: 'translateY(-2px)',
                 boxShadow: 'lg',
               },
             }}
           >
             <CardContent>
               <Stack spacing={1}>
                 <Typography level="h4" color="primary">
                   {t("admin.overview.auditLogsTitle")}
                 </Typography>
                 <Typography level="h1">
                   View
                 </Typography>
                 <Typography level="body-sm" color="neutral">
                   {t("admin.overview.auditLogs")}
                 </Typography>
                 <Typography level="body-xs" color="primary" sx={{ mt: 1 }}>
                   {t("admin.overview.clickToViewLogs")}
                 </Typography>
               </Stack>
             </CardContent>
           </Card>
         </Grid>
      </Grid>

      {import.meta.env.DEV && (
        <Box sx={{ mt: 3 }}>
          <Grid xs={12} sm={6} md={4} lg={2.4}>
            <Card
              onClick={() => navigate('/admin/debug')}
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minHeight: 160,
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 'lg',
                },
              }}
            >
              <CardContent>
                <Stack spacing={1}>
                  <Typography level="h4" color="warning">
                    {t("admin.overview.debugToolsTitle")}
                  </Typography>
                  <Typography level="h1">
                    Dev
                  </Typography>
                  <Typography level="body-sm" color="neutral">
                    {t("admin.overview.debugTools")}
                  </Typography>
                  <Typography level="body-xs" color="warning" sx={{ mt: 1 }}>
                    {t("admin.overview.clickToAccessDebug")}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Box>
      )}

      <Box sx={{ mt: 4 }}>
        <AdminRegistrationSettings />
      </Box>
    </Box>
  );
};

export default AdminOverview;