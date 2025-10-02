import React, { useState } from "react";
import {
  IconButton,
  Modal,
  ModalDialog,
  Typography,
  Button,
  Stack,
  Alert,
} from "@mui/joy";
import DeleteIcon from "@mui/icons-material/Delete";
import { deletePost, adminDeletePost } from "../api";

interface DeletePostButtonProps {
  postId: string;
  postName: string;
  isOwner: boolean;
  isAdmin?: boolean;
  onDelete: () => void;
}

const DeletePostButton: React.FC<DeletePostButtonProps> = ({
  postId,
  postName,
  isOwner,
  isAdmin = false,
  onDelete,
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOwner && !isAdmin) {
    return null;
  }

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      if (isAdmin) {
        await adminDeletePost(postId);
      } else {
        await deletePost(postId);
      }
      setOpen(false);
      onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <IconButton
        size="sm"
        color={isAdmin ? "warning" : "danger"}
        variant="plain"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation(); // Prevent card click
          setOpen(true);
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onMouseUp={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        sx={{
          "&:hover": {
            bgcolor: isAdmin ? "warning.softBg" : "danger.softBg",
          },
        }}
      >
        <DeleteIcon />
      </IconButton>

      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalDialog>
          <Typography level="h4" sx={{ mb: 2 }}>
            Delete Post
          </Typography>

          <Typography sx={{ mb: 3 }}>
            Are you sure you want to delete the post "{postName}"? This action
            cannot be undone.
          </Typography>

          {error && (
            <Alert color="danger" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Stack direction="row" spacing={2} sx={{ justifyContent: "flex-end" }}>
            <Button
              variant="plain"
              color="neutral"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              color={isAdmin ? "warning" : "danger"}
              onClick={handleDelete}
              loading={loading}
            >
              Delete
            </Button>
          </Stack>
        </ModalDialog>
      </Modal>
    </>
  );
};

export default DeletePostButton;