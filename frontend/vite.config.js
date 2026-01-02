import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Add this proxy configuration
      '/api': {
        target: 'http://localhost:5000', // Your backend server
        changeOrigin: true, // Needed for virtual hosted sites
         secure: false,
      },
    },
  },
})