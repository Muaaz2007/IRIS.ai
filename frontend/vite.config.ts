import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The frontend talks ONLY to the backend under /api/*.
// The backend chains: security guard -> ML classifier -> Ollama -> reply.
// Adjust the proxy target if the backend runs elsewhere.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    // Exact preview hostnames only (never allowedHosts: true)
    allowedHosts: [
      'pv-22aca48ed33c-de724dbc-c1ee-4a19-b9e7-d0f4a78971e4.style.dev',
    ],
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
