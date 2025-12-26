/**
 * Copyright (c) 2025 Foia Stream
 * Vite configuration for Cypress component testing
 */

import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  // Optimizations for Cypress component testing
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
