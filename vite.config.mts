import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';
import fs from 'fs';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode (development/production) in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  // Determine base path, default to '/' if PATH_PREFIX is not set
  // Ensure it starts and ends with a slash
  let basePath = env.VITE_PATH_PREFIX ? `${env.VITE_PATH_PREFIX}` : '';
  if (basePath && !basePath.startsWith('/')) {
    basePath = '/' + basePath;
  }
  if (basePath && !basePath.endsWith('/')) {
    basePath = basePath + '/';
  }
  if (!basePath) {
    basePath = '/';
  }

  const inputFiles = {
    main: path.resolve(__dirname, 'src/front-end/index.html'),
    downtime: path.resolve(__dirname, 'src/front-end/downtime.html'),
    unsupportedBrowser: path.resolve(__dirname, 'src/front-end/unsupported-browser.html')
  };

  return {
    plugins: [
      react(),
      tsconfigPaths({
        projects: [
          path.resolve(process.cwd(), 'tsconfig.json'),
          path.resolve(process.cwd(), 'src/front-end/typescript/tsconfig.json')
        ]
      }),
      nodePolyfills(),
      tailwindcss()
    ],
    resolve: {
      alias: {
        'bootstrap': path.resolve(process.cwd(), 'node_modules/bootstrap'),
        '/typescript': path.resolve(process.cwd(), 'src/front-end/typescript')
      }
    },
    // Set the base public path when served in production
    // Ensure leading/trailing slashes are correct
    base: basePath,
    // Specify the project root directory (where index.html is expected)
    // root: './src/front-end/html', // does not work
    root: './src/front-end',
    publicDir: './public',
    build: {
      outDir: '../../build/front-end', // Navigate up from src/front-end/html to project root
      emptyOutDir: true,
      sourcemap: mode === 'development',
      rollupOptions: {
        input: inputFiles
      }
    },
    server: {
      // Configure the development server
      port: 3001, // Vite runs on 3000
      strictPort: true, // Exit if port is already in use
      // Proxy API requests to the backend server
      proxy: {
        '/api': {
          target: 'http://localhost:3000', // Point proxy to backend on 3000
          changeOrigin: true, // Needed for virtual hosted sites
          secure: false,      // Optional: Ignore invalid SSL certs if backend uses HTTPS
          // rewrite: (path) => path.replace(/^\/api/, '') // Optional: Remove /api prefix before forwarding
        },
        '/jwt': {
          target: 'http://localhost:3000', // Point proxy to backend on 3000
          changeOrigin: true, // Needed for virtual hosted sites
          secure: false,      // Optional: Ignore invalid SSL certs if backend uses HTTPS
          // rewrite: (path) => path.replace(/^\/api/, '') // Optional: Remove /api prefix before forwarding
        },
        // todo: temporary auth fix
        '/auth': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false
        }
      }
    },
    define: {
      'process.env.VITE_SHOW_TEST_INDICATOR': JSON.stringify(env.VITE_SHOW_TEST_INDICATOR),
      'process.env.VITE_AI_SERVICE_URL': JSON.stringify(env.VITE_AI_SERVICE_URL)
    }
  };
});
