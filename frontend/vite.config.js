import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  esbuild: {
    legalComments: 'none'
  },
  optimizeDeps: {
    esbuildOptions: {
      legalComments: 'none'
    }
  },
  server: {
    port: 3000,
    open: false
  }
});
