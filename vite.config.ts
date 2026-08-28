import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'; // 🚀 ADICIONE ESTA LINHA
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    TanStackRouterVite({ autoCodeSplitting: true }), // 🚀 ADICIONE ESTA LINHA (Sempre antes do react())
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Trocado de generateSW pra injectManifest: precisamos de um service
      // worker customizado (src/sw.ts) com handler de 'push'/'notificationclick'
      // pro admin receber notificação de novo cadastro/assinante — o modo
      // generateSW padrão só gera cache, sem esses eventos.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['icon-152.png', 'icon-192.png', 'icon-512.png', 'favicon.ico', 'apple-touch-icon.png'],
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      },
      manifest: {
        name: 'Abastece ADM — Painel',
        short_name: 'Abastece ADM',
        description: 'Gerenciador do ecossistema Abastece Votu',
        theme_color: '#0B0F19',
        background_color: '#0B0F19',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});