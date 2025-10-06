import React, { useState, useEffect } from "react";
import {
  Button,
  Modal,
  ModalDialog,
  ModalClose,
  DialogTitle,
  DialogContent,
  Stack,
  Input,
  IconButton,
  Typography,
  Alert,
  Tooltip,
} from "@mui/joy";
import ShareIcon from "@mui/icons-material/Share";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import {
  createShareToken,
  getShareToken,
  deleteShareToken,
  type ShareToken,
} from "../api";
import { useAuth } from "../contexts/AuthContext";

interface ShareButtonProps {
  postId: string;
  size?: "sm" | "md" | "lg";
}

const ShareButton: React.FC<ShareButtonProps> = ({ postId, size = "md" }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [shareToken, setShareToken] = useState<ShareToken | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Check if share token already exists when modal opens
  useEffect(() => {
    if (open && user) {
      loadShareToken();
    }
  }, [open, user]);

  const loadShareToken = async () => {
    try {
      const token = await getShareToken(postId);
      setShareToken(token);
    } catch (err) {
      // No token exists yet, which is fine
      setShareToken(null);
    }
  };

  const handleCreateToken = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await createShareToken(postId);
      setShareToken(token);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error ||
        err.message ||
        "Failed to create share link";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (shareToken) {
      try {
        await navigator.clipboard.writeText(shareToken.share_url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        setError("Failed to copy link to clipboard");
      }
    }
  };

  const handleRevokeToken = async () => {
    if (!shareToken) return;

    setLoading(true);
    setError(null);
    try {
      await deleteShareToken(postId);
      setShareToken(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to revoke share link"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setError(null);
    setCopied(false);
  };

  if (!user) {
    return null; // Only show share button for logged-in users
  }

  return (
    <>
      <Tooltip title="Share" size={size}>
        <IconButton
          variant="plain"
          color="neutral"
          size={size}
          onClick={() => setOpen(true)}
        >
          <ShareIcon />
        </IconButton>
      </Tooltip>

      <Modal open={open} onClose={handleClose}>
        <ModalDialog sx={{ minWidth: 400 }}>
          <ModalClose />
          <DialogTitle>Share Post</DialogTitle>
          <DialogContent>
            <Stack spacing={2}>
              {!shareToken ? (
                <>
                  <Typography level="body-sm">
                    Create a shareable link for this post. Anyone with the link
                    will be able to view the post, even without logging in.
                  </Typography>
                  {error && <Alert color="danger">{error}</Alert>}
                  <Button
                    onClick={handleCreateToken}
                    loading={loading}
                    fullWidth
                  >
                    Generate Share Link
                  </Button>
                </>
              ) : (
                <>
                  <Typography level="body-sm">
                    Share this link with others. They will be able to view this
                    post without needing an account.
                  </Typography>
                  {error && <Alert color="danger">{error}</Alert>}
                  <Stack direction="row" spacing={1}>
                    <Input
                      value={shareToken.share_url}
                      readOnly
                      sx={{ flex: 1 }}
                      endDecorator={
                        <IconButton
                          onClick={handleCopyLink}
                          color={copied ? "success" : "neutral"}
                          variant="plain"
                        >
                          {copied ? <CheckIcon /> : <ContentCopyIcon />}
                        </IconButton>
                      }
                    />
                  </Stack>
                  <Alert color="success" size="sm">
                    {copied ? "Link copied!" : "Click the copy icon to copy"}
                  </Alert>
                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="outlined"
                      color="neutral"
                      onClick={handleClose}
                      fullWidth
                    >
                      Close
                    </Button>
                    <Button
                      variant="outlined"
                      color="danger"
                      onClick={handleRevokeToken}
                      loading={loading}
                      fullWidth
                    >
                      Revoke Link
                    </Button>
                  </Stack>
                </>
              )}
            </Stack>
          </DialogContent>
        </ModalDialog>
      </Modal>
    </>
  );
};

export default ShareButton;
