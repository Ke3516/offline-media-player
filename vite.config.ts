import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'favicon.svg'],
      manifest: {
        name: 'Offline Media Player',
        short_name: 'MediaPlayer',
        description: 'Offline music and video player for phones and tablets.',
        theme_color: '#0f172a',
        background_color: '#09090b',
        display: 'standalone',
        start_url: '/index.html',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,mp3,mp4,webm}'],
        navigateFallback: 'index.html'
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 5173
  }
});
