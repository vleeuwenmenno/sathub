import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Table,
  Button,
  Stack,
  Modal,
  ModalDialog,
  ModalClose,
  Input,
  IconButton,
  Chip,
  Tooltip,
} from "@mui/joy";
import { useMediaQuery, useTheme } from "@mui/material";
import { Search as SearchIcon, Clear as ClearIcon, Delete as DeleteIcon, Visibility as ViewIcon, VisibilityOff as VisibilityOffIcon, Refresh as RefreshIcon, OpenInNew as OpenInNewIcon } from "@mui/icons-material";
import { getAdminPosts, adminDeletePost, adminHidePost } from "../api";
import type { AdminPost } from "../api";

const AdminPosts: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; pages: number }>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; post: AdminPost | null }>({
    open: false,
    post: null,
  });
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
  const [hidingPostId, setHidingPostId] = useState<number | null>(null);

  const fetchPosts = async (page: number = 1, search: string = '') => {
    try {
      setLoading(true);
      const response = await getAdminPosts(page, pagination.limit, search);
      setPosts(response.posts);
      setPagination(response.pagination);
      setError(null);
    } catch (err) {
      setError("Failed to load posts");
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchPosts(pagination.page, searchQuery);
  }, []);

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when searching
    fetchPosts(1, searchQuery);
  };

  const handleRefresh = () => {
    fetchPosts(pagination.page, searchQuery);
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    fetchPosts(newPage, searchQuery);
  };

  const handleDeletePost = async (postId: number) => {
    try {
      setDeletingPostId(postId);
      await adminDeletePost(postId);
      setDeleteDialog({ open: false, post: null });

      // Check if we need to adjust pagination after deletion
      const remainingPosts = posts.filter(post => post.id !== postId);
      if (remainingPosts.length === 0 && pagination.page > 1) {
        // If this was the last post on the page and we're not on page 1, go to previous page
        handlePageChange(pagination.page - 1);
      } else {
        // Otherwise, refresh the current page
        await fetchPosts(pagination.page, searchQuery);
      }
    } catch (err) {
      setError("Failed to delete post");
      console.error("Error deleting post:", err);
    } finally {
      setDeletingPostId(null);
    }
  };

  const handleHidePost = async (postId: number, hidden: boolean) => {
    try {
      setHidingPostId(postId);
      await adminHidePost(postId, hidden);
      // Refresh the current page to get updated data from server
      await fetchPosts(pagination.page, searchQuery);
    } catch (err) {
      setError(`Failed to ${hidden ? 'hide' : 'unhide'} post`);
      console.error(`Error ${hidden ? 'hiding' : 'unhiding'} post:`, err);
    } finally {
      setHidingPostId(null);
    }
  };

  const handleViewPost = (postId: number) => {
    navigate(`/admin/posts/${postId}`);
  };

  const handleViewPostPublic = (postId: number) => {
    navigate(`/post/${postId}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ py: { xs: 1, md: 2 }, px: 0, maxWidth: "1400px", mx: "auto" }}>
      <Typography level="h2" sx={{ mb: 3, textAlign: "center" }}>
        Post Management
      </Typography>

      {error && (
        <Alert color="danger" variant="soft" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={isMobile ? "column" : "row"} spacing={2} alignItems={isMobile ? "stretch" : "center"}>
            <Input
              key="search-input" // Stable key to prevent recreation
              placeholder="Search by satellite name, station name, owner username, post UUID, or owner UUID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              startDecorator={<SearchIcon />}
              endDecorator={
                searchQuery && (
                  <IconButton
                    size="sm"
                    onClick={() => setSearchQuery('')}
                  >
                    <ClearIcon />
                  </IconButton>
                )
              }
              sx={{ flex: 1, minWidth: 0 }}
            />
            <Button
              variant="solid"
              onClick={handleSearch}
              startDecorator={<SearchIcon />}
              sx={{ minWidth: isMobile ? '100%' : 'auto' }}
            >
              Search
            </Button>
            <Button
              variant="outlined"
              onClick={handleRefresh}
              startDecorator={<RefreshIcon />}
              sx={{ minWidth: isMobile ? '100%' : 'auto' }}
            >
              Refresh
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: { xs: 1, md: 2 } }}>
          {isMobile ? (
            // Mobile card layout
            <Stack spacing={2}>
              {posts && posts.map((post) => (
                <Card key={post.id} variant="outlined">
                  <CardContent sx={{ p: 2 }}>
                    <Stack spacing={2}>
                      {/* Header with satellite and station */}
                      <Box>
                        <Typography level="body-lg" fontWeight="bold">
                          {post.satellite_name}
                        </Typography>
                        <Typography level="body-sm" color="neutral">
                          Station: {post.station_name}
                        </Typography>
                      </Box>

                      {/* Owner info */}
                      <Box>
                        <Typography level="body-sm">
                          <strong>Owner:</strong>{' '}
                          <Typography
                            component="span"
                            sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                            onClick={() => navigate(`/admin/users/${post.owner_uuid}`, { state: { from: 'posts' } })}
                          >
                            {post.owner_username}
                          </Typography>
                        </Typography>
                        <Typography level="body-xs" sx={{ fontFamily: 'monospace', color: 'neutral.600' }}>
                          {post.owner_uuid}
                        </Typography>
                        <Typography level="body-sm">
                          <strong>UUID:</strong> {post.uuid}
                        </Typography>
                      </Box>

                      {/* Status and created date */}
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          size="sm"
                          color={post.hidden ? "warning" : "success"}
                          variant="soft"
                        >
                          {post.hidden ? "Hidden" : "Visible"}
                        </Chip>
                        <Typography level="body-xs" color="neutral">
                          {new Date(post.created_at).toLocaleDateString('de-DE')}
                        </Typography>
                      </Stack>

                      {/* Action buttons */}
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="sm"
                          variant="outlined"
                          startDecorator={<ViewIcon />}
                          onClick={() => handleViewPost(post.id)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outlined"
                          startDecorator={<OpenInNewIcon />}
                          onClick={() => handleViewPostPublic(post.id)}
                        >
                          Post
                        </Button>
                        <Button
                          size="sm"
                          color={post.hidden ? "success" : "warning"}
                          variant="soft"
                          onClick={() => handleHidePost(post.id, !post.hidden)}
                          disabled={hidingPostId === post.id}
                        >
                          {post.hidden ? "Unhide" : "Hide"}
                        </Button>
                        <Button
                          size="sm"
                          color="danger"
                          variant="soft"
                          startDecorator={<DeleteIcon />}
                          onClick={() => setDeleteDialog({ open: true, post })}
                          disabled={deletingPostId === post.id}
                        >
                          Delete
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            // Desktop table layout
            <Box sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: '800px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '120px' }}>UUID</th>
                    <th style={{ width: '150px' }}>Owner</th>
                    <th style={{ width: '150px' }}>Station</th>
                    <th style={{ width: '150px' }}>Satellite</th>
                    <th style={{ width: '100px' }}>Status</th>
                    <th style={{ width: '120px' }}>Created</th>
                    <th style={{ width: '250px' }}>Actions</th>
                  </tr>
                </thead>
              <tbody>
                {posts && posts.map((post) => (
                  <tr key={post.id}>
                    <td>
                      <Typography level="body-sm" sx={{ fontFamily: 'monospace' }}>
                        {post.uuid}
                      </Typography>
                    </td>
                    <td>
                      <Typography
                        level="body-sm"
                        sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                        onClick={() => navigate(`/admin/users/${post.owner_uuid}`, { state: { from: 'posts' } })}
                      >
                        {post.owner_username}
                      </Typography>
                      <Typography level="body-xs" sx={{ fontFamily: 'monospace', color: 'neutral.600' }}>
                        {post.owner_uuid}
                      </Typography>
                    </td>
                    <td>
                      <Typography level="body-sm">
                        {post.station_name}
                      </Typography>
                    </td>
                    <td>
                      <Typography level="body-sm">
                        {post.satellite_name}
                      </Typography>
                    </td>
                    <td>
                      <Chip
                        size="sm"
                        color={post.hidden ? "warning" : "success"}
                        variant="soft"
                      >
                        {post.hidden ? "Hidden" : "Visible"}
                      </Chip>
                    </td>
                    <td>
                      <Typography level="body-sm">
                        {new Date(post.created_at).toLocaleDateString('de-DE')}
                      </Typography>
                    </td>
                    <td>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="View Admin Details">
                          <IconButton
                            size="sm"
                            variant="outlined"
                            onClick={() => handleViewPost(post.id)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View Public Post">
                          <IconButton
                            size="sm"
                            variant="outlined"
                            onClick={() => handleViewPostPublic(post.id)}
                          >
                            <OpenInNewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={post.hidden ? "Unhide Post" : "Hide Post"}>
                          <IconButton
                            size="sm"
                            color={post.hidden ? "success" : "warning"}
                            variant="soft"
                            onClick={() => handleHidePost(post.id, !post.hidden)}
                            disabled={hidingPostId === post.id}
                          >
                            {post.hidden ? <ViewIcon /> : <VisibilityOffIcon />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Post">
                          <IconButton
                            size="sm"
                            color="danger"
                            variant="soft"
                            onClick={() => setDeleteDialog({ open: true, post })}
                            disabled={deletingPostId === post.id}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 2, gap: 1 }}>
          <Button
            variant="outlined"
            disabled={pagination.page === 1}
            onClick={() => handlePageChange(pagination.page - 1)}
          >
            Previous
          </Button>
          <Typography sx={{ alignSelf: 'center', mx: 2 }}>
            Page {pagination.page} of {pagination.pages}
          </Typography>
          <Button
            variant="outlined"
            disabled={pagination.page === pagination.pages}
            onClick={() => handlePageChange(pagination.page + 1)}
          >
            Next
          </Button>
        </Box>
      )}

      {/* Results summary */}
      <Typography level="body-sm" color="neutral" sx={{ textAlign: 'center', mb: 3 }}>
        Showing {posts ? posts.length : 0} of {pagination.total} posts
        {searchQuery && ` matching "${searchQuery}"`}
      </Typography>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, post: null })}
      >
        <ModalDialog>
          <ModalClose />
          <Typography level="h4" sx={{ mb: 2 }}>
            Confirm Post Deletion
          </Typography>
          <Typography sx={{ mb: 3 }}>
            Are you sure you want to delete the post "{deleteDialog.post?.satellite_name}"?
            This action cannot be undone.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button
              variant="plain"
              color="neutral"
              onClick={() => setDeleteDialog({ open: false, post: null })}
            >
              Cancel
            </Button>
            <Button
              color="danger"
              onClick={() => deleteDialog.post && handleDeletePost(deleteDialog.post.id)}
              disabled={deletingPostId !== null}
            >
              Delete Post
            </Button>
          </Box>
        </ModalDialog>
      </Modal>
    </Box>
  );
};

export default AdminPosts;