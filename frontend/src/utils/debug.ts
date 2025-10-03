// Debug mode detection utility for frontend
// This helps determine if debug functionality should be available

/**
 * Determines if the application is running in debug/development mode
 * @returns boolean - true if in debug mode, false otherwise
 */
export const isDebugMode = (): boolean => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return false;
  }

  const hostname = window.location.hostname;

  // Development environments
  const developmentHosts = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    'sathub.local',
  ];

  // Check for common development hostnames
  if (developmentHosts.includes(hostname)) {
    return true;
  }

  // Check for development ports (commonly used in development)
  const port = window.location.port;
  const developmentPorts = ['9999', '5173', '4444', '4001'];
  if (developmentPorts.includes(port)) {
    return true;
  }

  // Check for explicit development subdomains
  if (hostname.startsWith('dev.') || hostname.startsWith('test.') || hostname.startsWith('staging.')) {
    return true;
  }

  // Check for .local domains (common in local development)
  if (hostname.endsWith('.local')) {
    return true;
  }

  // Check environment variables (if available)
  if (import.meta.env && import.meta.env.DEV) {
    return true;
  }

  // Check for NODE_ENV in window (for custom setups)
  if ((window as any).NODE_ENV === 'development') {
    return true;
  }

  // Default to false for production environments
  return false;
};

/**
 * Determines if debug functionality should be enabled
 * This is a more permissive check that can be used for development features
 * @returns boolean - true if debug features should be enabled
 */
export const isDebugEnabled = (): boolean => {
  return isDebugMode();
};

/**
 * Logs a debug message only if debug mode is enabled
 * @param message - The message to log
 * @param data - Optional data to log
 */
export const debugLog = (message: string, data?: any): void => {
  if (isDebugMode()) {
    console.log(`[DEBUG] ${message}`, data || '');
  }
};

/**
 * Creates a conditional wrapper for debug functionality
 * @param callback - The function to execute if debug mode is enabled
 * @returns void
 */
export const debugOnly = (callback: () => void): void => {
  if (isDebugMode()) {
    callback();
  }
};
