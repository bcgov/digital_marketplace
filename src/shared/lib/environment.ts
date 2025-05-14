/**
 * Helper functions to safely access environment variables
 * in both Vite (import.meta.env) and Node.js (process.env) contexts.
 */

// Type guard for Vite environment variables
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const importMeta: any;

// Helper to check if running in a Vite/browser-like environment
const isViteEnv = typeof importMeta !== 'undefined' && typeof importMeta.env !== 'undefined';

// Helper to get a string value
function getString(viteKey: string, nodeKey: string, defaultValue: string): string {
  if (isViteEnv) {
    // Access Vite env vars using the declared type
    return importMeta.env[viteKey] ?? defaultValue;
  }
  // Fallback to Node.js process.env
  return process.env[nodeKey] ?? defaultValue;
}

// --- Exported Accessor Functions ---

export function getNodeEnv(): 'development' | 'production' {
  const env = getString('VITE_NODE_ENV', 'NODE_ENV', 'production');
  return env === 'development' ? 'development' : 'production';
}

export function getContactEmail(): string {
  return getString('VITE_CONTACT_EMAIL', 'CONTACT_EMAIL', 'digitalmarketplace@gov.bc.ca');
}

export function getShowTestIndicator(): string {
  return getString('VITE_SHOW_TEST_INDICATOR', 'SHOW_TEST_INDICATOR', '');
}

export function getPathPrefix(): string {
  return getString('VITE_PATH_PREFIX', 'PATH_PREFIX', '');
}

// Add other shared environment variables here following the same pattern 