import React, { useState, useEffect } from 'react';
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
  Textarea,
  Select,
  Option,
  FormControl,
  FormLabel,
} from '@mui/joy';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { useAuth } from '../contexts/AuthContext';
import { getCommentsForPost, createComment, updateComment, deleteComment, likeComment, getProfilePictureUrl } from '../api';
import type { PostComment } from '../types';

const MAX_COMMENT_LENGTH = 2000;

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
};

interface CommentSectionProps {
  postId: string;
  highlightedCommentId?: string | null;
}

const CommentItem: React.FC<{
  comment: PostComment;
  onEdit: (comment: PostComment) => void;
  onDelete: (commentId: string) => void;
  onSaveEdit: (commentId: string, content: string) => Promise<void>;
  onCancelEdit: () => void;
  onLikeChange?: (commentId: string, liked: boolean, likesCount: number) => void;
  currentUserId?: string;
  isEditing?: boolean;
  editContent?: string;
  onEditContentChange?: (content: string) => void;
  submitting?: boolean;
  isNewlyPosted?: boolean;
  isHighlighted?: boolean;
}> = ({
  comment,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  onLikeChange,
  currentUserId,
  isEditing = false,
  editContent = '',
  onEditContentChange,
  submitting = false,
  isNewlyPosted = false,
  isHighlighted = false,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [isLiked, setIsLiked] = useState(comment.is_liked);
  const [likesCount, setLikesCount] = useState(comment.likes_count);
  const [isLikeLoading, setIsLikeLoading] = useState(false);

  const isOwner = currentUserId === comment.user_id;

  const handleSaveEdit = async () => {
    if (editContent.trim()) {
      await onSaveEdit(comment.id, editContent.trim());
    }
  };

  const handleCancelEdit = () => {
    onCancelEdit();
  };

  const handleLikeClick = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isLikeLoading || !currentUserId) return;

    setIsLikeLoading(true);
    const previousIsLiked = isLiked;
    const previousLikesCount = likesCount;

    // Optimistic update
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);

    try {
      const result = await likeComment(comment.id);
      setIsLiked(result.liked);
      // Update count based on server response
      setLikesCount(result.liked ? previousLikesCount + 1 : previousLikesCount - 1);

      if (onLikeChange) {
        onLikeChange(comment.id, result.liked, result.liked ? previousLikesCount + 1 : previousLikesCount - 1);
      }
    } catch (error) {
      // Revert optimistic update on error
      setIsLiked(previousIsLiked);
      setLikesCount(previousLikesCount);
      console.error("Failed to toggle comment like:", error);
    } finally {
      setIsLikeLoading(false);
    }
  };

  return (
    <Box>
      <Card
        id={`comment-${comment.id}`}
        variant="outlined"
        sx={{
          mb: 2,
          ...(isNewlyPosted && {
            backgroundColor: 'success.softBg',
            borderColor: 'success.outlinedBorder',
            transition: 'all 0.3s ease-out',
          }),
          ...(isHighlighted && {
            animation: "highlight-pulse 1.5s ease-in-out 2",
            "@keyframes highlight-pulse": {
              "0%, 100%": {
                boxShadow: "0 0 0 0 rgba(var(--joy-palette-primary-mainChannel) / 0)",
                transform: "scale(1)",
              },
              "50%": {
                boxShadow: "0 0 0 8px rgba(var(--joy-palette-primary-mainChannel) / 0.4)",
                transform: "scale(1.02)",
              },
            },
          }),
        }}
      >
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Avatar size="sm">
              {comment.has_profile_picture && comment.profile_picture_url ? (
                <img
                  src={getProfilePictureUrl(comment.profile_picture_url)}
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
                {isOwner && !isEditing && (
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
              {isEditing ? (
                <Box>
                  <Textarea
                    placeholder="Edit your comment..."
                    value={editContent}
                    onChange={(e) => onEditContentChange?.(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSaveEdit();
                      } else if (e.key === 'Escape') {
                        handleCancelEdit();
                      }
                    }}
                    minRows={2}
                    sx={{ mb: 1 }}
                  />
                  <Typography
                    level="body-xs"
                    sx={{
                      textAlign: 'right',
                      mb: 1,
                      color: editContent.length > MAX_COMMENT_LENGTH * 0.9 ? 'warning.main' : 'neutral',
                      fontWeight: editContent.length > MAX_COMMENT_LENGTH * 0.9 ? 'bold' : 'normal'
                    }}
                  >
                    {editContent.length} / {MAX_COMMENT_LENGTH}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="sm"
                      loading={submitting}
                      disabled={!editContent.trim()}
                      onClick={handleSaveEdit}
                    >
                      Save
                    </Button>
                    <Button size="sm" variant="plain" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  </Stack>
                </Box>
              ) : (
                <Box>
                  <Typography level="body-md" sx={{ mb: 1 }}>
                    {comment.content}
                  </Typography>
                  {/* Like button */}
                  {currentUserId && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <IconButton
                        size="sm"
                        onClick={handleLikeClick}
                        disabled={isLikeLoading}
                        sx={{
                          color: isLiked ? "#ef4444" : "neutral.400",
                          transition: "all 0.2s ease",
                          p: 0.5,
                          "&:hover": {
                            color: isLiked ? "#dc2626" : "danger.500",
                            transform: "scale(1.1)",
                          },
                        }}
                      >
                        {isLiked ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                      </IconButton>
                      <Typography
                        level="body-xs"
                        sx={{
                          color: isLiked ? "#ef4444" : "neutral.500",
                          fontWeight: isLiked ? "bold" : "normal",
                          transition: "all 0.2s ease",
                          minWidth: '20px',
                          textAlign: 'center'
                        }}
                      >
                        {likesCount}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

const CommentSection: React.FC<CommentSectionProps> = ({ postId, highlightedCommentId }) => {
  let user;
  try {
    const auth = useAuth();
    user = auth.user;
  } catch (error) {
    console.warn('Auth context not available:', error);
    user = null;
  }
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingSubmitting, setEditingSubmitting] = useState(false);
  const [isCommentFormExpanded, setIsCommentFormExpanded] = useState(false);
  const [newlyPostedCommentId, setNewlyPostedCommentId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'most_liked'>('newest');

  useEffect(() => {
    loadComments();
  }, [postId, sortBy]);

  const loadComments = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading comments for post:', postId, 'sort by:', sortBy);
      const data = await getCommentsForPost(postId, sortBy);
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

      const response = await createComment(postId, commentData);
      setNewComment('');
      setIsCommentFormExpanded(false); // Collapse form after posting
      await loadComments(); // Reload comments

      // Highlight the newly posted comment for 2 seconds
      if (response && response.id) {
        setNewlyPostedCommentId(response.id);
        setTimeout(() => {
          setNewlyPostedCommentId(null);
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExpandCommentForm = () => {
    setIsCommentFormExpanded(true);
  };

  const handleCancelCommentForm = () => {
    setNewComment('');
    setIsCommentFormExpanded(false);
  };

  const handleSaveEdit = async (commentId: string, content: string) => {
    try {
      setEditingSubmitting(true);
      await updateComment(commentId, { content });
      setEditingCommentId(null);
      setEditContent('');
      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update comment');
    } finally {
      setEditingSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditContent('');
  };

  const startEdit = (comment: PostComment) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await deleteComment(commentId);
      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment');
    }
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
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography level="h3">
          Comments ({comments ? comments.length : 0})
        </Typography>
        <FormControl size="sm" sx={{ minWidth: 150 }}>
          <FormLabel>Sort by</FormLabel>
          <Select
            value={sortBy}
            onChange={(_, value) => setSortBy(value as 'newest' | 'most_liked')}
          >
            <Option value="newest">Newest first</Option>
            <Option value="most_liked">Most liked</Option>
          </Select>
        </FormControl>
      </Stack>

      {error && (
        <Alert color="danger" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Add Comment Form */}
      {user && (
        <Box sx={{ mb: 3 }}>
          {!isCommentFormExpanded ? (
            <Button
              variant="outlined"
              onClick={handleExpandCommentForm}
              sx={{ width: '100%' }}
            >
              Write a comment
            </Button>
          ) : (
            <Card variant="outlined">
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); handleSubmitComment(); }}>
                  <Stack spacing={2}>
                    <Textarea
                      placeholder="Write a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmitComment();
                        }
                      }}
                      minRows={3}
                      autoFocus
                    />
                    <Typography
                      level="body-xs"
                      sx={{
                        textAlign: 'right',
                        color: newComment.length > MAX_COMMENT_LENGTH * 0.9 ? 'warning.main' : 'neutral',
                        fontWeight: newComment.length > MAX_COMMENT_LENGTH * 0.9 ? 'bold' : 'normal'
                      }}
                    >
                      {newComment.length} / {MAX_COMMENT_LENGTH}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button
                        type="submit"
                        loading={submitting}
                        disabled={!newComment.trim()}
                      >
                        Post
                      </Button>
                      <Button
                        variant="plain"
                        onClick={handleCancelCommentForm}
                      >
                        Cancel
                      </Button>
                    </Stack>
                  </Stack>
                </form>
              </CardContent>
            </Card>
          )}
        </Box>
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
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
              onLikeChange={(commentId, liked, likesCount) => {
                // Update the comment in the local state
                setComments(prevComments =>
                  prevComments.map(c =>
                    c.id === commentId
                      ? { ...c, is_liked: liked, likes_count: likesCount }
                      : c
                  )
                );
              }}
              currentUserId={user?.id}
              isEditing={editingCommentId === comment.id}
              editContent={editContent}
              onEditContentChange={setEditContent}
              submitting={editingSubmitting}
              isNewlyPosted={newlyPostedCommentId === comment.id}
              isHighlighted={highlightedCommentId === comment.id}
            />
          ))
        )}
      </Stack>
    </Box>
  );
};

export default CommentSection;