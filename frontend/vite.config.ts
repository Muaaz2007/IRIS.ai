import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The frontend talks ONLY to the backend under /api/*.
// The backend chains: security guard -> ML classifier -> Ollama -> reply.
// Adjust the proxy target if the backend runs elsewhere.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    // Exact preview hostnames only (never allowedHosts: true)
    allowedHosts: [
      'pv-22aca48ed33c-de724dbc-c1ee-4a19-b9e7-d0f4a78971e4.style.dev',
      'pv-34802b6d4064-7f278e6b-9666-496d-b945-35cd030dfddb.style.dev',
    ],
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
