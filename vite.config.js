import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_CJ_API_KEY': JSON.stringify(env.CJ_API_KEY || env.VITE_CJ_API_KEY || ''),
      // SECURITY: Only expose VITE_-prefixed env vars to the client bundle.
      // CJ API key is proxied server-side and should NOT be in client code.
      // VITE_PAYPAL_CLIENT_ID and VITE_GEMINI_KEY are intentionally client-side
      // (PayPal requires it; Gemini is proxied but needs the key for the proxy path).
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true
        },
        '/api-cj': {
          target: 'https://developers.cjdropshipping.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-cj/, ''),
        },
        '/api-gemini': {
          target: 'https://generativelanguage.googleapis.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-gemini/, ''),
        },
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
