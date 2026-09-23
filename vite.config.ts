import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const hlsTarget = env.VITE_HLS_TARGET || 'http://localhost:8088'
  return {
    plugins: [
      vue(),
      vueDevTools(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          importScripts: ['/push-sw.js'],
          cleanupOutdatedCaches: true,
          sourcemap: false,
          maximumFileSizeToCacheInBytes: 5000000,
        },
        manifest: {
          id: 'aqua',
          name: 'Aqua',
          short_name: 'Aqua',
          description: 'Aqua: Análise Pluviométrica',
          theme_color: '#4a90d9',
          background_color: '#ffffff',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/icons/aqua-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icons/aqua-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/icons/aqua-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        devOptions: {
          enabled: true,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      allowedHosts: ['5000.michalski.app'],
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'https://api-aqua.michalski.app',
          changeOrigin: true,
        },
        '/hls': {
          target: hlsTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
