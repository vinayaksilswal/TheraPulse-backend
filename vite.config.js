import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_PAYPAL_CLIENT_ID': JSON.stringify(env.PAYPAL_CLIENT_ID || env.VITE_PAYPAL_CLIENT_ID || ''),
      'import.meta.env.VITE_ADMIN_PIN': JSON.stringify(env.ADMIN_PIN || env.VITE_ADMIN_PIN || ''),
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true
        }
      },
    },
    build: {
      // Production optimizations
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Vendor chunk: React + ReactDOM + Router
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
              return 'vendor';
            }
            // PayPal SDK in its own chunk (loaded conditionally)
            if (id.includes('node_modules/@paypal')) {
              return 'paypal';
            }
          },
        },
      },
      // Enable source maps for error tracking in production
      sourcemap: mode === 'production' ? 'hidden' : true,
      // Chunk size warning threshold
      chunkSizeWarningLimit: 600,
    },
  }
})
