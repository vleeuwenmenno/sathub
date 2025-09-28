import React, { useState } from "react";
import { IconButton, Tooltip } from "@mui/joy";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { likePost } from "../api";

interface LikeButtonProps {
  postId: number;
  initialLikesCount: number;
  initialIsLiked: boolean;
  onLikeChange?: (liked: boolean, likesCount: number) => void;
}

const LikeButton: React.FC<LikeButtonProps> = ({
  postId,
  initialLikesCount,
  initialIsLiked,
  onLikeChange,
}) => {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isLoading, setIsLoading] = useState(false);

  const handleLikeClick = async (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click from firing
    if (isLoading) return;

    setIsLoading(true);
    const previousIsLiked = isLiked;
    const previousLikesCount = likesCount;

    // Optimistic update
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);

    try {
      const result = await likePost(postId);
      setIsLiked(result.liked);
      // Update count based on server response
      setLikesCount(result.liked ? likesCount + 1 : likesCount - 1);

      if (onLikeChange) {
        onLikeChange(result.liked, result.liked ? likesCount + 1 : likesCount - 1);
      }
    } catch (error) {
      // Revert optimistic update on error
      setIsLiked(previousIsLiked);
      setLikesCount(previousLikesCount);
      console.error("Failed to toggle like:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tooltip title={isLiked ? "Unlike" : "Like"}>
      <IconButton
        onClick={handleLikeClick}
        disabled={isLoading}
        sx={{
          color: isLiked ? "#ef4444" : "neutral.400",
          transition: "all 0.2s ease",
          "&:hover": {
            color: isLiked ? "#dc2626" : "danger.500",
            transform: "scale(1.1)",
          },
        }}
      >
        {isLiked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
        <span 
          style={{ 
            marginLeft: 4, 
            fontSize: "0.875rem",
            color: isLiked ? "#ef4444" : "inherit",
            fontWeight: isLiked ? "bold" : "normal",
            transition: "all 0.2s ease"
          }}
        >
          {likesCount}
        </span>
      </IconButton>
    </Tooltip>
  );
};

export default LikeButton;