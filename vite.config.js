import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three-vendor'
          // Only recharts here — d3 (used by the lazy Globe) would otherwise ride along
          // in this eagerly-preloaded chunk. Rollup places recharts' d3-* deps itself.
          if (id.includes('node_modules/recharts')) return 'charts-vendor'
          if (id.includes('node_modules/framer-motion')) return 'motion-vendor'
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.js',
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Nuclear Pulse',
        short_name: 'Nuclear Pulse',
        description: 'Live data on global nuclear reactors, industry stocks, and energy news.',
        theme_color: '#14120e',
        background_color: '#14120e',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Reactor schematics are only viewed in plant/learn modals — cache on first view instead of precaching.
        globIgnores: ['reactor-schematics/**'],
        runtimeCaching: [
          {
            // Google Fonts stylesheet
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets', expiration: { maxEntries: 10 } },
          },
          {
            // Google Fonts font files (immutable, versioned URLs)
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/reactor-schematics\/.*\.webp$/,
            handler: 'CacheFirst',
            options: { cacheName: 'reactor-schematics', expiration: { maxEntries: 10 } },
          },
        ],
      },
    }),
  ],
})
