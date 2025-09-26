import React, { useState, useEffect } from "react";
import { Alert, Box } from "@mui/joy";
import axios from "axios";

const BackendStatus: React.FC = () => {
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await axios.get("/health");
        if (response.status === 200) {
          setBackendOnline(true);
        } else {
          setBackendOnline(false);
        }
      } catch (error) {
        setBackendOnline(false);
      } finally {
        setChecking(false);
      }
    };

    // Initial check
    checkBackend();

    // Poll every 5 seconds
    const interval = setInterval(checkBackend, 5000);

    return () => clearInterval(interval);
  }, []);

  if (checking) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert color="warning" variant="soft">
          Checking backend connection...
        </Alert>
      </Box>
    );
  }

  if (!backendOnline) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert color="danger" variant="soft">
          Backend is not available. Please ensure the backend service is
          running.
        </Alert>
      </Box>
    );
  }

  return null; // Backend is online, no need to show anything
};

export default BackendStatus;
