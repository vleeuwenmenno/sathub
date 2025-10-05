import React, { useState, useEffect } from "react";
import { Alert, Box, Link } from "@mui/joy";
import axios from "axios";
import { getApiBaseUrl } from "../config";

const API_BASE = `${getApiBaseUrl()}/api`;

const BackendStatus: React.FC = () => {
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await axios.get(`${API_BASE}/health`);
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
    if (import.meta.env.DEV) {
      return (
        <Box sx={{ p: 2 }}>
          <Alert color="danger" variant="soft">
            Backend is not available (yet?), please wait until it's up or check
            the logs with <code>docker-compose logs -f backend</code>
          </Alert>
        </Box>
      );
    } else {
      return (
        <Box sx={{ p: 2 }}>
          <Alert color="danger" variant="soft">
            Something seems to have gone wrong. Please check our{" "}
            <Link
              href="https://updown.io/p/itf3y"
              target="_blank"
              rel="noopener noreferrer"
            >
              status page
            </Link>{" "}
            for updates.
          </Alert>
        </Box>
      );
    }
  }

  return null; // Backend is online, no need to show anything
};

export default BackendStatus;
