import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import { analyzer } from 'vite-bundle-analyzer'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(), 
    tailwindcss(),
    visualizer({
      filename: 'stats.html',
      template: 'treemap',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
    analyzer({
      analyzerMode: process.env.ANALYZE ? 'server' : 'disabled',
      openAnalyzer: true,
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  define: {
    // Inject version and build info
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(process.env.VITE_BUILD_TIME || new Date().toISOString()),
    VITE_APP_VERSION: JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom'],
          
          // Router
          'router': ['react-router-dom'],
          
          // Charts and visualization
          'charts': ['recharts'],
          
          // PDF generation (large library)
          'pdf': ['jspdf'],
          
          // Canvas manipulation (large library)
          'canvas': ['html2canvas-pro'],
          
          // UI components
          'ui': ['lucide-react', 'clsx', 'tailwind-merge'],
          
          // Utilities
          'utils': ['zod', 'zustand'],
          
          // External services
          'services': ['@supabase/supabase-js', '@stripe/stripe-js'],
          
          // Monitoring
          'monitoring': ['@sentry/react', 'web-vitals'],
        },
      },
    },
    chunkSizeWarningLimit: 1200, // 1.2MB
    target: 'es2020',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
})
