import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    cloudflare(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pokeball.svg'],
      manifest: {
        name: '포켓몬 도감 & 퀴즈',
        short_name: '포켓몬 도감',
        description:
          '아이와 함께, 또는 포켓몬을 좋아하는 누구나 즐길 수 있는 미니 도감 & 퀴즈 앱',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f7f7fa',
        theme_color: '#f2c31a',
        lang: 'ko',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/icons/maskable-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/maskable-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // 앱 셸(빌드된 HTML/JS/CSS)만 자동 프리캐시. 스프라이트/아트워크/울음소리는
        // raw.githubusercontent.com 외부 CDN이라 서비스워커로 선캐싱하지 않고
        // 브라우저 기본 HTTP 캐시에 맡긴다 (용량도 크고 오프라인 첫 방문엔 어차피 못 봄).
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname === '/data/pokemon.json',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'pokemon-data' },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true,
  },
})