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
  // Debug logging
  if (typeof window !== 'undefined') {
    console.log('Runtime config available:', !!window.ENV);
    console.log('Window ENV:', window.ENV);
    console.log('Build-time VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
  }
  
  // In production, use runtime config from window.ENV if it's been properly set
  if (typeof window !== 'undefined' && window.ENV && window.ENV.VITE_API_BASE_URL) {
    // Check if the placeholder hasn't been replaced (entrypoint script failed)
    if (!window.ENV.VITE_API_BASE_URL.includes('${VITE_API_BASE_URL}')) {
      console.log('Using runtime config:', window.ENV.VITE_API_BASE_URL);
      return window.ENV.VITE_API_BASE_URL;
    } else {
      console.log('Runtime config has unreplaced placeholders');
    }
  }
  
  // In development or fallback, use build-time config from import.meta.env
  const buildTimeUrl = import.meta.env.VITE_API_BASE_URL;
  if (buildTimeUrl) {
    console.log('Using build-time config:', buildTimeUrl);
    return buildTimeUrl;
  }
  
  // Final fallback - determine based on current location
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      console.log('Using localhost fallback');
      return 'http://localhost:4001';
    }
    // For production deployments, assume API is at api subdomain
    const fallbackUrl = `https://api.${hostname}`;
    console.log('Using hostname-based fallback:', fallbackUrl);
    return fallbackUrl;
  }
  
  console.log('Using final fallback');
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