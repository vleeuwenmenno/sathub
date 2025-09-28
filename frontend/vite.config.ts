import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://backend:4001",
        changeOrigin: true,
        secure: false,
      },
      "/health": {
        target: "http://backend:4001",
        changeOrigin: true,
        secure: false,
      },
      "/captcha": {
        target: "http://backend:4001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    allowedHosts: process.env.VITE_ALLOWED_HOSTS
      ? process.env.VITE_ALLOWED_HOSTS.split(",")
      : undefined,
  },
});
