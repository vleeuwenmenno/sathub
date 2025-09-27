import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Stack,
  Chip,
  Select,
  Option,
  FormControl,
  FormLabel,
  Input,
  IconButton,
  Avatar,
} from "@mui/joy";
import SearchIcon from "@mui/icons-material/Search";
import PersonIcon from "@mui/icons-material/Person";
import type { UserSummary } from "../api";
import { getGlobalUsers } from "../api";
import PaginationControls from "./PaginationControls";
import { useAuth } from "../contexts/AuthContext";

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
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

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Show loading while checking authentication
  if (authLoading) {
    return <Typography>Loading...</Typography>;
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getGlobalUsers(limit, page, sort, order, search);
      setUsers(data);
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
    loadUsers();
  }, [limit, page, sort, order, search]);

  if (loading) return <Typography>Loading users...</Typography>;
  if (error) return <Typography color="danger">Error: {error}</Typography>;

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, maxWidth: "1400px", mx: "auto" }}>
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
        <Grid container spacing={3}>
          {users.map((user) => (
            <Grid key={user.id} xs={12} sm={6} lg={4}>
              <Card
                sx={{
                  height: "100%",
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
                <CardContent
                  sx={{ flex: 1, display: "flex", flexDirection: "column", textAlign: "center" }}
                >
                  <Box sx={{ mb: 2 }}>
                    <Avatar
                      sx={{ width: 80, height: 80, mx: "auto", mb: 1 }}
                    >
                      <PersonIcon sx={{ fontSize: 40 }} />
                    </Avatar>
                    <Typography level="h4" sx={{ mb: 1 }}>
                      @{user.username}
                    </Typography>
                    <Chip size="sm" variant="soft" color={user.role === 'admin' ? 'danger' : user.role === 'moderator' ? 'warning' : 'primary'}>
                      {user.role}
                    </Chip>
                  </Box>

                  <Stack spacing={1} sx={{ mb: 2, flex: 1 }}>
                    <Typography
                      level="body-sm"
                      startDecorator={<span>📡</span>}
                    >
                      {user.public_stations} Public Station{user.public_stations !== 1 ? 's' : ''}
                    </Typography>
                    <Typography
                      level="body-sm"
                      startDecorator={<span>📊</span>}
                    >
                      {user.public_posts} Public Post{user.public_posts !== 1 ? 's' : ''}
                    </Typography>
                    <Typography
                      level="body-sm"
                      startDecorator={<span>📅</span>}
                    >
                      Joined {formatDate(user.created_at)}
                    </Typography>
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
    </Box>
  );
};

export default GlobalUsers;