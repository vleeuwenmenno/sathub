import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  Alert,
  Divider,
  FormLabel,
  Textarea,
} from '@mui/joy';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../contexts/AuthContext';
import { getCommentsForPost, createComment, updateComment, deleteComment } from '../api';
import type { Comment } from '../types';

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
};

interface CommentSectionProps {
  postId: string;
}

const CommentItem: React.FC<{
  comment: Comment;
  onEdit: (comment: Comment) => void;
  onDelete: (commentId: number) => void;
  currentUserId?: number;
}> = ({
  comment,
  onEdit,
  onDelete,
  currentUserId,
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const isOwner = currentUserId === comment.user_id;

  return (
    <Box>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Avatar size="sm">
              {comment.has_profile_picture && comment.profile_picture_url ? (
                <img
                  src={`/api/${comment.profile_picture_url}`}
                  alt={`${comment.username}'s profile`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '50%'
                  }}
                />
              ) : (
                <Typography level="body-sm">
                  {(comment.display_name || comment.username).charAt(0).toUpperCase()}
                </Typography>
              )}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Typography level="body-sm" fontWeight="bold">
                  {comment.username}
                </Typography>
                <Typography level="body-xs" color="neutral">
                  {formatDate(comment.created_at)}
                </Typography>
                {isOwner && (
                  <>
                    <IconButton
                      size="sm"
                      onClick={(e) => setMenuAnchor(e.currentTarget)}
                      sx={{ ml: 'auto' }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                    <Menu
                      anchorEl={menuAnchor}
                      open={Boolean(menuAnchor)}
                      onClose={() => setMenuAnchor(null)}
                    >
                      <MenuItem
                        onClick={() => {
                          onEdit(comment);
                          setMenuAnchor(null);
                        }}
                      >
                        <EditIcon sx={{ mr: 1 }} />
                        Edit
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          onDelete(comment.id);
                          setMenuAnchor(null);
                        }}
                        color="danger"
                      >
                        <DeleteIcon sx={{ mr: 1 }} />
                        Delete
                      </MenuItem>
                    </Menu>
                  </>
                )}
              </Stack>
              <Typography level="body-md" sx={{ mb: 1 }}>
                {comment.content}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

const CommentSection: React.FC<CommentSectionProps> = ({ postId }) => {
  let user;
  try {
    const auth = useAuth();
    user = auth.user;
  } catch (error) {
    console.warn('Auth context not available:', error);
    user = null;
  }
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading comments for post:', postId);
      const data = await getCommentsForPost(postId);
      console.log('Comments loaded:', data, 'Type:', typeof data, 'Is array:', Array.isArray(data));
      const commentsArray = Array.isArray(data) ? data : (data ? [data] : []);
      setComments(commentsArray);
    } catch (err) {
      console.error('Failed to load comments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load comments');
      setComments([]); // Ensure comments is always an array
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;

    try {
      setSubmitting(true);
      const commentData = {
        content: newComment.trim(),
      };

      await createComment(postId, commentData);
      setNewComment('');
      await loadComments(); // Reload comments
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async () => {
    if (!editingComment || !newComment.trim()) return;

    try {
      setSubmitting(true);
      await updateComment(editingComment.id, { content: newComment.trim() });
      setNewComment('');
      setEditingComment(null);
      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await deleteComment(commentId);
      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment');
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingComment(comment);
    setNewComment(comment.content);
  };

  const cancelAction = () => {
    setEditingComment(null);
    setNewComment('');
  };

  if (loading && !hasLoaded) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography level="h3" sx={{ mb: 3 }}>
        Comments ({comments ? comments.length : 0})
      </Typography>

      {error && (
        <Alert color="danger" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Add Comment Form */}
      {user && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography level="body-lg" sx={{ mb: 2 }}>
              {editingComment ? 'Edit Comment' : 'Add a Comment'}
            </Typography>
            <form onSubmit={(e) => { e.preventDefault(); editingComment ? handleEditComment() : handleSubmitComment(); }}>
              <Stack spacing={2}>
                <Textarea
                  placeholder={editingComment ? 'Edit your comment...' : 'Write a comment...'}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      editingComment ? handleEditComment() : handleSubmitComment();
                    }
                  }}
                  minRows={3}
                  autosize={true}
                />
                <Stack direction="row" spacing={1}>
                  <Button
                    type="submit"
                    loading={submitting}
                    disabled={!newComment.trim()}
                  >
                    {editingComment ? 'Update' : 'Post'}
                  </Button>
                  {editingComment && (
                    <Button variant="plain" onClick={cancelAction}>
                      Cancel
                    </Button>
                  )}
                </Stack>
              </Stack>
            </form>
          </CardContent>
        </Card>
      )}

      {!user && (
        <Alert color="warning" sx={{ mb: 3 }}>
          Please log in to comment on this post.
        </Alert>
      )}

      {/* Comments List */}
      <Stack spacing={2}>
        {comments.length === 0 ? (
          <Typography level="body-md" color="neutral" sx={{ textAlign: 'center', py: 4 }}>
            No comments yet. Be the first to comment!
          </Typography>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onEdit={startEdit}
              onDelete={handleDeleteComment}
              currentUserId={user?.id}
            />
          ))
        )}
      </Stack>
    </Box>
  );
};

export default CommentSection;