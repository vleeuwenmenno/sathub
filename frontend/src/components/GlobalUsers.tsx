import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Stack,
  Select,
  Option,
  FormControl,
  FormLabel,
  Input,
  IconButton,
  Avatar,
} from "@mui/joy";
import SearchIcon from "@mui/icons-material/Search";
import type { UserSummary } from "../api";
import { getGlobalUsers, getProfilePictureBlob } from "../api";
import PaginationControls from "./PaginationControls";
import { useAuth } from "../contexts/AuthContext";

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
};

const GlobalUsers: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("created_at");
  const [order, setOrder] = useState("desc");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [profilePictureUrls, setProfilePictureUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getGlobalUsers(limit, page, sort, order, search);
      setUsers(data);

      // Load profile pictures for users that have them
      const picturePromises = data
        .filter(user => user.has_profile_picture && user.profile_picture_url)
        .map(async (user) => {
          try {
            // Remove /api/ prefix if it exists since the api client already includes it
            const cleanUrl = user.profile_picture_url!.startsWith('/api/')
              ? user.profile_picture_url!.substring(5) // Remove '/api/'
              : user.profile_picture_url!;
            const blobUrl = await getProfilePictureBlob(cleanUrl);
            return { id: user.id, url: blobUrl };
          } catch (err) {
            console.error(`Failed to load profile picture for user ${user.id}:`, err);
            return null;
          }
        });

      const pictureResults = await Promise.all(picturePromises);
      const newProfilePictureUrls: Record<string, string> = {};

      pictureResults.forEach(result => {
        if (result) {
          newProfilePictureUrls[result.id] = result.url;
        }
      });

      setProfilePictureUrls(newProfilePictureUrls);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1); // Reset to first page when searching
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadUsers();
    }
  }, [limit, page, sort, order, search, authLoading, isAuthenticated]);

  // Show loading while checking authentication
  if (authLoading) {
    return <Typography>Loading...</Typography>;
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  if (loading) return <Typography>Loading users...</Typography>;
  if (error) return <Typography color="danger">Error: {error}</Typography>;

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, maxWidth: "1400px", mx: "auto" }}>
      <Typography level="h2" sx={{ mb: 3 }}>
        Global Users
      </Typography>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <FormControl size="sm">
          <FormLabel>Search users</FormLabel>
          <Input
            placeholder="Enter username..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            endDecorator={
              <IconButton
                onClick={handleSearch}
                disabled={loading}
                size="sm"
              >
                <SearchIcon />
              </IconButton>
            }
            sx={{ minWidth: 250 }}
          />
        </FormControl>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'end' }}>
          <FormControl size="sm">
            <FormLabel>Sort by</FormLabel>
            <Select
              value={sort}
              onChange={(_, value) => setSort(value as string)}
              sx={{ minWidth: 150 }}
            >
              <Option value="created_at">Created Date</Option>
              <Option value="username">Username</Option>
              <Option value="display_name">Display Name</Option>
            </Select>
          </FormControl>
          <FormControl size="sm">
            <FormLabel>Order</FormLabel>
            <Select
              value={order}
              onChange={(_, value) => setOrder(value as string)}
              sx={{ minWidth: 120 }}
            >
              <Option value="desc">Descending</Option>
              <Option value="asc">Ascending</Option>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {users.length >= limit && (
        <PaginationControls
          limit={limit}
          setLimit={setLimit}
          page={page}
          setPage={setPage}
          hasMore={users.length >= limit}
          loading={loading}
        />
      )}

      {users.length === 0 ? (
        <Card>
          <CardContent>
            <Typography level="body-lg" sx={{ textAlign: "center", py: 4 }}>
              No users found.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {users.map((user) => (
            <Grid key={user.id} xs={12} sm={6} lg={4}>
              <Card
                sx={{
                  height: "auto",
                  display: "flex",
                  flexDirection: "column",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "lg",
                    cursor: "pointer",
                  },
                }}
                onClick={() => navigate(`/user/${user.id}`)}
              >
                <CardContent sx={{ p: 2 }}>
                  {/* Top Section: Avatar and User Info */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                    <Avatar
                      src={profilePictureUrls[user.id] || undefined}
                      sx={{ width: 48, height: 48, flexShrink: 0 }}
                    >
                      {!profilePictureUrls[user.id] && (user.display_name || user.username)?.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography 
                        level="title-md" 
                        sx={{ 
                          mb: 0.25, 
                          wordBreak: "break-word",
                          hyphens: "auto"
                        }}
                      >
                        {user.display_name || user.username}
                      </Typography>
                      {user.display_name && (
                        <Typography 
                          level="body-sm" 
                          sx={{ 
                            color: "text.tertiary",
                            wordBreak: "break-word",
                            hyphens: "auto"
                          }}
                        >
                          @{user.username}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Bottom Section: Join Date and Statistics */}
                  <Stack spacing={1.5}>
                    <Typography 
                      level="body-sm" 
                      sx={{ 
                        color: "text.secondary",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5
                      }}
                    >
                      <span>📅</span> 
                      Joined {formatDate(user.created_at)}
                    </Typography>

                    <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between" }}>
                      <Box sx={{ textAlign: "center", flex: 1 }}>
                        <Typography level="title-sm" color="primary">
                          {user.public_stations}
                        </Typography>
                        <Typography level="body-xs" color="neutral">
                          Station{user.public_stations !== 1 ? 's' : ''}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: "center", flex: 1 }}>
                        <Typography level="title-sm" color="primary">
                          {user.public_posts}
                        </Typography>
                        <Typography level="body-xs" color="neutral">
                          Post{user.public_posts !== 1 ? 's' : ''}
                        </Typography>
                      </Box>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {users.length > 0 && (
        <PaginationControls
          limit={limit}
          setLimit={setLimit}
          page={page}
          setPage={setPage}
          hasMore={users.length >= limit}
          loading={loading}
        />
      )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default GlobalUsers;