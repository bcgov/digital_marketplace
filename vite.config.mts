import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode (development/production) in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  // Determine base path, default to '/' if PATH_PREFIX is not set
  // Ensure it starts and ends with a slash
  let basePath = env.PATH_PREFIX ? `${env.PATH_PREFIX}` : '';
  if (basePath && !basePath.startsWith('/')) {
    basePath = '/' + basePath;
  }
  if (basePath && !basePath.endsWith('/')) {
    basePath = basePath + '/';
  }
  if (!basePath) {
    basePath = '/';
  }

  return {
    plugins: [
      react(),
      tsconfigPaths({
        projects: [
          './tsconfig.json', // Root tsconfig
          './src/front-end/typescript/tsconfig.json' // Front-end specific tsconfig
        ]
      })
    ],
    resolve: {
      alias: {
        'bootstrap': path.resolve(process.cwd(), 'node_modules/bootstrap')
      }
    },
    // Define global constant replacements (similar to envify)
    // Access them in your code via import.meta.env.VITE_XXX
    define: {
      // Need to JSON.stringify strings
      'import.meta.env.VITE_NODE_ENV': JSON.stringify(env.NODE_ENV || mode),
      'import.meta.env.VITE_CONTACT_EMAIL': JSON.stringify(env.CONTACT_EMAIL || 'digitalmarketplace@gov.bc.ca'),
      'import.meta.env.VITE_SHOW_TEST_INDICATOR': JSON.stringify(env.SHOW_TEST_INDICATOR || ''),
      'import.meta.env.VITE_PATH_PREFIX': JSON.stringify(env.PATH_PREFIX || ''),
      // For compatibility if any code still uses process.env (less ideal with Vite)
      // Consider refactoring code to use import.meta.env
      'process.env.NODE_ENV': JSON.stringify(env.NODE_ENV || mode),
      'process.env.CONTACT_EMAIL': JSON.stringify(env.CONTACT_EMAIL || 'digitalmarketplace@gov.bc.ca'),
      'process.env.SHOW_TEST_INDICATOR': JSON.stringify(env.SHOW_TEST_INDICATOR || ''),
      'process.env.PATH_PREFIX': JSON.stringify(env.PATH_PREFIX || ''),
    },
    // Set the base public path when served in production
    // Ensure leading/trailing slashes are correct
    base: basePath,
    // Specify the project root directory (where index.html is expected)
    root: '.', // Project root
    publicDir: 'src/front-end/public',
    build: {
      // Specify the output directory relative to the root
      outDir: './build/front-end',
      // Set to false to prevent Vite from clearing the outDir
      // Useful if other build steps output to the same directory
      emptyOutDir: true,
      sourcemap: mode === 'development', // Enable sourcemaps in development
    },
    server: {
      // Configure the development server
      port: 5173, // Vite runs on 5173
      strictPort: true, // Exit if port is already in use
      // Proxy API requests to the backend server
      proxy: {
        // Adjust '/api' if your API routes have a different prefix
        '/api': {
          target: 'http://localhost:3000', // Point proxy to backend on 3000
          changeOrigin: true, // Needed for virtual hosted sites
          secure: false,      // Optional: Ignore invalid SSL certs if backend uses HTTPS
          // rewrite: (path) => path.replace(/^\/api/, '') // Optional: Remove /api prefix before forwarding
        }
      }
    }
  };
}); 