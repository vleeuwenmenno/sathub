// Configuration utility to get runtime environment variables
// This allows for both development (import.meta.env) and production (window.ENV) configurations

interface RuntimeConfig {
  VITE_API_BASE_URL?: string;
  VITE_ALLOWED_HOSTS?: string;
}

declare global {
  interface Window {
    ENV?: RuntimeConfig;
  }
}

// Helper functions for specific config values
export const getApiBaseUrl = (): string => {
  // In production, use runtime config from window.ENV if it's been properly set
  if (typeof window !== 'undefined' && window.ENV && window.ENV.VITE_API_BASE_URL) {
    // Check if the placeholder hasn't been replaced (entrypoint script failed)
    if (!window.ENV.VITE_API_BASE_URL.includes('${VITE_API_BASE_URL}')) {
      return window.ENV.VITE_API_BASE_URL;
    }
  }
  
  // In development or fallback, use build-time config from import.meta.env
  const buildTimeUrl = import.meta.env.VITE_API_BASE_URL;
  if (buildTimeUrl) {
    return buildTimeUrl;
  }
  
  // Final fallback - determine based on current location
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:4001';
    }
    // For production deployments, assume API is at api subdomain
    return `https://api.${hostname}`;
  }
  
  return 'http://localhost:4001';
};

export const getAllowedHosts = (): string => {
  // In production, use runtime config from window.ENV if it's been properly set
  if (typeof window !== 'undefined' && window.ENV && window.ENV.VITE_ALLOWED_HOSTS) {
    // Check if the placeholder hasn't been replaced (entrypoint script failed)
    if (!window.ENV.VITE_ALLOWED_HOSTS.includes('${VITE_ALLOWED_HOSTS}')) {
      return window.ENV.VITE_ALLOWED_HOSTS;
    }
  }
  
  // In development or fallback, use build-time config from import.meta.env
  const buildTimeHosts = import.meta.env.VITE_ALLOWED_HOSTS;
  if (buildTimeHosts) {
    return buildTimeHosts;
  }
  
  // Final fallback
  if (typeof window !== 'undefined') {
    return window.location.hostname;
  }
  
  return 'localhost';
};