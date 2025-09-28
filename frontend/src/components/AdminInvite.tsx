import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
  Stack,
} from "@mui/joy";
import { getAdminInvite } from "../api";

const AdminInvite: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInviteData = async () => {
      try {
        setLoading(true);
        const inviteData = await getAdminInvite();
        setData(inviteData);
        setError(null);
      } catch (err) {
        setError("Failed to load invite data");
        console.error("Error fetching admin invite data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInviteData();
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
        Invite Management
      </Typography>

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Typography level="h4">
              User Invitations
            </Typography>

            <Alert color="primary" variant="soft">
              <Typography level="body-sm">
                {data?.message || "Invite functionality is not yet implemented."}
              </Typography>
            </Alert>

            <Box sx={{ p: 3, bgcolor: 'background.level1', borderRadius: 'md' }}>
              <Typography level="body-lg" sx={{ mb: 2 }}>
                Coming Soon
              </Typography>
              <Typography level="body-sm" color="neutral">
                This section will allow administrators to:
              </Typography>
              <Stack spacing={1} sx={{ mt: 2 }}>
                <Typography level="body-sm" startDecorator="•">
                  Generate invitation links for new users
                </Typography>
                <Typography level="body-sm" startDecorator="•">
                  Set invitation expiration times
                </Typography>
                <Typography level="body-sm" startDecorator="•">
                  Track invitation usage and analytics
                </Typography>
                <Typography level="body-sm" startDecorator="•">
                  Manage bulk invitations
                </Typography>
              </Stack>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button variant="outlined" disabled>
                Generate Invite Link
              </Button>
              <Button variant="outlined" disabled>
                View Invite History
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdminInvite;