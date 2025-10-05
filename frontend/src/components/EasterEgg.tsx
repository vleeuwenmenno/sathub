import React, { useEffect, useRef } from "react";
import { Box } from "@mui/joy";
import easterEggGif from "../assets/easter-egg.gif";
import easterEggMp3 from "../assets/easteregg16sek.mp3";

interface EasterEggProps {
  onClose: () => void;
}

const EasterEgg: React.FC<EasterEggProps> = ({ onClose }) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // Play audio when component mounts
    if (audioRef.current) {
      audioRef.current.play().catch((error) => {
        console.log("Audio play failed:", error);
      });
    }

    // Auto close after 10 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 10000);

    return () => {
      clearTimeout(timer);
    };
  }, [onClose]);

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "rainbowFlash 0.2s infinite",
        "@keyframes rainbowFlash": {
          "0%": { backgroundColor: "#ff0000" },
          "14%": { backgroundColor: "#ff8000" },
          "28%": { backgroundColor: "#ffff00" },
          "42%": { backgroundColor: "#80ff00" },
          "57%": { backgroundColor: "#00ff00" },
          "71%": { backgroundColor: "#00ff80" },
          "85%": { backgroundColor: "#0080ff" },
          "100%": { backgroundColor: "#0000ff" },
        },
      }}
    >
      <img
        src={easterEggGif}
        alt="Easter Egg"
        style={{
          maxWidth: "50%",
          maxHeight: "50%",
          objectFit: "contain",
        }}
      />
      <audio ref={audioRef} src={easterEggMp3} loop />
    </Box>
  );
};

export default EasterEgg;
