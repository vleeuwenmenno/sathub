import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Modal,
  ModalDialog,
  ModalClose,
  Box,
  IconButton,
  Typography,
} from "@mui/joy";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

interface ImageViewerProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  altText: string;
  filename?: string;
}

const ImageViewer: React.FC<ImageViewerProps> = ({
  open,
  onClose,
  imageUrl,
  altText,
  filename,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom and pan when modal opens/closes or image changes
  useEffect(() => {
    if (open) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [open, imageUrl]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      // Much less sensitive zoom - changed from 0.1 to 0.02
      const delta = e.deltaY > 0 ? -0.02 : 0.02;
      const newZoom = Math.max(0.1, Math.min(5, zoom + delta));
      setZoom(newZoom);
    },
    [zoom]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
        setPan({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(5, prev + 0.5));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(0.1, prev - 0.5));
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        layout="fullscreen"
        sx={{
          display: "flex",
          flexDirection: "column",
          bgcolor: "rgba(0, 0, 0, 0.9)",
          p: 0,
        }}
      >
        {/* Header with controls */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 2,
            bgcolor: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(4px)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {filename && (
              <Typography level="body-sm" sx={{ color: "white" }}>
                {filename}
              </Typography>
            )}
            <Typography level="body-xs" sx={{ color: "neutral.300" }}>
              Zoom: {Math.round(zoom * 100)}%
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <IconButton
              size="sm"
              variant="soft"
              color="neutral"
              onClick={handleZoomOut}
              disabled={zoom <= 0.1}
              sx={{ color: "white" }}
            >
              <ZoomOutIcon />
            </IconButton>
            <IconButton
              size="sm"
              variant="soft"
              color="neutral"
              onClick={handleZoomIn}
              disabled={zoom >= 5}
              sx={{ color: "white" }}
            >
              <ZoomInIcon />
            </IconButton>
            <IconButton
              size="sm"
              variant="soft"
              color="neutral"
              onClick={handleReset}
              sx={{ color: "white" }}
            >
              <RestartAltIcon />
            </IconButton>
            <ModalClose
              variant="plain"
              sx={{
                position: "static",
                color: "white",
                "&:hover": {
                  bgcolor: "rgba(255, 255, 255, 0.1)",
                },
              }}
            />
          </Box>
        </Box>

        {/* Image container */}
        <Box
          ref={containerRef}
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            cursor: isDragging ? "grabbing" : "grab",
            userSelect: "none",
          }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt={altText}
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${
                pan.y / zoom
              }px)`,
              transformOrigin: "center center",
              transition: isDragging ? "none" : "transform 0.1s ease-out",
              maxWidth: zoom === 1 ? "100%" : "none",
              maxHeight: zoom === 1 ? "100%" : "none",
              objectFit: zoom === 1 ? "contain" : "none",
              userSelect: "none",
              pointerEvents: "none",
            }}
            draggable={false}
          />
        </Box>
      </ModalDialog>
    </Modal>
  );
};

export default ImageViewer;
