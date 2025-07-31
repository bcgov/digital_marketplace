import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { compression, defineAlgorithm } from 'vite-plugin-compression2';
import { constants } from 'zlib';

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
      // Only enable compression for production builds
      ...(mode === 'production' ? [
        compression({
          algorithms: [
            defineAlgorithm('gzip', { level: 9 }),
            defineAlgorithm('brotliCompress', {
              params: {
                [constants.BROTLI_PARAM_QUALITY]: 11
              }
            })
          ],
          exclude: [/\.woff2$/, /\.gz$/, /\.br$/]
        })
      ] : [])
    ],
    css: {
      preprocessorOptions: {
        scss: {
          quietDeps: true,
          silenceDeprecations: ['import']
        }
      }
    },
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
    root: './src/front-end/html', // Project root
    publicDir: '../public',
    build: {
      outDir: '../../../build/front-end', // Navigate up from src/front-end/html to project root
      emptyOutDir: true,
      sourcemap: mode === 'development',
      rollupOptions: {
        input: {
          main: path.resolve(process.cwd(), 'src/front-end/html/index.html'),
          downtime: path.resolve(process.cwd(), 'src/front-end/html/downtime.html'),
          unsupportedBrowser: path.resolve(process.cwd(), 'src/front-end/html/unsupported-browser.html')
        }
      }
    },
    server: {
      // Configure the development server
      port: 5173, // Vite runs on 5173
      strictPort: true, // Exit if port is already in use
      // Proxy API requests to the backend server
      proxy: {
        '/api': {
          target: 'http://localhost:3000', // Point proxy to backend on 3000
          changeOrigin: true, // Needed for virtual hosted sites
          secure: false,      // Optional: Ignore invalid SSL certs if backend uses HTTPS
        },
        '/auth': {
          target: 'http://localhost:3000', // Point proxy to backend on 3000
          changeOrigin: true, // Needed for virtual hosted sites
          secure: false,      // Optional: Ignore invalid SSL certs if backend uses HTTPS
        }
      }
    },
    define: {
      'process.env.VITE_SHOW_TEST_INDICATOR': JSON.stringify(env.VITE_SHOW_TEST_INDICATOR)
    }
  };
});
