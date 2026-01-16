import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  server: {
    proxy: {
      '/api/bridge': {
        target: 'https://api.testnet.hiro.so',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bridge/, '/bridge'),
      },
    },
  },
});
